/**
 * Preferências da conta (RF-130 a RF-135, ver docs/conta-e-configuracoes.md).
 * Ficam nos metadados do usuário no Supabase Auth; este módulo valida e
 * completa com os padrões o que vier de lá, que é editável pelo próprio usuário.
 */

export type Tema = "claro" | "escuro" | "auto";
export type Canal = "whatsapp" | "email" | "push";
export type Assunto = "lembretes" | "mensagens" | "novidades";

export interface Preferencias {
  tema: Tema;
  canais: Record<Canal, boolean>;
  assuntos: Record<Assunto, boolean>;
}

export const PREFERENCIAS_PADRAO: Preferencias = {
  tema: "claro",
  canais: { whatsapp: true, email: true, push: true },
  assuntos: { lembretes: true, mensagens: true, novidades: false },
};

function booleanos<K extends string>(valor: unknown, padrao: Record<K, boolean>): Record<K, boolean> {
  const origem = valor && typeof valor === "object" ? (valor as Record<string, unknown>) : {};
  const saida = { ...padrao };
  for (const k of Object.keys(padrao) as K[]) if (typeof origem[k] === "boolean") saida[k] = origem[k] as boolean;
  return saida;
}

/** Lê preferências de uma fonte não confiável, ignorando chaves e valores desconhecidos. */
export function normalizarPreferencias(valor: unknown): Preferencias {
  const p = valor && typeof valor === "object" ? (valor as Record<string, unknown>) : {};
  const tema = p.tema === "escuro" || p.tema === "auto" || p.tema === "claro" ? p.tema : PREFERENCIAS_PADRAO.tema;
  const canais = booleanos(p.canais, PREFERENCIAS_PADRAO.canais);
  // Pelo menos um canal fica ligado: sem nenhum, a pessoa perderia lembretes de pagamento.
  if (!Object.values(canais).some(Boolean)) canais.email = true;
  return { tema, canais, assuntos: booleanos(p.assuntos, PREFERENCIAS_PADRAO.assuntos) };
}

/** Nome de exibição: o informado, senão a parte do e-mail antes do @. */
export function nomeDeExibicao(nome: unknown, email: string | null, telefone: string | null): string {
  if (typeof nome === "string" && nome.trim()) return nome.trim().replace(/\s+/g, " ").slice(0, 60);
  if (email) return email.split("@")[0]!;
  return telefone ? `Celular final ${telefone.slice(-4)}` : "Sua conta";
}

export function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  const letras = partes.length > 1 ? partes[0]![0]! + partes[partes.length - 1]![0]! : (partes[0] ?? "A").slice(0, 2);
  return letras.toUpperCase();
}
