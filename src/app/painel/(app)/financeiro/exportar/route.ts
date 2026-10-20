import { exigirEquipe } from "@/lib/sessao";
import { supabaseServidor } from "@/lib/supabase/servidor";

const campo = (v: unknown) => `"${String(v ?? "").replaceAll('"', '""')}"`;
const reais = (c: number | null) => (c === null ? "" : (c / 100).toFixed(2).replace(".", ","));

/** RF-061: exportação das cobranças em CSV (separador ;, padrão do Excel em português). */
export async function GET() {
  const { organizacao } = await exigirEquipe();
  const supabase = await supabaseServidor();
  const [{ data: cobrancas }, { data: contratos }, { data: locatarios }] = await Promise.all([
    supabase.from("cobrancas").select("*").eq("organizacao_id", organizacao.id).order("vencimento"),
    supabase.from("contratos").select("id, locatario_id").eq("organizacao_id", organizacao.id),
    supabase.from("locatarios").select("id, nome, cpf").eq("organizacao_id", organizacao.id),
  ]);
  const pessoa = (contratoId: string) => locatarios?.find((l) => l.id === contratos?.find((c) => c.id === contratoId)?.locatario_id);
  const linhas = [
    ["Vencimento", "Motorista", "CPF", "Valor", "Valor pago", "Taxa Aluguei", "Situação", "Pago em", "Código Asaas"],
    ...(cobrancas ?? []).map((c) => [
      c.vencimento.split("-").reverse().join("/"),
      pessoa(c.contrato_id)?.nome,
      pessoa(c.contrato_id)?.cpf,
      reais(c.valor_centavos),
      reais(c.valor_pago_centavos),
      reais(c.split_plataforma_centavos),
      c.status,
      c.pago_em ? new Date(c.pago_em).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" }) : "",
      c.provedor_id,
    ]),
  ];
  const csv = "﻿" + linhas.map((l) => l.map(campo).join(";")).join("\r\n");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="cobrancas-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
