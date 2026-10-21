"use client";

import { Ambulance, Flame, MapPin, Phone, ShieldAlert, Siren, X } from "lucide-react";
import { useState } from "react";
import { createPortal } from "react-dom";

const NUMEROS = [
  { numero: "190", rotulo: "Polícia", detalhe: "Roubo, furto, ameaça", icone: Siren },
  { numero: "192", rotulo: "SAMU", detalhe: "Alguém ferido", icone: Ambulance },
  { numero: "193", rotulo: "Bombeiros", detalhe: "Fogo, acidente grave", icone: Flame },
] as const;

/**
 * Ajuda urgente para quem está com o carro: ligar para os serviços de
 * emergência e mandar a localização exata (do celular) para quem quiser.
 * Não depende de rastreador.
 */
export function BotaoEmergencia({ variante = "bloco" }: { variante?: "bloco" | "linha" }) {
  const [aberto, setAberto] = useState(false);
  const [estado, setEstado] = useState<string | null>(null);

  function enviarLocalizacao() {
    if (!navigator.geolocation) return setEstado("Este celular não informa a localização.");
    setEstado("Pegando a localização…");
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const texto = `Preciso de ajuda. Estou aqui: https://maps.google.com/?q=${coords.latitude.toFixed(6)},${coords.longitude.toFixed(6)}`;
        try {
          if (navigator.share) await navigator.share({ text: texto });
          else location.href = `https://wa.me/?text=${encodeURIComponent(texto)}`;
          setEstado(null);
        } catch {
          setEstado(null);
        }
      },
      () => setEstado("Libere a localização para o Aluguei nas configurações do celular."),
      { enableHighAccuracy: true, timeout: 15000 },
    );
  }

  return (
    <>
      {variante === "bloco" ? (
        <button onClick={() => setAberto(true)} className="flex flex-col items-center gap-2 rounded-[1.1rem] border border-perigo/25 bg-cartao p-3 shadow-cartao active:scale-[0.98]">
          <span className="grid size-12 place-items-center rounded-2xl bg-perigo-suave text-perigo"><ShieldAlert size={22} /></span>
          <span className="text-xs font-semibold">Emergência</span>
        </button>
      ) : (
        <button onClick={() => setAberto(true)} className="flex w-full items-center gap-3 rounded-[1.1rem] border border-perigo/25 bg-cartao p-4 text-left shadow-cartao">
          <span className="grid size-10 place-items-center rounded-xl bg-perigo-suave text-perigo"><ShieldAlert size={20} /></span>
          <span className="flex-1"><span className="block text-sm font-semibold">Emergência</span><span className="block text-xs text-suave">Acidente, roubo ou pane: ligue ou mande sua localização</span></span>
        </button>
      )}
      {aberto &&
        createPortal(
          <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Emergência">
            <button className="absolute inset-0 bg-[#071a3d]/50 backdrop-blur-[2px]" onClick={() => setAberto(false)} aria-label="Fechar" />
            <div className="animar-entrada absolute inset-x-0 bottom-0 mx-auto max-w-[30rem] rounded-t-3xl bg-cartao p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-flutuante">
              <div className="mb-3 flex items-center justify-between">
                <p className="flex items-center gap-2 text-lg font-bold"><ShieldAlert size={20} className="text-perigo" /> Emergência</p>
                <button onClick={() => setAberto(false)} className="grid size-9 place-items-center rounded-full bg-cartao-2" aria-label="Fechar"><X size={18} /></button>
              </div>
              <div className="grid gap-2">
                {NUMEROS.map(({ numero, rotulo, detalhe, icone: Icone }) => (
                  <a key={numero} href={`tel:${numero}`} className="flex items-center gap-3 rounded-2xl border border-borda p-3.5 active:bg-cartao-2">
                    <span className="grid size-10 place-items-center rounded-xl bg-perigo-suave text-perigo"><Icone size={20} /></span>
                    <span className="flex-1"><span className="block font-semibold">{rotulo} · {numero}</span><span className="block text-xs text-suave">{detalhe}</span></span>
                    <Phone size={18} className="text-suave" />
                  </a>
                ))}
                <button onClick={enviarLocalizacao} className="flex items-center gap-3 rounded-2xl bg-marca p-3.5 text-left text-white shadow-marca">
                  <span className="grid size-10 place-items-center rounded-xl bg-white/15"><MapPin size={20} /></span>
                  <span className="flex-1"><span className="block font-semibold">Enviar minha localização</span><span className="block text-xs text-white/75">Para o locador, um familiar ou o seguro, pelo WhatsApp</span></span>
                </button>
                {estado && <p className="text-center text-sm text-suave">{estado}</p>}
              </div>
              <p className="mt-3 text-center text-xs text-suave">Depois, avise o locador pelas Conversas: o contrato pede comunicação imediata de acidente, roubo ou apreensão.</p>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
