"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { hoje } from "@/dominio/datas/data";
import { cancelarCobrancaAsaas, estornarCobrancaAsaas } from "@/integracoes/asaas";
import { listarUsuarios } from "@/lib/admin-usuarios";
import { notificar } from "@/lib/notificacoes";
import { lerReais } from "@/dominio/dinheiro/centavos";
import { auditar } from "@/lib/auditoria";
import { conciliar, contaDoLocador } from "@/lib/cobrancas";
import { exigirEquipeAluguei } from "@/lib/equipe-aluguei";
import { supabaseAdmin } from "@/lib/supabase/admin";

export type Resultado = { ok?: string; erro?: string };
const erro = (mensagem: string): Resultado => ({ erro: mensagem });

/**
 * Ações da equipe do Aluguei. Cada uma confere se quem chama é da equipe e grava
 * na auditoria (antes e depois). Nada drástico de contrato acontece aqui:
 * rescisão e retomada continuam sendo decisão do locador (acoes_pendentes).
 */

export async function bloquearUsuario(usuarioId: string, bloquear: boolean) {
  const equipe = await exigirEquipeAluguei();
  if (usuarioId === equipe.id) throw new Error("Você não pode bloquear a sua própria conta.");
  const { error } = await supabaseAdmin().auth.admin.updateUserById(usuarioId, { ban_duration: bloquear ? "876000h" : "none" });
  if (error) throw error;
  await auditar({ organizacaoId: null, usuarioId: equipe.id, acao: bloquear ? "admin.usuario.bloquear" : "admin.usuario.desbloquear", entidade: "usuario", entidadeId: usuarioId });
  revalidatePath(`/admin/usuarios/${usuarioId}`);
}

export async function confirmarEmail(usuarioId: string) {
  const equipe = await exigirEquipeAluguei();
  const { error } = await supabaseAdmin().auth.admin.updateUserById(usuarioId, { email_confirm: true });
  if (error) throw error;
  await auditar({ organizacaoId: null, usuarioId: equipe.id, acao: "admin.usuario.confirmar_email", entidade: "usuario", entidadeId: usuarioId });
  revalidatePath(`/admin/usuarios/${usuarioId}`);
}

/** Mensalidade por carro e modo assistido de uma locadora. */
export async function ajustarLocadora(organizacaoId: string, form: FormData) {
  const equipe = await exigirEquipeAluguei();
  const admin = supabaseAdmin();
  const { data: antes } = await admin.from("organizacoes").select("mensalidade_por_carro_centavos, modo_assistido").eq("id", organizacaoId).single();
  const mensalidade = lerReais(String(form.get("mensalidade") ?? ""));
  const depois = {
    mensalidade_por_carro_centavos: mensalidade !== null && mensalidade >= 0 ? mensalidade : (antes?.mensalidade_por_carro_centavos ?? 0),
    modo_assistido: form.get("assistido") === "on",
  };
  const { error } = await admin.from("organizacoes").update(depois).eq("id", organizacaoId);
  if (error) throw error;
  await auditar({ organizacaoId, usuarioId: equipe.id, acao: "admin.locadora.ajustar", entidade: "organizacao", entidadeId: organizacaoId, antes: antes ?? null, depois });
  revalidatePath(`/admin/locadoras/${organizacaoId}`);
}

/** Moderação do marketplace: pausa ou reativa um anúncio. */
export async function moderarAnuncio(anuncioId: string, pausar: boolean) {
  const equipe = await exigirEquipeAluguei();
  const admin = supabaseAdmin();
  const { data: a } = await admin.from("anuncios").select("organizacao_id, status").eq("id", anuncioId).single();
  if (!a) return;
  const status = pausar ? "pausado" : "ativo";
  await admin.from("anuncios").update({ status, atualizado_em: new Date().toISOString() }).eq("id", anuncioId);
  await auditar({ organizacaoId: a.organizacao_id, usuarioId: equipe.id, acao: pausar ? "admin.anuncio.pausar" : "admin.anuncio.reativar", entidade: "anuncio", entidadeId: anuncioId, antes: { status: a.status }, depois: { status } });
  revalidatePath("/admin/anuncios");
}

