"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { normalizarCelular } from "@/dominio/cadastro/telefone";
import { registrarMensagem } from "@/lib/conversas";
import { exigirUsuario } from "@/lib/sessao";
import { supabaseAdmin } from "@/lib/supabase/admin";

const esquema = z.object({
  nome: z.string().trim().min(3, "Informe seu nome"),
  celular: z.string().transform((s, ctx) => {
    const c = normalizarCelular(s);
    if (!c) ctx.addIssue({ code: "custom", message: "Celular com DDD" });
    return c ?? "";
  }),
  mensagem: z.string().trim().min(2, "Escreva uma mensagem").max(2000),
});

export type EstadoInteresse = { erros?: Record<string, string>; mensagem?: string };

/** Abre (ou reabre) a conversa do motorista com o locador do anúncio. */
export async function iniciarConversa(anuncioId: string, _: EstadoInteresse, form: FormData): Promise<EstadoInteresse> {
  const usuario = await exigirUsuario(`/carros/${anuncioId}/interesse`);
  const lido = esquema.safeParse(Object.fromEntries(form));
  if (!lido.success) return { erros: Object.fromEntries(lido.error.issues.map((i) => [String(i.path[0]), i.message])) };

  const admin = supabaseAdmin();
  const { data: anuncio } = await admin.from("anuncios").select("id, organizacao_id, status").eq("id", anuncioId).maybeSingle();
  if (!anuncio || anuncio.status !== "ativo") return { mensagem: "Este anúncio não está mais disponível." };

  const { data: existente } = await admin.from("conversas").select("id").eq("anuncio_id", anuncioId).eq("usuario_id", usuario.id).maybeSingle();
  if (existente) redirect(`/m/conversas/${existente.id}`);

  const { data: conversa, error } = await admin
    .from("conversas")
    .insert({ organizacao_id: anuncio.organizacao_id, anuncio_id: anuncioId, usuario_id: usuario.id, nome_motorista: lido.data.nome, telefone_motorista: lido.data.celular })
    .select("id")
    .single();
  if (error || !conversa) return { mensagem: "Não foi possível abrir a conversa. Tente de novo." };
  await registrarMensagem(conversa.id, "motorista", usuario.id, lido.data.mensagem);
  redirect(`/m/conversas/${conversa.id}`);
}
