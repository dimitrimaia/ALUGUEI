import "server-only";
import type { Json } from "@/db/tipos";
import { supabaseAdmin } from "./supabase/admin";

/** RNF-007: grava uma ação sensível. A tabela só aceita inserção. */
export async function auditar(registro: {
  organizacaoId: string | null;
  usuarioId: string | null;
  acao: string;
  entidade: string;
  entidadeId?: string | null;
  antes?: Json;
  depois?: Json;
}) {
  const { error } = await supabaseAdmin().from("auditoria").insert({
    organizacao_id: registro.organizacaoId,
    usuario_id: registro.usuarioId,
    acao: registro.acao,
    entidade: registro.entidade,
    entidade_id: registro.entidadeId ?? null,
    antes: registro.antes ?? null,
    depois: registro.depois ?? null,
  });
  if (error) throw new Error(`Falha ao auditar ${registro.acao}: ${error.message}`);
}
