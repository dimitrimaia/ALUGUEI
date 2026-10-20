"use client";

import { useEffect } from "react";
import { salvarPerfilEscolhido } from "@/lib/perfil-escolhido";

/** Ao abrir o login de um perfil, o site passa a abrir nesse perfil também. */
export function LembrarPerfil({ perfil }: { perfil: "locador" | "motorista" }) {
  useEffect(() => salvarPerfilEscolhido(perfil), [perfil]);
  return null;
}
