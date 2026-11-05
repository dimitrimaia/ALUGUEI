"use client";

import type { EmailOtpType } from "@supabase/supabase-js";
import { LinkIcon, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { BotaoLink } from "@/components/ui";
import { supabaseNavegador } from "@/lib/supabase/navegador";

const MOTIVOS: Record<string, string> = {
  otp_expired: "Este link expirou ou já foi usado. Cada link vale uma vez só, e só o último pedido vale.",
  access_denied: "Este link expirou ou já foi usado. Cada link vale uma vez só, e só o último pedido vale.",
};

function destinoSeguro(v: string | null, padrao: string) {
  return v?.startsWith("/") && !v.startsWith("//") ? v : padrao;
}

/**
 * Lê o que o Supabase mandou no endereço (sessão no #, token_hash ou code na
 * busca), grava a sessão nos cookies e segue para a tela certa.
 */
export function Confirmar() {
  const [erro, setErro] = useState<{ texto: string; recuperacao: boolean } | null>(null);
  const feito = useRef(false);

  useEffect(() => {
    if (feito.current) return;
    feito.current = true;
    const busca = new URLSearchParams(location.search);
    const hash = new URLSearchParams(location.hash.slice(1));
    const tipo = hash.get("type") ?? busca.get("type");
    const recuperacao = tipo === "recovery";
    // Nos modelos de e-mail com token_hash, o endereço de volta original vem inteiro em `next`.
    let voltar = busca.get("voltar");
    try {
      const proximo = busca.get("next");
      if (!voltar && proximo) voltar = new URL(proximo, location.origin).searchParams.get("voltar");
    } catch {}
    const destino = recuperacao ? "/nova-senha" : destinoSeguro(voltar, "/inicio");
    const supabase = supabaseNavegador();

    (async () => {
      const codigoErro = hash.get("error_code") ?? busca.get("error_code") ?? hash.get("error") ?? busca.get("error");
      if (codigoErro) throw new Error(codigoErro);
      const acesso = hash.get("access_token");
      const renovacao = hash.get("refresh_token");
      const tokenHash = busca.get("token_hash");
      const code = busca.get("code");
      const { error } = acesso && renovacao
        ? await supabase.auth.setSession({ access_token: acesso, refresh_token: renovacao })
        : tokenHash && tipo
          ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type: tipo as EmailOtpType })
          : code
            ? await supabase.auth.exchangeCodeForSession(code)
            : { error: new Error("sem_dados") };
      if (error) throw new Error(("code" in error && typeof error.code === "string" ? error.code : "") || error.message);
      history.replaceState(null, "", location.pathname); // tira os tokens do histórico
      window.location.replace(destino); // página nova do zero, já com a sessão
    })().catch((e: Error) => {
      const texto = MOTIVOS[e.message] ?? (e.message.includes("code verifier") || e.message === "flow_state_not_found"
        ? "Este link foi aberto num navegador diferente do que pediu. Peça um novo link ou entre com o código do e-mail."
        : "Não conseguimos validar este link. Peça um novo.");
      setErro({ texto, recuperacao });
    });
  }, []);

  if (!erro) {
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <LoaderCircle size={28} className="animate-spin text-marca" />
        <p className="font-semibold">Entrando na sua conta…</p>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <span className="grid size-12 place-items-center rounded-full bg-alerta-suave text-alerta"><LinkIcon size={22} /></span>
      <h1 className="text-lg font-bold">{erro.recuperacao ? "Link de senha inválido" : "Link inválido"}</h1>
      <p className="text-sm text-suave">{erro.texto}</p>
      <BotaoLink href={erro.recuperacao ? "/entrar?modo=esqueci" : "/entrar?modo=codigo"} tamanho="lg" className="mt-2 w-full">
        {erro.recuperacao ? "Pedir novo link de senha" : "Pedir novo link ou código"}
      </BotaoLink>
      <Link href="/entrar" className="text-sm font-semibold text-marca">Entrar com senha</Link>
    </div>
  );
}
