"use client";

import { useState } from "react";
import { Botao, classeEntrada } from "@/components/ui";

export function CompartilharConvite({
  link,
  telefone,
  nome,
  locador,
  mensagem = "Para alugar o carro, faça seu cadastro por este link:",
}: {
  link: string;
  telefone: string;
  nome: string;
  locador: string;
  mensagem?: string;
}) {
  const [copiado, setCopiado] = useState(false);
  const primeiroNome = nome.split(" ")[0];
  const texto = `Olá, ${primeiroNome}! Aqui é ${locador}. ${mensagem} ${link}`;
  const whatsapp = `https://wa.me/${telefone.replace(/\D/g, "")}?text=${encodeURIComponent(texto)}`;

  return (
    <div className="flex flex-col gap-2">
      <input readOnly value={link} className={classeEntrada} onFocus={(e) => e.target.select()} />
      <div className="flex flex-wrap gap-2">
        <a href={whatsapp} target="_blank" rel="noreferrer" className="rounded-lg px-4 py-2.5 font-medium" style={{ background: "#25d366", color: "#08311a" }}>
          Enviar no WhatsApp
        </a>
        <Botao
          type="button"
          variante="secundario"
          onClick={async () => {
            await navigator.clipboard.writeText(link);
            setCopiado(true);
          }}
        >
          {copiado ? "Copiado!" : "Copiar link"}
        </Botao>
      </div>
    </div>
  );
}
