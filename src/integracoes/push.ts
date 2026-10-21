import "server-only";
import webpush from "web-push";

let configurado = false;

/** Notificação no celular (Web Push, padrão aberto: sem custo por mensagem). */
export async function enviarPush(inscricao: { endpoint: string; p256dh: string; auth: string }, d: { titulo: string; texto: string; link?: string; chave: string }): Promise<{ ok: boolean; expirada?: boolean; erro?: string }> {
  const publica = process.env.VAPID_PUBLIC_KEY;
  const privada = process.env.VAPID_PRIVATE_KEY;
  if (!publica || !privada) return { ok: false, erro: "VAPID não configurado" };
  if (!configurado) {
    webpush.setVapidDetails("mailto:suporte@aluguei.xyz", publica, privada);
    configurado = true;
  }
  try {
    await webpush.sendNotification(
      { endpoint: inscricao.endpoint, keys: { p256dh: inscricao.p256dh, auth: inscricao.auth } },
      JSON.stringify({ titulo: d.titulo, texto: d.texto, link: d.link ?? "/inicio", tag: d.chave }),
      { TTL: 60 * 60 * 24, urgency: "normal" },
    );
    return { ok: true };
  } catch (e) {
    const status = (e as { statusCode?: number }).statusCode;
    return { ok: false, expirada: status === 404 || status === 410, erro: String((e as Error).message ?? e) };
  }
}
