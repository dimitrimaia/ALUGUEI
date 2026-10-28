"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { data as dataISO, hoje } from "@/dominio/datas/data";
import { lerReais } from "@/dominio/dinheiro/centavos";
import { normalizarCriterios, normalizarPerfil } from "@/dominio/ganhos/custos";
import { comCampoVolta, normalizarPreferenciasCopiloto } from "@/dominio/ganhos/copiloto";
import { diaOperacional, normalizarFinancas } from "@/dominio/ganhos/financas";
import { geocodificar } from "@/integracoes/rotas";
import { CATEGORIAS_DESPESA, PLATAFORMAS } from "@/dominio/ganhos/plantao";
import { exigirUsuario } from "./sessao";
import { supabaseAdmin } from "./supabase/admin";
import { jornadaAberta } from "./plantao";
import { lugaresDaComunidade, marcarLugares, sincronizarLugares } from "./comunidade";

export type EstadoForm = { erro?: string; ok?: boolean; id?: string; tipo?: "ganho" | "despesa" };

/** Dia de trabalho de agora, com a virada configurada (meia-noite ou 4h). */
async function diaDeHoje(usuarioId: string) {
  const { data } = await supabaseAdmin().from("perfis_custo").select("*").eq("usuario_id", usuarioId).maybeSingle();
  return diaOperacional(normalizarFinancas((data as { financas?: unknown } | null)?.financas).virada);
}

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
  const dia = form.get("dia") ? dataISO(lido.data.dia) : await diaDeHoje(usuario.id);
  const { data } = await supabaseAdmin().from("ganhos").insert({ usuario_id: usuario.id, jornada_id: aberta?.id ?? null, dia, plataforma: lido.data.plataforma, valor_centavos: lido.data.valor!, corridas: lido.data.corridas }).select("id").single();
  atualizar();
  return { ok: true, id: data?.id, tipo: "ganho" };
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
  const dia = form.get("dia") ? dataISO(d.dia) : await diaDeHoje(usuario.id);
  const { data } = await supabaseAdmin()
    .from("despesas_motorista")
    .insert({ usuario_id: usuario.id, dia, categoria: d.categoria, valor_centavos: d.valor!, quantidade_mil: d.quantidade ? Math.round(d.quantidade * 1000) : null, km_odometro: d.km, descricao: d.descricao || null })
    .select("id")
    .single();
  atualizar();
  return { ok: true, id: data?.id, tipo: "despesa" };
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

/** Custos do carro e meta do dia (a régua do Copiloto tem a tela dela). */
export async function salvarCustos(entrada: { perfil: unknown; meta: number }): Promise<EstadoForm> {
  const usuario = await exigirUsuario("/m/plantao/custos");
  const meta = Number.isSafeInteger(entrada.meta) && entrada.meta >= 0 ? entrada.meta : 0;
  return gravarPerfil(usuario.id, { perfil: normalizarPerfil(entrada.perfil), meta_diaria_centavos: meta });
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
  valorFinal: z.number().int().positive().max(10_000_000).nullable().optional(),
  decisaoOrigem: z.enum(["toque", "pergunta", "automatica"]).nullable().optional(),
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
  const completas = linhas.map((l, i) => ({ ...l, valor_final_centavos: validas[i]!.valorFinal ?? null, decisao_origem: validas[i]!.decisaoOrigem ?? null }));
  let { data, error } = await supabaseAdmin().from("corridas_avaliadas").upsert(completas, { onConflict: "chave", ignoreDuplicates: true }).select("id");
  // Antes da migração 0010 as colunas novas não existem: grava sem elas.
  if (error) ({ data, error } = await supabaseAdmin().from("corridas_avaliadas").upsert(linhas, { onConflict: "chave", ignoreDuplicates: true }).select("id"));
  revalidatePath("/m/plantao", "layout");
  return { salvas: data?.length ?? 0 };
}

