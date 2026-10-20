/** Casca do app do motorista: pensado para celular, centralizado em telas maiores. */
export default function LayoutMotorista({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-fundo sm:py-6">
      <main className="mx-auto min-h-dvh max-w-[30rem] bg-fundo px-4 pb-10 sm:min-h-0 sm:overflow-hidden sm:rounded-[2rem] sm:border sm:border-borda sm:shadow-flutuante">
        {children}
      </main>
    </div>
  );
}
