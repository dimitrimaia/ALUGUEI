import "server-only";
import { cache } from "react";
import { supabaseAdmin } from "./supabase/admin";

export type UsuarioAdmin = {
  id: string;
  email: string | null;
  telefone: string | null;
  nome: string | null;
  criadoEm: string;
  ultimoLogin: string | null;
  emailConfirmado: boolean;
  bloqueado: boolean;
  temAluguelExterno: boolean;
};

/** Todas as contas (até 10 mil), da mais nova para a mais antiga. Só para o painel da equipe. */
export const listarUsuarios = cache(async (): Promise<UsuarioAdmin[]> => {
  const admin = supabaseAdmin();
  const todos: UsuarioAdmin[] = [];
  for (let pagina = 1; pagina <= 10; pagina++) {
    const { data, error } = await admin.auth.admin.listUsers({ page: pagina, perPage: 1000 });
    if (error) break;
    for (const u of data.users) {
      const meta = (u.user_metadata ?? {}) as Record<string, unknown>;
      todos.push({
        id: u.id,
        email: u.email ?? null,
        telefone: u.phone || null,
        nome: typeof meta.nome === "string" ? meta.nome : null,
        criadoEm: u.created_at,
        ultimoLogin: u.last_sign_in_at ?? null,
        emailConfirmado: Boolean(u.email_confirmed_at),
        bloqueado: Boolean(u.banned_until && new Date(u.banned_until) > new Date()),
        temAluguelExterno: Boolean(meta.aluguel),
      });
    }
    if (data.users.length < 1000) break;
  }
  return todos.sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));
});
