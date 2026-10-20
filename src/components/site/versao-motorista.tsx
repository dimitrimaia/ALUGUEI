import { ArrowRight, Check, ChevronDown, ClipboardCheck, FileSignature, MessageCircle, QrCode, Receipt, ShieldCheck, Smartphone, UserCheck } from "lucide-react";
import { BotaoLink, Placa } from "@/components/ui";

const PASSOS = [
  { icone: MessageCircle, titulo: "Receba o convite", texto: "O locador manda um link no seu WhatsApp com o carro, o valor da semana, a caução e a franquia de km." },
  { icone: UserCheck, titulo: "Faça o cadastro", texto: "CNH, comprovante de endereço e o print do seu perfil no Uber ou 99. Leva uns 5 minutos." },
  { icone: FileSignature, titulo: "Assine pelo celular", texto: "Antes de assinar, você vê um resumo do contrato em linguagem simples." },
  { icone: ClipboardCheck, titulo: "Retire o carro", texto: "Vocês fazem a vistoria juntos e você confirma as fotos no seu celular." },
];

const DUVIDAS = [
  { p: "Preciso baixar algum aplicativo?", r: "Não. Tudo funciona no navegador do celular. Se quiser, adicione o Aluguei à tela inicial para abrir como um app." },
  { p: "Como faço para me cadastrar?", r: "O cadastro começa pelo link de convite que o locador manda. Se ainda não recebeu, peça a ele." },
  { p: "Como pago o aluguel?", r: "Pelo Pix, com QR Code ou código copia e cola. A confirmação chega em segundos e fica no seu extrato." },
  { p: "E se o carro tiver um risco que não fui eu?", r: "Na retirada, a vistoria registra fotos com data, hora e local. Você confere e só confirma se estiver tudo certo." },
  { p: "Meus documentos ficam seguros?", r: "Só o locador que te convidou vê seus documentos, e você autoriza cada uso no cadastro." },
];

