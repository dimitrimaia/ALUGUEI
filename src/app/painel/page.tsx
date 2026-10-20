import { PARAMETROS_CONTRATO_REFERENCIA as ref } from "@/dominio/contrato/parametros";
import { formatarBRL } from "@/dominio/dinheiro/centavos";
import { reaisPorExtenso } from "@/dominio/dinheiro/por-extenso";

/** Painel do locador (RF-120). Por enquanto mostra o contrato de referência. */
export default function Painel() {
  return (
    <main className="mx-auto max-w-4xl p-6">
      <h1 className="text-2xl font-semibold">Painel do locador</h1>
      <section className="mt-6 grid gap-4 sm:grid-cols-4">
        {["Pagaram", "Em atraso", "Check-ins pendentes", "Revisões próximas"].map((titulo) => (
          <div key={titulo} className="rounded-lg border p-4">
            <p className="text-sm" style={{ color: "var(--suave)" }}>{titulo}</p>
            <p className="text-2xl font-semibold">0</p>
          </div>
        ))}
      </section>
      <p className="mt-6 text-sm" style={{ color: "var(--suave)" }}>
        Aluguel de referência: {formatarBRL(ref.aluguelSemanal)} ({reaisPorExtenso(ref.aluguelSemanal)}) por semana.
      </p>
    </main>
  );
}
