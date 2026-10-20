import { type Centavos, arredondar, percentual } from "../dinheiro/centavos";
import { type DataISO, diasEntre } from "../datas/data";
import type { ParametrosContrato } from "./parametros";

export interface Encargos {
  diasAtraso: number;
  multa: Centavos;
  juros: Centavos;
  total: Centavos;
}

/**
 * Multa e juros de mora sobre um débito (cláusula 3.6, RF-054).
 * Juros simples pro rata die sobre mês de 30 dias. A correção monetária
 * depende da série do índice e entra quando a fonte do índice for definida.
 */
export function calcularEncargos(
  principal: Centavos,
  vencimento: DataISO,
  pagamento: DataISO,
  encargos: ParametrosContrato["encargos"],
): Encargos {
  const diasAtraso = Math.max(0, diasEntre(vencimento, pagamento));
  if (diasAtraso === 0) return { diasAtraso, multa: 0, juros: 0, total: 0 };

  const multa = percentual(principal, encargos.multaBps);
  const juros = arredondar((principal * encargos.jurosMensaisBps * diasAtraso) / (10_000 * 30));
  return { diasAtraso, multa, juros, total: multa + juros };
}
