import { BadgeCheck, Car, Gauge, MapPin } from "lucide-react";
import Link from "next/link";
import { formatarBRL } from "@/dominio/dinheiro/centavos";
import type { AnuncioPublico } from "@/lib/marketplace";

export function CartaoAnuncio({ a, doApp = false }: { a: AnuncioPublico; doApp?: boolean }) {
  return (
    <Link href={doApp ? `/carros/${a.id}?de=app` : `/carros/${a.id}`} className="group overflow-hidden rounded-[1.1rem] border border-borda bg-cartao shadow-cartao transition-all hover:-translate-y-0.5 hover:shadow-flutuante">
      <div className="relative aspect-[16/10] bg-gradient-to-br from-marca-suave to-cartao-2">
        {a.fotos[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={a.fotos[0]} alt={a.veiculo.modelo} className="size-full object-cover" loading="lazy" />
        ) : (
          <Car className="absolute inset-0 m-auto text-marca/30" size={64} strokeWidth={1.3} />
        )}
        {a.verificado && <span className="absolute top-3 left-3 inline-flex items-center gap-1 rounded-full bg-cartao/95 px-2 py-0.5 text-[0.68rem] font-semibold text-ok shadow-cartao"><BadgeCheck size={12} /> Verificado</span>}
        <span className="absolute bottom-3 left-3 rounded-full bg-cartao/95 px-2.5 py-1 text-xs font-bold shadow-cartao">{formatarBRL(a.aluguelSemanal)}<span className="font-medium text-suave">/sem</span></span>
      </div>
      <div className="p-4">
        <p className="truncate font-bold">{a.veiculo.modelo}</p>
        <p className="text-xs text-suave">{[a.veiculo.anoModelo, a.veiculo.cor].filter(Boolean).join(" · ")}</p>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-suave">
          <span className="inline-flex items-center gap-1"><MapPin size={13} className="text-marca" /> {a.cidade}/{a.uf}</span>
          <span className="inline-flex items-center gap-1"><Gauge size={13} className="text-marca" /> {a.franquiaKmMensal.toLocaleString("pt-BR")} km/mês</span>
        </div>
      </div>
    </Link>
  );
}
