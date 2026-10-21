import "server-only";

/**
 * E-mail transacional pelo Resend (domínio aluguei.xyz já verificado).
 * Sem RESEND_API_KEY, não envia e avisa quem chamou (o aviso fica só no app).
 */
export async function enviarEmail(d: { para: string; assunto: string; texto: string; link?: string; chave: string }): Promise<{ id?: string; erro?: string }> {
  const chave = process.env.RESEND_API_KEY;
  if (!chave) return { erro: "RESEND_API_KEY não configurada" };
  const site = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://aluguei.xyz").replace(/\/$/, "");
  const botao = d.link ? `<p><a href="${site}${d.link}" style="display:inline-block;background:#1f56e8;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:bold">Abrir no Aluguei</a></p>` : "";
  const html = `<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;color:#0b1630"><p style="font-size:20px;font-weight:bold;color:#1f56e8;letter-spacing:2px">ALUGUEI</p><p style="font-size:17px;font-weight:bold">${escapar(d.assunto)}</p><p>${escapar(d.texto)}</p>${botao}<p style="color:#5b6880;font-size:12px">Você recebe este e-mail porque tem conta no Aluguei. Escolha os avisos em Conta → Notificações.</p></div>`;
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${chave}`, "content-type": "application/json", "Idempotency-Key": d.chave.slice(0, 256) },
    body: JSON.stringify({ from: process.env.EMAIL_REMETENTE ?? "Aluguei <avisos@aluguei.xyz>", to: [d.para], subject: d.assunto, html, text: `${d.texto}${d.link ? `\n\n${site}${d.link}` : ""}` }),
  });
  const corpo = (await r.json().catch(() => ({}))) as { id?: string; message?: string };
  return r.ok ? { id: corpo.id } : { erro: corpo.message ?? `HTTP ${r.status}` };
}

function escapar(t: string) {
  return t.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
}
