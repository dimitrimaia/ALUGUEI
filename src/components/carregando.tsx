/** Esqueleto mostrado na hora em que a pessoa toca numa opção, enquanto a tela carrega. */
export function Carregando({ variante = "lista" }: { variante?: "lista" | "painel" }) {
  const bloco = "animate-pulse rounded-[1.1rem] bg-borda/70";
  return (
    <div className="flex flex-col gap-4 py-2" role="status" aria-label="Carregando">
      <div className={`${bloco} h-6 w-40`} />
      {variante === "painel" && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => <div key={i} className={`${bloco} h-20`} />)}
        </div>
      )}
      <div className={`${bloco} h-28`} />
      <div className={`${bloco} h-16`} />
      <div className={`${bloco} h-16`} />
      <div className={`${bloco} h-16 opacity-60`} />
      <span className="sr-only">Carregando…</span>
    </div>
  );
}
