/** Valida CPF pelos dígitos verificadores. Aceita com ou sem máscara. */
export function cpfValido(entrada: string): boolean {
  const d = entrada.replace(/\D/g, "");
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  const digito = (ate: number) => {
    let soma = 0;
    for (let i = 0; i < ate; i++) soma += Number(d[i]) * (ate + 1 - i);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };
  return digito(9) === Number(d[9]) && digito(10) === Number(d[10]);
}

export function formatarCpf(entrada: string): string {
  const d = entrada.replace(/\D/g, "");
  return d.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4");
}

/** Placa antiga (ABC1234) ou Mercosul (ABC1D23), normalizada sem traço e em maiúsculas. */
export function normalizarPlaca(entrada: string): string | null {
  const p = entrada.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return /^[A-Z]{3}\d[A-Z0-9]\d{2}$/.test(p) ? p : null;
}

export function formatarPlaca(placa: string): string {
  return /^[A-Z]{3}\d{4}$/.test(placa) ? `${placa.slice(0, 3)}-${placa.slice(3)}` : placa;
}

/**
 * RENAVAM: 11 dígitos (os antigos, de 9, ganham zeros à esquerda), com dígito
 * verificador. Pega digitação errada antes de mandar o carro para verificação.
 */
export function renavamValido(entrada: string): boolean {
  let d = entrada.replace(/\D/g, "");
  if (d.length === 9) d = d.padStart(11, "0");
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  const pesos = [3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const soma = pesos.reduce((s, p, i) => s + p * Number(d[i]), 0);
  const dv = (soma * 10) % 11;
  return (dv === 10 ? 0 : dv) === Number(d[10]);
}
