import Link from "next/link";

export default function Inicio() {
  return (
    <main className="mx-auto flex max-w-md flex-col gap-4 p-6">
      <h1 className="text-2xl font-semibold">Aluguei</h1>
      <p style={{ color: "var(--suave)" }}>Estrutura inicial. Escolha uma área:</p>
      <Link className="rounded-lg border p-4" href="/painel">
        Painel do locador
      </Link>
      <Link className="rounded-lg border p-4" href="/m">
        App do motorista
      </Link>
    </main>
  );
}
