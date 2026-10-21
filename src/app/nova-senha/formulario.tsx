"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Aviso, Botao, Campo, classeEntrada } from "@/components/ui";
import { supabaseNavegador } from "@/lib/supabase/navegador";

export function FormularioNovaSenha() {
  const router = useRouter();
  const [senha, setSenha] = useState("");
  const [confirma, setConfirma] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (senha.length < 8) return setErro("A senha precisa ter pelo menos 8 caracteres.");
    if (senha !== confirma) return setErro("As duas senhas não são iguais.");
    setOcupado(true);
    const { error } = await supabaseNavegador().auth.updateUser({ password: senha });
    setOcupado(false);
    if (error) return setErro("Não foi possível salvar. Use uma senha diferente da anterior.");
    router.replace("/inicio" as never);
  }

  return (
    <form onSubmit={salvar} className="flex flex-col gap-4">
      {erro && <Aviso tom="perigo">{erro}</Aviso>}
      <Campo rotulo="Senha nova" dica="Pelo menos 8 caracteres."><input type="password" autoComplete="new-password" className={classeEntrada} value={senha} onChange={(e) => setSenha(e.target.value)} required /></Campo>
      <Campo rotulo="Repita a senha"><input type="password" autoComplete="new-password" className={classeEntrada} value={confirma} onChange={(e) => setConfirma(e.target.value)} required /></Campo>
      <Botao tamanho="lg" disabled={ocupado}>{ocupado ? "Salvando…" : "Salvar e entrar"}</Botao>
    </form>
  );
}
