import { ArrowRight, BellRing, Building2, Camera, Car, Check, ChevronDown, ClipboardCheck, FileSignature, Gauge, Landmark, Lock, Receipt, ShieldCheck, Smartphone, UserCheck, Wallet } from "lucide-react";
import { CabecalhoSite } from "@/components/site/cabecalho";
import { BotaoLink, Marca, Placa } from "@/components/ui";

const RECURSOS = [
  { icone: UserCheck, titulo: "Cadastro e análise do motorista", texto: "Convite pelo WhatsApp, cadastro pelo celular e pré-análise de idade, tempo de CNH e observação EAR. Quem aprova é você.", breve: false },
  { icone: FileSignature, titulo: "Contrato digital", texto: "Gerado com os seus valores, numerado e com valor por extenso sem erro. Assinado pelo celular, com validade pela Lei 14.063.", breve: false },
  { icone: ClipboardCheck, titulo: "Vistoria de entrega", texto: "8 fotos guiadas com data, hora e local, checklist de avarias e confirmação do motorista no celular dele.", breve: false },
  { icone: Wallet, titulo: "Cobrança semanal no Pix", texto: "Pix gerado antes do vencimento, multa e juros do contrato no atraso e baixa automática quando o motorista paga.", breve: false },
  { icone: Receipt, titulo: "Extrato e financeiro", texto: "Recebido, a receber e em atraso. O motorista vê o extrato dele; você exporta tudo para planilha.", breve: false },
  { icone: Camera, titulo: "Check-in de segunda", texto: "Fotos do painel, óleo, água e vídeo do carro toda semana, guiados pela câmera.", breve: true },
  { icone: BellRing, titulo: "Lembretes e notificações", texto: "Avisos antes do vencimento e notificação formal no prazo do contrato, com prova de envio.", breve: true },
  { icone: Gauge, titulo: "Km, franquia e revisões", texto: "Km do mês contra a franquia, cobrança do excedente e alerta da próxima revisão.", breve: true },
];

const PARA_QUEM = [
  {
    titulo: "Para o locador",
    icone: Building2,
    itens: [
      "Menos tempo cobrando e conferindo foto no WhatsApp",
      "Menos atraso: o Pix chega pronto, com multa e juros do contrato",
      "Contrato, vistoria e pagamentos de cada carro num lugar só",
      "Provas organizadas se precisar discutir uma avaria ou um débito",
    ],
  },
  {
    titulo: "Para o motorista",
    icone: Car,
    itens: [
      "Cadastro em cerca de 5 minutos, pelo celular",
      "Contrato com resumo em linguagem simples antes de assinar",
      "Pagamento no Pix com QR Code ou copia e cola",
      "Extrato com tudo o que foi cobrado e pago, e por quê",
    ],
  },
];

const DUVIDAS = [
  { p: "O dinheiro do aluguel passa pelo Aluguei?", r: "Não. O Pix cai direto numa conta de recebimento no nome do locador, aberta no Asaas, instituição de pagamento autorizada pelo Banco Central. O Aluguei recebe só a própria taxa, separada no momento do pagamento." },
  { p: "O contrato tem validade jurídica?", r: "Sim. As partes assinam eletronicamente (Lei 14.063/2020) e cada aceite guarda data, hora, IP, aparelho e o código de verificação do PDF. O contrato é entre locador e motorista; recomendamos revisar o modelo com o seu advogado." },
  { p: "O motorista precisa baixar um aplicativo?", r: "Não. Ele abre o link do convite no navegador do celular. Se quiser, adiciona o Aluguei à tela inicial e usa como um aplicativo." },
  { p: "Preciso ter CNPJ?", r: "Não. Dá para usar como pessoa física (CPF) ou empresa (CNPJ, inclusive MEI)." },
  { p: "E se o motorista atrasar o pagamento?", r: "O Pix já aplica a multa e os juros definidos no contrato. Você vê o atraso no painel e decide o que fazer. Rescisão e retomada do carro nunca acontecem sozinhas." },
  { p: "Quanto custa?", r: "R$ 250 por mês para cada carro com contrato ativo, descontados aos poucos em cada Pix de aluguel. Carro parado não paga nada." },
  { p: "Como ficam os dados dos motoristas?", r: "Documentos e fotos ficam guardados com acesso restrito ao locador que fez o convite. O motorista autoriza cada uso no cadastro, como pede a LGPD." },
];

const PASSOS = [
  { icone: Smartphone, titulo: "Convide pelo WhatsApp", texto: "Cadastre o carro, defina valor, caução e franquia e mande o link. O motorista vê tudo antes de se cadastrar." },
  { icone: UserCheck, titulo: "Analise o cadastro", texto: "O motorista manda CNH, comprovantes e o print do app. O sistema aponta pendências e você aprova ou recusa." },
  { icone: FileSignature, titulo: "Assine e vistorie", texto: "O contrato sai pronto com os valores combinados. Na retirada, a vistoria com fotos fica registrada pelos dois." },
  { icone: Wallet, titulo: "Receba toda semana", texto: "O Pix é gerado antes do vencimento e a baixa é automática. Você acompanha recebido e atrasos no painel." },
];

