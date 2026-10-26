"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { data as dataISO, hoje } from "@/dominio/datas/data";
import { lerReais } from "@/dominio/dinheiro/centavos";
import { normalizarCriterios, normalizarPerfil } from "@/dominio/ganhos/custos";
import { CATEGORIAS_DESPESA, PLATAFORMAS } from "@/dominio/ganhos/plantao";
import { exigirUsuario } from "./sessao";
import { supabaseAdmin } from "./supabase/admin";
import { jornadaAberta } from "./plantao";

export type EstadoForm = { erro?: string; ok?: boolean };

const km = z.preprocess((v) => (v === "" || v == null ? null : String(v).replace(/\D/g, "")), z.coerce.number().int().min(0).max(5_000_000).nullable());
const reais = (obrigatorio: boolean) =>
  z.preprocess((v) => (typeof v === "string" && v.trim() ? lerReais(v) : null), obrigatorio ? z.number({ message: "Informe o valor" }).int().positive("Informe o valor") : z.number().int().min(0).nullable());

function atualizar() {
  revalidatePath("/m/plantao", "layout");
  revalidatePath("/m");
}

export async function iniciarJornada(_: EstadoForm, form: FormData): Promise<EstadoForm> {
  const usuario = await exigirUsuario("/m/plantao");
  const lido = z.object({ km, meta: reais(false) }).safeParse(Object.fromEntries(form));
  if (!lido.success) return { erro: lido.error.issues[0]?.message ?? "Confira os campos." };
  if (await jornadaAberta(usuario.id)) return { erro: "Você já está em plantão." };
  const admin = supabaseAdmin();
  const meta = lido.data.meta ?? (await admin.from("perfis_custo").select("meta_diaria_centavos").eq("usuario_id", usuario.id).maybeSingle()).data?.meta_diaria_centavos ?? 0;
  await admin.from("jornadas").insert({ usuario_id: usuario.id, km_inicial: lido.data.km, meta_centavos: meta });
  if (lido.data.meta !== null) await admin.from("perfis_custo").update({ meta_diaria_centavos: meta }).eq("usuario_id", usuario.id);
  atualizar();
  return { ok: true };
}

export async function encerrarJornada(_: EstadoForm, form: FormData): Promise<EstadoForm> {
  const usuario = await exigirUsuario("/m/plantao");
  const aberta = await jornadaAberta(usuario.id);
  if (!aberta) return { erro: "Nenhum plantão aberto." };
  const lido = z.object({ km }).safeParse(Object.fromEntries(form));
  if (!lido.success) return { erro: "Confira o km." };
  if (lido.data.km !== null && aberta.km_inicial !== null && lido.data.km < aberta.km_inicial) return { erro: `O km final precisa ser maior que o inicial (${aberta.km_inicial.toLocaleString("pt-BR")}).` };
  await supabaseAdmin().from("jornadas").update({ fim: new Date().toISOString(), km_final: lido.data.km }).eq("id", aberta.id).eq("usuario_id", usuario.id);
  atualizar();
  redirect("/m/plantao/relatorios?periodo=hoje");
}

export async function lancarGanho(_: EstadoForm, form: FormData): Promise<EstadoForm> {
  const usuario = await exigirUsuario("/m/plantao");
  const lido = z
    .object({ plataforma: z.enum(PLATAFORMAS, { message: "Escolha a plataforma" }), valor: reais(true), corridas: z.coerce.number().int().min(1).max(200).catch(1), dia: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).catch(hoje()) })
    .safeParse(Object.fromEntries(form));
  if (!lido.success) return { erro: lido.error.issues[0]?.message ?? "Confira os campos." };
  const aberta = await jornadaAberta(usuario.id);
  await supabaseAdmin().from("ganhos").insert({ usuario_id: usuario.id, jornada_id: aberta?.id ?? null, dia: dataISO(lido.data.dia), plataforma: lido.data.plataforma, valor_centavos: lido.data.valor!, corridas: lido.data.corridas });
  atualizar();
  return { ok: true };
}

