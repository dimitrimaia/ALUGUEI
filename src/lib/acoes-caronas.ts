"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { lerReais } from "@/dominio/dinheiro/centavos";
import { contribuicaoMaxima, validarContribuicao } from "@/dominio/ganhos/carona";
import { taxas } from "@/dominio/ganhos/custos";
import { limparCidade, UFS } from "@/dominio/ganhos/ufs";
import { calcularRota } from "@/integracoes/rotas";
import { pessoas, REGRAS_CARONA, vagasLivres } from "./caronas";
import { notificar } from "./notificacoes";
import { configPlantao } from "./plantao";
import { exigirUsuario } from "./sessao";
import { supabaseAdmin } from "./supabase/admin";

export type EstadoCarona = { erro?: string; campos?: Record<string, string> };

/** Km da viagem pelo serviço de rotas, para preencher a oferta. */
export async function estimarKmCarona(origem: string, destino: string) {
  await exigirUsuario("/m/caronas/oferecer");
  const r = await calcularRota(origem, destino);
  return r ? { km: Math.round(r.km), minutos: r.minutos, estimada: r.estimada } : null;
}

/** Máximo que cada pessoa pode contribuir, com os custos do carro de quem oferece. */
export async function maximoCarona(km: number, pedagios: number, vagas: number) {
  const usuario = await exigirUsuario("/m/caronas/oferecer");
  const { perfil } = await configPlantao(usuario.id);
  return contribuicaoMaxima(taxas(perfil), Math.max(0, km), Math.max(0, pedagios), Math.max(1, vagas));
}

export async function oferecerCarona(_: EstadoCarona, form: FormData): Promise<EstadoCarona> {
  const usuario = await exigirUsuario("/m/caronas/oferecer");
  const bruto = Object.fromEntries(form);
  const lido = z
    .object({
      origemCidade: z.string().trim().min(2, "Informe a cidade de saída").max(60),
      origemUf: z.enum(UFS, { message: "Escolha o estado de saída" }),
      origemPonto: z.string().trim().max(120).optional(),
      destinoCidade: z.string().trim().min(2, "Informe a cidade de destino").max(60),
      destinoUf: z.enum(UFS, { message: "Escolha o estado de destino" }),
      destinoPonto: z.string().trim().max(120).optional(),
      partida: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Informe dia e hora da saída"),
      vagas: z.coerce.number().int().min(1, "Pelo menos 1 vaga").max(6),
      km: z.coerce.number().int().min(5, "Informe a distância (km)").max(5000),
      pedagios: z.preprocess((v) => (typeof v === "string" && v.trim() ? lerReais(v) : 0), z.number().int().min(0)),
      contribuicao: z.preprocess((v) => (typeof v === "string" && v.trim() ? lerReais(v) : null), z.number({ message: "Informe a contribuição por pessoa" }).int().min(0)),
      carro: z.string().trim().max(60).optional(),
      observacoes: z.string().trim().max(500).optional(),
    })
    .safeParse(bruto);
  if (!lido.success) return { erro: lido.error.issues[0]?.message ?? "Confira os campos." };
  const d = lido.data;
  const partida = new Date(`${d.partida}:00-03:00`);
  if (partida.getTime() < Date.now() + 30 * 60_000) return { erro: "A saída precisa ser daqui a pelo menos 30 minutos." };
  const { perfil } = await configPlantao(usuario.id);
  const maximo = contribuicaoMaxima(taxas(perfil), d.km, d.pedagios, d.vagas);
  const problema = validarContribuicao(d.contribuicao, maximo);
  if (problema) return { erro: problema };
  const regras = Object.fromEntries(Object.keys(REGRAS_CARONA).map((k) => [k, form.get(`regra_${k}`) === "on"]));
  const { data, error } = await supabaseAdmin()
    .from("caronas")
    .insert({
      motorista_id: usuario.id,
      origem_cidade: limparCidade(d.origemCidade),
      origem_uf: d.origemUf,
      origem_ponto: d.origemPonto || null,
      destino_cidade: limparCidade(d.destinoCidade),
      destino_uf: d.destinoUf,
      destino_ponto: d.destinoPonto || null,
      partida: partida.toISOString(),
      vagas: d.vagas,
      km: d.km,
      pedagios_centavos: d.pedagios,
      contribuicao_centavos: d.contribuicao,
      contribuicao_maxima_centavos: maximo,
      carro: d.carro || null,
      regras,
      observacoes: d.observacoes || null,
    })
    .select("id")
    .single();
  if (error || !data) return { erro: "Não foi possível publicar. Tente de novo." };
  revalidatePath("/m/caronas");
  revalidatePath("/caronas");
  redirect(`/m/caronas/${data.id}?publicada=1`);
}

