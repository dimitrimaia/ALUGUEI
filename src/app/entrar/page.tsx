import { CalendarCheck, Camera, ShieldCheck } from "lucide-react";
import { Marca } from "@/components/ui";
import { FormularioEntrar } from "./formulario";

export default async function Entrar({ searchParams }: { searchParams: Promise<{ voltar?: string; erro?: string }> }) {
  const { voltar, erro } = await searchParams;
  // Só aceita caminhos internos, para o link de login não virar redirecionamento aberto.
  const destino = voltar?.startsWith("/") && !voltar.startsWith("//") ? voltar : "/m";
  return (
    <main className="min-h-dvh bg-cartao lg:grid lg:grid-cols-2">
      <section className="fundo-marca relative overflow-hidden px-6 pt-10 pb-24 lg:flex lg:flex-col lg:justify-between lg:p-14">
        <div className="grade-sutil absolute inset-0 [mask-image:radial-gradient(70%_70%_at_30%_20%,black,transparent)]" aria-hidden />
        <div className="relative"><Marca inverso /></div>
        <div className="relative mt-10 lg:mt-0">
          <h1 className="text-3xl leading-tight font-extrabold tracking-tight sm:text-4xl lg:text-5xl">Bem-vindo de volta.</h1>
          <p className="mt-3 max-w-md text-white/80 lg:text-lg">Entre com um código no celular ou no e-mail. Sem senha para lembrar.</p>
          <ul className="mt-10 hidden flex-col gap-4 lg:flex">
            {[
              { icone: CalendarCheck, texto: "Cobrança semanal e lembretes automáticos" },
              { icone: Camera, texto: "Check-in e vistorias com fotos guiadas" },
              { icone: ShieldCheck, texto: "Provas com data, hora, local e código de verificação" },
            ].map(({ icone: Icone, texto }) => (
              <li key={texto} className="flex items-center gap-3 text-white/90">
                <span className="grid size-10 place-items-center rounded-xl bg-white/12 ring-1 ring-white/20"><Icone size={20} /></span>
                {texto}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative hidden text-sm text-white/60 lg:block">© {new Date().getFullYear()} Aluguei</p>
      </section>
      <section className="relative -mt-14 px-4 pb-10 lg:mt-0 lg:grid lg:place-items-center lg:p-14">
        <div className="mx-auto w-full max-w-sm rounded-[1.5rem] border border-borda bg-cartao p-6 shadow-flutuante lg:border-0 lg:p-0 lg:shadow-none">
          <h2 className="text-xl font-extrabold tracking-tight">Entrar</h2>
          <p className="mt-1 mb-6 text-sm text-suave">Enviamos um código para confirmar que é você.</p>
          <FormularioEntrar destino={destino} erroInicial={erro === "link" ? "O link expirou ou já foi usado. Peça um código novo." : undefined} />
        </div>
      </section>
    </main>
  );
}