const esquemaFinalizada = z.object({
  id: z.string().uuid(),
  metros: z.number().int().min(0).max(2_000_000),
  minutos: z.number().int().min(0).max(1440),
  fim: z.string().datetime({ offset: true }),
  status: z.literal("concluida"),
});

/**
 * Corridas que o celular acompanhou até o fim (GPS): grava km e tempo reais na
 * corrida já registrada. Devolve os ids tratados (os que ainda não subiram ficam
 * para a próxima vez). Antes da migração 0011, não grava e não confirma.
 */
export async function registrarFinalizadas(lista: unknown[]): Promise<{ ids: string[] }> {
  const usuario = await exigirUsuario("/m/plantao");
  const ids: string[] = [];
  for (const c of lista.slice(0, 200)) {
    const r = esquemaFinalizada.safeParse(c);
    if (!r.success) continue;
    const { data, error } = await supabaseAdmin()
      .from("corridas_avaliadas")
      .update({ metros_reais: r.data.metros, minutos_reais: r.data.minutos, finalizada_em: r.data.fim })
      .eq("usuario_id", usuario.id)
      .eq("chave", `${usuario.id}:${r.data.id}`)
      .select("id");
    if (error) break;
    if (data?.length) ids.push(r.data.id);
  }
  if (ids.length) revalidatePath("/m/plantao", "layout");
  return { ids };
}

/** Lugares que o motorista marcou como "evitar" na bolha do Android: entram na régua dele. */
export async function adicionarLugaresEvitar(lugares: string[]): Promise<void> {
  const usuario = await exigirUsuario("/m/plantao");
  const limpos = lugares.filter((l) => typeof l === "string").slice(0, 50);
  if (!limpos.length) return;
  const admin = supabaseAdmin();
  const { data } = await admin.from("perfis_custo").select("criterios").eq("usuario_id", usuario.id).maybeSingle();
  if (!data) return;
  const atual = normalizarCriterios(data.criterios);
  const criterios = normalizarCriterios({ ...atual, evitar: [...atual.evitar, ...limpos] });
  await admin.from("perfis_custo").update({ criterios, atualizado_em: new Date().toISOString() }).eq("usuario_id", usuario.id);
  await marcarLugares(usuario.id, limpos).catch(() => null);
  revalidatePath("/m/plantao", "layout");
}

/** Mínimos ajustados pela régua rápida da bolha. */
export async function salvarRegua(r: { minimoPorKm?: number; minimoPorHora?: number }): Promise<void> {
  const usuario = await exigirUsuario("/m/plantao");
  const admin = supabaseAdmin();
  const { data } = await admin.from("perfis_custo").select("criterios").eq("usuario_id", usuario.id).maybeSingle();
  if (!data) return;
  const criterios = normalizarCriterios({ ...normalizarCriterios(data.criterios), ...(r.minimoPorKm != null ? { minimoPorKm: Math.round(r.minimoPorKm) } : {}), ...(r.minimoPorHora != null ? { minimoPorHora: Math.round(r.minimoPorHora) } : {}) });
  await admin.from("perfis_custo").update({ criterios, atualizado_em: new Date().toISOString() }).eq("usuario_id", usuario.id);
  revalidatePath("/m/plantao", "layout");
}

/** Grava só a parte do perfil de custos indicada, criando a linha se ainda não existe. */
async function gravarPerfil(usuarioId: string, campos: Record<string, unknown>) {
  const admin = supabaseAdmin();
  const { data } = await admin.from("perfis_custo").select("usuario_id").eq("usuario_id", usuarioId).maybeSingle();
  const agora = new Date().toISOString();
  const { error } = data
    ? await admin.from("perfis_custo").update({ ...campos, atualizado_em: agora } as never).eq("usuario_id", usuarioId)
    : await admin.from("perfis_custo").insert({ usuario_id: usuarioId, perfil: normalizarPerfil(null), criterios: normalizarCriterios(null), ...campos, atualizado_em: agora } as never);
  atualizar();
  return error ? { erro: "Não foi possível salvar. Se acabou de atualizar o app, rode a migração 0009 no Supabase." } : { ok: true };
}