export async function lancarDespesa(_: EstadoForm, form: FormData): Promise<EstadoForm> {
  const usuario = await exigirUsuario("/m/plantao");
  const lido = z
    .object({
      categoria: z.enum(CATEGORIAS_DESPESA, { message: "Escolha o tipo" }),
      valor: reais(true),
      quantidade: z.preprocess((v) => (typeof v === "string" && v.trim() ? Number(v.replace(",", ".")) : null), z.number().positive().max(10_000).nullable()),
      km,
      descricao: z.string().trim().max(120).optional(),
      dia: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).catch(hoje()),
    })
    .safeParse(Object.fromEntries(form));
  if (!lido.success) return { erro: lido.error.issues[0]?.message ?? "Confira os campos." };
  const d = lido.data;
  await supabaseAdmin()
    .from("despesas_motorista")
    .insert({ usuario_id: usuario.id, dia: dataISO(d.dia), categoria: d.categoria, valor_centavos: d.valor!, quantidade_mil: d.quantidade ? Math.round(d.quantidade * 1000) : null, km_odometro: d.km, descricao: d.descricao || null });
  atualizar();
  return { ok: true };
}

export async function excluirLancamento(tipo: "ganho" | "despesa", id: string) {
  const usuario = await exigirUsuario("/m/plantao");
  await supabaseAdmin()
    .from(tipo === "ganho" ? "ganhos" : "despesas_motorista")
    .delete()
    .eq("id", id)
    .eq("usuario_id", usuario.id);
  atualizar();
}

/** Custos e critérios vêm já montados pela tela (JSON) e são normalizados aqui. */
export async function salvarCustos(entrada: { perfil: unknown; criterios: unknown; meta: number }): Promise<EstadoForm> {
  const usuario = await exigirUsuario("/m/plantao/custos");
  const perfil = normalizarPerfil(entrada.perfil);
  const criterios = normalizarCriterios(entrada.criterios);
  const meta = Number.isSafeInteger(entrada.meta) && entrada.meta >= 0 ? entrada.meta : 0;
  const { error } = await supabaseAdmin()
    .from("perfis_custo")
    .upsert({ usuario_id: usuario.id, perfil, criterios, meta_diaria_centavos: meta, atualizado_em: new Date().toISOString() });
  if (error) return { erro: "Não foi possível salvar. Tente de novo." };
  atualizar();
  return { ok: true };
}

const esquemaCorrida = z.object({
  id: z.string().uuid().optional(),
  app: z.string().max(30).nullable().optional(),
  valor: z.number().int().positive().max(10_000_000),
  kmCorrida: z.number().min(0).max(5000),
  minutosCorrida: z.number().min(0).max(1440).nullable().optional(),
  kmBusca: z.number().min(0).max(500).nullable().optional(),
  minutosBusca: z.number().min(0).max(1440).nullable().optional(),
  sinal: z.enum(["verde", "amarelo", "vermelho"]),
  decisao: z.enum(["aceitei", "recusei"]).nullable().optional(),
  origem: z.enum(["leitura", "digitada"]),
  momento: z.string().datetime({ offset: true }),
});

/** Corridas avaliadas: vindas da bolha do Android (fila do celular) ou da calculadora. Sem duplicar. */
export async function registrarCorridas(lista: unknown[]): Promise<{ salvas: number }> {
  const usuario = await exigirUsuario("/m/plantao");
  const validas = lista.slice(0, 500).flatMap((c) => {
    const r = esquemaCorrida.safeParse(c);
    return r.success ? [r.data] : [];
  });
  if (!validas.length) return { salvas: 0 };
  const aberta = await jornadaAberta(usuario.id);
  const linhas = validas.map((c) => ({
    usuario_id: usuario.id,
    jornada_id: aberta?.id ?? null,
    app: c.app ?? null,
    valor_centavos: c.valor,
    metros_corrida: Math.round(c.kmCorrida * 1000),
    minutos_corrida: c.minutosCorrida != null ? Math.round(c.minutosCorrida) : null,
    metros_busca: c.kmBusca != null ? Math.round(c.kmBusca * 1000) : null,
    minutos_busca: c.minutosBusca != null ? Math.round(c.minutosBusca) : null,
    sinal: c.sinal,
    decisao: c.decisao ?? null,
    origem: c.origem,
    ocorrida_em: c.momento,
    chave: c.id ? `${usuario.id}:${c.id}` : `${usuario.id}:${c.momento}:${c.valor}`,
  }));
  const { data } = await supabaseAdmin().from("corridas_avaliadas").upsert(linhas, { onConflict: "chave", ignoreDuplicates: true }).select("id");
  revalidatePath("/m/plantao", "layout");
  return { salvas: data?.length ?? 0 };
}
