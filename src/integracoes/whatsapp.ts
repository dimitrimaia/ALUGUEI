import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { paraWhatsApp } from "@/dominio/whatsapp/mensagens";

/**
 * WhatsApp Cloud API (Meta). Variáveis:
 * - WHATSAPP_TOKEN: token permanente do usuário do sistema (Business Manager);
 * - WHATSAPP_PHONE_NUMBER_ID: id do número que envia (não é o número em si);
 * - WHATSAPP_APP_SECRET: chave secreta do app, para conferir a assinatura do webhook;
 * - WHATSAPP_VERIFY_TOKEN: texto que você inventa e repete na tela do webhook da Meta;
 * - WHATSAPP_API_VERSION (opcional): versão da Graph API.
 */
const versao = () => process.env.WHATSAPP_API_VERSION ?? "v23.0";

export function whatsappConfigurado() {
  return Boolean(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID && process.env.WHATSAPP_APP_SECRET);
}

/** Confere o cabeçalho X-Hub-Signature-256 (HMAC SHA-256 do corpo cru com a chave secreta do app). */
export function assinaturaValida(corpoCru: string, assinatura: string | null): boolean {
  const segredo = process.env.WHATSAPP_APP_SECRET;
  if (!segredo || !assinatura?.startsWith("sha256=")) return false;
  const esperado = Buffer.from(`sha256=${createHmac("sha256", segredo).update(corpoCru, "utf8").digest("hex")}`);
  const recebido = Buffer.from(assinatura);
  return esperado.length === recebido.length && timingSafeEqual(esperado, recebido);
}

async function graph(caminho: string, corpo: unknown): Promise<{ ok: true; id?: string } | { ok: false; erro: string; codigo?: number }> {
  const r = await fetch(`https://graph.facebook.com/${versao()}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/${caminho}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`, "content-type": "application/json" },
    body: JSON.stringify(corpo),
  });
  const j = (await r.json().catch(() => ({}))) as { messages?: { id: string }[]; error?: { message?: string; code?: number } };
  return r.ok ? { ok: true, id: j.messages?.[0]?.id } : { ok: false, erro: j.error?.message ?? `HTTP ${r.status}`, codigo: j.error?.code };
}

/**
 * Texto livre: só dentro de 24 h da última mensagem da pessoa. Fora disso a Meta
 * recusa (código 131047) e é preciso um modelo aprovado (enviarModeloWhatsApp).
 */
export function enviarTextoWhatsApp(para: string, texto: string) {
  return graph("messages", { messaging_product: "whatsapp", recipient_type: "individual", to: para, type: "text", text: { body: paraWhatsApp(texto), preview_url: false } });
}

/** Modelo aprovado no WhatsApp Manager (avisos fora da janela de 24 h). */
export function enviarModeloWhatsApp(para: string, modelo: string, parametros: string[], idioma = "pt_BR") {
  return graph("messages", {
    messaging_product: "whatsapp",
    to: para,
    type: "template",
    template: { name: modelo, language: { code: idioma }, components: parametros.length ? [{ type: "body", parameters: parametros.map((t) => ({ type: "text", text: t })) }] : [] },
  });
}

/** Marca como lida (os dois tiques azuis) e mostra "digitando…" enquanto o agente responde. */
export function marcarLidaWhatsApp(mensagemId: string) {
  return graph("messages", { messaging_product: "whatsapp", status: "read", message_id: mensagemId, typing_indicator: { type: "text" } });
}
