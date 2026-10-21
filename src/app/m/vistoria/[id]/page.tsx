import { CabecalhoMotorista } from "@/components/motorista/cabecalho";
import { createHash } from "node:crypto";
import { notFound } from "next/navigation";
import { ResumoVistoria } from "@/components/resumo-vistoria";
import { Aviso, Suave } from "@/components/ui";
import { formatarPlaca } from "@/dominio/cadastro/documentos";
import type { ChecklistVistoria } from "@/dominio/vistoria/roteiro";
import { contratosDoMotorista } from "@/lib/motorista";
import { exigirUsuario } from "@/lib/sessao";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { fotosDaVistoria } from "@/lib/vistorias";
import { FormularioAceiteVistoria } from "./aceitar";

export default async function VistoriaMotorista({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const usuario = await exigirUsuario(`/m/vistoria/${id}`);
  const admin = supabaseAdmin();
  const { data: v } = await admin.from("vistorias").select("*").eq("id", id).maybeSingle();
  const contrato = v && (await contratosDoMotorista(usuario.id)).find((c) => c.id === v.contrato_id);
  if (!v || !contrato) notFound();

  const checklist = v.checklist as unknown as ChecklistVistoria;
  const [{ data: veiculo }, fotos] = await Promise.all([
    admin.from("veiculos").select("placa, modelo").eq("id", contrato.veiculo_id).single(),
    fotosDaVistoria(checklist),
  ]);
  const hash = createHash("sha256").update(JSON.stringify(v.checklist)).digest("hex");

  return (
    <div className="flex flex-col gap-4">
      <CabecalhoMotorista titulo="Vistoria" />
      <div>
        <Suave>{veiculo ? `${veiculo.modelo} · ${formatarPlaca(veiculo.placa)}` : ""}</Suave>
        <h1 className="text-2xl font-bold tracking-tight">{v.tipo === "devolucao" ? "Vistoria de devolução" : "Vistoria de entrega"}</h1>
        <p className="mt-1 text-suave">{v.tipo === "devolucao" ? "Confira o estado em que o carro foi devolvido. O locador compara com a entrega para fechar as contas." : "Confira com calma. É isso que vale na hora de devolver o carro."}</p>
      </div>
      <ResumoVistoria checklist={checklist} odometro={v.odometro} combustivel={v.combustivel_oitavos} fotos={fotos} />
      {v.aceite_locatario_evidencia_id ? (
        <Aviso tom="ok" titulo="Vistoria confirmada">Você confirmou o estado do carro {v.tipo === "devolucao" ? "na devolução" : "na entrega"}.</Aviso>
      ) : (
        <FormularioAceiteVistoria vistoriaId={v.id} hash={hash} />
      )}
    </div>
  );
}
