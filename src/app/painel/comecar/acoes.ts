"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { auditar } from "@/lib/auditoria";
import { exigirUsuario } from "@/lib/sessao";
import { supabaseAdmin } from "@/lib/supabase/admin";

const esquema = z.object({
  nome: z.string().trim().min(3, "Informe o nome"),
  documento: z
    .string()
    .transform((s) => s.replace(/\D/g, ""))
    .refine((s) => s.length === 11 || s.length === 14, "CPF (11 dígitos) ou CNPJ (14 dígitos)"),
  cidade: z.string().trim().min(2, "Informe a cidade"),
  uf: z.string().trim().length(2, "UF com 2 letras").toUpperCase(),
});

export type EstadoComecar = { erros?: Partial<Record<keyof z.input<typeof esquema>, string>>; mensagem?: string };

/** Cria o locador e torna o usuário Dono. Feito com a chave secreta: o RLS não deixa ninguém criar organização. */
export async function criarOrganizacao(_: EstadoComecar, form: FormData): Promise<EstadoComecar> {
  const usuario = await exigirUsuario("/painel/comecar");
  const lido = esquema.safeParse(Object.fromEntries(form));
  if (!lido.success) {
    return { erros: Object.fromEntries(lido.error.issues.map((i) => [i.path[0], i.message])) };
  }

  const admin = supabaseAdmin();
  const { data: jaMembro } = await admin.from("membros").select("id").eq("usuario_id", usuario.id).limit(1).maybeSingle();
  if (jaMembro) redirect("/painel");

  const { data: org, error } = await admin.from("organizacoes").insert(lido.data).select("id").single();
  if (error || !org) return { mensagem: "Não foi possível criar a conta. Tente de novo." };

  const { error: erroMembro } = await admin
    .from("membros")
    .insert({ organizacao_id: org.id, usuario_id: usuario.id, papel: "dono" });
  if (erroMembro) return { mensagem: "Não foi possível criar a conta. Tente de novo." };

  await auditar({ organizacaoId: org.id, usuarioId: usuario.id, acao: "organizacao.criar", entidade: "organizacoes", entidadeId: org.id, depois: lido.data });
  redirect("/painel");
}
