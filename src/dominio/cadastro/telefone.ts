/**
 * Normaliza um celular brasileiro para E.164 (+55DDD9XXXXXXXX), o formato do
 * login por OTP e do WhatsApp. Retorna null se não for um celular válido.
 */
export function normalizarCelular(entrada: string): string | null {
  let digitos = entrada.replace(/\D/g, "");
  if (digitos.startsWith("55") && digitos.length === 13) digitos = digitos.slice(2);
  if (digitos.startsWith("0")) digitos = digitos.slice(1);
  if (digitos.length !== 11) return null;
  const ddd = Number(digitos.slice(0, 2));
  if (ddd < 11 || ddd > 99 || digitos[2] !== "9") return null;
  return `+55${digitos}`;
}
