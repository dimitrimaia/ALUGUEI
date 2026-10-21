import { after } from "next/server";
import type { Json } from "@/db/tipos";
import { variantesTelefoneBR, lerWebhook } from "@/dominio/whatsapp/mensagens";
import { assinaturaValida, enviarTextoWhatsApp, marcarLidaWhatsApp, whatsappConfigurado } from "@/integracoes/whatsapp";
import { agenteLigado, humanoAssumiu, responderComAgente } from "@/lib/agente-suporte";
import { locadoraDoUsuario } from "@/lib/modos";
import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * Suporte pelo WhatsApp (Cloud API da Meta).
 * GET: a Meta confirma o endereço do webhook (hub.challenge).
 * POST: mensagens recebidas viram mensagens do atendimento, e o assistente responde pelo WhatsApp.
 */
export async function GET(request: Request) {
  const p = new URL(request.url).searchParams;
  if (p.get("hub.mode") === "subscribe" && p.get("hub.verify_token") && p.get("hub.verify_token") === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new Response(p.get("hub.challenge") ?? "", { status: 200 });
  }
  return new Response("não autorizado", { status: 403 });
}

export async function POST(request: Request) {
  if (!whatsappConfigurado()) return new Response("WhatsApp não configurado", { status: 503 });
  const cru = await request.text();
  if (!assinaturaValida(cru, request.headers.get("x-hub-signature-256"))) return new Response("assinatura inválida", { status: 401 });

  const corpo = JSON.parse(cru) as unknown;
  const admin = supabaseAdmin();
  for (const m of lerWebhook(corpo)) {
    // A Meta reenvia o mesmo evento se não responder rápido: cada mensagem é processada uma vez só.
    const { data: novo } = await admin
      .from("webhook_eventos")
      .upsert({ provedor: "whatsapp", evento_id: m.id, tipo: m.tipo, corpo: m as unknown as Json }, { onConflict: "provedor,evento_id", ignoreDuplicates: true })
      .select("id")
      .maybeSingle();
    if (!novo) continue;

    if (!m.texto) {
      await enviarTextoWhatsApp(m.de, "Por enquanto eu só consigo ler mensagens de texto. Pode escrever o que precisa?");
      continue;
    }

    const { data: usuarioId } = await admin.rpc("usuario_por_telefone" as never, { telefones: variantesTelefoneBR(m.de) } as never);
    const conta = (usuarioId as unknown as string | null) ?? null;

    // Continua o atendimento aberto deste número; senão, abre um novo.
    let { data: at } = await admin.from("atendimentos").select("*").eq("canal", "whatsapp").eq("telefone", m.de).neq("status", "encerrado").order("ultima_mensagem_em", { ascending: false }).limit(1).maybeSingle();
    if (!at) {
      const locadora = conta ? await locadoraDoUsuario(conta) : null;
      const { data } = await admin
        .from("atendimentos")
        .insert({ usuario_id: conta, canal: "whatsapp", telefone: m.de, modo: locadora ? "locador" : "motorista", organizacao_id: locadora?.id ?? null, assunto: m.nome ? `WhatsApp · ${m.nome}` : "WhatsApp" })
        .select("*")
        .single();
      at = data;
    }
    if (!at) continue;

    await admin.from("mensagens_suporte").insert({ atendimento_id: at.id, autor: "usuario", usuario_id: conta, texto: m.texto.slice(0, 4000) });
    await admin.from("atendimentos").update({ ultima_mensagem_em: new Date().toISOString(), status: "aberto", lido_usuario_em: new Date().toISOString() }).eq("id", at.id);
    await admin.from("webhook_eventos").update({ processado_em: new Date().toISOString() }).eq("id", novo.id);

    const atendimentoId = at.id;
    const { data: todas } = await admin.from("mensagens_suporte").select("autor, texto").eq("atendimento_id", atendimentoId);
    if (agenteLigado() && !humanoAssumiu(todas ?? [])) {
      after(async () => {
        await marcarLidaWhatsApp(m.id).catch(() => null);
        await responderComAgente(atendimentoId);
      });
    }
  }
  // Responder rápido: a Meta espera 200 em poucos segundos.
  return Response.json({ recebido: true });
}
