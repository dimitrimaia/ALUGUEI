import "server-only";
import { nomeDeExibicao } from "@/dominio/conta/preferencias";
import { supabaseAdmin } from "./supabase/admin";
import { urlAvatar } from "./conta";

export type Pessoa = { id: string; nome: string; foto: string | null; telefone: string | null; telefoneConfirmado: boolean };

/** Nome, foto e celular de quem oferece ou reserva (o celular só é mostrado depois da reserva aceita). */
export async function pessoas(ids: string[]): Promise<Map<string, Pessoa>> {
  const admin = supabaseAdmin();
  const unicos = [...new Set(ids)];
  const lista = await Promise.all(
    unicos.map(async (id) => {
      const { data } = await admin.auth.admin.getUserById(id);
      const u = data.user;
      const meta = (u?.user_metadata ?? {}) as Record<string, unknown>;
      return { id, nome: nomeDeExibicao(meta.nome, u?.email ?? null, u?.phone || null), foto: urlAvatar(typeof meta.foto === "string" ? meta.foto : null), telefone: u?.phone || null, telefoneConfirmado: Boolean(u?.phone_confirmed_at) };
    }),
  );
  return new Map(lista.map((p) => [p.id, p]));
}

/** Busca sem acento e sem maiúscula (o banco guarda como a pessoa digitou). */
const normal = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

export async function buscarCaronas(f: { de?: string; para?: string; dia?: string }) {
  const agora = new Date();
  const inicio = f.dia ? new Date(`${f.dia}T00:00:00-03:00`) : agora;
  let q = supabaseAdmin()
    .from("caronas")
    .select("*")
    .eq("status", "aberta")
    .gte("partida", (inicio < agora ? agora : inicio).toISOString())
    .order("partida")
    .limit(100);
  if (f.dia) q = q.lt("partida", new Date(new Date(`${f.dia}T00:00:00-03:00`).getTime() + 86_400_000).toISOString());
  const { data } = await q;
  const de = f.de ? normal(f.de) : "";
  const para = f.para ? normal(f.para) : "";
  return (data ?? []).filter((c) => (!de || normal(c.origem_cidade).includes(de)) && (!para || normal(c.destino_cidade).includes(para)));
}

/** Vagas ainda livres (reservas pendentes não ocupam: o motorista ainda vai decidir). */
export async function vagasLivres(caronaIds: string[]) {
  if (!caronaIds.length) return new Map<string, number>();
  const admin = supabaseAdmin();
  const [{ data: caronas }, { data: aceitas }] = await Promise.all([
    admin.from("caronas").select("id, vagas").in("id", caronaIds),
    admin.from("reservas_carona").select("carona_id, lugares").in("carona_id", caronaIds).eq("status", "aceita"),
  ]);
  return new Map((caronas ?? []).map((c) => [c.id, c.vagas - (aceitas ?? []).filter((r) => r.carona_id === c.id).reduce((s, r) => s + r.lugares, 0)]));
}

export const REGRAS_CARONA = { bagagem: "Cabe bagagem", semFumar: "Sem fumar", pets: "Aceita pets", arCondicionado: "Ar-condicionado", soMulheres: "Só mulheres" } as const;
export type RegraCarona = keyof typeof REGRAS_CARONA;

export const quando = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" }).replace(",", " ·");

/** Link do WhatsApp com mensagem pronta. */
export const linkWhatsApp = (telefone: string, texto: string) => `https://wa.me/${telefone.replace(/\D/g, "")}?text=${encodeURIComponent(texto)}`;
