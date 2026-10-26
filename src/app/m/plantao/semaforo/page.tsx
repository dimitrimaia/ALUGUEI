import { ChevronRight, History, SlidersHorizontal, Wrench } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { CabecalhoMotorista } from "@/components/motorista/cabecalho";
import { AtivarSemaforo } from "@/components/plantao/ativar-semaforo";
import { SincronizarPlantao } from "@/components/plantao/sincronizar";
import { configPlantao } from "@/lib/plantao";
import { exigirUsuario } from "@/lib/sessao";

export const metadata = { title: "Copiloto" };

export default async function Semaforo() {
  const usuario = await exigirUsuario("/m/plantao/semaforo");
  const c = await configPlantao(usuario.id);
  return (
    <div>
      <CabecalhoMotorista titulo="Copiloto" voltar="/m/plantao" />
      <SincronizarPlantao perfil={c.perfil} criterios={c.criterios} preferencias={c.preferencias} />
      <nav className="mb-4 grid grid-cols-3 gap-2" aria-label="Copiloto">
        {[
          { href: "/m/plantao/regua", rotulo: "Régua", texto: "O que é corrida boa", icone: SlidersHorizontal },
          { href: "/m/plantao/copiloto", rotulo: "Ajustes", texto: "Cartão, voz e base", icone: Wrench },
          { href: "/m/plantao/historico", rotulo: "Ofertas", texto: "O que passou", icone: History },
        ].map(({ href, rotulo, texto, icone: Icone }) => (
          <Link key={href} href={href as Route} className="flex flex-col gap-2 rounded-[1.1rem] border border-borda bg-cartao p-3 shadow-cartao transition-transform active:scale-[0.97]">
            <span className="flex items-center justify-between"><span className="grid size-9 place-items-center rounded-xl bg-marca-suave text-marca"><Icone size={18} /></span><ChevronRight size={15} className="text-suave" /></span>
            <span><span className="block text-sm font-bold">{rotulo}</span><span className="block text-[0.7rem] leading-tight text-suave">{texto}</span></span>
          </Link>
        ))}
      </nav>
      <AtivarSemaforo />
    </div>
  );
}
