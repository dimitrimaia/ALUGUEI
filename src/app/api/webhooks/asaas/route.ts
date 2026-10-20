import { timingSafeEqual } from "node:crypto";
import type { Json } from "@/db/tipos";
import { conciliar } from "@/lib/cobrancas";
import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * Avisos de pagamento do Asaas (RNF-033):
 *  1. confere o token do cabeçalho;
 *  2. grava o evento (índice único = deduplicação);
 *  3. relê a cobrança na API com a chave do locador (não confia no corpo) e aplica no extrato.
 */
export async function POST(request: Request) {
  const esperado = process.env.ASAAS_WEBHOOK_TOKEN;
  const recebido = request.headers.get("asaas-access-token");
  if (!esperado || !recebido || !iguais(esperado, recebido)) {
    return new Response("não autorizado", { status: 401 });
  }

  const corpo = (await request.json()) as { id?: string; event?: string; payment?: { id?: string } };
  if (!corpo.id || !corpo.event) return Response.json({ ignorado: true });

  const admin = supabaseAdmin();
  const { data: evento } = await admin
    .from("webhook_eventos")
    .upsert({ provedor: "asaas", evento_id: corpo.id, tipo: corpo.event, corpo: corpo as Json }, { onConflict: "provedor,evento_id", ignoreDuplicates: true })
    .select("id")
    .maybeSingle();
  if (!evento) return Response.json({ duplicado: true });

  try {
    if (corpo.payment?.id) {
      const { data: cob } = await admin.from("cobrancas").select("*").eq("provedor", "asaas").eq("provedor_id", corpo.payment.id).maybeSingle();
      if (cob) await conciliar(cob);
    }
    await admin.from("webhook_eventos").update({ processado_em: new Date().toISOString() }).eq("id", evento.id);
  } catch (e) {
    // Responde 200 mesmo assim: o evento fica gravado com o erro e a conciliação diária refaz.
    await admin.from("webhook_eventos").update({ erro: String(e).slice(0, 500) }).eq("id", evento.id);
  }
  return Response.json({ recebido: true });
}

function iguais(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
