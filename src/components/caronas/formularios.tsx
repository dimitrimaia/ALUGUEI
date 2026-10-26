"use client";

import { Check, MapPinned, Send, X } from "lucide-react";
import { useActionState, useEffect, useState, useTransition } from "react";
import { Aviso, Botao, Campo, classeAreaTexto, classeEntrada } from "@/components/ui";
import { formatarBRL, lerReais } from "@/dominio/dinheiro/centavos";
import { UFS } from "@/dominio/ganhos/ufs";
import { cancelarReserva, decidirReserva, estimarKmCarona, maximoCarona, oferecerCarona, reservarCarona } from "@/lib/acoes-caronas";

const REGRAS = { bagagem: "Cabe bagagem", semFumar: "Sem fumar", pets: "Aceita pets", arCondicionado: "Ar-condicionado", soMulheres: "Só mulheres" } as const;

function CidadeUf({ prefixo, rotulo, aoMudar }: { prefixo: "origem" | "destino"; rotulo: string; aoMudar: (v: string) => void }) {
  const [cidade, setCidade] = useState("");
  const [uf, setUf] = useState("");
  useEffect(() => aoMudar(cidade && uf ? `${cidade}, ${uf}` : ""), [cidade, uf, aoMudar]);
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium">{rotulo}</span>
      <div className="grid grid-cols-[1fr_5.5rem] gap-2">
        <input name={`${prefixo}Cidade`} required placeholder="Cidade" value={cidade} onChange={(e) => setCidade(e.target.value)} className={classeEntrada} />
        <select name={`${prefixo}Uf`} required value={uf} onChange={(e) => setUf(e.target.value)} className={classeEntrada} aria-label={`Estado (${rotulo})`}>
          <option value="">UF</option>
          {UFS.map((u) => <option key={u}>{u}</option>)}
        </select>
      </div>
      <input name={`${prefixo}Ponto`} maxLength={120} placeholder="Ponto de encontro (opcional)" className={classeEntrada} />
    </div>
  );
}