/** Régua completa do Copiloto (tela Régua). */
export async function salvarReguaCompleta(criterios: unknown): Promise<EstadoForm> {
  const usuario = await exigirUsuario("/m/plantao/regua");
  const c = normalizarCriterios(criterios);
  // A lista "evitar" também conta (anônima) para os avisos da comunidade.
  await sincronizarLugares(usuario.id, c.evitar).catch(() => null);
  if (!c.contarVolta) return gravarPerfil(usuario.id, { criterios: c });
  // Volta ligada: o cartão passa a mostrar o campo "Volta" para o motorista ver o custo.
  const { data } = await supabaseAdmin().from("perfis_custo").select("*").eq("usuario_id", usuario.id).maybeSingle();
  const preferencias = comCampoVolta(normalizarPreferenciasCopiloto((data as { preferencias?: unknown } | null)?.preferencias));
  return gravarPerfil(usuario.id, { criterios: c, preferencias });
}

export async function salvarPreferenciasCopiloto(preferencias: unknown): Promise<EstadoForm> {
  const usuario = await exigirUsuario("/m/plantao/copiloto");
  return gravarPerfil(usuario.id, { preferencias: normalizarPreferenciasCopiloto(preferencias) });
}

export async function salvarFinancas(financas: unknown): Promise<EstadoForm> {
  const usuario = await exigirUsuario("/m/plantao/financas");
  return gravarPerfil(usuario.id, { financas: normalizarFinancas(financas) });
}

/** Endereço da base (casa) → coordenadas, para o custo da volta. */
export async function buscarEnderecoBase(texto: string): Promise<{ nome: string; lat: number; lon: number } | null> {
  await exigirUsuario("/m/plantao/copiloto");
  const p = await geocodificar(texto);
  return p ? { nome: p.nome || texto, lat: p.lat, lon: p.lon } : null;
}

/** Guardar (positivo) ou usar (negativo) dinheiro da reserva de manutenção. */
export async function movimentarReserva(_: EstadoForm, form: FormData): Promise<EstadoForm> {
  const usuario = await exigirUsuario("/m/plantao/financas");
  const valor = lerReais(String(form.get("valor") ?? ""));
  if (!valor) return { erro: "Informe o valor." };
  const sinal = form.get("tipo") === "usar" ? -1 : 1;
  const { error } = await supabaseAdmin()
    .from("reservas_manutencao")
    .insert({ usuario_id: usuario.id, dia: await diaDeHoje(usuario.id), valor_centavos: sinal * valor, descricao: String(form.get("descricao") ?? "").trim().slice(0, 80) || null });
  if (error) return { erro: "Não foi possível salvar. Rode a migração 0009 no Supabase." };
  atualizar();
  return { ok: true };
}

/**
 * Fechar o dia em 1 minuto: ganhos de cada app, km e combustível de uma vez.
 * Cria o plantão do dia quando não houve (para o R$/hora e o R$/km).
 */
export async function fecharDia(_: EstadoForm, form: FormData): Promise<EstadoForm> {
  const usuario = await exigirUsuario("/m/plantao/fechar");
  const dia = await diaDeHoje(usuario.id);
  const admin = supabaseAdmin();
  const ganhos = PLATAFORMAS.flatMap((p) => {
    const valor = lerReais(String(form.get(`ganho_${p}`) ?? ""));
    const corridas = Math.max(1, Math.min(200, Number(form.get(`corridas_${p}`)) || 1));
    return valor ? [{ usuario_id: usuario.id, dia, plataforma: p, valor_centavos: valor, corridas }] : [];
  });
  const combustivel = lerReais(String(form.get("combustivel") ?? ""));
  const km = Number(String(form.get("km") ?? "").replace(/\D/g, "")) || 0;
  const horas = Number(String(form.get("horas") ?? "").replace(",", ".")) || 0;
  if (!ganhos.length && !combustivel && !km) return { erro: "Preencha pelo menos um ganho." };
  if (ganhos.length) await admin.from("ganhos").insert(ganhos);
  if (combustivel) await admin.from("despesas_motorista").insert({ usuario_id: usuario.id, dia, categoria: "combustivel", valor_centavos: combustivel, descricao: "Fechamento do dia" });
  if ((km || horas) && !(await jornadaAberta(usuario.id))) {
    const fim = new Date();
    const inicio = new Date(fim.getTime() - Math.min(24, Math.max(0, horas)) * 3_600_000);
    await admin.from("jornadas").insert({ usuario_id: usuario.id, inicio: inicio.toISOString(), fim: fim.toISOString(), km_inicial: km ? 0 : null, km_final: km || null });
  }
  atualizar();
  return { ok: true };
}

