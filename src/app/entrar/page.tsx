import { ArrowLeft, Building2, CalendarCheck, Camera, Car, FileSignature, ShieldCheck, Wallet } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { Marca } from "@/components/ui";
import { FormularioEntrar } from "./formulario";
import { LembrarPerfil } from "./lembrar";

const PERFIS = {
  locador: {
    titulo: "Área do locador",
    texto: "Entre ou crie a conta da sua locadora. É o mesmo passo: enviamos um código e pronto.",
    itens: [
      { icone: FileSignature, texto: "Contrato gerado com os seus valores e assinado pelo celular" },
      { icone: Wallet, texto: "Aluguel cobrado no Pix toda semana, com baixa automática" },
      { icone: ShieldCheck, texto: "Vistorias e aceites guardados como prova" },
    ],
  },
  motorista: {
    titulo: "Área do motorista",
    texto: "Acompanhe seu aluguel, pague no Pix e veja seu contrato. Primeira vez? Abra o link do convite que o locador mandou.",
    itens: [
      { icone: Wallet, texto: "Pague o aluguel no Pix em segundos" },
      { icone: FileSignature, texto: "Contrato e extrato sempre à mão" },
      { icone: Camera, texto: "Vistoria e fotos do carro registradas com data e local" },
    ],
  },
  geral: {
    titulo: "Bem-vindo ao Aluguei",
    texto: "Entre com um código no e-mail ou no celular. Sem senha para lembrar.",
    itens: [
      { icone: CalendarCheck, texto: "Cobrança semanal e lembretes automáticos" },
      { icone: Camera, texto: "Vistorias com fotos guiadas" },
      { icone: ShieldCheck, texto: "Provas com data, hora, local e código de verificação" },
    ],
  },
} as const;

export default async function Entrar({ searchParams }: { searchParams: Promise<{ voltar?: string; erro?: string; perfil?: string; novo?: string }> }) {
  const { voltar, erro, perfil, novo } = await searchParams;
  // Só aceita caminhos internos, para o link de login não virar redirecionamento aberto.
  const tipo = perfil === "locador" || perfil === "motorista" ? perfil : "geral";
  const padrao = tipo === "locador" ? "/painel" : tipo === "motorista" ? "/m" : "/inicio";
  const destino = voltar?.startsWith("/") && !voltar.startsWith("//") ? voltar : padrao;
  const p = PERFIS[tipo];
  // Motorista: visual claro, igual ao site na visão do motorista. Locador (e geral): azul.
  const claro = tipo === "motorista";
  const site = tipo === "geral" ? "/" : `/?para=${tipo}`;

  return (
    <main className={`min-h-dvh bg-cartao lg:grid lg:grid-cols-2 ${claro ? "tema-claro" : ""}`}>
      {tipo !== "geral" && <LembrarPerfil perfil={tipo} />}
      <section
        className={`relative overflow-hidden px-6 pt-8 pb-24 lg:flex lg:flex-col lg:justify-between lg:p-14 ${claro ? "bg-gradient-to-b from-[#e6efff] via-[#f2f6ff] to-[#f8faff] text-[#0b1630] lg:border-r lg:border-borda" : "fundo-marca"}`}
      >
        {!claro && <div className="grade-sutil absolute inset-0 [mask-image:radial-gradient(70%_70%_at_30%_20%,black,transparent)]" aria-hidden />}
        <div className="relative flex items-center justify-between">
          <Link href={site as Route} aria-label="Aluguei, início"><Marca inverso={!claro} /></Link>
          <Link
            href={site as Route}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold ${claro ? "bg-white text-[#0b1630] shadow-cartao ring-1 ring-borda hover:bg-cartao-2" : "bg-white/10 ring-1 ring-white/20 hover:bg-white/20"}`}
          >
            <ArrowLeft size={16} /> Voltar ao site
          </Link>
        </div>
        <div className="relative mt-10 lg:mt-0">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${claro ? "bg-marca-suave text-marca" : "bg-white/12 ring-1 ring-white/20"}`}>
            {tipo === "motorista" ? <Car size={14} /> : <Building2 size={14} />} {tipo === "motorista" ? "Motorista" : tipo === "locador" ? "Locador" : "Aluguei"}
          </span>
          <h1 className="mt-4 text-3xl leading-tight font-extrabold tracking-tight sm:text-4xl lg:text-5xl">{p.titulo}</h1>
          <p className={`mt-3 max-w-md lg:text-lg ${claro ? "text-[#5b6880]" : "text-white/80"}`}>{p.texto}</p>
          <ul className="mt-10 hidden flex-col gap-4 lg:flex">
            {p.itens.map(({ icone: Icone, texto }) => (
              <li key={texto} className={`flex items-center gap-3 ${claro ? "" : "text-white/90"}`}>
                <span className={`grid size-10 place-items-center rounded-xl ${claro ? "bg-white text-marca shadow-cartao ring-1 ring-borda" : "bg-white/12 ring-1 ring-white/20"}`}><Icone size={20} /></span>
                {texto}
              </li>
            ))}
          </ul>
        </div>
        <p className={`relative hidden text-sm lg:block ${claro ? "text-[#5b6880]" : "text-white/60"}`}>© {new Date().getFullYear()} Aluguei</p>
      </section>
      <section className="relative -mt-14 px-4 pb-10 lg:mt-0 lg:grid lg:place-items-center lg:p-14">
        <div className={`mx-auto w-full max-w-sm rounded-[1.5rem] border bg-cartao p-6 shadow-flutuante lg:border-0 lg:p-0 lg:shadow-none ${claro ? "border-marca/25" : "border-borda"}`}>
          <h2 className="text-xl font-extrabold tracking-tight">{tipo === "locador" ? "Entrar ou criar conta" : "Entrar"}</h2>
          <p className="mt-1 mb-6 text-sm text-suave">Vamos enviar um código de 6 dígitos para confirmar que é você.</p>
          {tipo === "motorista" && novo && (
            <p className="mb-5 rounded-xl bg-marca-suave p-3 text-sm">
              <strong>Primeira vez?</strong> O cadastro de motorista começa pelo link de convite que o locador manda no WhatsApp. Abra o link neste celular.
            </p>
          )}
          <FormularioEntrar destino={destino} erroInicial={erro === "link" ? "O link expirou ou já foi usado. Peça um código novo." : undefined} />
          <p className="mt-6 text-center text-sm text-suave">
            {tipo === "motorista" ? (
              <>É locador? <Link href="/entrar?perfil=locador" className="font-semibold text-marca">Entre pela área do locador</Link></>
            ) : (
              <>É motorista? <Link href="/entrar?perfil=motorista" className="font-semibold text-marca">Entre pela área do motorista</Link></>
            )}
          </p>
        </div>
      </section>
    </main>
  );
}
