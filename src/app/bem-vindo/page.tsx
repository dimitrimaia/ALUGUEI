import { ArrowLeft, ArrowRight, Building2, Car, Smartphone } from "lucide-react";
import Link from "next/link";
import { Marca } from "@/components/ui";
import { exigirUsuario } from "@/lib/sessao";

/** Primeiro acesso de quem ainda não é locador nem motorista. */
export default async function BemVindo() {
  const usuario = await exigirUsuario("/bem-vindo");
  return (
    <main className="min-h-dvh bg-fundo px-4 py-10">
      <div className="mx-auto max-w-2xl">
        <div className="mb-10 flex items-center justify-between">
          <Link href="/" aria-label="Aluguei, início"><Marca /></Link>
          <Link href="/" className="inline-flex items-center gap-1 text-sm font-semibold text-suave hover:text-texto"><ArrowLeft size={16} /> Site</Link>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight">Como você vai usar o Aluguei?</h1>
        <p className="mt-2 text-suave">Você entrou como <strong className="text-texto">{usuario.email ?? usuario.telefone}</strong>.</p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <Link href="/painel/comecar" className="group flex flex-col gap-4 rounded-[1.5rem] border-2 border-marca bg-cartao p-6 shadow-cartao transition-all hover:-translate-y-0.5 hover:shadow-flutuante">
            <span className="grid size-12 place-items-center rounded-2xl bg-marca text-white shadow-marca"><Building2 size={24} /></span>
            <span>
              <span className="block text-lg font-bold">Tenho carros para alugar</span>
              <span className="mt-1 block text-sm text-suave">Crie a conta da sua locadora: frota, motoristas, contratos e cobrança no Pix.</span>
            </span>
            <span className="mt-auto inline-flex items-center gap-1 text-sm font-bold text-marca">Criar conta de locador <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" /></span>
          </Link>

          <div className="flex flex-col gap-4 rounded-[1.5rem] border border-borda bg-cartao p-6 shadow-cartao">
            <span className="grid size-12 place-items-center rounded-2xl bg-marca-suave text-marca"><Car size={24} /></span>
            <span>
              <span className="block text-lg font-bold">Sou motorista</span>
              <span className="mt-1 block text-sm text-suave">O cadastro de motorista começa pelo link de convite que o locador manda no seu WhatsApp.</span>
            </span>
            <span className="mt-auto flex items-start gap-2 rounded-xl bg-cartao-2 p-3 text-sm text-suave">
              <Smartphone size={18} className="mt-0.5 shrink-0 text-marca" />
              Abra o link do convite neste celular. Se ainda não recebeu, peça ao locador.
            </span>
          </div>
        </div>

        <form action="/sair" method="post" className="mt-8">
          <button className="text-sm font-medium text-suave underline">Entrar com outra conta</button>
        </form>
      </div>
    </main>
  );
}
