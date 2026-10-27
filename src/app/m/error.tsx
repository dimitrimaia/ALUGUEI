"use client";

import { TelaErro } from "@/components/tela-erro";

/** Erro dentro do app: as barras de cima e de baixo continuam; só o conteúdo tenta de novo. */
export default function Erro(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <TelaErro {...props} />;
}
