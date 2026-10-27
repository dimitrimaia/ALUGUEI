import { z } from "zod";
import { type DataISO, data, diasEntre, somarDias, somarMeses } from "../datas/data";
import { arredondar, type Centavos } from "../dinheiro/centavos";

/**
 * Carro alugado FORA do Aluguei (locadora que não usa o app). O motorista copia
 * as condições do contrato dele, e o app avisa vistoria, pagamento, prazo,
 * km do mês e troca de óleo, e mostra quanto custa sair agora.
 *
 * Dinheiro em centavos, percentuais em bps (5000 = 50%), km inteiros.
 */

export type LeituraKm = { dia: DataISO; km: number };
export type Pergunta = { texto: string; resposta: string };

export type AluguelExterno = {
  locadora: string;
  telefoneLocadora: string;
  numeroContrato: string;
  modelo: string;
  placa: string;
  /** Primeiro dia com o carro; os pagamentos semanais contam daqui. */
  inicio: DataISO;
  /** Prazo mínimo (sair antes dele tem multa). 0 = sem prazo mínimo. */
  prazoMinimoDias: number;
  valorSemanal: Centavos;
  /** Multa por sair antes do prazo, sobre as semanas que faltam. */
  multaRescisaoBps: number;
  /** Outra multa fixa que o contrato prevê por descumprimento (pode somar). */
  multaDescumprimento: Centavos;
  /** Aviso prévio para sair depois do prazo mínimo. */
  avisoSaidaDias: number;
  /** Limite de km por mês (0 = livre) e preço de cada km a mais. */
  kmLimiteMensal: number;
  valorKmExcedente: Centavos;
  /** Km do painel no dia da retirada (começo da contagem). */
  kmInicial: number | null;
  caucao: Centavos;
  /** Dias para a locadora devolver a caução depois da entrega. */
  devolucaoCaucaoDias: number;
  /** Vistoria obrigatória a cada N dias (0 = não tem). */
  vistoriaCadaDias: number;
  ultimaVistoria: DataISO | null;
  trocaOleoCadaKm: number | null;
  ultimaTrocaOleoKm: number | null;
  franquiaRoubo: Centavos;
  franquiaColisao: Centavos;
  franquiaTerceiros: Centavos;
  /** Acréscimo que a locadora cobra sobre cada multa de trânsito. */
  acrescimoMultaBps: number;
  /** Valor da nota promissória (null = em branco ou não informado). */
  valorPromissoria: Centavos | null;
  /** Dia em que devolveu o carro (encerra os avisos e conta a caução). */
  devolucao: DataISO | null;
  leituras: LeituraKm[];
  perguntas: Pergunta[];
  observacoes: string;
};

const dataISO = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).transform((s) => data(s));
const centavos = z.number().int().min(0).max(100_000_000);
const km = z.number().int().min(0).max(5_000_000);
const texto = (max: number) => z.string().trim().max(max).catch("");

const esquema = z.object({
  locadora: z.string().trim().min(1).max(80),
  telefoneLocadora: texto(30),
  numeroContrato: texto(40),
  modelo: texto(80),
  placa: z.string().trim().toUpperCase().max(10).catch(""),
  inicio: dataISO,
  prazoMinimoDias: z.number().int().min(0).max(3650).catch(0),
  valorSemanal: centavos,
  multaRescisaoBps: z.number().int().min(0).max(10_000).catch(0),
  multaDescumprimento: centavos.catch(0),
  avisoSaidaDias: z.number().int().min(0).max(90).catch(0),
  kmLimiteMensal: km.catch(0),
  valorKmExcedente: centavos.catch(0),
  kmInicial: km.nullable().catch(null),
  caucao: centavos.catch(0),
  devolucaoCaucaoDias: z.number().int().min(0).max(365).catch(30),
  vistoriaCadaDias: z.number().int().min(0).max(365).catch(0),
  ultimaVistoria: dataISO.nullable().catch(null),
  trocaOleoCadaKm: km.nullable().catch(null),
  ultimaTrocaOleoKm: km.nullable().catch(null),
  franquiaRoubo: centavos.catch(0),
  franquiaColisao: centavos.catch(0),
  franquiaTerceiros: centavos.catch(0),
  acrescimoMultaBps: z.number().int().min(0).max(10_000).catch(0),
  valorPromissoria: centavos.nullable().catch(null),
  devolucao: dataISO.nullable().catch(null),
  leituras: z.array(z.object({ dia: dataISO, km })).max(400).catch([]),
  perguntas: z.array(z.object({ texto: z.string().trim().min(1).max(200), resposta: texto(500) })).max(30).catch([]),
  observacoes: texto(2000),
});

/** Lê o que veio da conta ou do formulário. Sem locadora, valor ou início válidos, não há aluguel. */
export function normalizarAluguel(entrada: unknown): AluguelExterno | null {
  const r = esquema.safeParse(entrada);
  if (!r.success) return null;
  const a = r.data;
  // Leituras em ordem e uma por dia (a última do dia vale).
  const porDia = new Map(a.leituras.map((l) => [l.dia, l.km]));
  a.leituras = [...porDia].map(([dia, k]) => ({ dia, km: k })).sort((x, y) => x.dia.localeCompare(y.dia)).slice(-400);
  return a;
}

