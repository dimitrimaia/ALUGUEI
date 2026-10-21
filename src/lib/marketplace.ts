import "server-only";
import { normalizarCidade } from "@/dominio/marketplace/cidade";
import { supabaseEnv } from "./supabase/env";
import { supabaseAdmin } from "./supabase/admin";

export const BUCKET_ANUNCIOS = "anuncios";

export function urlFoto(caminho: string): string {
  return `${supabaseEnv().url}/storage/v1/object/public/${BUCKET_ANUNCIOS}/${caminho}`;
}

export interface AnuncioPublico {
  id: string;
  organizacaoId: string;
  veiculoId: string;
  cidade: string;
  uf: string;
  aluguelSemanal: number;
  caucao: number;
  franquiaKmMensal: number;
  prazoMinimoMeses: number;
  descricao: string | null;
  fotos: string[];
  /** CRLV conferido pela equipe do Aluguei. */
  verificado: boolean;
  veiculo: { modelo: string; anoModelo: number | null; anoFabricacao: number | null; cor: string | null; placa: string; odometro: number };
  locador: { nome: string; cidade: string; uf: string };
}

/** Só o que pode ser público: nada de contato, documento ou placa completa (a página mascara). */
async function montar(linhas: { id: string; organizacao_id: string; veiculo_id: string; cidade: string; uf: string; aluguel_semanal_centavos: number; caucao_centavos: number; franquia_km_mensal: number; prazo_minimo_meses: number; descricao: string | null; fotos: unknown }[]): Promise<AnuncioPublico[]> {
  if (!linhas.length) return [];
  const admin = supabaseAdmin();
  const [{ data: veiculos }, { data: orgs }] = await Promise.all([
    admin.from("veiculos").select("*").in("id", linhas.map((l) => l.veiculo_id)),
    admin.from("organizacoes").select("id, nome, cidade, uf").in("id", linhas.map((l) => l.organizacao_id)),
  ]);
  return linhas.flatMap((l) => {
    const v = veiculos?.find((x) => x.id === l.veiculo_id);
    const o = orgs?.find((x) => x.id === l.organizacao_id);
    if (!v || !o || v.status !== "disponivel") return [];
    return [{
      id: l.id,
      organizacaoId: l.organizacao_id,
      veiculoId: l.veiculo_id,
      cidade: l.cidade,
      uf: l.uf,
      aluguelSemanal: l.aluguel_semanal_centavos,
      caucao: l.caucao_centavos,
      franquiaKmMensal: l.franquia_km_mensal,
      prazoMinimoMeses: l.prazo_minimo_meses,
      descricao: l.descricao,
      fotos: ((l.fotos as string[]) ?? []).map(urlFoto),
      verificado: v.verificacao === "verificado",
      veiculo: { modelo: v.modelo, anoModelo: v.ano_modelo, anoFabricacao: v.ano_fabricacao, cor: v.cor, placa: v.placa, odometro: v.odometro_atual },
      locador: { nome: o.nome, cidade: o.cidade, uf: o.uf },
    }];
  });
}

export async function buscarAnuncios(cidade?: string): Promise<AnuncioPublico[]> {
  let q = supabaseAdmin().from("anuncios").select("*").eq("status", "ativo").order("atualizado_em", { ascending: false }).limit(60);
  if (cidade) q = q.eq("cidade_busca", normalizarCidade(cidade));
  const { data } = await q;
  return montar(data ?? []);
}

export async function anuncioPublico(id: string): Promise<AnuncioPublico | null> {
  const { data } = await supabaseAdmin().from("anuncios").select("*").eq("id", id).eq("status", "ativo").maybeSingle();
  return data ? ((await montar([data]))[0] ?? null) : null;
}

/** Cidades com anúncio ativo, para o filtro. */
export async function cidadesComAnuncios(): Promise<{ cidade: string; uf: string; total: number }[]> {
  const { data } = await supabaseAdmin().from("anuncios").select("cidade, uf, cidade_busca").eq("status", "ativo");
  const mapa = new Map<string, { cidade: string; uf: string; total: number }>();
  for (const a of data ?? []) {
    const k = `${a.cidade_busca}|${a.uf}`;
    const atual = mapa.get(k) ?? { cidade: a.cidade, uf: a.uf, total: 0 };
    atual.total++;
    mapa.set(k, atual);
  }
  return [...mapa.values()].sort((a, b) => b.total - a.total || a.cidade.localeCompare(b.cidade));
}
