"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { z } from "zod";
import type { Linha } from "@/db/tipos";
import { enviarEmail } from "@/integracoes/email";
import { dentroDaJanela } from "@/dominio/whatsapp/mensagens";
import { enviarTextoWhatsApp } from "@/integracoes/whatsapp";
import { agenteLigado, humanoAssumiu, responderComAgente } from "./agente-suporte";
import { emailsDaEquipe } from "./equipe-aluguei";
import { locadoraDoUsuario } from "./modos";
import { notificar } from "./notificacoes";
import { exigirUsuario } from "./sessao";
import { ASSUNTOS_SUPORTE, acessoAtendimento } from "./suporte";
import { supabaseAdmin } from "./supabase/admin";

const RESPOSTA_AUTOMATICA = "Recebemos a sua mensagem. Alguém da equipe do Aluguei responde por aqui em horário comercial, em dias úteis. Você recebe um aviso quando chegar a resposta.";

async function avisarEquipe(atendimentoId: string, titulo: string, texto: string) {
  // Por enquanto a equipe recebe por e-mail; quando houver agentes, eles leem a mesma fila.
  for (const para of emailsDaEquipe()) await enviarEmail({ para, assunto: titulo, texto, link: `/admin/suporte/${atendimentoId}`, chave: `suporte:${atendimentoId}:${Date.now()}:${para}` });
}

export type EstadoNovoAtendimento = { erro?: string };

export async function abrirAtendimento(modo: "motorista" | "locador", _: EstadoNovoAtendimento, form: FormData): Promise<EstadoNovoAtendimento> {
  const usuario = await exigirUsuario(modo === "locador" ? "/painel/suporte" : "/m/suporte");
  const lido = z.object({ assunto: z.enum(ASSUNTOS_SUPORTE), texto: z.string().trim().min(5, "Conte um pouco mais").max(2000) }).safeParse(Object.fromEntries(form));
  if (!lido.success) return { erro: lido.error.issues[0]?.message ?? "Escolha o assunto e escreva a mensagem." };
  const admin = supabaseAdmin();
  const locadora = modo === "locador" ? await locadoraDoUsuario(usuario.id) : null;
  const { data: at, error } = await admin.from("atendimentos").insert({ usuario_id: usuario.id, modo, organizacao_id: locadora?.id ?? null, assunto: lido.data.assunto, lido_usuario_em: new Date().toISOString() }).select("id").single();
  if (error || !at) return { erro: "Não foi possível abrir o atendimento. Tente de novo." };
  await admin.from("mensagens_suporte").insert({ atendimento_id: at.id, autor: "usuario", usuario_id: usuario.id, texto: lido.data.texto });
  if (agenteLigado()) {
    // O assistente responde em segundos; a equipe só entra se ele transferir.
    after(() => responderComAgente(at.id));
  } else {
    await admin.from("mensagens_suporte").insert({ atendimento_id: at.id, autor: "sistema", texto: RESPOSTA_AUTOMATICA });
    await avisarEquipe(at.id, `Suporte: ${lido.data.assunto}`, `${usuario.email ?? usuario.telefone} (${modo}): ${lido.data.texto}`);
  }
  redirect(`${modo === "locador" ? "/painel" : "/m"}/suporte/${at.id}`);
}

export async function enviarMensagemSuporte(atendimentoId: string, texto: string, lado: "usuario" | "equipe"): Promise<{ mensagem?: Linha<"mensagens_suporte">; erro?: string }> {
  const acesso = await acessoAtendimento(atendimentoId, lado);
  if (!acesso) return { erro: "Atendimento não encontrado." };
  const limpo = texto.trim().slice(0, 2000);
  if (!limpo) return { erro: "Escreva uma mensagem." };
  const admin = supabaseAdmin();
  const agora = new Date().toISOString();
  const { data, error } = await admin.from("mensagens_suporte").insert({ atendimento_id: atendimentoId, autor: lado, usuario_id: acesso.usuarioId, texto: limpo }).select("*").single();
  if (error || !data) return { erro: "Não foi possível enviar." };
  await admin
    .from("atendimentos")
    .update({ ultima_mensagem_em: agora, status: lado === "equipe" ? "respondido" : "aberto", ...(lado === "equipe" ? { lido_equipe_em: agora } : { lido_usuario_em: agora }) })
    .eq("id", atendimentoId);
  const a = acesso.atendimento;
  if (lado === "equipe" && a.canal === "whatsapp" && a.telefone) {
    // Resposta da equipe a quem escreveu pelo WhatsApp: vai pelo WhatsApp.
    const { data: ultima } = await admin.from("mensagens_suporte").select("criado_em").eq("atendimento_id", atendimentoId).eq("autor", "usuario").order("criado_em", { ascending: false }).limit(1).maybeSingle();
    const envio = ultima && dentroDaJanela(new Date(ultima.criado_em)) ? await enviarTextoWhatsApp(a.telefone, limpo) : { ok: false as const, erro: "Passaram mais de 24 h da última mensagem da pessoa: a Meta só aceita um modelo aprovado." };
    if (!envio.ok) await admin.from("mensagens_suporte").insert({ atendimento_id: atendimentoId, autor: "sistema", texto: `Não foi entregue no WhatsApp: ${envio.erro}` });
  } else if (lado === "equipe" && a.usuario_id) {
    await notificar({ usuarioId: a.usuario_id, organizacaoId: a.organizacao_id, modelo: "suporte.resposta", titulo: "O suporte respondeu", texto: limpo.length > 120 ? `${limpo.slice(0, 117)}…` : limpo, link: `${a.modo === "locador" ? "/painel" : "/m"}/suporte/${atendimentoId}`, assunto: "mensagens", porEmail: true, chave: `suporte:${data.id}` });
  } else {
    const { data: todas } = await admin.from("mensagens_suporte").select("autor, texto").eq("atendimento_id", atendimentoId);
    if (agenteLigado() && !humanoAssumiu(todas ?? [])) after(() => responderComAgente(atendimentoId));
    else await avisarEquipe(atendimentoId, `Suporte: nova mensagem (${a.assunto})`, limpo);
  }
  return { mensagem: data };
}

export async function mensagensSuporteDesde(atendimentoId: string, desde: string, lado: "usuario" | "equipe"): Promise<Linha<"mensagens_suporte">[]> {
  const acesso = await acessoAtendimento(atendimentoId, lado);
  if (!acesso) return [];
  const admin = supabaseAdmin();
  const { data } = await admin.from("mensagens_suporte").select("*").eq("atendimento_id", atendimentoId).gt("criado_em", desde).order("criado_em");
  if (data?.length) await admin.from("atendimentos").update(lado === "equipe" ? { lido_equipe_em: new Date().toISOString() } : { lido_usuario_em: new Date().toISOString() }).eq("id", atendimentoId);
  return data ?? [];
}

export async function encerrarAtendimento(atendimentoId: string, lado: "usuario" | "equipe") {
  const acesso = await acessoAtendimento(atendimentoId, lado);
  if (!acesso) return;
  const admin = supabaseAdmin();
  await admin.from("atendimentos").update({ status: "encerrado" }).eq("id", atendimentoId);
  await admin.from("mensagens_suporte").insert({ atendimento_id: atendimentoId, autor: "sistema", texto: lado === "equipe" ? "Atendimento encerrado pela equipe. Se precisar, é só escrever de novo por aqui." : "Você encerrou o atendimento." });
  revalidatePath("/m/suporte");
  revalidatePath("/painel/suporte");
  revalidatePath("/admin/suporte");
}
