"use server";

import { createHash } from "node:crypto";
import { redirect } from "next/navigation";
import { hoje } from "@/dominio/datas/data";
import { auditar } from "@/lib/auditoria";
import { guardarEvidencia } from "@/lib/evidencias";
import { contratosDoMotorista } from "@/lib/motorista";
import { exigirUsuario } from "@/lib/sessao";
import { supabaseAdmin } from "@/lib/supabase/admin";

export type EstadoAceiteVistoria = { erro?: string };

/**
 * RF-043: o motorista confirma o estado do carro. O aceite guarda o hash do
 * checklist que ele viu. Com o aceite, o contrato fica ativo e o carro, alugado.
 */
export async function aceitarVistoria(vistoriaId: string, _: EstadoAceiteVistoria, form: FormData): Promise<EstadoAceiteVistoria> {
  const usuario = await exigirUsuario(`/m/vistoria/${vistoriaId}`);
  if (form.get("confirmo") !== "sim") return { erro: "Marque a confirmação para continuar." };
  const admin = supabaseAdmin();
  const { data: v } = await admin.from("vistorias").select("*").eq("id", vistoriaId).maybeSingle();
  const contrato = v && (await contratosDoMotorista(usuario.id)).find((c) => c.id === v.contrato_id);
  if (!v || !contrato) return { erro: "Vistoria não encontrada." };
  if (v.aceite_locatario_evidencia_id) redirect("/m");

  const hashChecklist = createHash("sha256").update(JSON.stringify(v.checklist)).digest("hex");
  if (form.get("hash") !== hashChecklist) return { erro: "A vistoria mudou desde que você abriu. Recarregue a página." };

  const latitude = Number(form.get("latitude")) || undefined;
  const longitude = Number(form.get("longitude")) || undefined;
  const aceite = await guardarEvidencia(
    new Blob([JSON.stringify({ vistoriaId, contratoId: contrato.id, papel: "locatario", usuarioId: usuario.id, hashChecklist, odometro: v.odometro, combustivelOitavos: v.combustivel_oitavos, aceitoEm: new Date().toISOString() })], { type: "application/json" }),
    { organizacaoId: v.organizacao_id, enviadoPor: usuario.id, finalidade: "vistoria.entrega.aceite", tipo: "aceite", contratoId: contrato.id, latitude, longitude },
  );

  await admin.from("vistorias").update({ aceite_locatario_evidencia_id: aceite.id }).eq("id", vistoriaId).is("aceite_locatario_evidencia_id", null);
  await admin.from("contratos").update({ status: "ativo" }).eq("id", contrato.id).eq("status", "assinado");
  await admin.from("veiculos").update({ status: "alugado", odometro_atual: v.odometro }).eq("id", contrato.veiculo_id);
  await admin.from("leituras_odometro").insert({
    organizacao_id: v.organizacao_id,
    veiculo_id: contrato.veiculo_id,
    km: v.odometro,
    origem: "vistoria",
    origem_id: vistoriaId,
    lido_em: hoje(),
  });

  await auditar({ organizacaoId: v.organizacao_id, usuarioId: usuario.id, acao: "vistoria.entrega.aceitar", entidade: "vistorias", entidadeId: vistoriaId, depois: { hashChecklist } });
  redirect("/m");
}
