import { usuarioAtual } from "@/lib/sessao";
import { supabaseAdmin } from "@/lib/supabase/admin";

/** Erros vistos na tela do app (o servidor registra os dele em instrumentation.ts). */
export async function POST(request: Request) {
  try {
    const corpo = (await request.json()) as { mensagem?: string; digest?: string; caminho?: string; tentativa?: number };
    const usuario = await usuarioAtual().catch(() => null);
    await supabaseAdmin()
      .from("erros_app")
      .insert({
        origem: "tela",
        mensagem: String(corpo.mensagem ?? "sem mensagem").slice(0, 1000),
        digest: corpo.digest?.slice(0, 100) ?? null,
        caminho: String(corpo.caminho ?? "").slice(0, 300),
        usuario_id: usuario?.id ?? null,
        detalhe: { tentativa: corpo.tentativa ?? 0, agente: request.headers.get("user-agent") },
      });
  } catch {}
  return new Response(null, { status: 204 });
}
