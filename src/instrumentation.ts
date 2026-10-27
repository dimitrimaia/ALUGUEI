import type { Instrumentation } from "next";

/**
 * Todo erro do servidor (tela, ação ou rota) fica registrado em erros_app com a
 * mensagem real, para diagnóstico. Nunca derruba nada: falhou, só ignora.
 */
export const onRequestError: Instrumentation.onRequestError = async (erro, pedido, contexto) => {
  try {
    if (process.env.NEXT_RUNTIME !== "nodejs") return;
    const e = erro as Error & { digest?: string };
    // Redirecionamento e "não encontrado" não são erro.
    if (e.digest?.startsWith("NEXT_REDIRECT") || e.digest?.startsWith("NEXT_HTTP_ERROR_FALLBACK")) return;
    const { supabaseAdmin } = await import("@/lib/supabase/admin");
    await supabaseAdmin()
      .from("erros_app")
      .insert({
        origem: "servidor",
        mensagem: `${e.name}: ${e.message}`.slice(0, 1000),
        digest: e.digest ?? null,
        caminho: pedido.path.slice(0, 300),
        detalhe: { tipo: contexto.routeType, rota: contexto.routePath, metodo: pedido.method, pilha: e.stack?.split("\n").slice(0, 8).join("\n") ?? null, agente: pedido.headers["user-agent"] ?? null },
      });
  } catch {}
};
