import { TrendingDown, TrendingUp } from "lucide-react";
import { CabecalhoMotorista } from "@/components/motorista/cabecalho";
import { Cartao, Vazio } from "@/components/ui";
import { hoje, somarDias } from "@/dominio/datas/data";
import { formatarBRL } from "@/dominio/dinheiro/centavos";
import { melhorEPior, porBlocoDeHorario } from "@/dominio/ganhos/horarios";
import { dadosDoPeriodo } from "@/lib/plantao";
import { exigirUsuario } from "@/lib/sessao";

export const metadata = { title: "Melhores horários" };

const faixa = (de: number) => `${String(de).padStart(2, "0")}h–${String(de + 2).padStart(2, "0")}h`;

/** Quando vale a pena estar online: média por km das ofertas, de 2 em 2 horas, nos últimos 30 dias. */
export default async function MelhoresHorarios() {
  const usuario = await exigirUsuario("/m/plantao/horarios");
  const dados = await dadosDoPeriodo(usuario.id, somarDias(hoje(), -29), hoje());
  const blocos = porBlocoDeHorario(dados.corridas.map((c) => ({ momento: c.ocorrida_em, valor: c.valor_centavos, metros: c.metros_corrida + (c.metros_busca ?? 0), sinal: c.sinal })));
  const { melhor, pior } = melhorEPior(blocos);
  const maior = Math.max(1, ...blocos.map((b) => b.mediaPorKm ?? 0));

  return (
    <div className="flex flex-col gap-4">
      <CabecalhoMotorista titulo="Melhores horários" voltar="/m/plantao/historico" />
      {dados.corridas.length < 10 ? (
        <Vazio titulo="Ainda com poucas ofertas">Com o Copiloto ligado, cada oferta entra aqui. Com umas 10 ofertas já dá para ver os horários que pagam melhor.</Vazio>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2">
            <Cartao className="!p-3">
              <p className="flex items-center gap-1 text-xs font-semibold text-ok"><TrendingUp size={14} /> Melhor horário</p>
              <p className="text-lg font-extrabold">{melhor ? faixa(melhor.de) : "—"}</p>
              {melhor && <p className="text-xs text-suave">{formatarBRL(melhor.mediaPorKm!)}/km em média</p>}
            </Cartao>
            <Cartao className="!p-3">
              <p className="flex items-center gap-1 text-xs font-semibold text-perigo"><TrendingDown size={14} /> Pior horário</p>
              <p className="text-lg font-extrabold">{pior ? faixa(pior.de) : "—"}</p>
              {pior && <p className="text-xs text-suave">{formatarBRL(pior.mediaPorKm!)}/km em média</p>}
            </Cartao>
          </div>
          <Cartao>
            <h2 className="mb-3 text-sm font-bold">Média por km das ofertas · últimos 30 dias</h2>
            <ul className="flex flex-col gap-1.5">
              {blocos.map((b) => (
                <li key={b.de} className="grid grid-cols-[4.2rem_1fr_4.6rem] items-center gap-2 text-xs" title={`${b.ofertas} ofertas, ${b.verdes} verdes`}>
                  <span className="font-semibold tabular-nums text-suave">{faixa(b.de)}</span>
                  <span className="h-3 overflow-hidden rounded-full bg-cartao-2">
                    {b.mediaPorKm !== null && <span className={`block h-full rounded-full ${b === melhor ? "bg-ok" : "bg-marca"}`} style={{ width: `${(b.mediaPorKm / maior) * 100}%` }} />}
                  </span>
                  <span className="text-right font-bold tabular-nums">{b.mediaPorKm !== null ? `${formatarBRL(b.mediaPorKm)}` : "—"}<span className="font-normal text-suave"> · {b.ofertas}</span></span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-suave">O número depois do valor é quantas ofertas chegaram naquele horário.</p>
          </Cartao>
        </>
      )}
    </div>
  );
}
