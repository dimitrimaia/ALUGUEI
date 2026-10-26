import { data, formatarData } from "@/dominio/datas/data";
import { NOME_DESPESA, NOME_PLATAFORMA } from "@/dominio/ganhos/plantao";
import { dadosDoPeriodo, intervalo, type Periodo } from "@/lib/plantao";
import { usuarioAtual } from "@/lib/sessao";

/** Planilha (CSV, abre no Excel e no Google Planilhas) com ganhos e despesas: boa para o imposto de renda. */
export async function GET(request: Request) {
  const usuario = await usuarioAtual();
  if (!usuario) return new Response("Entre na sua conta.", { status: 401 });
  const p = new URL(request.url).searchParams.get("periodo");
  const periodo: Periodo = p === "hoje" || p === "mes" ? p : "semana";
  const { de, ate } = intervalo(periodo);
  const d = await dadosDoPeriodo(usuario.id, de, ate);
  const reais = (c: number) => (c / 100).toFixed(2).replace(".", ",");
  const linhas = [
    ["Data", "Tipo", "Descrição", "Corridas", "Valor (R$)"],
    ...d.ganhos.map((g) => [formatarData(data(g.dia)), "Ganho", NOME_PLATAFORMA[g.plataforma] ?? g.plataforma, String(g.corridas), reais(g.valor_centavos)]),
    ...d.despesas.map((x) => [formatarData(data(x.dia)), "Despesa", `${NOME_DESPESA[x.categoria] ?? x.categoria}${x.descricao ? ` - ${x.descricao}` : ""}`, "", `-${reais(x.valor_centavos)}`]),
  ];
  const csv = "﻿" + linhas.map((l) => l.map((c) => `"${c.replace(/"/g, '""')}"`).join(";")).join("\r\n");
  return new Response(csv, { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="aluguei-ganhos-${de}-a-${ate}.csv"` } });
}