/** Corrigir a decisão de uma oferta no histórico (aceitei/recusei). */
export async function corrigirDecisao(id: string, decisao: "aceitei" | "recusei" | null) {
  const usuario = await exigirUsuario("/m/plantao/historico");
  await supabaseAdmin().from("corridas_avaliadas").update({ decisao }).eq("id", id).eq("usuario_id", usuario.id);
  revalidatePath("/m/plantao", "layout");
}

/** Perfis de régua (Dia, Noite, Aeroporto): guardados nas preferências do Copiloto. */
export async function salvarPerfisRegua(perfis: { nome: string; criterios: unknown }[]): Promise<EstadoForm> {
  const usuario = await exigirUsuario("/m/plantao/regua");
  const { data } = await supabaseAdmin().from("perfis_custo").select("*").eq("usuario_id", usuario.id).maybeSingle();
  const atual = normalizarPreferenciasCopiloto((data as { preferencias?: unknown } | null)?.preferencias);
  const limpos = perfis.slice(0, 6).map((p) => ({ nome: String(p.nome).trim().slice(0, 30) || "Perfil", criterios: normalizarCriterios(p.criterios) }));
  return gravarPerfil(usuario.id, { preferencias: { ...atual, perfis: limpos } });
}

/** Editar uma oferta do histórico (valor, distâncias, tempos e decisão). */
export async function editarCorrida(id: string, _: EstadoForm, form: FormData): Promise<EstadoForm> {
  const usuario = await exigirUsuario("/m/plantao/historico");
  const num = (k: string) => {
    const t = String(form.get(k) ?? "").trim().replace(/\./g, "").replace(",", ".");
    const n = Number(t);
    return t && Number.isFinite(n) && n >= 0 ? n : null;
  };
  const valor = lerReais(String(form.get("valor") ?? ""));
  const km = num("km");
  if (!valor || !km) return { erro: "Informe o valor e os km da viagem." };
  const decisao = form.get("decisao");
  const { error } = await supabaseAdmin()
    .from("corridas_avaliadas")
    .update({
      valor_centavos: valor,
      metros_corrida: Math.round(km * 1000),
      minutos_corrida: num("minutos") !== null ? Math.round(num("minutos")!) : null,
      metros_busca: num("kmBusca") !== null ? Math.round(num("kmBusca")! * 1000) : null,
      minutos_busca: num("minutosBusca") !== null ? Math.round(num("minutosBusca")!) : null,
      decisao: decisao === "aceitei" || decisao === "recusei" ? decisao : null,
    })
    .eq("id", id)
    .eq("usuario_id", usuario.id);
  if (error) return { erro: "Não foi possível salvar." };
  revalidatePath("/m/plantao", "layout");
  redirect("/m/plantao/historico");
}

export async function excluirCorrida(id: string) {
  const usuario = await exigirUsuario("/m/plantao/historico");
  await supabaseAdmin().from("corridas_avaliadas").delete().eq("id", id).eq("usuario_id", usuario.id);
  revalidatePath("/m/plantao", "layout");
  redirect("/m/plantao/historico");
}

/** Lugares que 3+ motoristas evitam (anônimo), para a bolha do Android avisar. */
export async function buscarLugaresComunidade() {
  await exigirUsuario("/m/plantao");
  return lugaresDaComunidade().catch(() => []);
}
