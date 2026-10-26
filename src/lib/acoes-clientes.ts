"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { estimarParticular, paraSlug, type TabelaParticular } from "@/dominio/ganhos/particular";
import { calcularRota } from "@/integracoes/rotas";
import { linkWhatsApp, pessoas } from "./caronas";
import { notificar } from "./notificacoes";
import { exigirUsuario } from "./sessao";
import { supabaseAdmin } from "./supabase/admin";

const RESERVADOS = new Set(["admin", "aluguei", "suporte", "app", "api", "m", "painel", "entrar"]);
const centavos = z.number().int().min(0).max(1_000_000);
const esquemaTabela = z.object({ nome: z.string().trim().min(1).max(30), tarifaBase: centavos, porKm: centavos, porMinuto: centavos, minimo: centavos });

/** Telefone BR → só dígitos com 55. Null se não parecer celular. */
function telefoneBR(t: string): string | null {
  let d = t.replace(/\D/g, "");
  if (d.length === 10 || d.length === 11) d = `55${d}`;
  return /^55\d{10,11}$/.test(d) ? d : null;
}

export async function salvarPerfilParticular(e: { slug: string; nome: string; cidade: string; whatsapp: string; apresentacao: string; tabelas: TabelaParticular[]; ativo: boolean }): Promise<{ erro?: string; ok?: boolean; slug?: string }> {
  const usuario = await exigirUsuario("/m/clientes");
  const slug = paraSlug(e.slug);
  if (slug.length < 3) return { erro: "O link precisa de pelo menos 3 letras." };
  if (RESERVADOS.has(slug)) return { erro: "Esse link é reservado. Escolha outro." };
  const whatsapp = telefoneBR(e.whatsapp);
  if (!whatsapp) return { erro: "WhatsApp inválido. Use DDD + número." };
  const tabelas = z.array(esquemaTabela).min(1).max(5).safeParse(e.tabelas);
  if (!tabelas.success) return { erro: "Confira a tabela de preços (nome e valores de cada categoria)." };
  const nome = e.nome.trim().slice(0, 60);
  const cidade = e.cidade.trim().slice(0, 60);
  if (!nome || !cidade) return { erro: "Informe o nome e a cidade." };
  const admin = supabaseAdmin();
  const { data: outro } = await admin.from("perfis_particular").select("usuario_id").eq("slug", slug).neq("usuario_id", usuario.id).maybeSingle();
  if (outro) return { erro: "Esse link já é de outra pessoa. Tente outro." };
  const { error } = await admin.from("perfis_particular").upsert({ usuario_id: usuario.id, slug, nome, cidade, whatsapp, apresentacao: e.apresentacao.trim().slice(0, 300) || null, tabelas: tabelas.data, ativo: e.ativo, atualizado_em: new Date().toISOString() });
  if (error) return { erro: "Não foi possível salvar. Tente de novo." };
  revalidatePath("/m/clientes");
  revalidatePath(`/c/${slug}`);
  return { ok: true, slug };
}

export async function mudarAgendamento(id: string, status: "confirmado" | "concluido" | "cancelado") {
  const usuario = await exigirUsuario("/m/clientes");
  await supabaseAdmin().from("agendamentos_particulares").update({ status }).eq("id", id).eq("motorista_id", usuario.id);
  revalidatePath("/m/clientes");
}

/** Público (página /c/slug): estimativa da corrida. */
export async function estimarCorridaParticular(slug: string, origem: string, destino: string) {
  if (origem.trim().length < 3 || destino.trim().length < 3) return { erro: "Informe origem e destino." };
  const { data: p } = await supabaseAdmin().from("perfis_particular").select("cidade, tabelas").eq("slug", slug).eq("ativo", true).maybeSingle();
  if (!p) return { erro: "Página não encontrada." };
  // Sem cidade no texto, procura na cidade do motorista.
  const comCidade = (t: string) => (t.includes(",") || t.toLowerCase().includes(p.cidade.toLowerCase()) ? t : `${t}, ${p.cidade}`);
  const rota = await calcularRota(comCidade(origem), comCidade(destino));
  if (!rota) return { erro: "Não achei um dos endereços. Tente com rua e número, ou o nome do lugar." };
  const tabelas = p.tabelas as TabelaParticular[];
  return { rota, precos: tabelas.map((t) => ({ nome: t.nome, valor: estimarParticular(rota.km, rota.minutos, t) })) };
}

