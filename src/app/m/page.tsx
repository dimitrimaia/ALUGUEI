import { Building2, CalendarClock, Camera, ChevronRight, Receipt, Check, ClipboardCheck, FileSignature, FileText, Hourglass, MessageCircle, Search, UserRoundPen, Wallet, XCircle } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { type FiltroResumo, ResumoTrabalho } from "@/components/motorista/resumo-trabalho";
import { ListaConversas } from "@/components/motorista/lista-conversas";
import { CabecalhoInicio } from "@/components/motorista/cabecalho";
import { BotaoEmergencia } from "@/components/motorista/emergencia";
import { Aviso, BotaoLink, Placa, Selo, Suave } from "@/components/ui";
import { diasDeAtraso, situacaoCheckin } from "@/dominio/checkin/checkin";
import type { Linha } from "@/db/tipos";
import { nomeDiaDaSemana } from "@/dominio/contrato/variaveis";
import { data, diaDaSemana, formatarData, hoje, somarDias } from "@/dominio/datas/data";
import { formatarBRL } from "@/dominio/dinheiro/centavos";
import { primeiroNome } from "@/dominio/conta/preferencias";
import { perfilResumido } from "@/lib/conta";
import { conversasDoMotorista } from "@/lib/conversas";
import { locadoraDoUsuario } from "@/lib/modos";
import { exigirUsuario } from "@/lib/sessao";
import { cadastrosDoMotorista, contratosDoMotorista } from "@/lib/motorista";
import { TIPO_OBRIGACAO } from "@/lib/rotulos";
import { supabaseAdmin } from "@/lib/supabase/admin";

const ETAPAS = ["Cadastro", "Análise", "Contrato", "Vistoria", "Carro com você"] as const;

function etapaAtual(cadastro: Linha<"locatarios">, contrato?: Linha<"contratos">): number {
  if (contrato?.status === "ativo") return 4;
  if (contrato?.status === "assinado") return 3;
  if (contrato || cadastro.status === "aprovado") return 2;
  if (cadastro.status === "em_analise") return 1;
  return 0;
}

