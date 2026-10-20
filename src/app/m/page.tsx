/** Tela inicial do motorista (RF-121). Mobile-first, pensada para Android. */
export default function Motorista() {
  return (
    <main className="mx-auto flex max-w-md flex-col gap-4 p-4">
      <h1 className="text-xl font-semibold">Olá!</h1>
      <div className="rounded-xl border p-4">
        <p className="text-sm" style={{ color: "var(--suave)" }}>Próximo vencimento</p>
        <p className="text-2xl font-semibold">—</p>
        <button className="mt-3 w-full rounded-lg p-3 font-medium text-white" style={{ background: "var(--marca)" }}>
          Pagar com Pix
        </button>
      </div>
      <div className="rounded-xl border p-4">
        <p className="text-sm" style={{ color: "var(--suave)" }}>Km do mês / franquia</p>
        <p className="text-lg font-semibold">— / 6.000 km</p>
      </div>
      <button className="rounded-xl border p-4 text-left font-medium">Fazer check-in de segunda</button>
    </main>
  );
}
