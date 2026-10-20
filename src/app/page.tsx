import { ArrowRight, BellRing, Camera, Check, ClipboardCheck, FileSignature, Gauge, ShieldCheck, Smartphone, Wallet } from "lucide-react";
import { BotaoLink, Marca, Placa } from "@/components/ui";

const RECURSOS = [
  { icone: FileSignature, titulo: "Contrato digital", texto: "Gerado com os seus valores, sem erro de extenso, assinado pelo celular com validade legal." },
  { icone: Wallet, titulo: "Cobrança semanal no Pix", texto: "Cobrança automática toda semana. Juros e multa calculados, baixa sozinha." },
  { icone: Camera, titulo: "Check-in de segunda", texto: "Fotos e vídeo guiados pela câmera. Você vê quem enviou e quem atrasou." },
  { icone: Gauge, titulo: "Km e revisões", texto: "Histórico de quilometragem, franquia do mês e alerta da próxima revisão." },
  { icone: BellRing, titulo: "Régua de cobrança", texto: "Lembretes e notificações formais no prazo do contrato, com prova de envio." },
  { icone: ShieldCheck, titulo: "Provas guardadas", texto: "Vistorias, fotos e aceites com data, hora, local e código de verificação." },
];

const PASSOS = [
  { icone: Smartphone, titulo: "Convide pelo WhatsApp", texto: "O motorista vê o carro e as condições e faz o cadastro em 5 minutos." },
  { icone: FileSignature, titulo: "Assine e vistorie", texto: "Contrato gerado na hora e vistoria guiada com fotos, tudo pelo celular." },
  { icone: Wallet, titulo: "O resto é automático", texto: "Cobrança, check-in, km e revisões rodam sozinhos. Você só decide." },
];

