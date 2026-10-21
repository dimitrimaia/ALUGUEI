import { ArrowDownLeft, ArrowUpRight, Receipt } from "lucide-react";
import { CabecalhoMotorista } from "@/components/motorista/cabecalho";
import { Cartao, Vazio } from "@/components/ui";
import { data, formatarData } from "@/dominio/datas/data";
import { formatarBRL } from "@/dominio/dinheiro/centavos";
import { saldo } from "@/dominio/financeiro/extrato";
import { contratosDoMotorista } from "@/lib/motorista";
import { exigirUsuario } from "@/lib/sessao";
import { supabaseAdmin } from "@/lib/supabase/admin";

/** Extrato do motorista (RF-059): tudo que foi cobrado e pago, com a origem de cada item. */
export default async function Extrato() {
  const usuario = await exigirUsuario("/m/extrato");
  const contratos = await contratosDoMotorista(usuario.id);
  const ids = contratos.map((c) => c.id);
  const admin = supabaseAdmin();
  const [{ data: lancamentos }, { data: obrigacoes }] = ids.length
    ? await Promise.all([
        admin.from("lancamentos").select("*").in("contrato_id", ids).order("competencia", { ascending: false }).order("criado_em", { ascending: false }),
        admin.from("obrigacoes").select("id, tipo, status").in("contrato_id", ids).eq("tipo", "caucao_parcela"),
      ])
    : [{ data: [] }, { data: [] }];
  const lista = lancamentos ?? [];
  const devido = saldo(lista.map((l) => ({ valor: l.valor_centavos })));
  const parcelasCaucao = new Set((obrigacoes ?? []).map((o) => o.id));
  const caucaoPaga = -lista.filter((l) => l.tipo === "pagamento" && l.obrigacao_id && parcelasCaucao.has(l.obrigacao_id)).reduce((s, l) => s + l.valor_centavos, 0);

  return (
    <div className="flex flex-col gap-4">
      <CabecalhoMotorista titulo="Extrato" />
      <div className="grid grid-cols-2 gap-3">
        <Cartao>
          <p className="text-xs font-semibold text-suave">Em aberto</p>
          <p className={`text-2xl font-extrabold ${devido > 0 ? "text-perigo" : ""}`}>{formatarBRL(Math.max(0, devido))}</p>
        </Cartao>
        <Cartao>
          <p className="text-xs font-semibold text-suave">Caução paga</p>
          <p className="text-2xl font-extrabold">{formatarBRL(caucaoPaga)}</p>
        </Cartao>
      </div>
      {!lista.length ? (
        <Vazio icone={Receipt} titulo="Nada por aqui ainda">As cobranças aparecem aqui quando forem geradas.</Vazio>
      ) : (
        <div className="divide-y divide-borda overflow-hidden rounded-[1.1rem] border border-borda bg-cartao shadow-cartao">
          {lista.map((l) => {
            const credito = l.valor_centavos < 0;
            return (
              <div key={l.id} className="flex items-center gap-3 px-4 py-3.5">
                <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${credito ? "bg-ok-suave text-ok" : "bg-cartao-2 text-suave"}`}>
                  {credito ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{l.descricao}</p>
                  <p className="text-xs text-suave">{formatarData(data(l.competencia))}</p>
                </div>
                <span className={`text-sm font-bold tabular-nums ${credito ? "text-ok" : ""}`}>{credito ? "+ " : "− "}{formatarBRL(Math.abs(l.valor_centavos))}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
