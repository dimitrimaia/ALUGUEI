import "server-only";
import { normalizarPreferencias } from "@/dominio/conta/preferencias";
import { enviarEmail } from "@/integracoes/email";
import { enviarPush } from "@/integracoes/push";
import { supabaseAdmin } from "./supabase/admin";

/** Assunto do aviso, para respeitar as preferências da pessoa. "formal" não pode ser desligado. */
export type AssuntoAviso = "lembretes" | "mensagens" | "novidades" | "formal";

export interface Aviso {
  usuarioId: string;
  organizacaoId?: string | null;
  contratoId?: string | null;
  /** Identifica o tipo do aviso (ex.: checkin.aberto, chat.mensagem). */
  modelo: string;
  titulo: string;
  texto: string;
  link?: string;
  assunto: AssuntoAviso;
  /** Idempotência: o mesmo aviso nunca sai duas vezes. */
  chave: string;
  /** Pede e-mail mesmo com push ligado (cobranças e avisos formais). */
  porEmail?: boolean;
}

/**
 * Registra o aviso no app e entrega pelos canais que a pessoa escolheu:
 * notificação no celular (push) e e-mail. WhatsApp entra com a API da Meta.
 * Nunca derruba quem chamou: falhas ficam registradas na própria notificação.
 */
export async function notificar(a: Aviso): Promise<void> {
  try {
    const admin = supabaseAdmin();
    const base = { organizacao_id: a.organizacaoId ?? null, contrato_id: a.contratoId ?? null, destinatario_usuario_id: a.usuarioId, formal: a.assunto === "formal", modelo: a.modelo, titulo: a.titulo, texto: a.texto, link: a.link ?? null };
    const { data: novo } = await admin.from("notificacoes").upsert({ ...base, canal: "app", chave: `${a.chave}:app`, enviada_em: new Date().toISOString() }, { onConflict: "chave", ignoreDuplicates: true }).select("id");
    if (!novo?.length) return; // já avisado

    const { data: u } = await admin.auth.admin.getUserById(a.usuarioId);
    const prefs = normalizarPreferencias(u.user?.user_metadata?.preferencias);
    const permitido = a.assunto === "formal" || prefs.assuntos[a.assunto];
    if (!permitido) return;

    if (prefs.canais.push) {
      const { data: aparelhos } = await admin.from("inscricoes_push").select("*").eq("usuario_id", a.usuarioId);
      for (const ap of aparelhos ?? []) {
        const r = await enviarPush(ap, { titulo: a.titulo, texto: a.texto, link: a.link, chave: a.chave });
        if (r.expirada) await admin.from("inscricoes_push").delete().eq("id", ap.id);
        await admin.from("notificacoes").upsert({ ...base, canal: "push", chave: `${a.chave}:push:${ap.id}`, enviada_em: r.ok ? new Date().toISOString() : null, falha: r.erro ?? null }, { onConflict: "chave", ignoreDuplicates: true });
      }
    }

    const email = u.user?.email;
    if (email && prefs.canais.email && (a.porEmail || a.assunto === "formal")) {
      const r = await enviarEmail({ para: email, assunto: a.titulo, texto: a.texto, link: a.link, chave: a.chave });
      await admin.from("notificacoes").upsert({ ...base, canal: "email", chave: `${a.chave}:email`, provedor_id: r.id ?? null, enviada_em: r.id ? new Date().toISOString() : null, falha: r.erro ?? null }, { onConflict: "chave", ignoreDuplicates: true });
    }
  } catch (e) {
    console.error("notificar", a.chave, e);
  }
}

/** Avisa todos da equipe de um locador. */
export async function notificarEquipe(organizacaoId: string, a: Omit<Aviso, "usuarioId" | "organizacaoId">) {
  const { data: membros } = await supabaseAdmin().from("membros").select("usuario_id").eq("organizacao_id", organizacaoId);
  await Promise.all((membros ?? []).map((m) => notificar({ ...a, organizacaoId, usuarioId: m.usuario_id, chave: `${a.chave}:${m.usuario_id}` })));
}

/** Usuário do motorista de um contrato (quem aceitou o cadastro). */
export async function usuarioDoContrato(contratoId: string): Promise<string | null> {
  const admin = supabaseAdmin();
  const { data: c } = await admin.from("contratos").select("locatario_id").eq("id", contratoId).single();
  if (!c) return null;
  const { data: l } = await admin.from("locatarios").select("usuario_id").eq("id", c.locatario_id).single();
  return l?.usuario_id ?? null;
}

export async function avisosNaoLidos(usuarioId: string): Promise<number> {
  const { count } = await supabaseAdmin().from("notificacoes").select("id", { count: "exact", head: true }).eq("destinatario_usuario_id", usuarioId).eq("canal", "app").is("lida_em", null);
  return count ?? 0;
}