/** Página inicial na visão do motorista: fundo claro, foco em convite, pagamento e transparência. */
export function VersaoMotorista() {
  return (
    <div className="bg-cartao">
      <section className="relative overflow-hidden bg-gradient-to-b from-[#eef3ff] to-cartao dark:from-[#0b1834]">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 pt-28 pb-20 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:pt-36">
          <div className="animar-entrada">
            <span className="inline-flex items-center gap-2 rounded-full bg-marca-suave px-3 py-1.5 text-sm font-semibold text-marca">
              <span className="size-2 rounded-full bg-marca" /> Para motoristas de Uber e 99
            </span>
            <h1 className="mt-6 text-[2.4rem] leading-[1.06] font-extrabold tracking-tight text-balance sm:text-[3.4rem]">
              Seu carro alugado, <span className="text-marca">sem papelada e sem surpresa.</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-suave">
              Cadastro pelo celular, contrato explicado em linguagem simples, pagamento no Pix e um extrato com tudo o que foi cobrado.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <BotaoLink href="/entrar?perfil=motorista" tamanho="lg">Entrar <ArrowRight size={18} /></BotaoLink>
              <BotaoLink href="#convite" tamanho="lg" variante="secundario">Como recebo o convite?</BotaoLink>
            </div>
          </div>

          <div className="mx-auto w-full max-w-[21rem]" aria-hidden>
            <div className="rounded-[2.2rem] border border-borda bg-cartao p-5 shadow-flutuante">
              <div className="flex items-center gap-3">
                <Placa placa="RTA1B23" />
                <div>
                  <p className="font-bold">Fiat Uno 1.0</p>
                  <p className="text-xs text-suave">Contrato ativo</p>
                </div>
              </div>
              <div className="mt-5 rounded-2xl bg-marca p-4 text-white shadow-marca">
                <p className="text-xs text-white/75">Aluguel desta semana</p>
                <p className="text-3xl font-extrabold">R$ 600,00</p>
                <div className="mt-3 flex items-center justify-center gap-2 rounded-xl bg-white py-2.5 text-sm font-bold text-[#1641b8]"><QrCode size={16} /> Pagar com Pix</div>
              </div>
              <div className="mt-3 flex flex-col gap-2">
                {[["Aluguel 20/10", "+ R$ 600,00 pago"], ["Caução 1/2", "+ R$ 600,00 pago"]].map(([a, b]) => (
                  <div key={a} className="flex items-center justify-between rounded-xl bg-cartao-2 px-3 py-2.5 text-sm">
                    <span className="font-semibold">{a}</span>
                    <span className="font-bold text-ok">{b}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="convite" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-20 sm:px-6">
        <p className="text-sm font-bold tracking-[0.14em] text-marca uppercase">Como funciona</p>
        <h2 className="mt-2 max-w-2xl text-3xl font-extrabold tracking-tight text-balance sm:text-4xl">Do convite ao carro na sua mão</h2>
        <ol className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {PASSOS.map(({ icone: Icone, titulo, texto }, i) => (
            <li key={titulo} className="relative rounded-[1.5rem] border border-borda bg-cartao p-6 shadow-cartao">
              <span className="absolute top-5 right-6 text-5xl font-extrabold text-marca/10">{i + 1}</span>
              <span className="grid size-12 place-items-center rounded-2xl bg-marca-suave text-marca"><Icone size={22} /></span>
              <p className="mt-5 text-lg font-bold">{titulo}</p>
              <p className="mt-2 text-sm leading-relaxed text-suave">{texto}</p>
            </li>
          ))}
        </ol>
        <div className="mt-6 flex items-start gap-3 rounded-2xl bg-marca-suave p-5 text-sm">
          <Smartphone size={20} className="mt-0.5 shrink-0 text-marca" />
          <p>O cadastro de motorista só começa pelo convite do locador. Se você aluga com alguém que ainda não usa o Aluguei, mostre esta página a ele.</p>
        </div>
      </section>

      <section className="bg-fundo">
        <div className="mx-auto grid max-w-6xl gap-4 px-4 py-20 sm:px-6 md:grid-cols-3">
          {[
            { icone: QrCode, titulo: "Pague em segundos", texto: "QR Code ou copia e cola. A baixa é automática, sem mandar comprovante." },
            { icone: Receipt, titulo: "Extrato transparente", texto: "Cada aluguel, pagamento, multa ou juros aparece com data e motivo." },
            { icone: ShieldCheck, titulo: "Vistoria que te protege", texto: "Fotos com data, hora e local na retirada. O que já existia fica registrado." },
          ].map(({ icone: Icone, titulo, texto }) => (
            <div key={titulo} className="rounded-[1.5rem] border border-borda bg-cartao p-6 shadow-cartao">
              <span className="grid size-12 place-items-center rounded-2xl bg-marca text-white shadow-marca"><Icone size={22} /></span>
              <p className="mt-5 font-bold">{titulo}</p>
              <p className="mt-2 text-sm leading-relaxed text-suave">{texto}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="duvidas" className="mx-auto max-w-3xl scroll-mt-24 px-4 py-20 sm:px-6">
        <p className="text-sm font-bold tracking-[0.14em] text-marca uppercase">Dúvidas</p>
        <h2 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">Perguntas de motoristas</h2>
        <div className="mt-10 flex flex-col gap-3">
          {DUVIDAS.map(({ p, r }) => (
            <details key={p} className="group rounded-2xl border border-borda bg-cartao px-5 py-4 shadow-cartao">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-bold">
                {p}
                <ChevronDown size={20} className="shrink-0 text-suave transition-transform group-open:rotate-180" />
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-suave">{r}</p>
            </details>
          ))}
        </div>
        <ul className="mt-10 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-suave">
          {["Sem app para baixar", "Pix com confirmação na hora", "Contrato com resumo simples"].map((t) => (
            <li key={t} className="flex items-center gap-2"><Check size={16} className="text-marca" /> {t}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
