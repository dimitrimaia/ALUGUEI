import { Marca } from "@/components/ui";
import { FormularioEntrar } from "./formulario";

export default async function Entrar({ searchParams }: { searchParams: Promise<{ voltar?: string }> }) {
  const { voltar } = await searchParams;
  // Só aceita caminhos internos, para o link de login não virar redirecionamento aberto.
  const destino = voltar?.startsWith("/") && !voltar.startsWith("//") ? voltar : "/m";
  return (
    <main className="grid min-h-dvh place-items-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center"><Marca className="text-xl" /></div>
        <div className="rounded-2xl border border-borda bg-cartao p-6 shadow-cartao">
          <h1 className="text-xl font-bold tracking-tight">Entrar</h1>
          <p className="mt-1 mb-6 text-sm text-suave">Enviamos um código para confirmar que é você. Sem senha.</p>
          <FormularioEntrar destino={destino} />
        </div>
      </div>
    </main>
  );
}
