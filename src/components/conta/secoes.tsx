import { Bell, Building2, Car, Settings2, CheckCircle2, ChevronRight, CircleDashed, Download, Hourglass, KeyRound, LifeBuoy, Lock, LogOut, Mail, MonitorSmartphone, Palette, ShieldCheck, UserRound } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { Aviso, Avatar, Cartao, Selo } from "@/components/ui";
import { FormularioNovaSenha } from "@/app/nova-senha/formulario";
import { sairDeTodosOsAparelhos } from "@/lib/acoes-conta";
import type { PerfilConta } from "@/lib/conta";
import { TEMAS } from "@/lib/tema";
import { TrocaModoDaConta } from "@/components/menu-app";
import { AtivarPush } from "./push";
import { FormAparencia, FormEmail, FormFoto, FormLocadora, FormNome, FormNotificacoes, VerificarCelular } from "./formularios";

export type Papel = "motorista" | "locador";

export const SECOES = {
  perfil: { titulo: "Dados pessoais", detalhe: "Foto, nome e contato", icone: UserRound },
  verificacao: { titulo: "Verificação da conta", detalhe: "E-mail, celular e documentos", icone: ShieldCheck },
  seguranca: { titulo: "Senha e acesso", detalhe: "Senha, e-mail de login e aparelhos", icone: KeyRound },
  locadora: { titulo: "Dados da locadora", detalhe: "Nome, cidade e aprovações", icone: Building2 },
  aparencia: { titulo: "Aparência", detalhe: "Tema claro ou escuro", icone: Palette },
  notificacoes: { titulo: "Notificações", detalhe: "Canais e assuntos dos avisos", icone: Bell },
  privacidade: { titulo: "Privacidade e dados", detalhe: "Seus dados, LGPD e exclusão", icone: Lock },
  ajuda: { titulo: "Ajuda e suporte", detalhe: "Dúvidas e falar com a gente", icone: LifeBuoy },
} as const;

export type ChaveSecao = keyof typeof SECOES;

export function eSecao(v: string, papel: Papel): v is ChaveSecao {
  return v in SECOES && (v !== "locadora" || papel === "locador");
}

function grupos(temLocadora: boolean): { titulo: string; itens: readonly ChaveSecao[] }[] {
  return [
    { titulo: "Conta", itens: ["perfil", "verificacao", "seguranca"] },
    ...(temLocadora ? [{ titulo: "Locadora", itens: ["locadora"] as const }] : []),
    { titulo: "Preferências", itens: ["aparencia", "notificacoes"] },
    { titulo: "Mais", itens: ["privacidade", "ajuda"] },
  ];
}

export interface ItemVerificacao {
  rotulo: string;
  detalhe: string;
  estado: "ok" | "andamento" | "pendente";
  href?: string;
}

const SUPORTE = "suporte@aluguei.xyz";

function Grupo({ titulo, children }: { titulo?: string; children: React.ReactNode }) {
  return (
    <section>
      {titulo && <h2 className="mb-2 px-1 text-xs font-semibold tracking-wide text-suave uppercase">{titulo}</h2>}
      <div className="divide-y divide-borda overflow-hidden rounded-[1.1rem] border border-borda bg-cartao shadow-cartao">{children}</div>
    </section>
  );
}

function Linha({ href, icone: Icone, titulo, detalhe, lateral }: { href: string; icone: typeof UserRound; titulo: string; detalhe?: string; lateral?: React.ReactNode }) {
  return (
    <Link href={href as Route} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-cartao-2 active:bg-cartao-2">
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-marca-suave text-marca"><Icone size={18} /></span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold">{titulo}</span>
        {detalhe && <span className="block truncate text-xs text-suave">{detalhe}</span>}
      </span>
      {lateral}
      <ChevronRight size={17} className="shrink-0 text-suave" />
    </Link>
  );
}