export async function reservarCarona(caronaId: string, _: EstadoCarona, form: FormData): Promise<EstadoCarona> {
  const usuario = await exigirUsuario(`/m/caronas/${caronaId}`);
  const admin = supabaseAdmin();
  const { data: c } = await admin.from("caronas").select("*").eq("id", caronaId).eq("status", "aberta").maybeSingle();
  if (!c) return { erro: "Esta carona não está mais disponível." };
  if (c.motorista_id === usuario.id) return { erro: "Esta carona é sua." };
  const lugares = Math.max(1, Math.min(6, Number(form.get("lugares")) || 1));
  const livres = (await vagasLivres([c.id])).get(c.id) ?? 0;
  if (lugares > livres) return { erro: livres ? `Só ${livres === 1 ? "resta 1 vaga" : `restam ${livres} vagas`}.` : "Não há mais vagas." };
  const eu = (await pessoas([usuario.id])).get(usuario.id);
  if (!eu?.telefoneConfirmado) return { erro: "Confirme o seu celular em Conta › Dados pessoais antes de reservar: é por ele que vocês combinam o encontro." };
  const mensagem = String(form.get("mensagem") ?? "").trim().slice(0, 300) || null;
  const { error } = await admin.from("reservas_carona").upsert({ carona_id: c.id, passageiro_id: usuario.id, lugares, mensagem, status: "pendente", decidido_em: null }, { onConflict: "carona_id,passageiro_id" });
  if (error) return { erro: "Não foi possível reservar. Tente de novo." };
  await notificar({ usuarioId: c.motorista_id, modelo: "carona.pedido", titulo: "Pedido de carona", texto: `${eu.nome} quer ${lugares === 1 ? "1 lugar" : `${lugares} lugares`} de ${c.origem_cidade} para ${c.destino_cidade}.`, link: `/m/caronas/${c.id}`, assunto: "mensagens", chave: `carona:${c.id}:${usuario.id}:${Date.now()}` });
  revalidatePath(`/m/caronas/${c.id}`);
  return {};
}

export async function decidirReserva(reservaId: string, decisao: "aceita" | "recusada") {
  const usuario = await exigirUsuario("/m/caronas");
  const admin = supabaseAdmin();
  const { data: r } = await admin.from("reservas_carona").select("*, caronas!inner(*)").eq("id", reservaId).maybeSingle();
  const c = r?.caronas as unknown as { id: string; motorista_id: string; origem_cidade: string; destino_cidade: string } | undefined;
  if (!r || !c || c.motorista_id !== usuario.id || r.status !== "pendente") return;
  if (decisao === "aceita" && ((await vagasLivres([c.id])).get(c.id) ?? 0) < r.lugares) return;
  await admin.from("reservas_carona").update({ status: decisao, decidido_em: new Date().toISOString() }).eq("id", reservaId).eq("status", "pendente");
  await notificar({
    usuarioId: r.passageiro_id,
    modelo: "carona.decisao",
    titulo: decisao === "aceita" ? "Carona confirmada!" : "Carona não confirmada",
    texto: decisao === "aceita" ? `Sua vaga de ${c.origem_cidade} para ${c.destino_cidade} está confirmada. Combine o encontro pelo WhatsApp.` : `O motorista não confirmou a vaga de ${c.origem_cidade} para ${c.destino_cidade}. Veja outras caronas.`,
    link: `/m/caronas/${c.id}`,
    assunto: "mensagens",
    chave: `carona:decisao:${reservaId}`,
  });
  revalidatePath(`/m/caronas/${c.id}`);
}

export async function cancelarReserva(caronaId: string) {
  const usuario = await exigirUsuario(`/m/caronas/${caronaId}`);
  await supabaseAdmin().from("reservas_carona").update({ status: "cancelada" }).eq("carona_id", caronaId).eq("passageiro_id", usuario.id);
  revalidatePath(`/m/caronas/${caronaId}`);
}

export async function cancelarCarona(caronaId: string) {
  const usuario = await exigirUsuario(`/m/caronas/${caronaId}`);
  const admin = supabaseAdmin();
  const { data: c } = await admin.from("caronas").update({ status: "cancelada" }).eq("id", caronaId).eq("motorista_id", usuario.id).select("*").maybeSingle();
  if (!c) return;
  const { data: reservas } = await admin.from("reservas_carona").select("passageiro_id").eq("carona_id", caronaId).in("status", ["pendente", "aceita"]);
  await Promise.all(
    (reservas ?? []).map((r) =>
      notificar({ usuarioId: r.passageiro_id, modelo: "carona.cancelada", titulo: "Carona cancelada", texto: `A carona de ${c.origem_cidade} para ${c.destino_cidade} foi cancelada pelo motorista.`, link: "/m/caronas", assunto: "mensagens", chave: `carona:cancelada:${caronaId}:${r.passageiro_id}` }),
    ),
  );
  revalidatePath("/m/caronas");
  redirect("/m/caronas?aba=minhas");
}
