import { CalendarClock, ChevronRight, KeyRound, Plus } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CabecalhoMotorista } from "@/components/motorista/cabecalho";
import { BotaoLink, Cartao, Placa } from "@/components/ui";
import { diasEntre, formatarData, hoje } from "@/dominio/datas/data";
import { formatarBRL } from "@/dominio/dinheiro/centavos";
import { proximoPagamento } from "@/dominio/ganhos/aluguel";
import { alugueisExternos } from "@/lib/aluguel-externo";
import { exigirUsuario } from "@/lib/sessao";

export const metadata = { title: "Carros alugados" };

const emDias = (d: number) => (d === 0 ? "hoje" : d === 1 ? "amanhã" : `em ${d} dias`);

/** Os carros alugados fora do Aluguei: o que está em uso e os que já foram devolvidos. */
export default async function CarrosAlugados() {
  const usuario = await exigirUsuario("/m/plantao/aluguel");
  const lista = await alugueisExternos(usuario.id);
  if (!lista.length) redirect("/m/plantao/aluguel/novo");
  const dia = hoje();
  const emUso = lista.filter((a) => !a.devolucao);
  const devolvidos = lista.filter((a) => a.devolucao);

  return (
    <div className="flex flex-col gap-4">
      <CabecalhoMotorista titulo="Carros alugados" voltar="/m/plantao" acao={<BotaoLink href={"/m/plantao/aluguel/novo" as Route} variante="secundario" tamanho="sm"><Plus size={15} /> Novo</BotaoLink>} />

      {emUso.map((a) => {
        const pag = proximoPagamento(a, dia);
        const faltam = diasEntre(dia, pag);
        return (
          <Link key={a.id} href={`/m/plantao/aluguel/${a.id}` as Route} className="fundo-marca relative flex flex-col gap-4 overflow-hidden rounded-[1.4rem] p-5 text-white shadow-flutuante">
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2 py-0.5 text-[0.7rem] font-semibold"><span className="size-1.5 rounded-full bg-[#4ade80]" /> Em uso</span>
                <p className="mt-2 truncate text-xl font-bold">{a.modelo || "Carro alugado"}</p>
                <p className="truncate text-sm text-white/75">{a.locadora} · desde {formatarData(a.inicio)}</p>
              </div>
              {a.placa && <Placa placa={a.placa} tamanho="sm" />}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl bg-white/12 p-3 ring-1 ring-white/15">
                <p className="text-[0.7rem] text-white/70">Próximo aluguel</p>
                <p className="font-bold tabular-nums">{formatarData(pag).slice(0, 5)} · {formatarBRL(a.valorSemanal).replace(",00", "")}</p>
                <p className={`text-xs ${faltam <= 1 ? "font-semibold text-[#ffd27a]" : "text-white/70"}`}>Vence {emDias(faltam)}</p>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-white/12 p-3 ring-1 ring-white/15">
                <span className="text-sm font-semibold">Ver tudo</span>
                <ChevronRight size={18} />
              </div>
            </div>
          </Link>
        );
      })}

      {!emUso.length && (
        <Cartao className="flex flex-col items-center gap-2 py-6 text-center">
          <KeyRound size={22} className="text-marca" />
          <p className="font-semibold">Nenhum carro em uso</p>
          <p className="text-sm text-suave">Alugou outro carro? Cadastre para o app avisar pagamento, vistoria e km.</p>
          <BotaoLink href={"/m/plantao/aluguel/novo" as Route} className="mt-1"><Plus size={16} /> Cadastrar carro</BotaoLink>
        </Cartao>
      )}

      {devolvidos.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-bold text-suave">Já devolvidos</h2>
          {devolvidos.map((a) => (
            <Link key={a.id} href={`/m/plantao/aluguel/${a.id}` as Route} className="flex items-center gap-3 rounded-[1.1rem] border border-borda bg-cartao p-3 shadow-cartao">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-cartao-2 text-suave"><CalendarClock size={18} /></span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{a.modelo || "Carro alugado"} · {a.locadora}</span>
                <span className="block text-xs text-suave">{formatarData(a.inicio)} a {formatarData(a.devolucao!)}</span>
              </span>
              <ChevronRight size={17} className="text-suave" />
            </Link>
          ))}
        </section>
      )}

      <p className="text-center text-xs text-suave">Só o carro em uso entra no Plantão (aluguel descontado do lucro) e nos lembretes.</p>
    </div>
  );
}
