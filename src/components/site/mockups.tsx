import { Camera, ClipboardCheck, QrCode } from "lucide-react";
import { Placa } from "@/components/ui";

/** Simulação do app do motorista, usada no topo da página do locador. */
export function MockupLocador() {
  return (
          <div className="relative mx-auto w-full max-w-[22rem]" aria-hidden>
            <div className="absolute top-24 -left-24 z-10 hidden rotate-[-6deg] rounded-2xl bg-white p-3 text-[#0b1630] shadow-flutuante xl:block">
              <p className="text-[0.7rem] font-semibold text-suave">Pagamento recebido</p>
              <p className="text-lg font-extrabold text-ok">+ R$ 600,00</p>
            </div>
            <div className="rounded-[2.4rem] bg-[#06122c] p-3 shadow-[0_30px_80px_rgb(4_12_40_/_0.55)] ring-1 ring-white/10">
              <div className="overflow-hidden rounded-[1.9rem] bg-fundo text-texto">
                <div className="fundo-marca px-5 pt-6 pb-8">
                  <p className="text-xs text-white/75">Olá, João</p>
                  <p className="mt-3 text-xs text-white/75">Próximo pagamento · terça, 27/10</p>
                  <p className="text-3xl font-extrabold">R$ 600,00</p>
                  <div className="mt-4 rounded-xl bg-white py-2.5 text-center text-sm font-bold text-[#1641b8]">Pagar com Pix</div>
                </div>
                <div className="-mt-4 flex flex-col gap-2.5 px-3 pb-4">
                  <div className="rounded-2xl bg-cartao p-3 shadow-cartao">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-suave">Km do mês</p>
                      <p className="text-xs font-bold">3.420 / 6.000</p>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-cartao-2"><div className="h-2 w-[57%] rounded-full bg-marca" /></div>
                  </div>
                  <div className="flex items-center gap-3 rounded-2xl bg-cartao p-3 shadow-cartao">
                    <span className="grid size-9 place-items-center rounded-xl bg-marca-suave text-marca"><Camera size={18} /></span>
                    <div className="flex-1">
                      <p className="text-sm font-bold">Check-in de segunda</p>
                      <p className="text-xs text-suave">Menos de 1 minuto</p>
                    </div>
                    <span className="rounded-full bg-alerta-suave px-2 py-0.5 text-[0.65rem] font-bold text-alerta">Hoje</span>
                  </div>
                  <div className="flex items-center gap-3 rounded-2xl bg-cartao p-3 shadow-cartao">
                    <Placa placa="RTA1B23" tamanho="sm" />
                    <div>
                      <p className="text-sm font-bold">Fiat Uno 1.0</p>
                      <p className="text-xs text-suave">Contrato ativo</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="absolute -right-24 bottom-10 z-10 hidden rotate-[5deg] rounded-2xl bg-white p-3 text-[#0b1630] shadow-flutuante xl:block">
              <p className="flex items-center gap-1.5 text-[0.7rem] font-semibold text-suave"><ClipboardCheck size={14} className="text-marca" /> Vistoria confirmada</p>
              <p className="text-sm font-bold">8 fotos · 10 itens OK</p>
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
