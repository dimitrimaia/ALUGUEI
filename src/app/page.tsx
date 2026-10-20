import { BellRing, Camera, FileSignature, Gauge, ShieldCheck, Wallet } from "lucide-react";
import { BotaoLink, Marca } from "@/components/ui";

const RECURSOS = [
  { icone: FileSignature, titulo: "Contrato digital", texto: "Gerado com os seus valores, sem erro de extenso, assinado pelo celular." },
  { icone: Wallet, titulo: "Cobrança semanal no Pix", texto: "Cobrança automática toda semana, juros e multa calculados e baixa sozinha." },
  { icone: Camera, titulo: "Check-in de segunda", texto: "O motorista manda fotos e vídeo guiados. Você vê quem enviou e quem atrasou." },
  { icone: Gauge, titulo: "Km e revisões", texto: "Histórico de quilometragem, franquia do mês e alerta da próxima revisão." },
  { icone: BellRing, titulo: "Régua de cobrança", texto: "Lembretes e notificações formais no prazo do contrato, com prova de envio." },
  { icone: ShieldCheck, titulo: "Provas guardadas", texto: "Vistorias, fotos e aceites com data, hora, local e código de verificação." },
];

export default function Inicio() {
  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <Marca />
        <BotaoLink href="/entrar" variante="secundario" tamanho="sm">Entrar</BotaoLink>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 pt-8 pb-16 sm:px-6 lg:grid-cols-2 lg:pt-16">
          <div>
            <span className="inline-block rounded-full bg-marca-suave px-3 py-1 text-sm font-semibold text-marca">Para quem aluga carro para motorista de app</span>
            <h1 className="mt-4 text-4xl leading-tight font-extrabold tracking-tight sm:text-5xl">
              Seu carro alugado, <span className="text-marca">no automático.</span>
            </h1>
            <p className="mt-4 max-w-xl text-lg text-suave">
              O Aluguei faz o trabalho do administrador do contrato: cobra toda semana, pede as fotos de segunda, controla km e
              caução e guarda as provas. Você só decide.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <BotaoLink href="/painel" tamanho="lg">Sou locador</BotaoLink>
              <BotaoLink href="/m" tamanho="lg" variante="secundario">Sou motorista</BotaoLink>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-sm" aria-hidden>
            <div className="absolute -inset-6 -z-10 rounded-[2.5rem] bg-marca-suave blur-2xl" />
            <div className="rounded-[2rem] border border-borda bg-cartao p-5 shadow-flutuante">
              <p className="text-sm text-suave">Próximo vencimento</p>
              <p className="text-3xl font-extrabold tracking-tight">R$ 600,00</p>
              <p className="text-sm text-suave">terça-feira, 27/10</p>
              <div className="mt-4 rounded-xl bg-marca py-3 text-center font-semibold text-marca-texto">Pagar com Pix</div>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-cartao-2 p-3">
                  <p className="text-xs text-suave">Km do mês</p>
                  <p className="font-bold">3.420 / 6.000</p>
                  <div className="mt-2 h-1.5 rounded-full bg-borda"><div className="h-1.5 w-[57%] rounded-full bg-marca" /></div>
                </div>
                <div className="rounded-xl bg-cartao-2 p-3">
                  <p className="text-xs text-suave">Caução</p>
                  <p className="font-bold">R$ 1.200,00</p>
                  <p className="mt-1 text-xs text-ok">Quitada</p>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-3 rounded-xl border border-borda p-3">
                <Camera className="text-marca" size={20} />
                <div className="flex-1">
                  <p className="text-sm font-semibold">Check-in de segunda</p>
                  <p className="text-xs text-suave">Leva menos de 1 minuto</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-borda bg-cartao">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Tudo o que o contrato manda, sem planilha nem WhatsApp manual</h2>
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {RECURSOS.map(({ icone: Icone, titulo, texto }) => (
                <div key={titulo} className="flex gap-4">
                  <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-marca-suave text-marca"><Icone size={22} /></span>
                  <div>
                    <p className="font-semibold">{titulo}</p>
                    <p className="mt-1 text-sm text-suave">{texto}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16 text-center sm:px-6">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Você só paga pelo carro que está rodando</h2>
          <p className="mx-auto mt-3 max-w-xl text-suave">Carro parado não paga mensalidade. A taxa sai junto com o aluguel que o motorista paga.</p>
          <BotaoLink href="/painel" tamanho="lg" className="mt-8">Começar agora</BotaoLink>
        </section>
      </main>

      <footer className="border-t border-borda py-8 text-center text-sm text-suave">© {new Date().getFullYear()} Aluguei</footer>
    </div>
  );
}
