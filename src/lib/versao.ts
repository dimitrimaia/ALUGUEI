"use client";

/** Erro de "versão trocada": a tela é de uma publicação antiga e o servidor já é outro. */
export function erroDeVersao(e: unknown): boolean {
  const m = e instanceof Error ? `${e.name} ${e.message}` : String(e);
  return /Server Action|Failed to find|ChunkLoadError|Loading chunk|Failed to fetch dynamically imported module|deployment/i.test(m);
}

/** Recarrega uma vez só (evita laço se o erro for outro). */
export function recarregarUmaVez(): boolean {
  try {
    const chave = "aluguei_recarregou";
    const ultimo = Number(sessionStorage.getItem(chave) ?? 0);
    if (Date.now() - ultimo < 30_000) return false;
    sessionStorage.setItem(chave, String(Date.now()));
  } catch {}
  window.location.reload();
  return true;
}

/**
 * Roda uma ação do servidor e devolve a mensagem de erro em vez de derrubar a
 * tela. Se for troca de versão, recarrega a página (a ação pode ser refeita).
 */
export async function acaoSegura<T>(f: () => Promise<T>): Promise<T | { erro: string }> {
  try {
    return await f();
  } catch (e) {
    if (erroDeVersao(e) && recarregarUmaVez()) return { erro: "Atualizando o app…" };
    return { erro: "Não foi possível salvar agora. Confira a internet e tente de novo." };
  }
}
