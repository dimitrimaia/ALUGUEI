import { type DataISO, somarMeses } from "../datas/data";

export interface RegrasElegibilidade {
  idadeMinimaAnos: number;
  tempoMinimoCnhAnos: number;
  /** Uber e 99 exigem a observação "Exerce Atividade Remunerada" na CNH. */
  exigirEar: boolean;
}

export const REGRAS_ELEGIBILIDADE_PADRAO: RegrasElegibilidade = {
  idadeMinimaAnos: 25,
  tempoMinimoCnhAnos: 3,
  exigirEar: true,
};

export interface DadosCandidato {
  dataNascimento: DataISO;
  /** Data da 1ª habilitação, impressa na CNH. A data de emissão muda a cada renovação. */
  cnhPrimeiraHabilitacao: DataISO;
  cnhValidade: DataISO;
  cnhTemEar: boolean;
  enviouComprovanteApp: boolean;
}

export type Pendencia =
  | "idade_minima"
  | "tempo_de_cnh"
  | "cnh_vencida"
  | "cnh_sem_ear"
  | "sem_comprovante_app";

/**
 * Pré-análise automática (RF-004, RF-005). Não aprova ninguém sozinha: o
 * resultado vai para a fila de análise, onde o locador decide e registra o
 * motivo (RF-022).
 */
export function preAnalisar(c: DadosCandidato, em: DataISO, regras = REGRAS_ELEGIBILIDADE_PADRAO): Pendencia[] {
  const pendencias: Pendencia[] = [];
  if (somarMeses(c.dataNascimento, regras.idadeMinimaAnos * 12) > em) pendencias.push("idade_minima");
  if (somarMeses(c.cnhPrimeiraHabilitacao, regras.tempoMinimoCnhAnos * 12) > em) pendencias.push("tempo_de_cnh");
  if (c.cnhValidade < em) pendencias.push("cnh_vencida");
  if (regras.exigirEar && !c.cnhTemEar) pendencias.push("cnh_sem_ear");
  if (!c.enviouComprovanteApp) pendencias.push("sem_comprovante_app");
  return pendencias;
}
