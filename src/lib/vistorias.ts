import "server-only";
import type { ChecklistVistoria } from "@/dominio/vistoria/roteiro";
import { linkTemporario } from "./evidencias";
import { supabaseAdmin } from "./supabase/admin";

/** Fotos da vistoria com links temporários, na ordem do roteiro. Chame só depois de checar o acesso. */
export async function fotosDaVistoria(checklist: ChecklistVistoria) {
  const ids = [...Object.values(checklist.fotos).filter(Boolean), ...checklist.fotosExtras] as string[];
  if (!ids.length) return {};
  const { data } = await supabaseAdmin().from("evidencias").select("id, caminho_storage, recebido_em, latitude, longitude").in("id", ids);
  const urls: Record<string, { url: string | null; recebidoEm: string; temLocal: boolean }> = {};
  for (const e of data ?? []) {
    urls[e.id] = { url: await linkTemporario(e.caminho_storage), recebidoEm: e.recebido_em, temLocal: e.latitude !== null };
  }
  return urls;
}
