"use server";

import { revalidatePath } from "next/cache";
import { auditar } from "@/lib/auditoria";
import { participacao, registrarMensagem } from "@/lib/conversas";
import { exigirEquipe } from "@/lib/sessao";
import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * Transforma a conversa em convite: cria o cadastro do motorista já ligado à
 * conta dele, com as condições do anúncio, e avisa na própria conversa.
 */
export async function enviarConviteDaConversa(conversaId: string): Promise<{ erro?: string; ok?: string }> {
  const { organizacao, usuario } = await exigirEquipe();
  const p = await participacao(conversaId, usuario);
  if (!p || p.papel !== "locador" || p.conversa.organizacao_id !== organizacao.id) return { erro: "Conversa não encontrada." };
  if (p.conversa.locatario_id) return { ok: "O convite já foi enviado." };

  const admin = supabaseAdmin();
  const { data: anuncio } = await admin.from("anuncios").select("*").eq("id", p.conversa.anuncio_id).single();
  if (!anuncio) return { erro: "Anúncio não encontrado." };
  const { data: aberto } = await admin
    .from("locatarios")
    .select("id")
    .eq("organizacao_id", organizacao.id)
    .eq("usuario_id", p.conversa.usuario_id)
    .in("status", ["convidado", "em_cadastro", "em_analise", "aprovado"])
    .limit(1)
    .maybeSingle();

  let locatarioId = aberto?.id;
  if (!locatarioId) {
    const { data: l, error } = await admin
      .from("locatarios")
      .insert({
        organizacao_id: organizacao.id,
        usuario_id: p.conversa.usuario_id,
        nome: p.conversa.nome_motorista,
        telefone: p.conversa.telefone_motorista,
        status: "em_cadastro",
        veiculo_ofertado_id: anuncio.veiculo_id,
        oferta: {
          aluguelSemanal: anuncio.aluguel_semanal_centavos,
          caucao: anuncio.caucao_centavos,
          franquiaKmMensal: anuncio.franquia_km_mensal,
          prazoMeses: anuncio.prazo_minimo_meses,
        },
      })
      .select("id")
      .single();
    if (error || !l) return { erro: "Não foi possível criar o convite." };
    locatarioId = l.id;
  }

  await admin.from("conversas").update({ locatario_id: locatarioId }).eq("id", conversaId);
  await registrarMensagem(conversaId, "sistema", null, `${organizacao.nome} enviou o convite. Faça seu cadastro para seguir com o aluguel: /m/cadastro/${locatarioId}`);
  await auditar({ organizacaoId: organizacao.id, usuarioId: usuario.id, acao: "conversa.convite", entidade: "locatarios", entidadeId: locatarioId, depois: { conversaId } });
  revalidatePath(`/painel/conversas/${conversaId}`);
  return { ok: "Convite enviado na conversa." };
}