/** Próximo pagamento semanal (pré-pago, no mesmo dia da semana do início). Hoje conta. */
export function proximoPagamento(a: AluguelExterno, hoje: DataISO): DataISO {
  if (hoje <= a.inicio) return a.inicio;
  const resto = diasEntre(a.inicio, hoje) % 7;
  return resto === 0 ? hoje : somarDias(hoje, 7 - resto);
}

/** Próxima vistoria: a cada N dias desde a última (ou desde o início). */
export function proximaVistoria(a: AluguelExterno): DataISO | null {
  if (a.vistoriaCadaDias <= 0) return null;
  return somarDias(a.ultimaVistoria ?? a.inicio, a.vistoriaCadaDias);
}

export function fimPrazoMinimo(a: AluguelExterno): DataISO | null {
  return a.prazoMinimoDias > 0 ? somarDias(a.inicio, a.prazoMinimoDias) : null;
}

/**
 * Quanto custa devolver o carro hoje. Antes do prazo mínimo: a multa (bps) sobre
 * as semanas que faltam (semana começada conta inteira). Depois: nada, só o aviso.
 */
export function custoParaSair(a: AluguelExterno, hoje: DataISO): { multa: Centavos; semanasRestantes: number; multaExtraPossivel: Centavos; dentroDoPrazo: boolean } {
  const fim = fimPrazoMinimo(a);
  if (!fim || hoje >= fim) return { multa: 0, semanasRestantes: 0, multaExtraPossivel: 0, dentroDoPrazo: false };
  const semanasRestantes = Math.ceil(diasEntre(hoje, fim) / 7);
  return { multa: arredondar((semanasRestantes * a.valorSemanal * a.multaRescisaoBps) / 10_000), semanasRestantes, multaExtraPossivel: a.multaDescumprimento, dentroDoPrazo: true };
}

/** Ciclo mensal da quilometragem: do dia do mês do início até a véspera do mesmo dia no mês seguinte. */
export function cicloDoMes(a: AluguelExterno, hoje: DataISO): { de: DataISO; ate: DataISO } {
  let k = Math.max(0, (Number(hoje.slice(0, 4)) - Number(a.inicio.slice(0, 4))) * 12 + Number(hoje.slice(5, 7)) - Number(a.inicio.slice(5, 7)));
  while (k > 0 && somarMeses(a.inicio, k) > hoje) k--;
  return { de: somarMeses(a.inicio, k), ate: somarDias(somarMeses(a.inicio, k + 1), -1) };
}

/**
 * Km rodados no ciclo e a projeção até o fim dele, pelas leituras do painel.
 * A base é a última leitura antes do ciclo (ou o km da retirada, no primeiro
 * ciclo); sem base, conta da primeira leitura do ciclo.
 */
export function kmDoCiclo(a: AluguelExterno, leituras: LeituraKm[], hoje: DataISO) {
  const { de, ate } = cicloDoMes(a, hoje);
  const ordenadas = [...leituras].filter((l) => l.dia <= hoje).sort((x, y) => x.dia.localeCompare(y.dia) || x.km - y.km);
  const antes = ordenadas.filter((l) => l.dia < de).at(-1);
  const dentro = ordenadas.filter((l) => l.dia >= de);
  const base = antes?.km ?? (de === a.inicio && a.kmInicial !== null ? a.kmInicial : dentro[0]?.km ?? null);
  const atual = ordenadas.at(-1)?.km ?? a.kmInicial;
  const rodados = base !== null && atual !== null ? Math.max(0, atual - base) : 0;
  const diasCiclo = diasEntre(de, ate) + 1;
  const diasPassados = Math.min(diasCiclo, diasEntre(de, hoje) + 1);
  const projecao = diasPassados > 0 ? Math.round((rodados * diasCiclo) / diasPassados) : rodados;
  const limite = a.kmLimiteMensal;
  const excedenteProjetado = limite > 0 ? Math.max(0, projecao - limite) : 0;
  return {
    de,
    ate,
    rodados,
    projecao,
    limite,
    kmAtual: atual,
    excedente: limite > 0 ? Math.max(0, rodados - limite) : 0,
    custoExcedenteProjetado: arredondar(excedenteProjetado * a.valorKmExcedente),
    /** Quanto dá para rodar por dia até o fim do ciclo sem passar do limite. */
    porDiaRestante: limite > 0 ? Math.max(0, Math.floor((limite - rodados) / Math.max(1, diasCiclo - diasPassados + 1))) : null,
  };
}

/** Km que faltam para a próxima troca de óleo (negativo = passou). */
export function trocaDeOleo(a: AluguelExterno, kmAtual: number | null): { proximaKm: number; faltam: number } | null {
  if (!a.trocaOleoCadaKm || kmAtual === null) return null;
  const ultima = a.ultimaTrocaOleoKm ?? a.kmInicial;
  if (ultima === null) return null;
  const proximaKm = ultima + a.trocaOleoCadaKm;
  return { proximaKm, faltam: proximaKm - kmAtual };
}

