"use client";

import { MessageCircle } from "lucide-react";
import { useActionState } from "react";
import { Aviso, Botao, Campo, classeAreaTexto, classeEntrada } from "@/components/ui";
import { type EstadoInteresse, iniciarConversa } from "./acoes";

export function FormularioInteresse({ anuncioId, inicial }: { anuncioId: string; inicial: { nome: string; celular: string; mensagem: string } }) {
  const [estado, enviar, enviando] = useActionState<EstadoInteresse, FormData>(iniciarConversa.bind(null, anuncioId), {});
  const e = estado.erros ?? {};
  return (
    <form action={enviar} className="flex flex-col gap-4">
      {estado.mensagem && <Aviso tom="perigo">{estado.mensagem}</Aviso>}
      <Campo rotulo="Seu nome" erro={e.nome}>
        <input name="nome" defaultValue={inicial.nome} autoComplete="name" className={classeEntrada} required />
      </Campo>
      <Campo rotulo="Celular com DDD" erro={e.celular}>
        <input name="celular" type="tel" inputMode="tel" defaultValue={inicial.celular} placeholder="(31) 99999-9999" className={classeEntrada} required />
      </Campo>
      <Campo rotulo="Mensagem" erro={e.mensagem}>
        <textarea name="mensagem" rows={3} defaultValue={inicial.mensagem} className={classeAreaTexto} required />
      </Campo>
      <Botao tamanho="lg" disabled={enviando} icone={MessageCircle}>{enviando ? "Abrindo conversa…" : "Enviar mensagem"}</Botao>
    </form>
  );
}
