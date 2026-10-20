import { FOTOS_VISTORIA, ITENS_CHECKLIST, type ChecklistVistoria, combustivelPorExtenso } from "@/dominio/vistoria/roteiro";
import { Cartao, Selo } from "./ui";

const TOM = { ok: "ok", avaria: "alerta", ausente: "perigo" } as const;
const ROTULO = { ok: "OK", avaria: "Avaria", ausente: "Falta" } as const;

/** Vistoria em modo leitura: usado pelo locador e pelo motorista. */
export function ResumoVistoria({
  checklist,
  odometro,
  combustivel,
  fotos,
}: {
  checklist: ChecklistVistoria;
  odometro: number;
  combustivel: number;
  fotos: Record<string, { url: string | null }>;
}) {
  const problemas = checklist.itens.filter((i) => i.estado !== "ok");
  const todas = [
    ...FOTOS_VISTORIA.map((f) => ({ rotulo: f.rotulo, id: checklist.fotos[f.id] })),
    ...checklist.fotosExtras.map((id, i) => ({ rotulo: `Detalhe ${i + 1}`, id })),
  ].filter((f): f is { rotulo: string; id: string } => Boolean(f.id));

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <Cartao><p className="text-sm text-suave">Km</p><p className="text-xl font-bold">{odometro.toLocaleString("pt-BR")}</p></Cartao>
        <Cartao><p className="text-sm text-suave">Combustível</p><p className="text-xl font-bold">{combustivelPorExtenso(combustivel)}</p></Cartao>
      </div>
      <Cartao>
        <p className="mb-3 font-semibold">Fotos</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {todas.map((f) => (
            <a key={f.id} href={fotos[f.id]?.url ?? "#"} target="_blank" rel="noreferrer" className="relative block aspect-[4/3] overflow-hidden rounded-xl bg-cartao-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {fotos[f.id]?.url && <img src={fotos[f.id]!.url!} alt={f.rotulo} className="size-full object-cover" />}
              <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-2 pt-5 pb-1.5 text-xs font-semibold text-white">{f.rotulo}</span>
            </a>
          ))}
        </div>
      </Cartao>
      <Cartao>
        <div className="mb-2 flex items-center justify-between">
          <p className="font-semibold">Checklist</p>
          {problemas.length ? <Selo tom="alerta">{problemas.length} ponto(s) de atenção</Selo> : <Selo tom="ok">Tudo OK</Selo>}
        </div>
        <ul className="divide-y divide-borda">
          {ITENS_CHECKLIST.map((def) => {
            const i = checklist.itens.find((x) => x.item === def.id);
            if (!i) return null;
            return (
              <li key={def.id} className="py-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span>{def.rotulo}</span>
                  <Selo tom={TOM[i.estado]}>{ROTULO[i.estado]}</Selo>
                </div>
                {i.observacao && <p className="mt-1 text-sm text-suave">{i.observacao}</p>}
              </li>
            );
          })}
        </ul>
        {checklist.observacoes && <p className="mt-3 rounded-xl bg-cartao-2 p-3 text-sm">{checklist.observacoes}</p>}
      </Cartao>
    </div>
  );
}
