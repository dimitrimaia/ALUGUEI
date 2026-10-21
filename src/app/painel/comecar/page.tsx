import { Building2, CalendarCheck, ShieldCheck, Wallet } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Cartao, Marca } from "@/components/ui";
import { BotaoVoltar } from "@/components/voltar";
import { perfilResumido } from "@/lib/conta";
import { locadoraDoUsuario } from "@/lib/modos";
import { exigirUsuario } from "@/lib/sessao";
import { FormularioComecar } from "./formulario";

export const metadata = { title: "Ativar o modo locador" };

/** Ativa o modo locador na conta: cria a locadora (pessoa física ou empresa). */
export default async function Comecar() {
  const usuario = await exigirUsuario("/painel/comecar");
  if (await locadoraDoUsuario(usuario.id)) redirect("/painel");
  const perfil = await perfilResumido();

  return (
    <main className="mx-auto flex max-w-lg flex-col gap-4 px-4 py-6">
      <div className="mb-2 flex items-center justify-between">
        <Link href="/m" aria-label="Início do app"><Marca /></Link>
        <BotaoVoltar destino="/m" className="text-sm font-semibold text-suave hover:text-texto">Voltar</BotaoVoltar>
      </div>
      <span className="grid size-12 place-items-center rounded-2xl bg-marca text-white shadow-marca"><Building2 size={24} /></span>
      <h1 className="text-[1.6rem] leading-tight font-bold tracking-tight">Ative o modo locador</h1>
      <p className="text-sm text-suave">Anuncie seu carro para motoristas de app e receba o aluguel no Pix toda semana. É a mesma conta: você continua podendo alugar carros.</p>
      <ul className="grid gap-2 text-sm">
        {[
          { icone: CalendarCheck, texto: "Contrato com os seus valores, assinado pelo celular" },
          { icone: Wallet, texto: "Cobrança semanal no Pix com baixa automática" },
          { icone: ShieldCheck, texto: "Vistoria com fotos e check-in toda semana" },
        ].map(({ icone: Icone, texto }) => (
          <li key={texto} className="flex items-center gap-2.5"><Icone size={17} className="shrink-0 text-marca" /> {texto}</li>
        ))}
      </ul>
      <Cartao>
        <p className="mb-4 text-sm text-suave">Esses dados aparecem no contrato como LOCADOR.</p>
        <FormularioComecar nomeInicial={perfil?.nomeInformado ?? ""} />
      </Cartao>
    </main>
  );
}
