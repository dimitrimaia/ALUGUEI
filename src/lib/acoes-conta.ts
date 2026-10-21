"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { normalizarPreferencias } from "@/dominio/conta/preferencias";
import { auditar } from "./auditoria";
import { BUCKET_AVATARES, garantirBucketAvatares, perfilDaConta } from "./conta";
import { exigirEquipe } from "./sessao";
import { supabaseAdmin } from "./supabase/admin";
import { supabaseServidor } from "./supabase/servidor";

export type Resultado = { ok: true; mensagem?: string } | { ok: false; erro: string };

async function exigirPerfil() {
  const perfil = await perfilDaConta();
  if (!perfil) throw new Error("Sessão expirada. Entre de novo.");
  return perfil;
}

/** Renova o token (que carrega nome, foto e tema para os menus) e atualiza as telas. */
async function atualizarTelas() {
  await (await supabaseServidor()).auth.refreshSession();
  revalidatePath("/", "layout");
}

export async function salvarNome(_: Resultado | null, dados: FormData): Promise<Resultado> {
  await exigirPerfil();
  const nome = String(dados.get("nome") ?? "").trim().replace(/\s+/g, " ");
  if (nome.length < 2) return { ok: false, erro: "Informe seu nome." };
  if (nome.length > 60) return { ok: false, erro: "Use até 60 caracteres." };
  const { error } = await (await supabaseServidor()).auth.updateUser({ data: { nome } });
  if (error) return { ok: false, erro: "Não foi possível salvar. Tente de novo." };
  await atualizarTelas();
  return { ok: true, mensagem: "Nome salvo." };
}

/** Endereço assinado para o navegador enviar a foto direto ao Storage. */
export async function prepararFoto(): Promise<{ caminho: string; token: string }> {
  const perfil = await exigirPerfil();
  await garantirBucketAvatares();
  const caminho = `${perfil.id}/${Date.now()}.jpg`;
  const { data, error } = await supabaseAdmin().storage.from(BUCKET_AVATARES).createSignedUploadUrl(caminho);
  if (error || !data) throw new Error("Não foi possível preparar o envio da foto.");
  return { caminho, token: data.token };
}

export async function salvarFoto(caminho: string | null): Promise<Resultado> {
  const perfil = await exigirPerfil();
  if (caminho !== null && !new RegExp(`^${perfil.id}/\\d+\\.jpg$`).test(caminho)) return { ok: false, erro: "Foto inválida." };
  const { error } = await (await supabaseServidor()).auth.updateUser({ data: { foto: caminho } });
  if (error) return { ok: false, erro: "Não foi possível salvar a foto." };
  // A foto anterior não serve mais para nada.
  if (perfil.fotoCaminho && perfil.fotoCaminho !== caminho) await supabaseAdmin().storage.from(BUCKET_AVATARES).remove([perfil.fotoCaminho]);
  await atualizarTelas();
  return { ok: true, mensagem: caminho ? "Foto atualizada." : "Foto removida." };
}

export async function salvarPreferencias(valor: unknown): Promise<Resultado> {
  await exigirPerfil();
  const preferencias = normalizarPreferencias(valor);
  const { error } = await (await supabaseServidor()).auth.updateUser({ data: { preferencias } });
  if (error) return { ok: false, erro: "Não foi possível salvar. Tente de novo." };
  await atualizarTelas();
  return { ok: true };
}

/** Encerra a sessão em todos os aparelhos (celular perdido, computador emprestado). */
export async function sairDeTodosOsAparelhos() {
  const supabase = await supabaseServidor();
  await supabase.auth.signOut({ scope: "global" });
  redirect("/entrar?saiu=todos");
}

export async function salvarLocadora(_: Resultado | null, dados: FormData): Promise<Resultado> {
  const { organizacao, papel, usuario } = await exigirEquipe();
  if (papel !== "dono") return { ok: false, erro: "Só o dono da conta altera os dados da locadora." };
  const nome = String(dados.get("nome") ?? "").trim();
  const cidade = String(dados.get("cidade") ?? "").trim();
  const uf = String(dados.get("uf") ?? "").trim().toUpperCase();
  const modoAssistido = dados.get("modo_assistido") === "on";
  if (nome.length < 2) return { ok: false, erro: "Informe o nome da locadora." };
  if (cidade.length < 2 || !/^[A-Z]{2}$/.test(uf)) return { ok: false, erro: "Informe a cidade e a UF (2 letras)." };
  const depois = { nome, cidade, uf, modo_assistido: modoAssistido };
  const { error } = await supabaseAdmin().from("organizacoes").update(depois).eq("id", organizacao.id);
  if (error) return { ok: false, erro: "Não foi possível salvar. Tente de novo." };
  await auditar({
    organizacaoId: organizacao.id,
    usuarioId: usuario.id,
    acao: "organizacao.atualizar",
    entidade: "organizacoes",
    entidadeId: organizacao.id,
    antes: { nome: organizacao.nome, cidade: organizacao.cidade, uf: organizacao.uf, modo_assistido: organizacao.modo_assistido },
    depois,
  });
  revalidatePath("/painel", "layout");
  return { ok: true, mensagem: "Dados da locadora salvos." };
}
