"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { normalizarCelular } from "@/dominio/cadastro/telefone";
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

  const campo = "w-full rounded-lg border bg-transparent p-3 text-lg";
  const botao = "w-full rounded-lg p-3 font-medium text-white disabled:opacity-60";

  if (enviadoPara) {
    return (
      <form onSubmit={verificar} className="flex flex-col gap-4">
        <p>Enviamos um código para <strong>{enviadoPara}</strong>.</p>
        <label className="flex flex-col gap-1">
          Código
          <input
            className={`${campo} tracking-widest`}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={8}
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
            autoFocus
          />
        </label>
        {erro && <p role="alert" className="text-red-600">{erro}</p>}
        <button className={botao} style={{ background: "var(--marca)" }} disabled={ocupado || codigo.length < 6}>
          {ocupado ? "Verificando…" : "Entrar"}
        </button>
        <button type="button" className="underline" onClick={() => { setEnviadoPara(null); setCodigo(""); }}>
          Usar outro {canal === "celular" ? "número" : "e-mail"}
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={enviarCodigo} className="flex flex-col gap-4">
      <div className="flex gap-2" role="tablist">
        {(["celular", "email"] as const).map((c) => (
          <button
            key={c}
            type="button"
            role="tab"
            aria-selected={canal === c}
            className={`flex-1 rounded-lg border p-2 ${canal === c ? "font-semibold" : ""}`}
            onClick={() => { setCanal(c); setContato(""); setErro(null); }}
          >
            {c === "celular" ? "Celular" : "E-mail"}
          </button>
        ))}
      </div>
      <label className="flex flex-col gap-1">
        {canal === "celular" ? "Celular com DDD" : "E-mail"}
        <input
          className={campo}
          type={canal === "celular" ? "tel" : "email"}
          inputMode={canal === "celular" ? "tel" : "email"}
          autoComplete={canal === "celular" ? "tel-national" : "email"}
          placeholder={canal === "celular" ? "(31) 99999-9999" : "voce@exemplo.com"}
          value={contato}
          onChange={(e) => setContato(e.target.value)}
        />
      </label>
      {erro && <p role="alert" className="text-red-600">{erro}</p>}
      <button className={botao} style={{ background: "var(--marca)" }} disabled={ocupado}>
        {ocupado ? "Enviando…" : "Receber código"}
      </button>
    </form>
  );
}