/** Confere a cobrança no Asaas agora (pagamento perdido no webhook). */
export async function conferirCobranca(cobrancaId: string) {
  const equipe = await exigirEquipeAluguei();
  const admin = supabaseAdmin();
  const { data: c } = await admin.from("cobrancas").select("*").eq("id", cobrancaId).single();
  if (!c) return;
  const depois = await conciliar(c);
  await auditar({ organizacaoId: c.organizacao_id, usuarioId: equipe.id, acao: "admin.cobranca.conferir", entidade: "cobranca", entidadeId: cobrancaId, antes: { status: c.status }, depois: { status: depois.status } });
  revalidatePath("/admin/cobrancas");
}

/**
 * Cancela uma cobrança não paga (no Asaas e aqui). Com `isentar`, a obrigação
 * vira isenta (não será cobrada de novo); sem, continua pendente e a rotina
 * diária emite uma cobrança nova.
 */
export async function cancelarCobranca(cobrancaId: string, isentar: boolean, form: FormData): Promise<Resultado> {
  const equipe = await exigirEquipeAluguei();
  if (String(form.get("confirmar") ?? "").trim().toUpperCase() !== "CANCELAR") return erro("Digite CANCELAR para confirmar.");
  const motivo = String(form.get("motivo") ?? "").trim().slice(0, 300) || "Cancelada pela equipe";
  const admin = supabaseAdmin();
  const { data: c } = await admin.from("cobrancas").select("*").eq("id", cobrancaId).single();
  if (!c || c.status === "paga") return erro("Cobrança paga não se cancela: use o estorno.");
  const conta = await contaDoLocador(c.organizacao_id);
  if (c.provedor_id && conta) {
    try {
      await cancelarCobrancaAsaas(conta.chaveApi, c.provedor_id);
    } catch (e) {
      return erro(`O Asaas recusou o cancelamento: ${e instanceof Error ? e.message : e}`);
    }
  }
  await admin.from("cobrancas").update({ status: "cancelada" }).eq("id", cobrancaId);
  if (isentar && c.obrigacao_id) {
    await admin.from("obrigacoes").update({ status: "isenta" }).eq("id", c.obrigacao_id);
    await admin.from("lancamentos").upsert(
      { organizacao_id: c.organizacao_id, contrato_id: c.contrato_id, obrigacao_id: c.obrigacao_id, competencia: hoje(), tipo: "isencao", valor_centavos: -c.valor_centavos, descricao: `Isenção: ${motivo}`, chave: `isencao:admin:${cobrancaId}` },
      { onConflict: "chave", ignoreDuplicates: true },
    );
  }
  await auditar({ organizacaoId: c.organizacao_id, usuarioId: equipe.id, acao: isentar ? "admin.cobranca.cancelar_isentar" : "admin.cobranca.cancelar", entidade: "cobranca", entidadeId: cobrancaId, antes: { status: c.status }, depois: { status: "cancelada", motivo } });
  revalidatePath("/admin/cobrancas");
  return { ok: isentar ? "Cobrança cancelada e obrigação isenta." : "Cobrança cancelada. A rotina diária emite uma nova." };
}

