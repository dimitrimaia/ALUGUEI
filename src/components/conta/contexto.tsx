"use client";

import { createContext, type ReactNode, useContext, useEffect } from "react";
import type { PerfilMenu } from "@/components/menu-app";
import { type Tema, aplicarTema, lerTema } from "@/lib/tema";

export interface ContaApp {
  perfil: PerfilMenu;
  naoLidas: number;
  modo: "motorista" | "locador";
  /** Nome da locadora, se o modo locador estiver ativado. */
  locadora: string | null;
}

const Contexto = createContext<ContaApp>({ perfil: { nome: "Sua conta", foto: null, detalhe: "" }, naoLidas: 0, modo: "motorista", locadora: null });

/**
 * Dados da conta para o menu e as abas, carregados uma vez pelo layout.
 * Também aplica neste aparelho o tema salvo na conta (vale em todo aparelho em que a pessoa entrar).
 */
export function ProvedorConta({ valor, tema, children }: { valor: ContaApp; tema: Tema; children: ReactNode }) {
  useEffect(() => {
    if (lerTema() !== tema) aplicarTema(tema);
  }, [tema]);
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export const useConta = () => useContext(Contexto);
