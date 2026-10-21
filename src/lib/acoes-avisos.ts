"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { notificar } from "./notificacoes";
import { exigirUsuario } from "./sessao";
import { supabaseAdmin } from "./supabase/admin";

const esquemaInscricao = z.object({ endpoint: z.string().url(), keys: z.object({ p256dh: z.string(), auth: z.string() }) });

/** Guarda o aparelho que aceitou receber notificações. */
export async function salvarInscricaoPush(inscricao: unknown): Promise<{ ok: boolean }> {
  const usuario = await exigirUsuario("/inicio");
  const d = esquemaInscricao.safeParse(inscricao);
  if (!d.success) return { ok: false };
  const dispositivo = (await headers()).get("user-agent")?.slice(0, 300) ?? null;
  const { error } = await supabaseAdmin()
    .from("inscricoes_push")
    .upsert({ usuario_id: usuario.id, endpoint: d.data.endpoint, p256dh: d.data.keys.p256dh, auth: d.data.keys.auth, dispositivo }, { onConflict: "endpoint" });
  return { ok: !error };
}

export async function removerInscricaoPush(endpoint: string) {
  const usuario = await exigirUsuario("/inicio");
  await supabaseAdmin().from("inscricoes_push").delete().eq("endpoint", endpoint).eq("usuario_id", usuario.id);
}

/** Aviso de teste, para a pessoa ver como chega. */
export async function avisoDeTeste() {
  const usuario = await exigirUsuario("/inicio");
  await notificar({ usuarioId: usuario.id, modelo: "teste", titulo: "Notificações ligadas", texto: "É assim que os avisos do Aluguei chegam neste aparelho.", link: "/inicio", assunto: "formal", chave: `teste:${usuario.id}:${Date.now()}` });
}

/** Marca como lidos os avisos (todos, ou um). */
export async function marcarAvisosLidos(id?: string) {
  const usuario = await exigirUsuario("/inicio");
  let q = supabaseAdmin().from("notificacoes").update({ lida_em: new Date().toISOString() }).eq("destinatario_usuario_id", usuario.id).eq("canal", "app").is("lida_em", null);
  if (id) q = q.eq("id", id);
  await q;
  revalidatePath("/", "layout");
}
