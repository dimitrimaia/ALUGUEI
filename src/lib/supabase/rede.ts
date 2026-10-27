/**
 * fetch com uma nova tentativa quando a rede falha (conexão caiu, tempo esgotado)
 * ou o Supabase responde 502/503/504. Só para leituras e operações idempotentes:
 * GET/HEAD sempre; outros métodos só quando a falha foi antes de chegar ao servidor.
 */
export const fetchComRetentativa: typeof fetch = async (entrada, opcoes) => {
  const metodo = (opcoes?.method ?? "GET").toUpperCase();
  const leitura = metodo === "GET" || metodo === "HEAD";
  for (let tentativa = 0; ; tentativa++) {
    try {
      const r = await fetch(entrada, opcoes);
      if (leitura && tentativa === 0 && [502, 503, 504].includes(r.status)) {
        await new Promise((ok) => setTimeout(ok, 250));
        continue;
      }
      return r;
    } catch (e) {
      // TypeError = a requisição nem saiu/chegou (rede). Abortado de propósito: não repete.
      const deRede = e instanceof TypeError && !(opcoes?.signal?.aborted ?? false);
      if (tentativa >= 1 || !deRede) throw e;
      await new Promise((ok) => setTimeout(ok, 250));
    }
  }
};
