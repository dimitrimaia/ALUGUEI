"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ITENS_CHECKIN, conferirKm, faltandoNoCheckin } from "@/dominio/checkin/checkin";
import { hoje } from "@/dominio/datas/data";
import { auditar } from "@/lib/auditoria";
import { ArquivoInvalido, registrarArquivoEnviado, urlDeEnvio } from "@/lib/evidencias";
import { contratosDoMotorista } from "@/lib/motorista";
import { exigirUsuario } from "@/lib/sessao";
import { supabaseAdmin } from "@/lib/supabase/admin";

const IDS = ITENS_CHECKIN.map((i) => i.id) as [string, ...string[]];

/** O check-in pertence a um contrato ativo do motorista logado. */
async function checkinDoMotorista(obrigacaoId: string) {
  const usuario = await exigirUsuario(`/m/checkin/${obrigacaoId}`);
  const { data: o } = await supabaseAdmin().from("obrigacoes").select("*").eq("id", obrigacaoId).eq("tipo", "checkin").maybeSingle();
  const contrato = o && (await contratosDoMotorista(usuario.id)).find((c) => c.id === o.contrato_id && c.status === "ativo");
  if (!o || !contrato) throw new Error("Check-in não encontrado.");
  return { usuario, obrigacao: o, contrato };
}

function pasta(organizacaoId: string, contratoId: string, obrigacaoId: string) {
  return `${organizacaoId}/checkin/${contratoId}/${obrigacaoId}/`;
}

/** Passo 1: endereço assinado para o celular mandar a foto ou o vídeo direto ao cofre. */
export async function prepararArquivo(obrigacaoId: string, item: string) {
  const { obrigacao, contrato } = await checkinDoMotorista(obrigacaoId);
  if (obrigacao.status === "cumprida") throw new Error("Este check-in já foi enviado.");
  const id = z.enum(IDS).parse(item);
  const extensao = id === "video" ? "mp4" : "jpg";
  return urlDeEnvio(`${pasta(contrato.organizacao_id, contrato.id, obrigacaoId)}${id}-${randomUUID()}.${extensao}`);
}

const esquemaRegistro = z.object({
  caminho: z.string(),
  item: z.enum(IDS),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  precisao: z.number().optional(),
  capturadoEm: z.string().datetime().optional(),
});

/** Passo 2: o arquivo chegou; calcula o hash e registra no cofre com hora, local e aparelho. */
export async function registrarArquivo(obrigacaoId: string, entrada: z.input<typeof esquemaRegistro>): Promise<{ ok: true; evidenciaId: string } | { ok: false; erro: string }> {
  const { usuario, contrato } = await checkinDoMotorista(obrigacaoId);
  const d = esquemaRegistro.parse(entrada);
  if (!d.caminho.startsWith(pasta(contrato.organizacao_id, contrato.id, obrigacaoId))) return { ok: false, erro: "Arquivo inválido." };
  try {
    const ev = await registrarArquivoEnviado(d.caminho, {
      organizacaoId: contrato.organizacao_id,
      enviadoPor: usuario.id,
      finalidade: `checkin.${d.item}`,
      tipo: d.item === "video" ? "video" : "foto",
      contratoId: contrato.id,
      veiculoId: contrato.veiculo_id,
      latitude: d.latitude,
      longitude: d.longitude,
      precisaoMetros: d.precisao,
      capturadoEm: d.capturadoEm ? new Date(d.capturadoEm) : undefined,
    });
    return { ok: true, evidenciaId: ev.id };
  } catch (e) {
    return { ok: false, erro: e instanceof ArquivoInvalido ? e.message : "Falhou o registro. Tente de novo." };
  }
}

const esquemaConclusao = z.object({
  km: z.number().int(),
  combustivelOitavos: z.number().int().min(0).max(8),
  evidencias: z.record(z.string(), z.string().uuid()),
});

/**
 * Passo 3: fecha o check-in. Uma vez só por semana (obrigacao_id é único);
 * cumpre a obrigação e registra o km no histórico do carro.
 */
export async function concluirCheckin(obrigacaoId: string, entrada: z.input<typeof esquemaConclusao>): Promise<{ ok: true } | { ok: false; erro: string }> {
  const { usuario, obrigacao, contrato } = await checkinDoMotorista(obrigacaoId);
  if (obrigacao.status === "cumprida") return { ok: true };
  const d = esquemaConclusao.parse(entrada);
  const faltam = faltandoNoCheckin(d.evidencias);
  if (faltam.length) return { ok: false, erro: `Falta: ${faltam.map((f) => ITENS_CHECKIN.find((i) => i.id === f)!.rotulo.toLowerCase()).join(", ")}.` };

  const admin = supabaseAdmin();
  const { data: veiculo } = await admin.from("veiculos").select("odometro_atual").eq("id", contrato.veiculo_id).single();
  const km = conferirKm(d.km, veiculo?.odometro_atual ?? 0);
  if (!km.ok) return { ok: false, erro: km.erro };

  // As evidências precisam ser deste check-in, do cofre deste contrato.
  const { data: provas } = await admin.from("evidencias").select("id, finalidade").in("id", Object.values(d.evidencias)).eq("contrato_id", contrato.id);
  if ((provas ?? []).length !== Object.keys(d.evidencias).length) return { ok: false, erro: "Algum arquivo não chegou. Envie de novo." };

  const { data: checkin, error } = await admin
    .from("checkins")
    .insert({ organizacao_id: contrato.organizacao_id, contrato_id: contrato.id, obrigacao_id: obrigacaoId, referencia: obrigacao.vencimento, odometro_informado: d.km, combustivel_oitavos: d.combustivelOitavos, evidencias: d.evidencias })
    .select("id")
    .single();
  if (error && !/duplicate|unique/i.test(error.message)) return { ok: false, erro: "Não foi possível concluir agora. Tente de novo." };

  await Promise.all([
    admin.from("obrigacoes").update({ status: "cumprida" }).eq("id", obrigacaoId),
    admin.from("leituras_odometro").insert({ organizacao_id: contrato.organizacao_id, veiculo_id: contrato.veiculo_id, km: d.km, origem: "checkin", origem_id: checkin?.id ?? null, lido_em: hoje() }),
    d.km > (veiculo?.odometro_atual ?? 0) ? admin.from("veiculos").update({ odometro_atual: d.km }).eq("id", contrato.veiculo_id) : Promise.resolve(),
  ]);
  await auditar({ organizacaoId: contrato.organizacao_id, usuarioId: usuario.id, acao: "checkin.enviado", entidade: "checkins", entidadeId: checkin?.id ?? null, depois: { obrigacaoId, km: d.km } });
  revalidatePath("/m");
  return { ok: true };
}
