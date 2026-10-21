import "server-only";

/**
 * Gemini (Google AI Studio) pela API REST, com chamada de ferramentas.
 * Tem nível gratuito (com limite por minuto e por dia). Atenção: no nível
 * gratuito o Google pode usar o conteúdo para melhorar os produtos dele.
 * Chave em aistudio.google.com → Get API key. Variável: GEMINI_API_KEY.
 */

export type FerramentaGemini = { name: string; description: string; parameters?: Record<string, unknown> };
type Parte = { text?: string; thought?: boolean; functionCall?: { name: string; args?: Record<string, unknown> }; functionResponse?: { name: string; response: Record<string, unknown> } };
type Conteudo = { role: "user" | "model"; parts: Parte[] };

export function geminiConfigurado() {
  return Boolean(process.env.GEMINI_API_KEY);
}

/** O Gemini aceita só parte do JSON Schema: tira o que ele recusa e omite objeto sem campos. */
export function paraFerramentaGemini(f: { name: string; description?: string; input_schema: Record<string, unknown> }): FerramentaGemini {
  const limpar = (s: unknown): unknown => {
    if (Array.isArray(s)) return s.map(limpar);
    if (!s || typeof s !== "object") return s;
    return Object.fromEntries(Object.entries(s).filter(([k]) => k !== "additionalProperties" && k !== "strict").map(([k, v]) => [k, limpar(v)]));
  };
  const props = (f.input_schema.properties ?? {}) as Record<string, unknown>;
  return { name: f.name, description: f.description ?? "", ...(Object.keys(props).length ? { parameters: limpar(f.input_schema) as Record<string, unknown> } : {}) };
}

/**
 * Laço de conversa com ferramentas: chama o modelo, executa as ferramentas que
 * ele pedir e repete até ele responder em texto (ou acabar as voltas).
 */
export async function conversarComGemini(opcoes: {
  modelo: string;
  sistema: string;
  historico: { role: "user" | "assistant"; content: string }[];
  ferramentas: FerramentaGemini[];
  executar: (nome: string, args: Record<string, unknown>) => Promise<unknown>;
  maxVoltas: number;
}): Promise<{ texto: string; bloqueado: boolean }> {
  const conteudos: Conteudo[] = opcoes.historico.map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] }));
  let texto = "";
  for (let volta = 0; volta < opcoes.maxVoltas; volta++) {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${opcoes.modelo}:generateContent`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY ?? "" },
      body: JSON.stringify({ systemInstruction: { parts: [{ text: opcoes.sistema }] }, contents: conteudos, tools: [{ functionDeclarations: opcoes.ferramentas }] }),
    });
    if (!r.ok) throw new Error(`Gemini ${r.status}: ${(await r.text()).slice(0, 300)}`);
    const corpo = (await r.json()) as { candidates?: { content?: { parts?: Parte[] }; finishReason?: string }[]; promptFeedback?: { blockReason?: string } };
    const c = corpo.candidates?.[0];
    if (!c || corpo.promptFeedback?.blockReason || c.finishReason === "SAFETY" || c.finishReason === "PROHIBITED_CONTENT") return { texto: "", bloqueado: true };
    const partes = c.content?.parts ?? [];
    conteudos.push({ role: "model", parts: partes });
    texto = partes.filter((p) => p.text && !p.thought).map((p) => p.text).join("\n").trim() || texto;
    const chamadas = partes.filter((p) => p.functionCall);
    if (!chamadas.length) break;
    const respostas: Parte[] = [];
    for (const p of chamadas) {
      const { name, args } = p.functionCall!;
      let resultado: unknown;
      try {
        resultado = await opcoes.executar(name, args ?? {});
      } catch {
        resultado = { erro: "Não foi possível consultar agora." };
      }
      respostas.push({ functionResponse: { name, response: { resultado } } });
    }
    conteudos.push({ role: "user", parts: respostas });
  }
  return { texto, bloqueado: false };
}
