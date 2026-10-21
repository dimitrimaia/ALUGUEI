import "server-only";
import { cache } from "react";
import { type Preferencias, nomeDeExibicao, normalizarPreferencias } from "@/dominio/conta/preferencias";
import { supabaseAdmin } from "./supabase/admin";
import { supabaseServidor } from "./supabase/servidor";

export const BUCKET_AVATARES = "avatares";

export interface PerfilConta {
  id: string;
  nome: string;
  /** Nome digitado pela pessoa (vazio se ela nunca informou). */
  nomeInformado: string;
  email: string | null;
  telefone: string | null;
  emailConfirmado: boolean;
  telefoneConfirmado: boolean;
  foto: string | null;
  fotoCaminho: string | null;
  preferencias: Preferencias;
  criadoEm: string;
}

export function urlAvatar(caminho: string | null | undefined): string | null {
  if (!caminho) return null;
  return supabaseAdmin().storage.from(BUCKET_AVATARES).getPublicUrl(caminho).data.publicUrl;
}

/** Perfil completo do usuário logado, lido do Supabase Auth (uma chamada por requisição). */
export const perfilDaConta = cache(async (): Promise<PerfilConta | null> => {
  const supabase = await supabaseServidor();
  const { data } = await supabase.auth.getUser();
  const u = data.user;
  if (!u) return null;
  const meta = (u.user_metadata ?? {}) as Record<string, unknown>;
  const fotoCaminho = typeof meta.foto === "string" && meta.foto.startsWith(`${u.id}/`) ? meta.foto : null;
  return {
    id: u.id,
    nome: nomeDeExibicao(meta.nome, u.email ?? null, u.phone || null),
    nomeInformado: typeof meta.nome === "string" ? meta.nome : "",
    email: u.email ?? null,
    telefone: u.phone || null,
    emailConfirmado: Boolean(u.email_confirmed_at),
    telefoneConfirmado: Boolean(u.phone_confirmed_at),
    foto: urlAvatar(fotoCaminho),
    fotoCaminho,
    preferencias: normalizarPreferencias(meta.preferencias),
    criadoEm: u.created_at,
  };
});

/** Cria o bucket público das fotos de perfil na primeira vez que alguém envia uma. */
export async function garantirBucketAvatares() {
  const admin = supabaseAdmin();
  const { data } = await admin.storage.getBucket(BUCKET_AVATARES);
  if (data) return;
  const { error } = await admin.storage.createBucket(BUCKET_AVATARES, { public: true, fileSizeLimit: 2 * 1024 * 1024, allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"] });
  if (error && !/already exists/i.test(error.message)) throw new Error(`Falha ao criar o bucket de fotos: ${error.message}`);
}
