"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { normalizarCelular } from "@/dominio/cadastro/telefone";
import { Aviso, Botao, Campo, classeEntrada } from "@/components/ui";
import { supabaseNavegador } from "@/lib/supabase/navegador";

type Canal = "celular" | "email";

export function FormularioEntrar({ destino }: { destino: string }) {
  const router = useRouter();
  const [canal, setCanal] = useState<Canal>("celular");
  const [contato, setContato] = useState("");
  const [enviadoPara, setEnviadoPara] = useState<string | null>(null);
  const [codigo, setCodigo] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  async function enviarCodigo(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    const alvo = canal === "celular" ? normalizarCelular(contato) : contato.trim().toLowerCase();
    if (!alvo || (canal === "email" && !alvo.includes("@"))) {
      setErro(canal === "celular" ? "Informe um celular com DDD." : "Informe um e-mail válido.");
      return;
    }
    setOcupado(true);
    const supabase = supabaseNavegador();
    const { error } =
      canal === "celular"
        ? await supabase.auth.signInWithOtp({ phone: alvo })
        : await supabase.auth.signInWithOtp({ email: alvo });
    setOcupado(false);
    if (error) return setErro("Não foi possível enviar o código. Tente de novo em instantes.");
    setEnviadoPara(alvo);
  }

  async function verificar(e: React.FormEvent) {
    e.preventDefault();
    if (!enviadoPara) return;
    setErro(null);
    setOcupado(true);
    const supabase = supabaseNavegador();
    const token = codigo.replace(/\D/g, "");
    const { error } =
      canal === "celular"
        ? await supabase.auth.verifyOtp({ phone: enviadoPara, token, type: "sms" })
        : await supabase.auth.verifyOtp({ email: enviadoPara, token, type: "email" });
    setOcupado(false);
    if (error) return setErro("Código inválido ou expirado.");
    router.replace(destino as never);
    router.refresh();
  }


  if (enviadoPara) {
    return (
      <form onSubmit={verificar} className="flex flex-col gap-4">
        <p className="text-sm">Enviamos um código para <strong>{enviadoPara}</strong>.</p>
        <Campo rotulo="Código">
          <input
            className={`${classeEntrada} h-13 text-center text-2xl font-bold tracking-[0.4em]`}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={8}
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
            autoFocus
          />
        </Campo>
        {erro && <Aviso tom="perigo">{erro}</Aviso>}
        <Botao tamanho="lg" disabled={ocupado || codigo.length < 6}>
          {ocupado ? "Verificando…" : "Entrar"}
        </Botao>
        <button type="button" className="text-sm font-medium text-suave underline" onClick={() => { setEnviadoPara(null); setCodigo(""); }}>
          Usar outro {canal === "celular" ? "número" : "e-mail"}
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={enviarCodigo} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-cartao-2 p-1" role="tablist">
        {(["celular", "email"] as const).map((c) => (
          <button
            key={c}
            type="button"
            role="tab"
            aria-selected={canal === c}
            className={`rounded-lg py-2 text-sm font-semibold transition-colors ${canal === c ? "bg-cartao text-texto shadow-cartao" : "text-suave"}`}
            onClick={() => { setCanal(c); setContato(""); setErro(null); }}
          >
            {c === "celular" ? "Celular" : "E-mail"}
          </button>
        ))}
      </div>
      <Campo rotulo={canal === "celular" ? "Celular com DDD" : "E-mail"}>
        <input
          className={classeEntrada}
          type={canal === "celular" ? "tel" : "email"}
          inputMode={canal === "celular" ? "tel" : "email"}
          autoComplete={canal === "celular" ? "tel-national" : "email"}
          placeholder={canal === "celular" ? "(31) 99999-9999" : "voce@exemplo.com"}
          value={contato}
          onChange={(e) => setContato(e.target.value)}
        />
      </Campo>
      {erro && <Aviso tom="perigo">{erro}</Aviso>}
      <Botao tamanho="lg" disabled={ocupado}>
        {ocupado ? "Enviando…" : "Receber código"}
      </Botao>
    </form>
  );
}
