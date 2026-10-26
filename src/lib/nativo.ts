"use client";

import type { Criterios, PerfilCusto } from "@/dominio/ganhos/custos";
import type { PreferenciasCopiloto } from "@/dominio/ganhos/copiloto";

/**
 * Ponte com o app Android (Capacitor + plugin "Plantao", em android/.../plantao).
 * No navegador comum nada disso existe e as funções devolvem null: a tela
 * mostra a versão web (digitação) e o convite para o app.
 */

export type EstadoNativo = { localizacao?: boolean; dormindo?: boolean; android: boolean; sobreposicao: boolean; acessibilidade: boolean; notificacoes: boolean; semOtimizacaoBateria: boolean; ligado: boolean; configurado: boolean; corridasPendentes: number };
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
  origem: "leitura" | "digitada";
  momento: string;
};

export type EstadoCamera = { gravando: boolean; desde?: string | null; arquivos?: number; usadoMb?: number };
type RespostaPermissao = { tipo: string; concedida: boolean; aberto: boolean };
type Ouvinte = { remove: () => Promise<void> | void };
type PluginPlantao = {
  estado(): Promise<EstadoNativo>;
  configurar(o: { perfil: PerfilCusto; criterios: Criterios; segundosCartao?: number; tema?: "claro" | "escuro" | "auto"; vibrar?: boolean; preferencias?: PreferenciasCopiloto }): Promise<EstadoNativo>;
  pedirLocalizacao(): Promise<RespostaPermissao>;
  definirBaseAqui(): Promise<{ lat: number; lon: number }>;
  pedirCamera(): Promise<RespostaPermissao>;
  cameraIniciar(): Promise<EstadoCamera>;
  cameraParar(): Promise<EstadoCamera>;
  cameraEstado(): Promise<EstadoCamera>;
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
  addListener(evento: "permissao" | "oferta" | "decisao" | "estado" | "regua" | "base" | "preferencia" | "perfil", cb: (dados: unknown) => void): Promise<Ouvinte>;
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
