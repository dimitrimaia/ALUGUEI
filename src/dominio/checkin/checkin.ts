import { type DataISO, diasEntre } from "../datas/data";

/**
 * Check-in semanal (RF-070 a RF-073): no dia combinado no contrato, o motorista
 * manda as fotos do painel (km e combustível), da vareta de óleo e do líquido
 * de arrefecimento, e um vídeo dando a volta no carro.
 */
export const ITENS_CHECKIN = [
  { id: "painel", tipo: "foto", rotulo: "Painel ligado", dica: "Com o km e o marcador de combustível legíveis" },
  { id: "oleo", tipo: "foto", rotulo: "Vareta do óleo", dica: "Puxe a vareta, limpe, recoloque e fotografe o nível" },
  { id: "arrefecimento", tipo: "foto", rotulo: "Líquido de arrefecimento", dica: "O reservatório com o nível entre MIN e MAX (motor frio)" },
  { id: "video", tipo: "video", rotulo: "Volta no carro", dica: "Um vídeo curto andando ao redor do carro, sem cortes" },
] as const;

export type IdItemCheckin = (typeof ITENS_CHECKIN)[number]["id"];

/** Dá para fazer o check-in a partir da véspera do dia combinado. */
export const ANTECEDENCIA_DIAS = 1;

export type SituacaoCheckin = "futuro" | "aberto" | "atrasado" | "feito";

export function situacaoCheckin(vencimento: DataISO, hoje: DataISO, feito: boolean): SituacaoCheckin {
  if (feito) return "feito";
  const dias = diasEntre(hoje, vencimento); // positivo: ainda falta
  if (dias > ANTECEDENCIA_DIAS) return "futuro";
  return dias < 0 ? "atrasado" : "aberto";
}

export function diasDeAtraso(vencimento: DataISO, hoje: DataISO): number {
  return Math.max(0, diasEntre(vencimento, hoje));
}

/**
 * O km informado não pode ser menor que o último conhecido. Uma semana com mais
 * de 5.000 km é quase certamente erro de digitação: pede confirmação.
 */
export function conferirKm(informado: number, ultimo: number): { ok: true; alerta?: string } | { ok: false; erro: string } {
  if (!Number.isInteger(informado) || informado <= 0) return { ok: false, erro: "Informe o km que aparece no painel." };
  if (informado < ultimo) return { ok: false, erro: `O km não pode ser menor que o último registrado (${ultimo.toLocaleString("pt-BR")} km).` };
  if (informado - ultimo > 5000) return { ok: true, alerta: `São ${(informado - ultimo).toLocaleString("pt-BR")} km desde o último registro. Confira se digitou certo.` };
  return { ok: true };
}

/** Itens que ainda faltam para concluir o check-in. */
export function faltandoNoCheckin(evidencias: Partial<Record<IdItemCheckin, string>>): IdItemCheckin[] {
  return ITENS_CHECKIN.map((i) => i.id).filter((id) => !evidencias[id]);
}
