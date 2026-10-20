/** "São João del-Rei" → "sao joao del-rei": chave de busca sem acento nem caixa. */
export function normalizarCidade(cidade: string): string {
  return cidade.normalize("NFD").replace(/\p{Diacritic}/gu, "").trim().replace(/\s+/g, " ").toLowerCase();
}

/** Mensagem pronta do primeiro contato. */
export function mensagemDeInteresse(modelo: string): string {
  return `Olá! Tenho interesse no ${modelo}. Ainda está disponível?`;
}

/** Placa parcial para a busca pública: só as três letras. */
export function placaParcial(placa: string): string {
  return `${placa.slice(0, 3)}-****`;
}
