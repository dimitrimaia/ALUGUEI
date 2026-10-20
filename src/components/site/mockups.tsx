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