/** Estorna uma cobrança paga: devolve o Pix e lança o estorno no extrato (nada é apagado). */
export async function estornarCobranca(cobrancaId: string, form: FormData): Promise<Resultado> {
  const equipe = await exigirEquipeAluguei();
  if (String(form.get("confirmar") ?? "").trim().toUpperCase() !== "ESTORNAR") return erro("Digite ESTORNAR para confirmar.");
  const motivo = String(form.get("motivo") ?? "").trim().slice(0, 300) || "Estornada pela equipe";
  const admin = supabaseAdmin();
  const { data: c } = await admin.from("cobrancas").select("*").eq("id", cobrancaId).single();
  if (!c || c.status !== "paga" || !c.provedor_id) return erro("Só dá para estornar cobrança paga pelo Asaas.");
  const conta = await contaDoLocador(c.organizacao_id);
  if (!conta) return erro("A locadora não tem conta Asaas ligada.");
  try {
    await estornarCobrancaAsaas(conta.chaveApi, c.provedor_id, motivo);
  } catch (e) {
    return erro(`O Asaas recusou o estorno: ${e instanceof Error ? e.message : e}`);
  }
  await admin.from("cobrancas").update({ status: "estornada" }).eq("id", cobrancaId);
  if (c.obrigacao_id) await admin.from("obrigacoes").update({ status: "pendente" }).eq("id", c.obrigacao_id);
  await admin.from("lancamentos").upsert(
    { organizacao_id: c.organizacao_id, contrato_id: c.contrato_id, obrigacao_id: c.obrigacao_id, competencia: hoje(), tipo: "estorno", valor_centavos: c.valor_pago_centavos ?? c.valor_centavos, descricao: `Estorno: ${motivo}`, chave: `estorno:admin:${cobrancaId}` },
    { onConflict: "chave", ignoreDuplicates: true },
  );
  await auditar({ organizacaoId: c.organizacao_id, usuarioId: equipe.id, acao: "admin.cobranca.estornar", entidade: "cobranca", entidadeId: cobrancaId, antes: { status: "paga" }, depois: { status: "estornada", motivo } });
  revalidatePath("/admin/cobrancas");
  return { ok: "Estorno pedido ao Asaas e lançado no extrato." };
}

/**
 * Prorroga o fim de um contrato (as regras do contrato não mudam: ficam
 * congeladas nos parâmetros). Só para frente, nunca para trás.
 */
export async function prorrogarContrato(contratoId: string, form: FormData): Promise<Resultado> {
  const equipe = await exigirEquipeAluguei();
  const novoFim = String(form.get("fim") ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(novoFim)) return erro("Data inválida.");
  const admin = supabaseAdmin();
  const { data: k } = await admin.from("contratos").select("id, organizacao_id, fim, status").eq("id", contratoId).single();
  if (!k) return erro("Contrato não encontrado.");
  if (novoFim <= k.fim) return erro("A nova data precisa ser depois do fim atual.");
  await admin.from("contratos").update({ fim: novoFim }).eq("id", contratoId);
  await auditar({ organizacaoId: k.organizacao_id, usuarioId: equipe.id, acao: "admin.contrato.prorrogar", entidade: "contrato", entidadeId: contratoId, antes: { fim: k.fim }, depois: { fim: novoFim } });
  revalidatePath("/admin/contratos");
  return { ok: `Contrato prorrogado até ${novoFim.split("-").reverse().join("/")}.` };
}

/**
 * Exclui a conta de login (LGPD). Recusa se a pessoa tem contrato ativo ou é dona
 * de locadora. Contratos, evidências e auditoria ficam (obrigação legal); só o
 * acesso e os dados de login somem.
 */
