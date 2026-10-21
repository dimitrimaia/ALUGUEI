"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { lerReais } from "@/dominio/dinheiro/centavos";
import { normalizarCidade } from "@/dominio/marketplace/cidade";
import { auditar } from "@/lib/auditoria";
import { BUCKET_ANUNCIOS } from "@/lib/marketplace";
import { exigirEquipe } from "@/lib/sessao";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServidor } from "@/lib/supabase/servidor";

const reais = (rotulo: string) =>
  z.string().transform((s, ctx) => {
    const v = lerReais(s);
    if (!v) ctx.addIssue({ code: "custom", message: `${rotulo} inválido` });
    return v ?? 0;
  });

const esquema = z.object({
  cidade: z.string().trim().min(2, "Informe a cidade"),
  uf: z.string().trim().length(2, "UF").toUpperCase(),
  aluguelSemanal: reais("Valor"),
  caucao: reais("Caução"),
  franquiaKmMensal: z.coerce.number().int().positive("Franquia inválida"),
  prazoMinimoMeses: z.coerce.number().int().min(1).max(36),
  descricao: z.string().trim().max(1500).optional(),
  fotos: z.string().transform((s) => (s ? (JSON.parse(s) as string[]) : [])).pipe(z.array(z.string()).max(6)),
});

export type EstadoAnuncio = { erros?: Record<string, string>; mensagem?: string };

export async function salvarAnuncio(veiculoId: string, _: EstadoAnuncio, form: FormData): Promise<EstadoAnuncio> {
  const { organizacao, usuario } = await exigirEquipe();
  const lido = esquema.safeParse(Object.fromEntries(form));
  if (!lido.success) return { erros: Object.fromEntries(lido.error.issues.map((i) => [String(i.path[0]), i.message])) };
  const d = lido.data;
  if (d.fotos.some((f) => !f.startsWith(`${organizacao.id}/`))) return { mensagem: "Foto inválida." };

  const supabase = await supabaseServidor();
  const { data: v } = await supabase.from("veiculos").select("*").eq("id", veiculoId).eq("organizacao_id", organizacao.id).maybeSingle();
  if (!v) return { mensagem: "Veículo não encontrado." };
  if (v.status !== "disponivel") return { mensagem: "Só dá para anunciar carro com situação Disponível." };
  // Só carro com documento conferido vai para a busca (os anúncios antigos continuam até serem editados).
  const { data: existente } = await supabase.from("anuncios").select("id").eq("veiculo_id", veiculoId).maybeSingle();
  if (v.verificacao !== "verificado" && !existente) return { mensagem: "Envie o CRLV na ficha do veículo. Depois da conferência, o anúncio pode ir para a busca." };

  const dados = {
    organizacao_id: organizacao.id,
    veiculo_id: veiculoId,
    cidade: d.cidade,
    uf: d.uf,
    cidade_busca: normalizarCidade(d.cidade),
    aluguel_semanal_centavos: d.aluguelSemanal,
    caucao_centavos: d.caucao,
    franquia_km_mensal: d.franquiaKmMensal,
    prazo_minimo_meses: d.prazoMinimoMeses,
    descricao: d.descricao || null,
    fotos: d.fotos,
    status: "ativo" as const,
    atualizado_em: new Date().toISOString(),
  };
  const { error } = await supabase.from("anuncios").upsert(dados, { onConflict: "veiculo_id" });
  if (error) return { mensagem: "Não foi possível salvar o anúncio." };
  await auditar({ organizacaoId: organizacao.id, usuarioId: usuario.id, acao: "anuncio.salvar", entidade: "veiculos", entidadeId: veiculoId, depois: { ...d } });
  redirect("/painel/anuncios");
}

export async function alternarAnuncio(veiculoId: string, ativo: boolean) {
  const { organizacao } = await exigirEquipe();
  const supabase = await supabaseServidor();
  await supabase.from("anuncios").update({ status: ativo ? "ativo" : "pausado", atualizado_em: new Date().toISOString() }).eq("veiculo_id", veiculoId).eq("organizacao_id", organizacao.id);
  revalidatePath("/painel/anuncios");
  return { ok: ativo ? "Anúncio ativo." : "Anúncio pausado." };
}

/** URL assinada para enviar uma foto do anúncio direto ao bucket público. */
export async function prepararFotoAnuncio(veiculoId: string) {
  const { organizacao } = await exigirEquipe();
  const caminho = `${organizacao.id}/${veiculoId}/${randomUUID()}.jpg`;
  const { data, error } = await supabaseAdmin().storage.from(BUCKET_ANUNCIOS).createSignedUploadUrl(caminho);
  if (error || !data) throw new Error("Não foi possível preparar o envio da foto.");
  return { caminho: data.path, token: data.token };
}
