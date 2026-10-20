import { timingSafeEqual } from "node:crypto";

/**
 * Webhook do Asaas. Fluxo (RNF-033):
 *  1. valida o token do cabeçalho;
 *  2. grava o evento em webhook_eventos (índice único = deduplicação);
 *  3. responde 200 rápido e processa a baixa num job do Inngest.
 */
export async function POST(request: Request) {
  const esperado = process.env.ASAAS_WEBHOOK_TOKEN;
  const recebido = request.headers.get("asaas-access-token");
  if (!esperado || !recebido || !iguais(esperado, recebido)) {
    return new Response("não autorizado", { status: 401 });
  }

  const corpo: unknown = await request.json();
  // TODO(semana 7): insert em webhook_eventos ON CONFLICT DO NOTHING e
  // inngest.send({ name: "pagamento/webhook-recebido", data: { id } }).
  void corpo;
  return Response.json({ recebido: true });
}

function iguais(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
