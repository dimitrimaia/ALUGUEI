"use client";

import { Check, Eye, EyeOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Aviso, Botao, Campo, classeEntrada } from "@/components/ui";
import { supabaseNavegador } from "@/lib/supabase/navegador";

/** Define a senha nova. Serve à recuperação e à troca de senha nas configurações. */
export function FormularioNovaSenha({ aoSalvar = "/inicio" }: { aoSalvar?: string | null }) {
  const router = useRouter();
  const [senha, setSenha] = useState("");
  const [confirma, setConfirma] = useState("");
  const [ver, setVer] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [salvo, setSalvo] = useState(false);
  const [ocupado, setOcupado] = useState(false);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    if (senha.length < 8) return setErro("A senha precisa ter pelo menos 8 caracteres.");
    if (senha !== confirma) return setErro("As duas senhas não são iguais.");
    setOcupado(true);
    const { error } = await supabaseNavegador().auth.updateUser({ password: senha });
    setOcupado(false);
    if (error) {
      return setErro(
        error.code === "same_password" ? "A senha nova precisa ser diferente da atual."
          : error.code === "weak_password" ? "Senha fraca. Use pelo menos 8 caracteres, com letras e números."
            : error.code === "reauthentication_needed" ? "Por segurança, saia e entre de novo antes de trocar a senha."
              : "Não foi possível salvar a senha. Tente de novo.",
      );
    }
    if (aoSalvar) return router.replace(aoSalvar as never);
    setSalvo(true);
    setSenha("");
    setConfirma("");
  }

  const tipo = ver ? "text" : "password";
  return (
    <form onSubmit={salvar} className="flex flex-col gap-4">
      {erro && <Aviso tom="perigo">{erro}</Aviso>}
      {salvo && <Aviso tom="ok"><Check size={16} className="inline" /> Senha alterada.</Aviso>}
      <Campo rotulo="Senha nova" dica="Pelo menos 8 caracteres.">
        <span className="relative block">
          <input type={tipo} autoComplete="new-password" className={`${classeEntrada} pr-11`} value={senha} onChange={(e) => setSenha(e.target.value)} required />
          <button type="button" onClick={() => setVer((v) => !v)} aria-label={ver ? "Esconder senha" : "Mostrar senha"} className="absolute top-1/2 right-2 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-suave hover:bg-cartao-2">
            {ver ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        </span>
      </Campo>
      <Campo rotulo="Repita a senha nova"><input type={tipo} autoComplete="new-password" className={classeEntrada} value={confirma} onChange={(e) => setConfirma(e.target.value)} required /></Campo>
      <Botao tamanho="lg" disabled={ocupado}>{ocupado ? "Salvando…" : aoSalvar ? "Salvar e entrar" : "Salvar senha"}</Botao>
    </form>
  );
}
