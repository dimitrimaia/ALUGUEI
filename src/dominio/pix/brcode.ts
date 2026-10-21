/**
 * Pix direto, sem gateway: gera o "copia e cola" (BR Code, padrão EMV do Banco
 * Central) de um Pix estático com valor, para a chave do próprio locador. Não
 * tem custo, mas também não tem aviso automático de pagamento: o locador confere
 * na conta dele e dá baixa.
 */

export type TipoChavePix = "cpf" | "cnpj" | "email" | "celular" | "aleatoria";

/**
 * Normaliza a chave como o DICT espera e diz o tipo. Retorna null se não for uma
 * chave válida. 11 dígitos sem "+" são lidos como CPF; celular vem com +55.
 */
export function normalizarChavePix(entrada: string): { chave: string; tipo: TipoChavePix } | null {
  const t = entrada.trim();
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(t)) return { chave: t.toLowerCase(), tipo: "aleatoria" };
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t) && t.length <= 77) return { chave: t.toLowerCase(), tipo: "email" };
  const d = t.replace(/\D/g, "");
  if (t.startsWith("+")) return d.length >= 12 && d.length <= 13 ? { chave: `+${d}`, tipo: "celular" } : null;
  if (d.length === 14 && !/[a-z]/i.test(t)) return { chave: d, tipo: "cnpj" };
  if (d.length === 11) return { chave: d, tipo: "cpf" };
  return null;
}

/** Celular como chave: +55 + DDD + número. */
export function chaveDeCelular(entrada: string): string | null {
  const d = entrada.replace(/\D/g, "").replace(/^55(?=\d{11}$)/, "");
  return d.length === 11 && d[2] === "9" ? `+55${d}` : null;
}

function campo(id: string, valor: string): string {
  return `${id}${String(valor.length).padStart(2, "0")}${valor}`;
}

/** Sem acentos e só com caracteres que todo banco aceita. */
function limpar(texto: string, maximo: number): string {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9 .\-]/g, "").trim().slice(0, maximo);
}

/** CRC16-CCITT (polinômio 0x1021, início 0xFFFF), exigido no campo 63. */
export function crc16(texto: string): string {
  let crc = 0xffff;
  for (const byte of new TextEncoder().encode(texto)) {
    crc ^= byte << 8;
    for (let i = 0; i < 8; i++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

export function gerarBRCode(d: { chave: string; nome: string; cidade: string; valorCentavos?: number; txid?: string; descricao?: string }): string {
  const conta = campo("00", "br.gov.bcb.pix") + campo("01", d.chave) + (d.descricao ? campo("02", limpar(d.descricao, 40)) : "");
  const txid = d.txid ? d.txid.replace(/[^A-Za-z0-9]/g, "").slice(0, 25) || "***" : "***";
  const corpo =
    campo("00", "01") +
    campo("26", conta) +
    campo("52", "0000") +
    campo("53", "986") +
    (d.valorCentavos ? campo("54", (d.valorCentavos / 100).toFixed(2)) : "") +
    campo("58", "BR") +
    campo("59", limpar(d.nome, 25) || "LOCADOR") +
    campo("60", limpar(d.cidade, 15) || "BRASIL") +
    campo("62", campo("05", txid)) +
    "6304";
  return corpo + crc16(corpo);
}
