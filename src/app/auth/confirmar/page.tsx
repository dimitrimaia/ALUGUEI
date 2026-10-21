import { Marca } from "@/components/ui";
import { Confirmar } from "./confirmar";

export const metadata = { title: "Entrando", robots: { index: false } };

/** Destino dos links de e-mail (entrar, confirmar a conta e criar senha nova). */
export default function PaginaConfirmar() {
  return (
    <main className="tema-claro grid min-h-dvh place-items-center bg-fundo px-5 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center"><Marca /></div>
        <div className="rounded-[1.5rem] border border-borda bg-cartao p-6 shadow-flutuante">
          <Confirmar />
        </div>
      </div>
    </main>
  );
}