/** "a, b e c" */
function juntar(itens: string[]) {
  return itens.length > 1 ? `${itens.slice(0, -1).join(", ")} e ${itens.at(-1)}` : (itens[0] ?? "");
}

const ICONE_ESTADO = { ok: CheckCircle2, andamento: Hourglass, pendente: CircleDashed } as const;
const COR_ESTADO = { ok: "text-ok", andamento: "text-alerta", pendente: "text-suave" } as const;

/** Tela inicial de Conta: cartão do perfil, verificação e a lista de configurações. */
export function IndiceConta({ perfil, base, verificacao, locadora }: { perfil: PerfilConta; base: string; verificacao: ItemVerificacao[]; locadora: { nome: string; papel: "dono" | "operador" } | null }) {
  const feitos = verificacao.filter((v) => v.estado === "ok").length;
  const nomeTema = TEMAS.find((t) => t.id === perfil.preferencias.tema)?.rotulo;
  return (
    <div className="flex flex-col gap-5">
      <Link href={`${base}/perfil` as Route} className="flex items-center gap-4 rounded-[1.1rem] border border-borda bg-cartao p-4 shadow-cartao transition-colors hover:bg-cartao-2">
        <Avatar nome={perfil.nome} foto={perfil.foto} tamanho="lg" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-lg font-bold tracking-tight">{perfil.nome}</span>
          <span className="block truncate text-sm text-suave">{perfil.email ?? perfil.telefone}</span>
          <span className="mt-1.5 flex flex-wrap gap-1.5">
            <Selo tom="marca">Motorista</Selo>
            {locadora && <Selo tom="ok">Locador{locadora.papel === "operador" ? " · operador" : ""}</Selo>}
          </span>
        </span>
        <ChevronRight size={18} className="shrink-0 text-suave" />
      </Link>

      <Link href={`${base}/verificacao` as Route} className="rounded-[1.1rem] border border-borda bg-cartao p-4 shadow-cartao transition-colors hover:bg-cartao-2">
        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-2 text-sm font-semibold"><ShieldCheck size={18} className={feitos === verificacao.length ? "text-ok" : "text-marca"} /> Verificação da conta</span>
          <span className="text-xs font-semibold text-suave">{feitos} de {verificacao.length}</span>
        </div>
        <div className="mt-3 flex gap-1.5">
          {verificacao.map((v) => <span key={v.rotulo} className={`h-1.5 flex-1 rounded-full ${v.estado === "ok" ? "bg-ok" : v.estado === "andamento" ? "bg-alerta" : "bg-borda"}`} />)}
        </div>
        <p className="mt-2 text-xs text-suave">
          {feitos === verificacao.length ? "Tudo verificado." : `Falta: ${juntar(verificacao.filter((v) => v.estado !== "ok").map((v) => v.rotulo.replace(/^./, (c) => c.toLowerCase())))}.`}
        </p>
      </Link>

      <section>
        <h2 className="mb-2 px-1 text-xs font-semibold tracking-wide text-suave uppercase">Modo do app</h2>
        <TrocaModoDaConta />
        <p className="mt-2 px-1 text-xs text-suave">
          {locadora
            ? `Uma conta só: alugue carros como motorista e gerencie ${locadora.nome} como locador.`
            : "Tem carro para alugar? Ative o modo locador e anuncie. Você continua podendo alugar carros."}
        </p>
      </section>

      {base === "/m/conta" && (
        <Grupo titulo="Trabalho">
          <Linha href="/m/plantao/configuracoes" icone={Settings2} titulo="Configurações do Copiloto" detalhe="Régua, cartão, avisos, base, câmera" />
          <Linha href="/m/plantao/custos" icone={Car} titulo="Custos do carro" detalhe="Para calcular o lucro de cada corrida" />
        </Grupo>
      )}

      {grupos(Boolean(locadora)).map((g) => (
        <Grupo key={g.titulo} titulo={g.titulo}>
          {g.itens.map((k) => (
            <Linha key={k} href={k === "locadora" ? "/painel/conta/locadora" : `${base}/${k}`} icone={SECOES[k].icone} titulo={SECOES[k].titulo} detalhe={k === "aparencia" ? `Tema ${nomeTema?.toLowerCase()}` : SECOES[k].detalhe} />
          ))}
        </Grupo>
      ))}

      <form action="/sair" method="post">
        <button className="flex w-full items-center justify-center gap-2 rounded-[1.1rem] border border-borda bg-cartao py-3.5 text-sm font-semibold text-perigo shadow-cartao hover:bg-cartao-2"><LogOut size={17} /> Sair da conta</button>
      </form>
      <p className="text-center text-xs text-suave">Aluguei · versão {process.env.NEXT_PUBLIC_VERSAO ?? "0.1"} · conta criada em {new Date(perfil.criadoEm).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}</p>
    </div>
  );
}

