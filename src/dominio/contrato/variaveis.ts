import { type DataISO, diaDaSemana, diasEntre, formatarData, mesesEntre, somarMeses, type DiaDaSemana } from "../datas/data";
import { type Centavos, formatarBRL } from "../dinheiro/centavos";
import { numeroPorExtenso, reaisPorExtenso } from "../dinheiro/por-extenso";
import type { ParametrosContrato } from "./parametros";

const DIAS = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];

export function nomeDiaDaSemana(d: DiaDaSemana): string {
  return DIAS[d]!;
}

export function valorComExtenso(valor: Centavos): string {
  return `${formatarBRL(valor).replace(/ /g, " ")} (${reaisPorExtenso(valor)})`;
}

export function quantidade(n: number, singular: string, plural: string): string {
  return `${n.toLocaleString("pt-BR")} (${numeroPorExtenso(n)}) ${n === 1 ? singular : plural}`;
}

/** 500 bps → "5% (cinco por cento)". Frações aparecem só no número. */
export function percentualPorExtenso(bps: number): string {
  const p = bps / 100;
  const numero = p.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
  return Number.isInteger(p) ? `${numero}% (${numeroPorExtenso(p)} por cento)` : `${numero}%`;
}

export function listaPtBr(itens: string[]): string {
  if (itens.length <= 1) return itens.join("");
  return `${itens.slice(0, -1).join("; ")} e ${itens.at(-1)}`;
}

const INDICES: Record<string, string> = { IGPM: "IGP-M/FGV", IPCA: "IPCA/IBGE", INPC: "INPC/IBGE", nenhum: "índice oficial que vier a ser acordado" };

/** "3 (três) meses", ou "2 (dois) meses e 5 (cinco) dias" quando não fecha em meses. */
function prazoPorExtenso(inicio: DataISO, fim: DataISO): string {
  const meses = mesesEntre(inicio, fim);
  const dias = diasEntre(somarMeses(inicio, meses), fim);
  const partes = [meses && quantidade(meses, "mês", "meses"), dias && quantidade(dias, "dia", "dias")].filter(Boolean);
  return partes.join(" e ");
}

export interface PartesContrato {
  locador: { nome: string; documento: string; cidade: string; uf: string };
  locatario: { nome: string; cpf: string; cnh: string; endereco: string };
  veiculo: { modelo: string; placa: string; ano: string; cor: string; renavam: string; odometro: number };
}

function documentoFormatado(doc: string): string {
  const d = doc.replace(/\D/g, "");
  if (d.length === 11) return `CPF ${d.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4")}`;
  if (d.length === 14) return `CNPJ ${d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5")}`;
  return doc;
}

/** Todas as variáveis do modelo, derivadas dos MESMOS dados que geram a agenda e as cobranças. */
export function variaveisDoContrato(p: ParametrosContrato, partes: PartesContrato, emissao: DataISO): Record<string, string> {
  const { locador, locatario, veiculo } = partes;
  return {
    locador_qualificacao: `${locador.nome}, inscrito no ${documentoFormatado(locador.documento)}, com sede em ${locador.cidade}/${locador.uf}`,
    locatario_qualificacao: `${locatario.nome}, inscrito no ${documentoFormatado(locatario.cpf)}, portador da CNH nº ${locatario.cnh}, residente em ${locatario.endereco}`,
    veiculo_descricao: [veiculo.modelo, veiculo.ano && `ano ${veiculo.ano}`, veiculo.cor && `cor ${veiculo.cor}`, `placa ${veiculo.placa}`, veiculo.renavam && `Renavam ${veiculo.renavam}`]
      .filter(Boolean)
      .join(", "),
    veiculo_odometro: quantidade(veiculo.odometro, "quilômetro", "quilômetros"),
    prazo: prazoPorExtenso(p.inicio, p.fim),
    data_inicio: formatarData(p.inicio),
    data_fim: formatarData(p.fim),
    aluguel_semanal: valorComExtenso(p.aluguelSemanal),
    dia_vencimento: nomeDiaDaSemana(p.diaVencimento),
    primeiro_vencimento: `${formatarData(p.inicio)} (${nomeDiaDaSemana(diaDaSemana(p.inicio))})`,
    multa_mora: percentualPorExtenso(p.encargos.multaBps),
    juros_mora: `${percentualPorExtenso(p.encargos.jurosMensaisBps)} ao mês`,
    indice_correcao: INDICES[p.encargos.indiceCorrecao]!,
    indice_reajuste: INDICES[p.reajuste.indice]!,
    reajuste_meses: quantidade(p.reajuste.aCadaMeses, "mês", "meses"),
    caucao_total: valorComExtenso(p.caucao.total),
    caucao_parcelas: listaPtBr(p.caucao.parcelas.map((x) => `${valorComExtenso(x.valor)} em ${formatarData(x.vencimento)}`)),
    prazo_devolucao_caucao: quantidade(p.prazos.diasUteisDevolucaoCaucao, "dia útil", "dias úteis"),
    franquia_km: quantidade(p.km.franquiaMensal, "quilômetro", "quilômetros"),
    valor_km_excedente: valorComExtenso(p.km.valorExcedente),
    dia_checkin: nomeDiaDaSemana(p.checkin.diaSemana),
    area_circulacao: p.areaCirculacao,
    revisao_km: quantidade(p.manutencao.revisaoACadaKm, "quilômetro", "quilômetros"),
    taxa_administracao_multa: percentualPorExtenso(p.taxaAdministracaoMultaBps),
    dias_inadimplencia: quantidade(p.prazos.diasParaInadimplencia, "dia", "dias"),
    horas_regularizar: quantidade(p.prazos.horasParaRegularizar, "hora", "horas"),
    horas_aviso_protesto: quantidade(p.prazos.horasAvisoProtesto, "hora", "horas"),
    foro: `${locador.cidade}/${locador.uf}`,
    cidade_assinatura: `${locador.cidade}/${locador.uf}`,
    data_emissao: formatarData(emissao),
  };
}