const esquemaPedido = z.object({
  nome: z.string().trim().min(2, "Informe seu nome").max(60),
  whatsapp: z.string().trim().min(10, "Informe seu WhatsApp"),
  origem: z.string().trim().min(3).max(200),
  destino: z.string().trim().min(3).max(200),
  quando: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Informe dia e hora"),
  categoria: z.string().trim().min(1).max(30),
});

/** Público: grava o pedido, avisa o motorista e devolve o link do WhatsApp com a mensagem pronta. */
export async function agendarCorridaParticular(slug: string, entrada: z.input<typeof esquemaPedido>): Promise<{ erro?: string; link?: string }> {
  const lido = esquemaPedido.safeParse(entrada);
  if (!lido.success) return { erro: lido.error.issues[0]?.message ?? "Confira os campos." };
  const d = lido.data;
  const whatsappCliente = telefoneBR(d.whatsapp);
  if (!whatsappCliente) return { erro: "WhatsApp inválido. Use DDD + número." };
  const quando = new Date(`${d.quando}:00-03:00`);
  if (quando.getTime() < Date.now() - 10 * 60_000) return { erro: "Escolha um horário a partir de agora." };
  const admin = supabaseAdmin();
  const { data: p } = await admin.from("perfis_particular").select("*").eq("slug", slug).eq("ativo", true).maybeSingle();
  if (!p) return { erro: "Página não encontrada." };
  // Contra abuso: até 5 pedidos por hora do mesmo WhatsApp para o mesmo motorista.
  const { count } = await admin.from("agendamentos_particulares").select("id", { count: "exact", head: true }).eq("motorista_id", p.usuario_id).eq("whatsapp", whatsappCliente).gte("criado_em", new Date(Date.now() - 3_600_000).toISOString());
  if ((count ?? 0) >= 5) return { erro: "Muitos pedidos seguidos. Fale direto pelo WhatsApp do motorista." };
  const tabela = (p.tabelas as TabelaParticular[]).find((t) => t.nome === d.categoria) ?? (p.tabelas as TabelaParticular[])[0]!;
  const rota = await calcularRota(d.origem.includes(",") ? d.origem : `${d.origem}, ${p.cidade}`, d.destino.includes(",") ? d.destino : `${d.destino}, ${p.cidade}`);
  const valor = rota ? estimarParticular(rota.km, rota.minutos, tabela) : null;
  await admin.from("agendamentos_particulares").insert({
    motorista_id: p.usuario_id,
    nome: d.nome,
    whatsapp: whatsappCliente,
    origem: d.origem,
    destino: d.destino,
    quando: quando.toISOString(),
    categoria: tabela.nome,
    metros: rota ? Math.round(rota.km * 1000) : null,
    minutos: rota?.minutos ?? null,
    valor_estimado_centavos: valor ?? 0,
  });
  await notificar({ usuarioId: p.usuario_id, modelo: "particular.pedido", titulo: "Novo pedido de corrida", texto: `${d.nome}: ${d.origem} → ${d.destino}`, link: "/m/clientes", assunto: "mensagens", chave: `particular:${p.usuario_id}:${whatsappCliente}:${Date.now()}` });
  const dataHora = quando.toLocaleString("pt-BR", { weekday: "long", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
  const texto = [
    `Olá, ${p.nome}! Quero agendar uma corrida (pedido pelo seu link do Aluguei):`,
    `*Nome:* ${d.nome}`,
    `*Quando:* ${dataHora}`,
    `*Saída:* ${d.origem}`,
    `*Destino:* ${d.destino}`,
    `*Categoria:* ${tabela.nome}`,
    valor ? `*Estimativa:* R$ ${(valor / 100).toFixed(2).replace(".", ",")}${rota ? ` (${rota.km.toLocaleString("pt-BR")} km)` : ""}` : "",
  ]
    .filter(Boolean)
    .join("\n");
  return { link: linkWhatsApp(p.whatsapp, texto) };
}

/** Telefone confirmado da conta, para sugerir no WhatsApp do perfil. */
export async function meuTelefone() {
  const usuario = await exigirUsuario("/m/clientes");
  return (await pessoas([usuario.id])).get(usuario.id)?.telefone ?? null;
}
