"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { z } from "zod";
import { FOTOS_VISTORIA, ITENS_CHECKLIST, type ChecklistVistoria, faltando } from "@/dominio/vistoria/roteiro";
import { auditar } from "@/lib/auditoria";
import { ArquivoInvalido, linkTemporario, registrarArquivoEnviado, urlDeEnvio } from "@/lib/evidencias";
import { exigirEquipe } from "@/lib/sessao";
import { supabaseServidor } from "@/lib/supabase/servidor";

async function contratoDaEquipe(contratoId: string) {
  const equipe = await exigirEquipe();
  const supabase = await supabaseServidor();
  const { data: c } = await supabase
    .from("contratos")
    .select("id, status, veiculo_id, organizacao_id")
    .eq("id", contratoId)
    .eq("organizacao_id", equipe.organizacao.id)
    .maybeSingle();
  if (!c) throw new Error("Contrato não encontrado");
  return { ...equipe, contrato: c, supabase };
}

const IDS_FOTO = [...FOTOS_VISTORIA.map((f) => f.id), "extra"] as const;

/** Passo 1 do envio: URL assinada para o navegador mandar a foto direto ao cofre. */
export async function prepararFoto(contratoId: string, foto: (typeof IDS_FOTO)[number]) {
  const { organizacao, contrato } = await contratoDaEquipe(contratoId);
  if (contrato.status !== "assinado") throw new Error("A vistoria de entrega é feita depois da assinatura.");
  z.enum(IDS_FOTO).parse(foto);
  return urlDeEnvio(`${organizacao.id}/vistoria/entrega/${contratoId}/${foto}-${randomUUID()}.jpg`);
}

const esquemaRegistro = z.object({
  caminho: z.string(),
  foto: z.enum(IDS_FOTO),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  precisao: z.number().optional(),
  capturadoEm: z.string().datetime().optional(),
});

/** Passo 2: a foto chegou; calcula o hash e registra no cofre. */
export async function registrarFoto(contratoId: string, entrada: z.input<typeof esquemaRegistro>) {
  const { organizacao, usuario, contrato } = await contratoDaEquipe(contratoId);
  const d = esquemaRegistro.parse(entrada);
  if (!d.caminho.startsWith(`${organizacao.id}/vistoria/entrega/${contratoId}/`)) throw new Error("Caminho inválido");
  try {
    const ev = await registrarArquivoEnviado(d.caminho, {
      organizacaoId: organizacao.id,
      enviadoPor: usuario.id,
      finalidade: `vistoria.entrega.${d.foto}`,
      tipo: "foto",
      contratoId,
      veiculoId: contrato.veiculo_id,
      latitude: d.latitude,
      longitude: d.longitude,
      precisaoMetros: d.precisao,
      capturadoEm: d.capturadoEm ? new Date(d.capturadoEm) : undefined,
    });
    return { ok: true as const, evidenciaId: ev.id, url: await linkTemporario(d.caminho) };
  } catch (e) {
    if (e instanceof ArquivoInvalido) return { ok: false as const, erro: e.message };
    throw e;
  }
}

const esquemaVistoria = z.object({
  odometro: z.number().int().min(0),
  combustivelOitavos: z.number().int().min(0).max(8),
  fotos: z.record(z.string(), z.string().uuid()),
  fotosExtras: z.array(z.string().uuid()).max(20),
  itens: z.array(
    z.object({
      item: z.enum(ITENS_CHECKLIST.map((i) => i.id) as [string, ...string[]]),
      estado: z.enum(["ok", "avaria", "ausente"]),
      observacao: z.string().trim().max(500).optional(),
    }),
  ),
  observacoes: z.string().trim().max(2000).optional(),
});

export type ResultadoVistoria = { erro?: string };

export async function concluirVistoria(contratoId: string, entrada: z.input<typeof esquemaVistoria>): Promise<ResultadoVistoria> {
  const { organizacao, usuario, contrato, supabase } = await contratoDaEquipe(contratoId);
  if (contrato.status !== "assinado") return { erro: "Este contrato não está aguardando vistoria de entrega." };
  const lido = esquemaVistoria.safeParse(entrada);
  if (!lido.success) return { erro: "Dados da vistoria inválidos." };
  const d = lido.data;
  const checklist = { fotos: d.fotos, fotosExtras: d.fotosExtras, itens: d.itens, observacoes: d.observacoes } as ChecklistVistoria;

  const f = faltando(checklist);
  if (f.fotos.length) return { erro: `Faltam ${f.fotos.length} foto(s) obrigatória(s).` };
  if (f.itens.length) return { erro: "Marque todos os itens do checklist." };
  if (f.observacoesObrigatorias.length) return { erro: "Descreva cada avaria ou item ausente." };

  // As fotos citadas precisam ser deste contrato.
  const ids = [...Object.values(d.fotos), ...d.fotosExtras];
  const { data: provas } = await supabase.from("evidencias").select("id").eq("contrato_id", contratoId).in("id", ids);
  if ((provas?.length ?? 0) !== new Set(ids).size) return { erro: "Alguma foto não pertence a este contrato. Envie de novo." };

  const { data: veiculo } = await supabase.from("veiculos").select("odometro_atual").eq("id", contrato.veiculo_id).single();
  if (veiculo && d.odometro < veiculo.odometro_atual) {
    return { erro: `O km informado é menor que o último registrado (${veiculo.odometro_atual.toLocaleString("pt-BR")} km).` };
  }

  const { data: existente } = await supabase.from("vistorias").select("id").eq("contrato_id", contratoId).eq("tipo", "entrega").maybeSingle();
  if (existente) return { erro: "A vistoria de entrega já foi registrada." };

  const { data: vistoria, error } = await supabase
    .from("vistorias")
    .insert({
      organizacao_id: organizacao.id,
      contrato_id: contratoId,
      tipo: "entrega",
      odometro: d.odometro,
      combustivel_oitavos: d.combustivelOitavos,
      checklist: JSON.parse(JSON.stringify(checklist)),
      realizada_em: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (error || !vistoria) return { erro: "Não foi possível salvar a vistoria." };

  await auditar({ organizacaoId: organizacao.id, usuarioId: usuario.id, acao: "vistoria.entrega.registrar", entidade: "vistorias", entidadeId: vistoria.id, depois: { odometro: d.odometro, combustivel: d.combustivelOitavos } });
  redirect(`/painel/contratos/${contratoId}`);
}