export default function Inicio() {
  return (
    <div className="min-h-dvh bg-cartao">
      <div className="fundo-marca relative overflow-hidden">
        <div className="grade-sutil absolute inset-0 [mask-image:radial-gradient(80%_70%_at_70%_30%,black,transparent)]" aria-hidden />
        <CabecalhoSite />

        <section className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 pt-8 pb-20 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:pt-14 lg:pb-28">
          <div className="animar-entrada">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/12 px-3 py-1.5 text-sm font-semibold ring-1 ring-white/20 backdrop-blur">
              <span className="size-2 rounded-full bg-[#7dd3fc]" /> Para quem aluga carro para motorista de app
            </span>
            <h1 className="mt-6 text-[2.4rem] leading-[1.06] font-extrabold tracking-tight text-balance sm:text-[3.4rem]">
              Alugue seu carro para motorista de app sem virar cobrador.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-white/80">
              O Aluguei cuida da rotina do contrato por você: cadastro e análise do motorista, contrato digital, vistoria com fotos e
              cobrança semanal no Pix. Você acompanha tudo pelo painel e só decide o que é importante.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <BotaoLink href="/entrar?perfil=locador" tamanho="lg" variante="claro">Criar conta de locador <ArrowRight size={18} /></BotaoLink>
              <BotaoLink href="/entrar?perfil=motorista" tamanho="lg" variante="vidro">Sou motorista</BotaoLink>
            </div>
            <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/80">
              {["Sem planilha", "Pix direto na sua conta", "Carro parado não paga"].map((t) => (
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
        <section className="border-b border-borda">
          <div className="mx-auto grid max-w-6xl gap-6 px-4 py-10 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
            {[
              { valor: "~5 min", texto: "para o motorista se cadastrar pelo celular" },
              { valor: "100%", texto: "digital: convite, contrato, vistoria e pagamento" },
              { valor: "R$ 0", texto: "de mensalidade para carro parado" },
              { valor: "Pix", texto: "direto na sua conta, com baixa automática" },
            ].map((x) => (
              <div key={x.texto}>
                <p className="text-3xl font-extrabold tracking-tight text-marca">{x.valor}</p>
                <p className="mt-1 text-sm text-suave">{x.texto}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="como-funciona" className="mx-auto max-w-6xl scroll-mt-6 px-4 py-20 sm:px-6">
          <p className="text-sm font-bold tracking-[0.14em] text-marca uppercase">Como funciona</p>
          <h2 className="mt-2 max-w-2xl text-3xl font-extrabold tracking-tight text-balance sm:text-4xl">Do convite ao carro rodando, sem papel</h2>
          <ol className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {PASSOS.map(({ icone: Icone, titulo, texto }, i) => (
              <li key={titulo} className="relative rounded-[1.5rem] border border-borda bg-fundo p-6">
                <span className="absolute top-5 right-6 text-5xl font-extrabold text-marca/10">{i + 1}</span>
                <span className="grid size-12 place-items-center rounded-2xl bg-marca text-white shadow-marca"><Icone size={22} /></span>
                <p className="mt-5 text-lg font-bold">{titulo}</p>
                <p className="mt-2 text-sm leading-relaxed text-suave">{texto}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="bg-fundo">
          <div className="mx-auto grid max-w-6xl gap-5 px-4 py-20 sm:px-6 lg:grid-cols-2">
            {PARA_QUEM.map(({ titulo, icone: Icone, itens }, i) => (
              <div key={titulo} className={`rounded-[1.75rem] p-7 sm:p-9 ${i === 0 ? "fundo-marca shadow-flutuante" : "border border-borda bg-cartao shadow-cartao"}`}>
                <span className={`grid size-12 place-items-center rounded-2xl ${i === 0 ? "bg-white/15 ring-1 ring-white/25" : "bg-marca-suave text-marca"}`}><Icone size={24} /></span>
                <h3 className="mt-5 text-2xl font-extrabold tracking-tight">{titulo}</h3>
                <ul className="mt-5 flex flex-col gap-3">
                  {itens.map((t) => (
                    <li key={t} className="flex gap-3">
                      <Check size={20} className={`mt-0.5 shrink-0 ${i === 0 ? "text-[#7dd3fc]" : "text-marca"}`} />
                      <span className={i === 0 ? "text-white/90" : ""}>{t}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <section id="recursos" className="mx-auto max-w-6xl scroll-mt-6 px-4 py-20 sm:px-6">
          <p className="text-sm font-bold tracking-[0.14em] text-marca uppercase">Recursos</p>
          <h2 className="mt-2 max-w-2xl text-3xl font-extrabold tracking-tight text-balance sm:text-4xl">O que o contrato manda, o Aluguei acompanha</h2>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {RECURSOS.map(({ icone: Icone, titulo, texto, breve }) => (
              <div key={titulo} className="flex flex-col rounded-[1.5rem] border border-borda bg-cartao p-6 shadow-cartao transition-all hover:-translate-y-1 hover:shadow-flutuante">
                <div className="flex items-start justify-between gap-2">
                  <span className="grid size-12 place-items-center rounded-2xl bg-marca-suave text-marca"><Icone size={22} /></span>
                  {breve && <span className="rounded-full bg-alerta-suave px-2.5 py-0.5 text-xs font-bold text-alerta">Em breve</span>}
                </div>
                <p className="mt-5 font-bold">{titulo}</p>
                <p className="mt-2 text-sm leading-relaxed text-suave">{texto}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="fundo-navy">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[1fr_1.2fr] lg:items-center">
            <div>
              <p className="text-sm font-bold tracking-[0.14em] text-[#7dd3fc] uppercase">Segurança</p>
              <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-balance sm:text-4xl">Seu dinheiro na sua conta. Suas provas guardadas.</h2>
              <p className="mt-4 text-white/70">Feito para quem precisa provar o que aconteceu: cada foto, vistoria e aceite fica registrado e não pode ser alterado depois.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                { icone: Landmark, titulo: "Pix direto para você", texto: "Conta de recebimento no seu nome, no Asaas. A plataforma não guarda o seu dinheiro." },
                { icone: ShieldCheck, titulo: "Provas com código", texto: "Fotos e documentos com data, hora, local e código de verificação (SHA-256)." },
                { icone: Lock, titulo: "Dados protegidos", texto: "Cada locador só vê os próprios dados. Autorizações do motorista registradas (LGPD)." },
                { icone: UserCheck, titulo: "Você decide", texto: "Rescisão, retomada do carro e protesto nunca acontecem automaticamente." },
              ].map(({ icone: Icone, titulo, texto }) => (
                <div key={titulo} className="rounded-2xl bg-white/[0.05] p-5 ring-1 ring-white/10">
                  <Icone size={22} className="text-[#7dd3fc]" />
                  <p className="mt-3 font-bold">{titulo}</p>
                  <p className="mt-1 text-sm text-white/65">{texto}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="preco" className="mx-auto max-w-6xl scroll-mt-6 px-4 py-20 sm:px-6">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="text-sm font-bold tracking-[0.14em] text-marca uppercase">Preço</p>
              <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-balance sm:text-4xl">Você só paga pelo carro que está rodando</h2>
              <p className="mt-4 text-suave">Sem fatura separada: a taxa é descontada automaticamente de cada Pix de aluguel que o motorista paga. Se o carro está parado, você não paga nada por ele.</p>
            </div>
            <div className="rounded-[1.75rem] border-2 border-marca bg-cartao p-7 shadow-flutuante sm:p-9">
              <p className="text-sm font-semibold text-suave">Por carro com contrato ativo</p>
              <p className="mt-1 text-5xl font-extrabold tracking-tight">R$ 250<span className="text-lg font-semibold text-suave">/mês</span></p>
              <p className="mt-2 text-sm text-suave">Equivale a R$ 57,53 por semana de aluguel.</p>
              <ul className="mt-6 flex flex-col gap-3 text-sm">
                {["Carro parado não paga", "Cobrança junto com o aluguel, sem boleto", "Contrato, vistoria, Pix e extrato incluídos", "Pessoa física ou empresa"].map((t) => (
                  <li key={t} className="flex gap-3"><Check size={18} className="mt-0.5 shrink-0 text-marca" /> {t}</li>
                ))}
              </ul>
              <BotaoLink href="/entrar?perfil=locador" tamanho="lg" className="mt-8 w-full">Criar conta de locador</BotaoLink>
            </div>
          </div>
        </section>

        <section id="duvidas" className="bg-fundo">
          <div className="mx-auto max-w-3xl scroll-mt-6 px-4 py-20 sm:px-6">
            <p className="text-sm font-bold tracking-[0.14em] text-marca uppercase">Dúvidas</p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">Perguntas frequentes</h2>
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
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="fundo-marca relative overflow-hidden rounded-[2rem] px-6 py-14 text-center sm:px-12">
            <div className="grade-sutil absolute inset-0 opacity-70 [mask-image:radial-gradient(60%_80%_at_50%_0%,black,transparent)]" aria-hidden />
            <div className="relative">
              <h2 className="text-3xl font-extrabold tracking-tight text-balance sm:text-4xl">Comece pelo primeiro carro</h2>
              <p className="mx-auto mt-4 max-w-xl text-white/80">Crie a conta, cadastre o carro e mande o convite para o motorista. Leva poucos minutos.</p>
              <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
                <BotaoLink href="/entrar?perfil=locador" tamanho="lg" variante="claro">Criar conta de locador <ArrowRight size={18} /></BotaoLink>
                <BotaoLink href="/entrar?perfil=motorista" tamanho="lg" variante="vidro">Sou motorista</BotaoLink>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="fundo-navy">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-10 text-sm text-white/60 sm:flex-row sm:px-6">
          <Marca inverso />
          <p>© {new Date().getFullYear()} Aluguei · Gestão de locação de carros para motoristas de aplicativo</p>
        </div>
      </footer>
    </div>
  );
}
