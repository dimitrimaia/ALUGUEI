import { z } from "zod";

/**
 * Preferências do Copiloto (bolha e cartão no Android). Ficam na conta
 * (perfis_custo.preferencias) e são entregues ao app pelo plugin em configurar().
 */

export const CAMPOS_CARTAO = ["porKm", "porHora", "lucro", "lucroHora", "lucroPct", "valor", "porMin", "nota", "tempoTotal", "distanciaTotal", "busca", "volta"] as const;
export type CampoCartao = (typeof CAMPOS_CARTAO)[number];
export const NOME_CAMPO: Record<CampoCartao, string> = {
  porKm: "R$/km",
  porHora: "R$/hora",
  lucro: "Lucro (R$)",
  lucroHora: "Lucro por hora",
  lucroPct: "Lucro %",
  valor: "Valor da corrida",
  porMin: "R$/min",
  nota: "Nota do passageiro",
  tempoTotal: "Tempo total",
  distanciaTotal: "Distância total",
  busca: "Até o passageiro",
  volta: "Volta para a base",
};

export type Base = { nome: string; lat: number; lon: number } | null;

export type PreferenciasCopiloto = {
  /** Campos do cartão, na ordem (máximo 6; os 3 primeiros são os grandes). */
  campos: CampoCartao[];
  tamanhoFonte: "p" | "m" | "g";
  /** Segundos na tela (Uber e 99; no inDrive fica enquanto a oferta estiver aberta). */
  segundosCartao: number;
  /** Opacidade da bolha (30 a 100). */
  opacidadeBolha: number;
  tema: "app" | "claro" | "escuro";
  vibrar: boolean;
  /** Fala o resultado ("verde, 2 reais e 10 por km"). */
  voz: boolean;
  /** Bip curto só na corrida boa. */
  bip: boolean;
  /** Pergunta "Você aceitou?" depois da oferta, para o histórico ficar certo. */
  perguntarAceite: boolean;
  /** Mensagem pronta para o passageiro: {saudacao}, {nome}, {tempo}. */
  mensagem: string;
  /** Casa ou ponto preferido, para o custo da volta. Null: usa a localização do momento. */
  base: Base;
  /** O leitor dorme quando o app de corrida está offline ou fechado. */
  economia: boolean;
};

export const MENSAGEM_PADRAO = "{saudacao}, {nome}! Já estou a caminho e chego em aproximadamente {tempo}. Por gentileza, me aguarde no local de embarque.";

export const PREFERENCIAS_PADRAO: PreferenciasCopiloto = {
  campos: ["porKm", "porHora", "lucro", "nota", "tempoTotal", "distanciaTotal"],
  tamanhoFonte: "m",
  segundosCartao: 12,
  opacidadeBolha: 100,
  tema: "app",
  vibrar: true,
  voz: false,
  bip: true,
  perguntarAceite: true,
  mensagem: MENSAGEM_PADRAO,
  base: null,
  economia: true,
};

const esquema = z.object({
  campos: z
    .array(z.enum(CAMPOS_CARTAO))
    .min(1)
    .catch(PREFERENCIAS_PADRAO.campos)
    .transform((l) => [...new Set(l)].slice(0, 6)),
  tamanhoFonte: z.enum(["p", "m", "g"]).catch("m"),
  segundosCartao: z.coerce.number().int().min(4).max(120).catch(12),
  opacidadeBolha: z.coerce.number().int().min(30).max(100).catch(100),
  tema: z.enum(["app", "claro", "escuro"]).catch("app"),
  vibrar: z.boolean().catch(true),
  voz: z.boolean().catch(false),
  bip: z.boolean().catch(true),
  perguntarAceite: z.boolean().catch(true),
  mensagem: z.string().trim().min(3).max(300).catch(MENSAGEM_PADRAO),
  base: z
    .object({ nome: z.string().trim().min(1).max(120), lat: z.number().min(-90).max(90), lon: z.number().min(-180).max(180) })
    .nullable()
    .catch(null),
  economia: z.boolean().catch(true),
});

export function normalizarPreferenciasCopiloto(entrada: unknown): PreferenciasCopiloto {
  const r = esquema.safeParse(entrada ?? {});
  return r.success ? r.data : PREFERENCIAS_PADRAO;
}

/** "Bom dia/Boa tarde/Boa noite" pela hora de Brasília. */
export function saudacao(hora: number): string {
  return hora >= 5 && hora < 12 ? "Bom dia" : hora >= 12 && hora < 18 ? "Boa tarde" : "Boa noite";
}

/** Preenche a mensagem pronta (o Android usa a mesma regra). */
export function montarMensagem(modelo: string, d: { hora: number; nome?: string | null; minutos?: number | null }): string {
  const tempo = d.minutos != null ? `${Math.max(1, Math.round(d.minutos))} min` : "poucos minutos";
  return modelo
    .replaceAll("{saudacao}", saudacao(d.hora))
    .replaceAll("{nome}", d.nome?.trim() || "tudo bem")
    .replaceAll("{tempo}", tempo)
    .replace(/,\s*tudo bem!/, ", tudo bem?");
}