/** Conteúdo de cada tela de configuração. */
export function SecaoConta({
  secao,
  perfil,
  papel,
  base,
  verificacao,
  locadora,
}: {
  secao: ChaveSecao;
  perfil: PerfilConta;
  papel: Papel;
  base: string;
  verificacao: ItemVerificacao[];
  locadora?: { nome: string; cidade: string; uf: string; modoAssistido: boolean; documento: string; podeEditar: boolean };
}) {
  switch (secao) {
    case "perfil":
      return (
        <div className="flex flex-col gap-5">
          <Cartao className="flex flex-col gap-6">
            <FormFoto nome={perfil.nome} foto={perfil.foto} />
            <FormNome nome={perfil.nomeInformado} />
          </Cartao>
          <Grupo titulo="Contato">
            <Linha href={`${base}/seguranca`} icone={Mail} titulo="E-mail" detalhe={perfil.email ?? "Nenhum e-mail"} lateral={perfil.email && <Selo tom={perfil.emailConfirmado ? "ok" : "alerta"}>{perfil.emailConfirmado ? "Confirmado" : "Pendente"}</Selo>} />
            <Linha href={`${base}/verificacao`} icone={MonitorSmartphone} titulo="Celular" detalhe={perfil.telefone ? `+${perfil.telefone.replace(/^\+/, "")}` : "Adicione para receber avisos no WhatsApp"} lateral={perfil.telefone && <Selo tom={perfil.telefoneConfirmado ? "ok" : "alerta"}>{perfil.telefoneConfirmado ? "Confirmado" : "Pendente"}</Selo>} />
          </Grupo>
        </div>
      );

    case "verificacao":
      return (
        <div className="flex flex-col gap-5">
          <p className="text-sm text-suave">
            {papel === "motorista"
              ? "Conta verificada passa mais confiança para o locador e agiliza a análise do seu cadastro."
              : "Conta verificada passa mais confiança para os motoristas e libera o recebimento no Pix."}
          </p>
          <Grupo>
            {verificacao.map((v) => {
              const Icone = ICONE_ESTADO[v.estado];
              const conteudo = (
                <>
                  <Icone size={20} className={`shrink-0 ${COR_ESTADO[v.estado]}`} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">{v.rotulo}</span>
                    <span className="block text-xs text-suave">{v.detalhe}</span>
                  </span>
                  {v.href && <ChevronRight size={17} className="shrink-0 text-suave" />}
                </>
              );
              return v.href ? (
                <Link key={v.rotulo} href={v.href as Route} className="flex items-center gap-3 px-4 py-3.5 hover:bg-cartao-2">{conteudo}</Link>
              ) : (
                <div key={v.rotulo} className="flex items-center gap-3 px-4 py-3.5">{conteudo}</div>
              );
            })}
          </Grupo>
          <Cartao>
            <h2 className="mb-1 font-semibold">Celular</h2>
            <p className="mb-4 text-sm text-suave">Usado nos avisos de pagamento pelo WhatsApp e para entrar com código por SMS.</p>
            <VerificarCelular atual={perfil.telefone ? `+${perfil.telefone.replace(/^\+/, "")}` : null} confirmado={perfil.telefoneConfirmado} />
          </Cartao>
        </div>
      );

    case "seguranca":
      return (
        <div className="flex flex-col gap-5">
          <Cartao>
            <h2 className="font-semibold">Senha</h2>
            <p className="mt-1 mb-4 text-sm text-suave">Se você sempre entrou com código, crie uma senha aqui para entrar mais rápido.</p>
            <FormularioNovaSenha aoSalvar={null} />
          </Cartao>
          <Cartao>
            <h2 className="font-semibold">E-mail de login</h2>
            <p className="mt-1 mb-4 text-sm text-suave">É por ele que você entra e recebe os comprovantes.</p>
            <FormEmail atual={perfil.email} voltar={`${base}/seguranca`} />
          </Cartao>
          <Cartao>
            <h2 className="font-semibold">Aparelhos conectados</h2>
            <p className="mt-1 mb-4 text-sm text-suave">Perdeu o celular ou entrou num computador de outra pessoa? Saia de todos os aparelhos de uma vez. Depois é só entrar de novo neste.</p>
            <form action={sairDeTodosOsAparelhos}>
              <button className="inline-flex h-10 items-center gap-2 rounded-xl border border-borda px-4 text-sm font-semibold text-perigo hover:bg-perigo-suave"><LogOut size={16} /> Sair de todos os aparelhos</button>
            </form>
          </Cartao>
        </div>
      );

    case "locadora":
      return locadora ? (
        <div className="flex flex-col gap-5">
          <Cartao><FormLocadora {...locadora} /></Cartao>
          <Grupo titulo="Também na conta da locadora">
            <Linha href="/painel/recebimentos" icone={Building2} titulo="Recebimentos" detalhe="Conta para receber os aluguéis no Pix" />
          </Grupo>
          <p className="px-1 text-xs text-suave">CPF/CNPJ da locadora: {locadora.documento}. Para corrigir o documento, fale com o suporte: ele está no contrato e na conta de recebimentos.</p>
        </div>
      ) : null;

    case "aparencia":
      return (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-suave">O tema escolhido vale neste e nos outros aparelhos em que você entrar.</p>
          <FormAparencia preferencias={perfil.preferencias} opcoes={TEMAS} />
        </div>
      );

    case "notificacoes":
      return (
        <div className="flex flex-col gap-5">
        <AtivarPush />
        <FormNotificacoes
          preferencias={perfil.preferencias}
          canais={[
            { id: "whatsapp", rotulo: "WhatsApp", detalhe: perfil.telefoneConfirmado ? "No celular confirmado" : "Confirme o celular para receber" },
            { id: "email", rotulo: "E-mail", detalhe: perfil.email ?? "Adicione um e-mail" },
            { id: "push", rotulo: "Notificação no celular", detalhe: "Com o app instalado na tela inicial" },
          ]}
          assuntos={
            papel === "motorista"
              ? [
                  { id: "lembretes", rotulo: "Lembretes", detalhe: "Vencimento do aluguel e check-in da semana" },
                  { id: "mensagens", rotulo: "Mensagens", detalhe: "Respostas dos locadores nas conversas" },
                  { id: "novidades", rotulo: "Novidades e dicas", detalhe: "Carros novos na sua cidade e recursos do app" },
                ]
              : [
                  { id: "lembretes", rotulo: "Resumo e lembretes", detalhe: "Pagamentos recebidos, atrasos e check-ins" },
                  { id: "mensagens", rotulo: "Mensagens", detalhe: "Motoristas interessados nos seus anúncios" },
                  { id: "novidades", rotulo: "Novidades e dicas", detalhe: "Recursos novos do Aluguei" },
                ]
          }
          formais={{ rotulo: "Avisos do contrato", detalhe: "Cobranças, atrasos e notificações formais. Sempre enviados, porque valem como comunicação oficial." }}
        />
        </div>
      );

    case "privacidade":
      return (
        <div className="flex flex-col gap-5">
          <Cartao className="flex flex-col gap-3 text-sm">
            <h2 className="font-semibold">O que guardamos</h2>
            <ul className="flex list-disc flex-col gap-1.5 pl-5 text-suave">
              <li>Seus dados de conta: nome, e-mail, celular e foto.</li>
              {papel === "motorista" ? <li>O cadastro enviado ao locador: documentos, CNH e comprovante de endereço.</li> : <li>Os dados da locadora, da frota, dos contratos e das cobranças.</li>}
              <li>Contratos, vistorias, check-ins e conversas, com data, hora e local, como prova para as duas partes.</li>
            </ul>
            <p className="text-suave">Contratos e provas ficam guardados por 5 anos depois do fim do contrato, o prazo para cobranças e defesa previsto em lei. O resto é apagado quando você pede a exclusão.</p>
          </Cartao>
          <Grupo titulo="Seus direitos (LGPD)">
            <a href="/api/conta/dados" download className="flex items-center gap-3 px-4 py-3 hover:bg-cartao-2">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-marca-suave text-marca"><Download size={18} /></span>
              <span className="flex-1"><span className="block text-sm font-semibold">Baixar meus dados</span><span className="block text-xs text-suave">Arquivo com tudo o que está ligado à sua conta</span></span>
            </a>
            <a href={`mailto:${SUPORTE}?subject=${encodeURIComponent("Excluir minha conta")}&body=${encodeURIComponent(`Quero excluir a conta ${perfil.email ?? perfil.telefone}.`)}`} className="flex items-center gap-3 px-4 py-3 hover:bg-cartao-2">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-perigo-suave text-perigo"><Lock size={18} /></span>
              <span className="flex-1"><span className="block text-sm font-semibold">Pedir a exclusão da conta</span><span className="block text-xs text-suave">Respondemos em até 15 dias. Contratos ativos precisam ser encerrados antes.</span></span>
            </a>
          </Grupo>
          <Aviso tom="neutro">Dúvidas sobre os seus dados: <a className="font-semibold text-marca" href={`mailto:${SUPORTE}`}>{SUPORTE}</a>. Leia a <a className="font-semibold text-marca" href="/privacidade">política de privacidade</a> e os <a className="font-semibold text-marca" href="/termos">termos de uso</a>.</Aviso>
        </div>
      );

    case "ajuda":
      return (
        <div className="flex flex-col gap-5">
          <Grupo titulo="Ajuda">
            <Linha href={`/?para=${papel}#duvidas`} icone={LifeBuoy} titulo="Perguntas frequentes" detalhe="Como funciona, preços e segurança" />
            <Linha href={`/?para=${papel}#como-funciona`} icone={CheckCircle2} titulo="Como o Aluguei funciona" detalhe="O passo a passo, do convite à devolução" />
          </Grupo>
          <Grupo titulo="Fale com a gente">
            <Linha href={`${base.replace(/\/conta$/, "")}/suporte`} icone={LifeBuoy} titulo="Chat com o suporte" detalhe="Converse com a equipe do Aluguei pelo app" />
            <a href={`mailto:${SUPORTE}`} className="flex items-center gap-3 px-4 py-3 hover:bg-cartao-2">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-marca-suave text-marca"><Mail size={18} /></span>
              <span className="flex-1"><span className="block text-sm font-semibold">E-mail do suporte</span><span className="block text-xs text-suave">{SUPORTE} · respondemos em dias úteis</span></span>
            </a>
          </Grupo>
          {papel === "motorista" && <Aviso tom="neutro">Sobre o carro, o aluguel ou o contrato, fale primeiro com o seu locador pelas Conversas: é ele quem decide.</Aviso>}
        </div>
      );
  }
}
