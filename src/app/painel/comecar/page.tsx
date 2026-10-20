import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Cartao, Marca, Suave } from "@/components/ui";
import { exigirUsuario } from "@/lib/sessao";
import { supabaseServidor } from "@/lib/supabase/servidor";
import { FormularioComecar } from "./formulario";

export default async function Comecar() {
  const usuario = await exigirUsuario("/painel/comecar");
  const supabase = await supabaseServidor();
  const { data: membro } = await supabase.from("membros").select("id").eq("usuario_id", usuario.id).limit(1).maybeSingle();
  if (membro) redirect("/painel");

  return (
    <main className="mx-auto flex max-w-lg flex-col gap-4 px-4 py-10">
      <div className="mb-4 flex items-center justify-between">
        <Link href="/" aria-label="Aluguei, início"><Marca /></Link>
        <Link href="/bem-vindo" className="inline-flex items-center gap-1 text-sm font-semibold text-suave hover:text-texto"><ArrowLeft size={16} /> Voltar</Link>
      </div>
      <p className="text-sm font-semibold text-marca">Primeiro acesso</p>
      <h1 className="text-3xl font-extrabold tracking-tight">Cadastre sua locadora</h1>
      <Suave>Esses dados aparecem no contrato como LOCADOR. Depois você cadastra o primeiro carro e convida o motorista.</Suave>
      <Cartao>
        <FormularioComecar />
      </Cartao>
    </main>
  );
}
