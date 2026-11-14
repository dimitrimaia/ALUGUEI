"use client";

import type { Criterios, PerfilCusto } from "@/dominio/ganhos/custos";
import type { PreferenciasCopiloto } from "@/dominio/ganhos/copiloto";

/**
 * Ponte com o app Android (Capacitor + plugin "Plantao", em android/.../plantao).
 * No navegador comum nada disso existe e as funções devolvem null: a tela
 * mostra a versão web (digitação) e o convite para o app.
 */

/** Aceite da declaração do Copiloto (localStorage). v3: inclui a leitura da imagem da tela na Uber. */
export const ACEITE_COPILOTO = "aluguei_semaforo_aceite_v3";

export type LeituraDiagnostico = { em: string; resultado: string; nos: number; textos: string[] };
export type EstadoNativo = { ultimaLeitura?: Record<string, LeituraDiagnostico> | null; versaoApp?: number; atualizavel?: boolean; ultimoErro?: string | null; localizacao?: boolean; dormindo?: boolean; android: boolean; sobreposicao: boolean; acessibilidade: boolean; notificacoes: boolean; semOtimizacaoBateria: boolean; ligado: boolean; configurado: boolean; corridasPendentes: number };
export type CorridaNativa = {
  /** UUID gerado no celular: chave de idempotência do envio. */
  id: string;
  app?: string | null;
  valor: number;
  kmCorrida: number;
  minutosCorrida?: number | null;
  kmBusca?: number | null;
  minutosBusca?: number | null;
  sinal: "verde" | "amarelo" | "vermelho";
  decisao?: "aceitei" | "recusei" | "sem_resposta" | null;
  /** Valor com que a corrida foi feita (contraproposta ou correção), em centavos. */
  valorFinal?: number | null;
  decisaoOrigem?: "toque" | "pergunta" | "automatica" | null;
  origem: "leitura" | "digitada";
  momento: string;
};

export type GravacaoNativa = { id: string; bytes: number; criadoEm: string; duracaoSeg: number | null; miniatura: string | null; emGravacao: boolean };
export type EstadoCamera = { gravando: boolean; desde?: string | null; arquivos?: number; usadoMb?: number };
type RespostaPermissao = { tipo: string; concedida: boolean; aberto: boolean };
type Ouvinte = { remove: () => Promise<void> | void };
type PluginPlantao = {
  estado(): Promise<EstadoNativo>;
  configurar(o: { perfil: PerfilCusto; criterios: Criterios; comunidade?: { nome: string; dia: number; noite: number }[]; segundosCartao?: number; tema?: "claro" | "escuro" | "auto"; vibrar?: boolean; preferencias?: PreferenciasCopiloto }): Promise<EstadoNativo>;
  pedirLocalizacao(): Promise<RespostaPermissao>;
  definirBaseAqui(): Promise<{ lat: number; lon: number }>;
  pedirCamera(): Promise<RespostaPermissao>;
  cameraIniciar(): Promise<EstadoCamera>;
  cameraParar(): Promise<EstadoCamera>;
  cameraEstado(): Promise<EstadoCamera>;
  /** Vídeos da câmera de segurança (APK novo; nos antigos, não existe). */
  gravacoes?(): Promise<{ gravacoes: GravacaoNativa[]; camera: EstadoCamera }>;
  abrirGravacao?(o: { id: string }): Promise<{ ok: boolean }>;
  compartilharGravacao?(o: { id: string }): Promise<{ ok: boolean }>;
  apagarGravacao?(o: { id: string }): Promise<{ ok: boolean }>;
  /** Perfil de régua escolhido na bolha e ainda não salvo na conta. */
  perfilPendente(): Promise<{ perfil: { nome: string; criterios: unknown } | null }>;
  limparPerfilPendente(): Promise<void>;
  /** Lugares marcados como "evitar" na bolha, ainda não levados para a conta. */
  lugaresAdicionados(): Promise<{ lugares: string[] }>;
  limparLugaresAdicionados(): Promise<void>;
  /** Régua mudada no menu da bolha e ainda não salva na conta. */
  reguaPendente(): Promise<{ regua: { minimoPorKm: number; minimoPorHora: number } | null }>;
  limparReguaPendente(): Promise<void>;
  pedirSobreposicao(): Promise<RespostaPermissao>;
  pedirAcessibilidade(): Promise<RespostaPermissao>;
  pedirNotificacoes(): Promise<RespostaPermissao>;
  pedirSemOtimizacaoBateria(): Promise<RespostaPermissao>;
  /** Rejeita com code "SEM_SOBREPOSICAO" ou "NAO_INICIOU". */
  ligar(): Promise<EstadoNativo>;
  desligar(): Promise<EstadoNativo>;
  simular(o: { valor: number; kmCorrida: number; minutosCorrida?: number; kmBusca?: number; minutosBusca?: number }): Promise<unknown>;
  corridasPendentes(): Promise<{ corridas: CorridaNativa[] }>;
  confirmarEnvio(o: { ate?: string; ids?: string[] }): Promise<{ corridasPendentes: number }>;
  /** Corridas acompanhadas até o fim pelo GPS (APK novo; nos antigos, não existe). */
  corridasFinalizadas?(): Promise<{ corridas: { id: string; metros: number; minutos: number; inicio: string; fim: string; status: string }[] }>;
  confirmarFinalizadas?(o: { ids: string[] }): Promise<void>;
  /** APK direto: baixa a versão nova e abre o instalador (sem permissão, abre a tela dela). */
  atualizarApp?(o: { url: string }): Promise<{ permissao: boolean; baixando: boolean }>;
  /** Conforme a versão do Capacitor, volta o ouvinte direto ou uma promessa dele: use `soltarOuvinte`. */
  addListener(evento: "permissao" | "oferta" | "decisao" | "estado" | "regua" | "base" | "preferencia" | "perfil", cb: (dados: unknown) => void): Promise<Ouvinte> | Ouvinte;
};

type JanelaCapacitor = { Capacitor?: { isNativePlatform?: () => boolean; getPlatform?: () => string; Plugins?: { Plantao?: PluginPlantao } } };

export function plataforma(): "android" | "ios" | "web" | "app-sem-ponte" {
  if (typeof window === "undefined") return "web";
  const c = (window as unknown as JanelaCapacitor).Capacitor;
  // Dentro do app (o navegador dele se identifica), mas sem a ponte nativa: app desatualizado.
  if (!c?.isNativePlatform?.()) return navigator.userAgent.includes("AlugueiApp") ? "app-sem-ponte" : "web";
  return c.getPlatform?.() === "ios" ? "ios" : "android";
}

export function plantaoNativo(): PluginPlantao | null {
  if (plataforma() !== "android") return null;
  return (window as unknown as JanelaCapacitor).Capacitor?.Plugins?.Plantao ?? null;
}

/**
 * Solta um ouvinte do plugin, venha ele direto ou numa promessa. Nunca lança:
 * erro na limpeza de um efeito derruba a tela inteira (tela branca).
 */
export function soltarOuvinte(o: Promise<Ouvinte> | Ouvinte | null | undefined): void {
  Promise.resolve(o)
    .then((x) => x?.remove?.())
    .catch(() => null);
}