export default function Inicio() {
  return (
    <div className="min-h-dvh bg-cartao">
      <div className="fundo-marca relative overflow-hidden">
        <div className="grade-sutil absolute inset-0 [mask-image:radial-gradient(80%_70%_at_70%_30%,black,transparent)]" aria-hidden />
        <header className="relative mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
          <Marca inverso />
          <div className="flex items-center gap-2">
            <BotaoLink href="/m" variante="vidro" tamanho="sm" className="hidden sm:inline-flex">Sou motorista</BotaoLink>
            <BotaoLink href="/entrar?voltar=/painel" variante="claro" tamanho="sm">Entrar</BotaoLink>
          </div>
        </header>

        <section className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 pt-8 pb-20 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:pt-14 lg:pb-28">
          <div className="animar-entrada">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/12 px-3 py-1.5 text-sm font-semibold ring-1 ring-white/20 backdrop-blur">
              <span className="size-2 rounded-full bg-[#7dd3fc]" /> Para quem aluga carro para motorista de app
            </span>
            <h1 className="mt-6 text-[2.6rem] leading-[1.05] font-extrabold tracking-tight sm:text-6xl">
              Seu carro alugado<br />no piloto automático.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-white/80">
              O Aluguei faz o trabalho do administrador do contrato: cobra toda semana, pede as fotos de segunda, controla km e caução e
              guarda as provas. Você só decide.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <BotaoLink href="/painel" tamanho="lg" variante="claro">Começar como locador <ArrowRight size={18} /></BotaoLink>
              <BotaoLink href="/m" tamanho="lg" variante="vidro">Sou motorista</BotaoLink>
            </div>
            <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/80">
              {["Sem planilha", "Sem cobrar no WhatsApp", "Carro parado não paga"].map((t) => (
                <li key={t} className="flex items-center gap-2"><Check size={16} className="text-[#7dd3fc]" /> {t}</li>
              ))}
            </ul>
          </div>

          <div className="relative mx-auto w-full max-w-[22rem]" aria-hidden>
            <div className="absolute top-24 -left-24 z-10 hidden rotate-[-6deg] rounded-2xl bg-white p-3 text-[#0b1630] shadow-flutuante xl:block">
              <p className="text-[0.7rem] font-semibold text-suave">Pagamento recebido</p>
              <p className="text-lg font-extrabold text-ok">+ R$ 600,00</p>
            </div>
            <div className="rounded-[2.4rem] bg-[#06122c] p-3 shadow-[0_30px_80px_rgb(4_12_40_/_0.55)] ring-1 ring-white/10">
              <div className="overflow-hidden rounded-[1.9rem] bg-fundo text-texto">
                <div className="fundo-marca px-5 pt-6 pb-8">
                  <p className="text-xs text-white/75">Olá, João</p>
                  <p className="mt-3 text-xs text-white/75">Próximo pagamento · terça, 27/10</p>
                  <p className="text-3xl font-extrabold">R$ 600,00</p>
                  <div className="mt-4 rounded-xl bg-white py-2.5 text-center text-sm font-bold text-[#1641b8]">Pagar com Pix</div>
                </div>
                <div className="-mt-4 flex flex-col gap-2.5 px-3 pb-4">
                  <div className="rounded-2xl bg-cartao p-3 shadow-cartao">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-suave">Km do mês</p>
                      <p className="text-xs font-bold">3.420 / 6.000</p>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-cartao-2"><div className="h-2 w-[57%] rounded-full bg-marca" /></div>
                  </div>
                  <div className="flex items-center gap-3 rounded-2xl bg-cartao p-3 shadow-cartao">
                    <span className="grid size-9 place-items-center rounded-xl bg-marca-suave text-marca"><Camera size={18} /></span>
                    <div className="flex-1">
                      <p className="text-sm font-bold">Check-in de segunda</p>
                      <p className="text-xs text-suave">Menos de 1 minuto</p>
                    </div>
                    <span className="rounded-full bg-alerta-suave px-2 py-0.5 text-[0.65rem] font-bold text-alerta">Hoje</span>
                  </div>
                  <div className="flex items-center gap-3 rounded-2xl bg-cartao p-3 shadow-cartao">
                    <Placa placa="RTA1B23" tamanho="sm" />
                    <div>
                      <p className="text-sm font-bold">Fiat Uno 1.0</p>
                      <p className="text-xs text-suave">Contrato ativo</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="absolute -right-24 bottom-10 z-10 hidden rotate-[5deg] rounded-2xl bg-white p-3 text-[#0b1630] shadow-flutuante xl:block">
              <p className="flex items-center gap-1.5 text-[0.7rem] font-semibold text-suave"><ClipboardCheck size={14} className="text-marca" /> Vistoria confirmada</p>
              <p className="text-sm font-bold">8 fotos · 10 itens OK</p>
            </div>
          </div>
        </section>
      </div>

      <main>
        <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <p className="text-sm font-bold tracking-[0.14em] text-marca uppercase">Como funciona</p>
          <h2 className="mt-2 max-w-2xl text-3xl font-extrabold tracking-tight sm:text-4xl">Do convite ao carro rodando, sem papel</h2>
          <ol className="mt-12 grid gap-6 md:grid-cols-3">
            {PASSOS.map(({ icone: Icone, titulo, texto }, i) => (
              <li key={titulo} className="relative rounded-[1.5rem] border border-borda bg-fundo p-6">
                <span className="absolute top-6 right-6 text-5xl font-extrabold text-marca/10">{i + 1}</span>
                <span className="grid size-12 place-items-center rounded-2xl bg-marca text-white shadow-marca"><Icone size={22} /></span>
                <p className="mt-5 text-lg font-bold">{titulo}</p>
                <p className="mt-2 text-suave">{texto}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="bg-fundo">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
            <p className="text-sm font-bold tracking-[0.14em] text-marca uppercase">Recursos</p>
            <h2 className="mt-2 max-w-2xl text-3xl font-extrabold tracking-tight sm:text-4xl">Tudo o que o contrato manda, feito por você automaticamente</h2>
            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {RECURSOS.map(({ icone: Icone, titulo, texto }) => (
                <div key={titulo} className="rounded-[1.5rem] border border-borda bg-cartao p-6 shadow-cartao transition-all hover:-translate-y-1 hover:shadow-flutuante">
                  <span className="grid size-12 place-items-center rounded-2xl bg-marca-suave text-marca"><Icone size={22} /></span>
                  <p className="mt-5 font-bold">{titulo}</p>
                  <p className="mt-2 text-sm leading-relaxed text-suave">{texto}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="fundo-marca relative overflow-hidden rounded-[2rem] px-6 py-14 text-center sm:px-12">
            <div className="grade-sutil absolute inset-0 opacity-70 [mask-image:radial-gradient(60%_80%_at_50%_0%,black,transparent)]" aria-hidden />
            <div className="relative">
              <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Você só paga pelo carro que está rodando</h2>
              <p className="mx-auto mt-4 max-w-xl text-white/80">Carro parado não paga mensalidade. A taxa sai junto com o aluguel que o motorista paga, sem fatura separada.</p>
              <BotaoLink href="/painel" tamanho="lg" variante="claro" className="mt-9">Criar minha conta <ArrowRight size={18} /></BotaoLink>
            </div>
          </div>
        </section>
      </main>

      <footer className="fundo-navy">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-10 text-sm text-white/60 sm:flex-row sm:px-6">
          <Marca inverso />
          <p>© {new Date().getFullYear()} Aluguei. Gestão de locação para motoristas de aplicativo.</p>
        </div>
      </footer>
    </div>
  );
}
