"use server";

import { z } from "zod";
import { aluguelMensal, COMBUSTIVEIS, CRITERIOS_PADRAO, PERFIL_PADRAO } from "@/dominio/ganhos/custos";
import { aluguelDoContrato } from "./plantao";
import { exigirUsuario } from "./sessao";
import { supabaseAdmin } from "./supabase/admin";

const esquema = z.object({
  uso: z.enum(["motorista", "locador", "ambos"]),
  carro: z.enum(["proprio", "alugado", "aluguei", "nenhum"]).nullable(),
  aluguelSemanal: z.number().int().min(0).max(10_000_000).nullable(),
  combustivel: z.enum(COMBUSTIVEIS).nullable(),
  preco: z.number().int().min(0).max(10_000).nullable(),
  consumo: z.number().min(0.5).max(100).nullable(),
  meta: z.number().int().min(0).max(10_000_000).nullable(),
});

/**
 * Fim das boas-vindas: grava o que a pessoa respondeu nos custos do Plantão
 * (para a calculadora e o semáforo já saírem certos) e diz para onde ir.
 */
export async function concluirComeco(entrada: z.input<typeof esquema>): Promise<{ destino: string; erro?: string }> {
  const usuario = await exigirUsuario("/comecar");
  const lido = esquema.safeParse(entrada);
  if (!lido.success) return { destino: "/inicio", erro: "Confira as respostas." };
  const d = lido.data;
  if (d.uso !== "locador" && d.carro && d.carro !== "nenhum") {
    const fixos =
      d.carro === "alugado" && d.aluguelSemanal
        ? [{ nome: "Aluguel do carro", valor: aluguelMensal(d.aluguelSemanal) }]
        : d.carro === "aluguei" && (await aluguelDoContrato(usuario.id))
          ? [{ nome: "Aluguel do carro (contrato)", valor: 0, doContrato: true }]
          : [];
    const perfil = {
      ...PERFIL_PADRAO,
      combustivel: d.combustivel ?? PERFIL_PADRAO.combustivel,
      precoCombustivel: d.preco ?? PERFIL_PADRAO.precoCombustivel,
      consumo: d.consumo ?? PERFIL_PADRAO.consumo,
      // Carro alugado: a manutenção costuma ser do locador.
      desgaste: d.carro === "proprio" ? PERFIL_PADRAO.desgaste : [],
      fixosMensais: fixos,
    };
    await supabaseAdmin()
      .from("perfis_custo")
      .upsert({ usuario_id: usuario.id, perfil, criterios: CRITERIOS_PADRAO, meta_diaria_centavos: d.meta ?? 0, atualizado_em: new Date().toISOString() });
  }
  if (d.uso === "locador" || d.uso === "ambos") return { destino: "/painel/comecar" };
  if (d.carro === "nenhum") return { destino: "/m/buscar" };
  return { destino: "/m/plantao" };
}