export function FormOferecer() {
  const [estado, despachar, pendente] = useActionState(oferecerCarona, {});
  const [origem, setOrigem] = useState("");
  const [destino, setDestino] = useState("");
  const [km, setKm] = useState("");
  const [vagas, setVagas] = useState(3);
  const [pedagios, setPedagios] = useState("");
  const [maximo, setMaximo] = useState<number | null>(null);
  const [contribuicao, setContribuicao] = useState("");
  const [estimando, iniciar] = useTransition();
  const [aviso, setAviso] = useState<string | null>(null);

  useEffect(() => {
    const k = Number(km);
    if (!k) return setMaximo(null);
    const t = setTimeout(() => maximoCarona(k, lerReais(pedagios) ?? 0, vagas).then(setMaximo), 300);
    return () => clearTimeout(t);
  }, [km, pedagios, vagas]);

  const valor = lerReais(contribuicao);
  const passou = maximo !== null && valor !== null && valor > maximo;

  return (
    <form action={despachar} className="flex flex-col gap-4">
      <CidadeUf prefixo="origem" rotulo="Saindo de" aoMudar={setOrigem} />
      <CidadeUf prefixo="destino" rotulo="Indo para" aoMudar={setDestino} />
      <div className="grid grid-cols-2 gap-3">
        <Campo rotulo="Dia e hora da saída"><input name="partida" type="datetime-local" required className={classeEntrada} /></Campo>
        <Campo rotulo="Vagas">
          <select name="vagas" value={vagas} onChange={(e) => setVagas(Number(e.target.value))} className={classeEntrada}>
            {[1, 2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{n} {n === 1 ? "vaga" : "vagas"}</option>)}
          </select>
        </Campo>
      </div>
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Distância</span>
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <span className="relative block">
            <input name="km" inputMode="numeric" required value={km} onChange={(e) => setKm(e.target.value.replace(/\D/g, ""))} placeholder="Ex.: 430" className={`${classeEntrada} pr-12`} />
            <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs font-semibold text-suave">km</span>
          </span>
          <Botao
            type="button"
            variante="secundario"
            icone={MapPinned}
            disabled={!origem || !destino || estimando}
            onClick={() =>
              iniciar(async () => {
                const r = await estimarKmCarona(origem, destino);
                if (!r) return setAviso("Não achei a rota. Digite os km (veja no Google Maps).");
                setKm(String(r.km));
                setAviso(`${r.estimada ? "Estimativa" : "Rota"}: ${r.km} km, cerca de ${Math.round(r.minutos / 60)}h de viagem.`);
              })
            }
          >
            {estimando ? "…" : "Calcular"}
          </Botao>
        </div>
        {aviso && <span className="text-xs text-suave">{aviso}</span>}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Campo rotulo="Pedágios (total)">
          <input name="pedagios" inputMode="decimal" value={pedagios} onChange={(e) => setPedagios(e.target.value)} placeholder="0,00" className={classeEntrada} />
        </Campo>
        <Campo rotulo="Contribuição por pessoa" erro={passou ? "Passa da parte de cada um no custo" : undefined}>
          <input name="contribuicao" inputMode="decimal" required value={contribuicao} onChange={(e) => setContribuicao(e.target.value)} placeholder={maximo !== null ? (maximo / 100).toFixed(2).replace(".", ",") : "0,00"} className={classeEntrada} />
        </Campo>
      </div>
      {maximo !== null && (
        <div className="rounded-xl bg-marca-suave p-3 text-sm">
          <p>
            Máximo por pessoa: <strong>{formatarBRL(maximo)}</strong>
            {maximo > 0 && (
              <button type="button" onClick={() => setContribuicao((maximo / 100).toFixed(2).replace(".", ","))} className="ml-2 font-semibold text-marca">Usar</button>
            )}
          </p>
          <p className="mt-0.5 text-xs text-suave">Combustível, desgaste e pedágio divididos por todos no carro, você incluído. Na carona ninguém lucra: é isso que a diferencia de transporte pago.</p>
        </div>
      )}
      <Campo rotulo="Carro" dica="Opcional. Ex.: Onix prata"><input name="carro" maxLength={60} className={classeEntrada} /></Campo>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1.5 text-sm font-medium">Combinados</legend>
        <div className="flex flex-wrap gap-2">
          {Object.entries(REGRAS).map(([k, r]) => (
            <label key={k} className="cursor-pointer">
              <input type="checkbox" name={`regra_${k}`} className="peer sr-only" />
              <span className="inline-flex h-9 items-center rounded-full border border-borda px-3 text-sm font-semibold text-suave peer-checked:border-marca peer-checked:bg-marca peer-checked:text-white">{r}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <Campo rotulo="Observações" dica="Opcional"><textarea name="observacoes" rows={3} maxLength={500} className={classeAreaTexto} placeholder="Ex.: paro para um café na metade do caminho." /></Campo>
      {estado.erro && <Aviso tom="perigo">{estado.erro}</Aviso>}
      <Botao tamanho="lg" icone={Send} disabled={pendente || passou} className="w-full">{pendente ? "Publicando…" : "Publicar carona"}</Botao>
    </form>
  );
}

export function FormReservar({ caronaId, livres }: { caronaId: string; livres: number }) {
  const [estado, despachar, pendente] = useActionState(reservarCarona.bind(null, caronaId), {});
  return (
    <form action={despachar} className="flex flex-col gap-3">
      <div className="grid grid-cols-[7rem_1fr] gap-2">
        <select name="lugares" className={classeEntrada} aria-label="Lugares">
          {Array.from({ length: Math.min(livres, 4) }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n} {n === 1 ? "lugar" : "lugares"}</option>)}
        </select>
        <input name="mensagem" maxLength={300} placeholder="Mensagem (opcional)" className={classeEntrada} />
      </div>
      {estado.erro && <Aviso tom="perigo">{estado.erro}</Aviso>}
      <Botao tamanho="lg" disabled={pendente} className="w-full">{pendente ? "Enviando…" : "Pedir para ir junto"}</Botao>
    </form>
  );
}

export function DecidirReserva({ reservaId }: { reservaId: string }) {
  const [pendente, iniciar] = useTransition();
  return (
    <div className="grid grid-cols-2 gap-2">
      <Botao variante="secundario" tamanho="sm" icone={X} disabled={pendente} onClick={() => iniciar(() => decidirReserva(reservaId, "recusada"))}>Recusar</Botao>
      <Botao tamanho="sm" icone={Check} disabled={pendente} onClick={() => iniciar(() => decidirReserva(reservaId, "aceita"))}>Aceitar</Botao>
    </div>
  );
}

export function BotaoCancelarReserva({ caronaId }: { caronaId: string }) {
  const [pendente, iniciar] = useTransition();
  return <button type="button" disabled={pendente} onClick={() => confirm("Cancelar o seu pedido?") && iniciar(() => cancelarReserva(caronaId))} className="text-sm font-semibold text-perigo">Cancelar meu pedido</button>;
}
