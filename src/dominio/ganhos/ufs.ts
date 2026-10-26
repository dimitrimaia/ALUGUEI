export const UFS = ["AC", "AL", "AM", "AP", "BA", "CE", "DF", "ES", "GO", "MA", "MG", "MS", "MT", "PA", "PB", "PE", "PI", "PR", "RJ", "RN", "RO", "RR", "RS", "SC", "SE", "SP", "TO"] as const;
export type UF = (typeof UFS)[number];

/** "são  paulo" → "São Paulo"? Não: só limpa espaços; a busca ignora acento e maiúscula. */
export const limparCidade = (s: string) => s.trim().replace(/\s+/g, " ").slice(0, 60);
