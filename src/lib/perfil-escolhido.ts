/** Lembra se a pessoa escolheu ver o Aluguei como locador ou motorista (só neste aparelho). */
export type PerfilEscolhido = "locador" | "motorista";
const CHAVE = "aluguei:perfil";

export function lerPerfilEscolhido(): PerfilEscolhido | null {
  try {
    const v = localStorage.getItem(CHAVE);
    return v === "locador" || v === "motorista" ? v : null;
  } catch {
    return null;
  }
}

export function salvarPerfilEscolhido(p: PerfilEscolhido) {
  try {
    localStorage.setItem(CHAVE, p);
  } catch {
    // Navegação privada ou armazenamento bloqueado: segue sem lembrar.
  }
}