export type Lembrete = { chave: string; titulo: string; texto: string; nivel: "info" | "alerta" | "perigo"; quando: DataISO };

const reais = (c: Centavos) => `R$ ${(c / 100).toLocaleString("pt-BR", { minimumFractionDigits: c % 100 ? 2 : 0, maximumFractionDigits: 2 })}`;

/**
 * Avisos do dia (para o painel e para a rotina diária). Cada um tem chave
 * própria, ligada à data do evento, para sair uma vez só.
 */
export function lembretesDoDia(a: AluguelExterno, hoje: DataISO, leituras: LeituraKm[] = a.leituras): Lembrete[] {
  if (a.devolucao) {
    const caucao = somarDias(a.devolucao, a.devolucaoCaucaoDias);
    return a.caucao > 0 && hoje === caucao
      ? [{ chave: `caucao:${caucao}`, titulo: "Caução: prazo de devolução", texto: `Hoje acaba o prazo para a ${a.locadora} devolver a caução de ${reais(a.caucao)} e a nota promissória.`, nivel: "alerta", quando: caucao }]
      : [];
  }
  const l: Lembrete[] = [];
  const pagamento = proximoPagamento(a, hoje);
  const diasPag = diasEntre(hoje, pagamento);
  if (diasPag <= 1) l.push({ chave: `pagamento:${pagamento}`, titulo: diasPag === 0 ? "Aluguel vence hoje" : "Aluguel vence amanhã", texto: `${reais(a.valorSemanal)} para a ${a.locadora}. Atrasar um dia pode bloquear o carro.`, nivel: diasPag === 0 ? "perigo" : "alerta", quando: pagamento });

  const vistoria = proximaVistoria(a);
  if (vistoria) {
    const d = diasEntre(hoje, vistoria);
    if (d < 0) l.push({ chave: `vistoria:${vistoria}:atrasada:${hoje}`, titulo: "Vistoria atrasada", texto: `Era para ${vistoria.split("-").reverse().join("/")}. Sem ela, a locadora pode bloquear o carro. Quando fizer, marque no app.`, nivel: "perigo", quando: vistoria });
    else if (d <= 2) l.push({ chave: `vistoria:${vistoria}:${d}`, titulo: d === 0 ? "Vistoria é hoje" : `Vistoria em ${d} dia${d > 1 ? "s" : ""}`, texto: `Vistoria obrigatória a cada ${a.vistoriaCadaDias} dias na ${a.locadora}. Leve o carro limpo e tire fotos.`, nivel: d === 0 ? "perigo" : "alerta", quando: vistoria });
  }

  const fim = fimPrazoMinimo(a);
  if (fim) {
    const d = diasEntre(hoje, fim);
    if (d === 7 || d === 0) l.push({ chave: `prazo:${fim}:${d}`, titulo: d === 0 ? "Acabou o prazo mínimo" : "Prazo mínimo acaba em 7 dias", texto: d === 0 ? `Desde hoje dá para devolver o carro sem a multa de ${a.multaRescisaoBps / 100}%, avisando com ${a.avisoSaidaDias} dias.` : `Em ${fim.split("-").reverse().join("/")} o contrato fica livre de multa. Pense se continua.`, nivel: "info", quando: fim });
  }

  const k = kmDoCiclo(a, leituras, hoje);
  if (k.limite > 0 && k.custoExcedenteProjetado > 0) l.push({ chave: `km:${k.de}:${Math.floor(k.projecao / 500)}`, titulo: "Vai passar do limite de km", texto: `No ritmo de agora, ${k.projecao.toLocaleString("pt-BR")} km no mês (limite ${k.limite.toLocaleString("pt-BR")}): cerca de ${reais(k.custoExcedenteProjetado)} a mais. Até ${k.porDiaRestante} km/dia fica dentro.`, nivel: "alerta", quando: hoje });

  const oleo = trocaDeOleo(a, k.kmAtual);
  if (oleo && oleo.faltam <= 500) l.push({ chave: `oleo:${oleo.proximaKm}:${oleo.faltam <= 0 ? "passou" : "perto"}`, titulo: oleo.faltam <= 0 ? "Troca de óleo passou" : "Troca de óleo chegando", texto: oleo.faltam <= 0 ? `Passou ${-oleo.faltam} km da troca. O contrato pode cobrar por km rodado além dela: avise a locadora hoje.` : `Faltam ${oleo.faltam} km. Combine com a locadora antes de passar.`, nivel: oleo.faltam <= 0 ? "perigo" : "alerta", quando: hoje });
  return l;
}

/** Perguntas que vale fazer à locadora quando o contrato deixa dúvida. */
export const PERGUNTAS_SUGERIDAS = [
  "Qual o valor máximo da nota promissória?",
  "A cada quantos km é a troca de óleo, e onde faço?",
  "A data de início do contrato é a da retirada do carro?",
  "Qual o horário e o local da vistoria quinzenal?",
] as const;