/** Início do motorista (RF-121): um resumo do que importa agora, no estilo de app de banco. */
export default async function Motorista({ searchParams }: { searchParams: Promise<{ checkin?: string; resumo?: string; de?: string; ate?: string }> }) {
  const q = await searchParams;
  const checkinEnviado = q.checkin === "ok";
  const filtroResumo: FiltroResumo = (["hoje", "semana", "mes", "trinta", "perso"] as const).find((f) => f === q.resumo) ?? "semana";
  const usuario = await exigirUsuario("/m");
  const [cadastros, contratos, perfil, conversas, locadora] = await Promise.all([
    cadastrosDoMotorista(usuario.id),
    contratosDoMotorista(usuario.id),
    perfilResumido(),
    conversasDoMotorista(usuario.id, 3),
    locadoraDoUsuario(usuario.id),
  ]);
  const admin = supabaseAdmin();
  const ids = contratos.map((c) => c.id);
  const dia = hoje();
  const [{ data: orgs }, { data: vistorias }, { data: obrigacoes }, { data: veiculos }, { count: frota }] = await Promise.all([
    cadastros.length ? admin.from("organizacoes").select("id, nome").in("id", cadastros.map((c) => c.organizacao_id)) : Promise.resolve({ data: [] }),
    ids.length ? admin.from("vistorias").select("id, contrato_id, tipo, aceite_locatario_evidencia_id").in("contrato_id", ids) : Promise.resolve({ data: [] }),
    ids.length ? admin.from("obrigacoes").select("id, contrato_id, tipo, vencimento, valor_centavos, status").in("contrato_id", ids).in("status", ["pendente", "atrasada"]).lte("vencimento", somarDias(dia, 21)).order("vencimento") : Promise.resolve({ data: [] }),
    contratos.length ? admin.from("veiculos").select("id, placa, modelo").in("id", contratos.map((c) => c.veiculo_id)) : Promise.resolve({ data: [] }),
    locadora ? admin.from("veiculos").select("id", { count: "exact", head: true }).eq("organizacao_id", locadora.id) : Promise.resolve({ count: null }),
  ]);

  const nomeOrg = (id: string) => orgs?.find((o) => o.id === id)?.nome ?? "Locador";
  const nome = primeiroNome(perfil?.nomeInformado || cadastros[0]?.nome);
  const principal = cadastros[0];
  const contrato = principal && contratos.find((k) => k.locatario_id === principal.id);
  const etapa = principal ? etapaAtual(principal, contrato) : 0;
  const ativo = contrato?.status === "ativo";
  const proximoPagamento = (obrigacoes ?? []).find((o) => o.contrato_id === contrato?.id && o.tipo !== "checkin");
  const veiculo = contrato && veiculos?.find((x) => x.id === contrato.veiculo_id);
  const vistoriaPendente = contrato && vistorias?.find((v) => v.contrato_id === contrato.id && !v.aceite_locatario_evidencia_id);
  const devolucaoPendente = vistoriaPendente?.tipo === "devolucao";
  const proximoCheckin = ativo ? (obrigacoes ?? []).find((o) => o.contrato_id === contrato.id && o.tipo === "checkin") : undefined;
  const situacao = proximoCheckin ? situacaoCheckin(data(proximoCheckin.vencimento), dia, false) : null;

  return (
    <div className="flex flex-col gap-4">
      <CabecalhoInicio />

      <div>
        <p className="text-sm text-suave">Olá{nome ? `, ${nome}` : ""} 👋</p>
        <h1 className="text-[1.4rem] leading-tight font-bold tracking-tight">{ativo ? "Seu aluguel em dia" : principal && principal.status !== "recusado" ? "Acompanhe seu aluguel" : "Encontre seu carro"}</h1>
      </div>

      <ResumoTrabalho usuarioId={usuario.id} filtro={filtroResumo} de={q.de} ate={q.ate} />

      {ativo ? (
        <section className="fundo-marca relative overflow-hidden rounded-[1.4rem] p-5 shadow-flutuante">
          <div className="grade-sutil absolute inset-0 opacity-60 [mask-image:radial-gradient(80%_80%_at_90%_0%,black,transparent)]" aria-hidden />
          <div className="relative">
            <p className="text-sm text-white/75">
              {proximoPagamento ? `Próximo pagamento · ${nomeDiaDaSemana(diaDaSemana(data(proximoPagamento.vencimento)))}, ${formatarData(data(proximoPagamento.vencimento)).slice(0, 5)}` : "Nenhum pagamento nos próximos dias"}
            </p>
            <p className="text-[2rem] leading-tight font-bold tracking-tight tabular-nums">{proximoPagamento ? formatarBRL(proximoPagamento.valor_centavos ?? 0) : "R$ 0,00"}</p>
            {proximoPagamento && <p className="text-sm text-white/75">{TIPO_OBRIGACAO[proximoPagamento.tipo]}</p>}
            <div className="mt-4 grid grid-cols-2 gap-2">
              {proximoPagamento ? (
                <BotaoLink href={`/m/pagar/${proximoPagamento.id}` as Route} variante="claro" className="h-11 rounded-xl"><Wallet size={17} /> Pagar com Pix</BotaoLink>
              ) : (
                <span className="flex h-11 items-center justify-center rounded-xl bg-white/15 text-sm font-semibold">Tudo pago</span>
              )}
              <BotaoLink href="/m/extrato" variante="vidro" className="h-11 rounded-xl"><Receipt size={17} /> Extrato</BotaoLink>
            </div>
          </div>
        </section>
      ) : principal && principal.status !== "recusado" ? (
        <section className="rounded-[1.1rem] border border-borda bg-cartao p-4 shadow-cartao">
          <p className="text-xs font-semibold text-suave">Seu andamento · etapa {etapa + 1} de {ETAPAS.length}</p>
          <p className="mt-0.5 text-xl font-bold tracking-tight">{ETAPAS[etapa]}</p>
          <ol className="mt-4 flex gap-1.5" aria-label="Andamento">
            {ETAPAS.map((nome, i) => (
              <li key={nome} className={`h-1.5 flex-1 rounded-full ${i < etapa ? "bg-marca" : i === etapa ? "bg-marca/50" : "bg-borda"}`} title={nome} />
            ))}
          </ol>
          <p className="mt-2 text-xs text-suave">{nomeOrg(principal.organizacao_id)}</p>
        </section>
      ) : (
        <form action="/m/buscar" className="fundo-marca relative overflow-hidden rounded-[1.4rem] p-5 shadow-flutuante">
          <div className="grade-sutil absolute inset-0 opacity-50 [mask-image:radial-gradient(80%_80%_at_90%_0%,black,transparent)]" aria-hidden />
          <div className="relative">
            <p className="font-semibold">Carros para rodar no app</p>
            <p className="mt-0.5 text-sm text-white/75">Busque na sua cidade e converse com o locador por aqui.</p>
            <label className="relative mt-4 block">
              <span className="sr-only">Cidade</span>
              <Search size={17} className="absolute top-1/2 left-3.5 -translate-y-1/2 text-[#5b6880]" />
              <input name="cidade" placeholder="Em qual cidade você roda?" className="h-11 w-full rounded-xl bg-white pr-3 pl-10 text-[#0b1630] outline-none placeholder:text-[#5b6880]" />
            </label>
            <button className="mt-2 h-11 w-full rounded-xl bg-white/15 text-sm font-semibold ring-1 ring-white/25 hover:bg-white/25">Buscar carros</button>
          </div>
        </form>
      )}

      <div className="flex flex-col gap-4">
        {checkinEnviado && <Aviso tom="ok" titulo="Check-in enviado">Obrigado! O locador recebe as fotos e o km agora.</Aviso>}

        {proximoCheckin && (situacao === "aberto" || situacao === "atrasado") && (
          <Acao
            icone={Camera}
            titulo={situacao === "atrasado" ? `Check-in atrasado há ${diasDeAtraso(data(proximoCheckin.vencimento), dia)} ${diasDeAtraso(data(proximoCheckin.vencimento), dia) === 1 ? "dia" : "dias"}` : "Hora do check-in da semana"}
            texto="Fotos do painel, do óleo e do arrefecimento, e um vídeo dando a volta no carro."
            destaque
          >
            <BotaoLink href={`/m/checkin/${proximoCheckin.id}` as Route} tamanho="lg" className="w-full"><Camera size={18} /> Fazer check-in</BotaoLink>
          </Acao>
        )}

        {principal && (
          <>
            {principal.status === "em_cadastro" && (
              <Acao icone={UserRoundPen} titulo="Termine seu cadastro" texto="Dados, CNH e fotos dos documentos. Leva uns 5 minutos." destaque>
                <BotaoLink href={`/m/cadastro/${principal.id}` as Route} tamanho="lg" className="w-full">Continuar cadastro</BotaoLink>
              </Acao>
            )}
            {principal.status === "em_analise" && <Acao icone={Hourglass} titulo="Cadastro em análise" texto={`${nomeOrg(principal.organizacao_id)} vai conferir seus dados. Você recebe um aviso quando decidir.`} />}
            {principal.status === "recusado" && <Acao icone={XCircle} titulo="Cadastro não aprovado" texto="O locador não aprovou o cadastro desta vez. Fale com ele para saber mais." />}
            {principal.status === "aprovado" && !contrato && <Acao icone={Check} titulo="Cadastro aprovado!" texto="O locador está preparando o seu contrato." />}
            {contrato?.status === "aguardando_assinatura" && (
              <Acao icone={FileSignature} titulo="Seu contrato está pronto" texto="Leia o resumo e assine pelo celular." destaque>
                <BotaoLink href={`/m/contrato/${contrato.id}` as Route} tamanho="lg" className="w-full">Ver e assinar</BotaoLink>
              </Acao>
            )}
            {vistoriaPendente && (
              <Acao icone={ClipboardCheck} titulo={devolucaoPendente ? "Confirme a vistoria de devolução" : "Confirme a vistoria"} texto={devolucaoPendente ? "Confira as fotos e o estado em que o carro foi devolvido." : "Confira as fotos e o estado do carro antes de sair com ele."} destaque>
                <BotaoLink href={`/m/vistoria/${vistoriaPendente.id}` as Route} tamanho="lg" className="w-full">Conferir vistoria</BotaoLink>
              </Acao>
            )}
            {contrato?.status === "assinado" && !vistoriaPendente && (
              <Acao icone={ClipboardCheck} titulo="Contrato assinado" texto="Agora é a vistoria de entrega, feita com o locador na retirada do carro." />
            )}
          </>
        )}

        {veiculo && (
          <Link href="/m/carro" className="flex items-center gap-4 rounded-[1.1rem] border border-borda bg-cartao p-4 shadow-cartao transition-colors active:bg-cartao-2">
            <Placa placa={veiculo.placa} />
            <div className="min-w-0 flex-1">
              <p className="line-clamp-2 leading-snug font-bold">{veiculo.modelo}</p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <Selo tom={ativo ? "ok" : "neutro"}>{ativo ? "Com você" : "Reservado"}</Selo>
                <span className="truncate text-xs text-suave">{nomeOrg(contrato!.organizacao_id)}</span>
              </div>
            </div>
            <ChevronRight size={18} className="shrink-0 text-suave" />
          </Link>
        )}

        {ativo && (
          <div className="grid grid-cols-4 gap-2">
            {[
              { icone: Camera, rotulo: "Check-in", href: proximoCheckin && situacao !== "futuro" ? `/m/checkin/${proximoCheckin.id}` : null, quando: proximoCheckin ? formatarData(data(proximoCheckin.vencimento)).slice(0, 5) : undefined },
              { icone: FileText, rotulo: "Contrato", href: `/m/contrato/${contrato.id}` },
              { icone: ClipboardCheck, rotulo: "Vistoria", href: vistorias?.find((v) => v.contrato_id === contrato.id) ? `/m/vistoria/${vistorias.find((v) => v.contrato_id === contrato.id)!.id}` : null },
            ].map(({ icone: Icone, rotulo, href, quando }: { icone: typeof Camera; rotulo: string; href: string | null; quando?: string }) => {
              const conteudo = (
                <>
                  <span className="grid size-12 place-items-center rounded-2xl bg-marca-suave text-marca"><Icone size={22} /></span>
                  <span className="text-xs font-semibold">{rotulo}</span>
                  {!href && quando && <span className="-mt-1 text-[0.6rem] text-suave">{quando}</span>}
                </>
              );
              return href ? (
                <Link key={rotulo} href={href as Route} className="flex flex-col items-center gap-2 rounded-[1.1rem] border border-borda bg-cartao p-3 shadow-cartao active:scale-[0.98]">{conteudo}</Link>
              ) : (
                <span key={rotulo} className="flex flex-col items-center gap-2 rounded-[1.1rem] border border-borda bg-cartao p-3 opacity-60">{conteudo}</span>
              );
            })}
            <BotaoEmergencia />
          </div>
        )}

        {!!conversas.length && (
          <section>
            <div className="mt-1 mb-2.5 flex items-center justify-between">
              <h2 className="text-base font-bold tracking-tight">Conversas</h2>
              <Link href="/m/conversas" className="text-sm font-semibold text-marca">Ver todas</Link>
            </div>
            <ListaConversas conversas={conversas} />
          </section>
        )}

        {locadora && (
          <Link href="/painel" className="flex items-center gap-3 rounded-[1.1rem] border border-borda bg-cartao p-4 shadow-cartao active:bg-cartao-2">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-marca-suave text-marca"><Building2 size={19} /></span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold">{locadora.nome}</span>
              <span className="block text-xs text-suave">{frota ? `${frota} ${frota === 1 ? "carro" : "carros"} no modo locador` : "Modo locador ativo"}</span>
            </span>
            <span className="text-xs font-semibold text-marca">Abrir</span>
            <ChevronRight size={16} className="text-suave" />
          </Link>
        )}

        {!cadastros.length && (
          <section className="rounded-[1.1rem] border border-borda bg-cartao p-4 shadow-cartao">
            <h2 className="text-base font-bold tracking-tight">Como funciona</h2>
            <ol className="mt-3 flex flex-col gap-3">
              {[
                { icone: Search, titulo: "Encontre um carro", texto: "Veja valor da semana, caução e fotos." },
                { icone: MessageCircle, titulo: "Converse com o locador", texto: "Tire dúvidas e combine a retirada pelo app." },
                { icone: FileSignature, titulo: "Cadastro e contrato", texto: "Envie a CNH, assine pelo celular e pegue o carro." },
              ].map(({ icone: Icone, titulo, texto }) => (
                <li key={titulo} className="flex gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-marca-suave text-marca"><Icone size={17} /></span>
                  <span><span className="block text-sm font-semibold">{titulo}</span><span className="block text-xs text-suave">{texto}</span></span>
                </li>
              ))}
            </ol>
            {!locadora && <p className="mt-4 flex items-start gap-2 rounded-xl bg-cartao-2 p-3 text-xs text-suave"><Building2 size={15} className="mt-px shrink-0 text-marca" /> <span>Tem um carro parado? <Link href="/m/carros?aba=anunciados" className="font-semibold text-marca">Anuncie no Aluguei</Link> com a mesma conta.</span></p>}
          </section>
        )}

        {!!obrigacoes?.length && (
          <section>
            <h2 className="mt-1 mb-2.5 text-base font-bold tracking-tight">Próximos compromissos</h2>
            <div className="divide-y divide-borda overflow-hidden rounded-[1.1rem] border border-borda bg-cartao shadow-cartao">
              {obrigacoes.slice(0, 6).map((o) => (
                <div key={o.id} className="flex items-center gap-3 px-4 py-3">
                  <span className="grid size-10 place-items-center rounded-xl bg-cartao-2 text-suave">
                    {o.tipo === "checkin" ? <Camera size={18} /> : <CalendarClock size={18} />}
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold">{TIPO_OBRIGACAO[o.tipo]}</p>
                    <p className={`text-xs ${o.vencimento < dia ? "font-semibold text-perigo" : "text-suave"}`}>{o.vencimento < dia ? "Vencido · " : ""}{nomeDiaDaSemana(diaDaSemana(data(o.vencimento)))}, {formatarData(data(o.vencimento))}</p>
                  </div>
                  {o.valor_centavos !== null && <span className="text-sm font-bold">{formatarBRL(o.valor_centavos)}</span>}
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function Acao({ icone: Icone, titulo, texto, destaque = false, children }: { icone: typeof Check; titulo: string; texto: string; destaque?: boolean; children?: React.ReactNode }) {
  return (
    <div className={`flex flex-col gap-4 rounded-[1.1rem] border bg-cartao p-4 shadow-cartao ${destaque ? "border-marca/40 ring-4 ring-marca/10" : "border-borda"}`}>
      <div className="flex gap-3">
        <span className={`grid size-11 shrink-0 place-items-center rounded-2xl ${destaque ? "bg-marca text-white shadow-marca" : "bg-marca-suave text-marca"}`}><Icone size={22} aria-hidden /></span>
        <div>
          <p className="font-bold">{titulo}</p>
          <Suave>{texto}</Suave>
        </div>
      </div>
      {children}
    </div>
  );
}
