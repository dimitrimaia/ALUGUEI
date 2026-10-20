import { notFound, redirect } from "next/navigation";
import { Suave } from "@/components/ui";
import { FINALIDADES } from "@/lib/consentimentos";
import { cadastroDoMotorista } from "@/lib/motorista";
import { exigirUsuario } from "@/lib/sessao";
import { FormularioCadastro } from "./formulario";

export default async function Cadastro({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const usuario = await exigirUsuario(`/m/cadastro/${id}`);
  const l = await cadastroDoMotorista(usuario.id, id);
  if (!l) notFound();
  if (l.status !== "em_cadastro") redirect("/m");

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold tracking-tight">Seu cadastro</h1>
      <Suave>Preencha seus dados e mande as fotos dos documentos. Leva uns 5 minutos.</Suave>
      <FormularioCadastro
        locatarioId={l.id}
        inicial={{ nome: l.nome, email: l.email ?? usuario.email ?? "" }}
        consentimentos={FINALIDADES.map((f) => ({ id: f.id, texto: f.texto }))}
      />
    </div>
  );
}