export async function excluirConta(usuarioId: string, form: FormData): Promise<Resultado> {
  const equipe = await exigirEquipeAluguei();
  if (String(form.get("confirmar") ?? "").trim().toUpperCase() !== "EXCLUIR") return erro("Digite EXCLUIR para confirmar.");
  if (usuarioId === equipe.id) return erro("Você não pode excluir a sua própria conta aqui.");
  const admin = supabaseAdmin();
  const [{ data: dono }, { data: cadastros }] = await Promise.all([
    admin.from("membros").select("id").eq("usuario_id", usuarioId).eq("papel", "dono").limit(1),
    admin.from("locatarios").select("id").eq("usuario_id", usuarioId),
  ]);
  if (dono?.length) return erro("A pessoa é dona de uma locadora: transfira ou encerre a locadora antes.");
  if (cadastros?.length) {
    const { count } = await admin.from("contratos").select("id", { count: "exact", head: true }).in("locatario_id", cadastros.map((c) => c.id)).in("status", ["ativo", "assinado", "aguardando_assinatura"]);
    if (count) return erro("A pessoa tem contrato em andamento: encerre o contrato antes.");
  }
  const { data: u } = await admin.auth.admin.getUserById(usuarioId);
  // Exclusão suave do Supabase: some o login e os dados pessoais da conta.
  const { error } = await admin.auth.admin.deleteUser(usuarioId, true);
  if (error) return erro(error.message);
  await auditar({ organizacaoId: null, usuarioId: equipe.id, acao: "admin.usuario.excluir", entidade: "usuario", entidadeId: usuarioId, antes: { email: u.user?.email ?? null, telefone: u.user?.phone ?? null } });
  redirect("/admin/usuarios");
}

export type Publico = "todos" | "copiloto" | "locadores" | "motoristas_locadora" | "inativos";

/**
 * Aviso para muita gente de uma vez: entra no sino do app e vai por push (e por
 * e-mail para quem deixou). Cada envio tem uma chave própria por pessoa, então
 * repetir o mesmo envio não manda duas vezes.
 */
export async function enviarEmMassa(form: FormData): Promise<Resultado> {
  const equipe = await exigirEquipeAluguei();
  const titulo = String(form.get("titulo") ?? "").trim().slice(0, 80);
  const texto = String(form.get("texto") ?? "").trim().slice(0, 500);
  const link = String(form.get("link") ?? "").trim();
  const publico = String(form.get("publico") ?? "todos") as Publico;
  if (titulo.length < 3 || texto.length < 3) return erro("Escreva o título e o texto.");
  if (link && !link.startsWith("/")) return erro("O link precisa ser uma página do app, começando com /.");
  const admin = supabaseAdmin();
  const usuarios = await listarUsuarios();
  let alvo = usuarios.filter((u) => !u.bloqueado);
  if (publico === "copiloto") {
    const { data } = await admin.from("perfis_custo").select("usuario_id").limit(20_000);
    const s = new Set((data ?? []).map((x) => x.usuario_id));
    alvo = alvo.filter((u) => s.has(u.id));
  } else if (publico === "locadores") {
    const { data } = await admin.from("membros").select("usuario_id").limit(20_000);
    const s = new Set((data ?? []).map((x) => x.usuario_id));
    alvo = alvo.filter((u) => s.has(u.id));
  } else if (publico === "motoristas_locadora") {
    const { data } = await admin.from("locatarios").select("usuario_id").not("usuario_id", "is", null).limit(20_000);
    const s = new Set((data ?? []).map((x) => x.usuario_id));
    alvo = alvo.filter((u) => s.has(u.id));
  } else if (publico === "inativos") {
    const limite = new Date(Date.now() - 14 * 86_400_000).toISOString();
    alvo = alvo.filter((u) => (u.ultimoLogin ?? "") < limite);
  }
  const campanha = `massa:${Date.now().toString(36)}`;
  let enviados = 0;
  // Em lotes de 20, para não sobrecarregar o push.
  for (let i = 0; i < alvo.length; i += 20) {
    await Promise.all(
      alvo.slice(i, i + 20).map((u) =>
        notificar({ usuarioId: u.id, modelo: "admin.massa", titulo, texto, link: link || undefined, assunto: "novidades", chave: `${campanha}:${u.id}` }).then(() => enviados++),
      ),
    );
  }
  await auditar({ organizacaoId: null, usuarioId: equipe.id, acao: "admin.mensagem_massa", entidade: "notificacao", entidadeId: campanha, depois: { publico, titulo, texto, link, enviados } });
  revalidatePath("/admin/mensagens");
  return { ok: `Aviso enviado para ${enviados} pessoa${enviados === 1 ? "" : "s"}.` };
}
