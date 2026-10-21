/** Regras puras do chat de suporte com o assistente (sem banco, sem rede). */

export const MARCA_TRANSFERENCIA = "Transferido para a equipe";

export interface MensagemSuporte {
  autor: string;
  texto: string;
}

/** Uma pessoa da equipe já assumiu (respondeu ou recebeu a transferência): o assistente não responde mais. */
export function humanoAssumiu(mensagens: readonly MensagemSuporte[]): boolean {
  return mensagens.some((m) => m.autor === "equipe" || (m.autor === "sistema" && m.texto.startsWith(MARCA_TRANSFERENCIA)));
}

/**
 * Histórico para o modelo: a pessoa é "user"; o assistente e a equipe são
 * "assistant" (a equipe marcada como tal). Avisos do sistema ficam de fora, e
 * mensagens seguidas do mesmo lado viram uma só.
 */
export function historicoParaModelo(mensagens: readonly MensagemSuporte[]): { role: "user" | "assistant"; content: string }[] {
  const saida: { role: "user" | "assistant"; content: string }[] = [];
  for (const m of mensagens) {
    if (m.autor === "sistema") continue;
    const role = m.autor === "usuario" ? "user" : "assistant";
    const texto = m.autor === "equipe" ? `[Resposta de uma pessoa da equipe] ${m.texto}` : m.texto;
    const ultima = saida.at(-1);
    if (ultima?.role === role) ultima.content += `\n\n${texto}`;
    else saida.push({ role, content: texto });
  }
  // O modelo precisa começar por uma mensagem da pessoa.
  while (saida[0]?.role === "assistant") saida.shift();
  return saida;
}
