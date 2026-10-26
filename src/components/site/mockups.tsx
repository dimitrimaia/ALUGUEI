import { Camera, ClipboardCheck, QrCode } from "lucide-react";
import { Placa } from "@/components/ui";

/** Simulação do app do motorista, usada no topo da página do locador. */
export function MockupLocador() {
  return (
    <div className="relative mx-auto w-full max-w-[22rem]" aria-hidden>
      <div className="absolute top-24 -left-24 z-10 hidden rotate-[-6deg] rounded-2xl bg-white p-3 text-[#0b1630] shadow-flutuante xl:block">
        <p className="text-[0.7rem] font-semibold text-[#5b6880]">Pix recebido · João</p>
        <p className="text-lg font-extrabold text-[#0f8a4b]">+ R$ 600,00</p>
      </div>
      <div className="rounded-[2.4rem] bg-[#06122c] p-3 shadow-[0_30px_80px_rgb(4_12_40_/_0.55)] ring-1 ring-white/10">
        <div className="overflow-hidden rounded-[1.9rem] bg-[#f3f6fb] text-[#0b1630]">
          <div className="fundo-marca px-5 pt-6 pb-8">
            <p className="text-xs text-white/75">Boa tarde, Locadora Silva</p>
            <p className="mt-3 text-xs text-white/75">Recebido esta semana</p>
            <p className="text-3xl font-extrabold">R$ 2.400,00</p>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              {[["Rodando", "4"], ["Em dia", "4"], ["Atraso", "0"]].map(([a, b]) => (
                <div key={a} className="rounded-xl bg-white/12 py-2 ring-1 ring-white/15">
                  <p className="text-[0.6rem] text-white/70">{a}</p>
                  <p className="text-base font-extrabold">{b}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="-mt-4 flex flex-col gap-2.5 px-3 pb-4">
            {([["João S.", "JS", "+ R$ 600,00"], ["Marcos P.", "MP", "+ R$ 600,00"]] as const).map(([n, iniciais, v]) => (
              <div key={n} className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-cartao">
                <span className="grid size-9 place-items-center rounded-full bg-[#e8efff] text-xs font-bold text-[#1f56e8]">{iniciais}</span>
                <div className="flex-1">
                  <p className="text-sm font-bold">{n}</p>
                  <p className="text-xs text-[#5b6880]">Pagou o aluguel</p>
                </div>
                <span className="text-sm font-bold text-[#0f8a4b]">{v}</span>
              </div>
            ))}
            <div className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-cartao">
              <span className="grid size-9 place-items-center rounded-xl bg-[#e8efff] text-[#1f56e8]"><Camera size={18} /></span>
              <div className="flex-1">
                <p className="text-sm font-bold">Check-in de segunda</p>
                <p className="text-xs text-[#5b6880]">3 de 4 enviados</p>
              </div>
              <span className="rounded-full bg-[#fff1d6] px-2 py-0.5 text-[0.65rem] font-bold text-[#b45309]">1 falta</span>
            </div>
          </div>
        </div>
      </div>
      <div className="absolute -right-24 bottom-10 z-10 hidden rotate-[5deg] rounded-2xl bg-white p-3 text-[#0b1630] shadow-flutuante xl:block">
        <p className="flex items-center gap-1.5 text-[0.7rem] font-semibold text-[#5b6880]"><ClipboardCheck size={14} className="text-[#1f56e8]" /> Vistoria confirmada</p>
        <p className="text-sm font-bold">RTA1B23 · 8 fotos</p>
      </div>
    </div>
  );
}

/** Cartão do carro e do aluguel, usado no topo da página do motorista. */
export function MockupMotorista() {
  return (
          <div className="mx-auto w-full max-w-[21rem]" aria-hidden>
            <div className="rounded-[2.2rem] border border-borda bg-cartao p-5 shadow-flutuante">
              <div className="flex items-center gap-3">
                <Placa placa="RTA1B23" />
                <div>
                  <p className="font-bold">Fiat Uno 1.0</p>
                  <p className="text-xs text-suave">Contrato ativo</p>
                </div>
              </div>
              <div className="mt-5 rounded-2xl bg-marca p-4 text-white shadow-marca">
                <p className="text-xs text-white/75">Aluguel desta semana</p>
                <p className="text-3xl font-extrabold">R$ 600,00</p>
                <div className="mt-3 flex items-center justify-center gap-2 rounded-xl bg-white py-2.5 text-sm font-bold text-[#1641b8]"><QrCode size={16} /> Pagar com Pix</div>
              </div>
              <div className="mt-3 flex flex-col gap-2">
                {[["Aluguel 20/10", "+ R$ 600,00 pago"], ["Caução 1/2", "+ R$ 600,00 pago"]].map(([a, b]) => (
                  <div key={a} className="flex items-center justify-between rounded-xl bg-cartao-2 px-3 py-2.5 text-sm">
                    <span className="font-semibold">{a}</span>
                    <span className="font-bold text-ok">{b}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
  );
}

/** Simulação do semáforo: a oferta de um app de corrida e a bolha do Aluguei por cima. */
export function MockupSemaforo() {
  return (
    <div className="relative mx-auto w-full max-w-[20rem]" aria-hidden>
      <div className="rounded-[2.4rem] bg-[#020817] p-3 shadow-[0_30px_80px_rgb(0_0_0_/_0.5)] ring-1 ring-white/10">
        <div className="relative h-[30rem] overflow-hidden rounded-[1.9rem] bg-[#1e293b]">
          {/* "Mapa" */}
          <div className="absolute inset-0 opacity-40 [background-image:linear-gradient(#334155_1px,transparent_1px),linear-gradient(90deg,#334155_1px,transparent_1px)] [background-size:28px_28px]" />
          <div className="absolute top-24 left-10 h-40 w-2 rotate-[24deg] rounded-full bg-[#64748b]/60" />
          <div className="absolute top-40 left-0 h-2 w-64 -rotate-6 rounded-full bg-[#64748b]/60" />
          {/* Bolha do Aluguei */}
          <div className="absolute top-5 right-3 left-3 rounded-2xl bg-[#16a34a] p-3 text-white shadow-[0_12px_30px_rgb(0_0_0_/_0.45)]">
            <div className="flex items-center justify-between text-[0.7rem] font-bold tracking-wide uppercase"><span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-white" /> Vale a pena</span><span className="font-medium normal-case opacity-85">9,7 km · 23 min</span></div>
            <div className="mt-2 grid grid-cols-3 gap-1.5 text-center">
              {[["por km", "R$ 2,90"], ["por hora", "R$ 73"], ["lucro", "R$ 21,30"]].map(([a, b]) => (
                <div key={a} className="rounded-lg bg-black/15 py-1.5"><p className="text-[0.55rem] opacity-80">{a}</p><p className="text-sm font-extrabold">{b}</p></div>
              ))}
            </div>
          </div>
          {/* Oferta do app de corrida */}
          <div className="absolute right-0 bottom-0 left-0 rounded-t-3xl bg-white p-4 text-[#0b1630]">
            <p className="text-xs font-semibold text-[#5b6880]">Nova viagem</p>
            <p className="text-2xl font-extrabold">R$ 28,10</p>
            <p className="mt-1 text-xs text-[#5b6880]">8 min (2,3 km) até o passageiro</p>
            <p className="text-xs text-[#5b6880]">Viagem de 15 min (7,4 km)</p>
            <div className="mt-3 h-10 rounded-xl bg-[#0b1630]" />
          </div>
        </div>
      </div>
      <div className="absolute -bottom-4 -left-6 hidden rotate-[-5deg] rounded-2xl bg-white p-3 text-[#0b1630] shadow-flutuante sm:block">
        <p className="text-[0.65rem] font-semibold text-[#5b6880]">Lucro hoje · aluguel descontado</p>
        <p className="text-lg font-extrabold text-[#0f8a4b]">R$ 187,40</p>
      </div>
    </div>
  );
}
