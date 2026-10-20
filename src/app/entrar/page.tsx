import { FormularioEntrar } from "./formulario";

export default async function Entrar({ searchParams }: { searchParams: Promise<{ voltar?: string }> }) {
  const { voltar } = await searchParams;
  // Só aceita caminhos internos, para o link de login não virar redirecionamento aberto.
  const destino = voltar?.startsWith("/") && !voltar.startsWith("//") ? voltar : "/m";
  return (
    <main className="mx-auto flex max-w-sm flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold">Entrar no Aluguei</h1>
      <FormularioEntrar destino={destino} />
    </main>
  );
}
