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
      <Marca className="mb-4 text-xl" />
      <h1 className="text-2xl font-bold tracking-tight">Criar conta de locador</h1>
      <Suave>Esses dados aparecem nos contratos e nas cobranças. Dá para mudar depois.</Suave>
      <Cartao>
        <FormularioComecar />
      </Cartao>
    </main>
  );
}
