import { CalendarClock, Camera, Receipt, Check, ClipboardCheck, FileSignature, FileText, Hourglass, Inbox, LogOut, UserRoundPen, Wallet, XCircle } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { BotaoLink, Cartao, Marca, Placa, Selo, Suave, Vazio } from "@/components/ui";
import type { Linha } from "@/db/tipos";
import { nomeDiaDaSemana } from "@/dominio/contrato/variaveis";
import { data, diaDaSemana, formatarData, hoje, somarDias } from "@/dominio/datas/data";
import { formatarBRL } from "@/dominio/dinheiro/centavos";
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

/** Tela inicial do motorista (RF-121), no estilo de app de banco: o que importa no topo. */
export default async function Motorista() {
  const usuario = await exigirUsuario("/m");
  const [cadastros, contratos] = await Promise.all([cadastrosDoMotorista(usuario.id), contratosDoMotorista(usuario.id)]);
  const admin = supabaseAdmin();
  const ids = contratos.map((c) => c.id);
  const dia = hoje();
  const [{ data: orgs }, { data: vistorias }, { data: obrigacoes }, { data: veiculos }] = await Promise.all([
    cadastros.length ? admin.from("organizacoes").select("id, nome").in("id", cadastros.map((c) => c.organizacao_id)) : Promise.resolve({ data: [] }),
    ids.length ? admin.from("vistorias").select("id, contrato_id, aceite_locatario_evidencia_id").in("contrato_id", ids) : Promise.resolve({ data: [] }),
    ids.length ? admin.from("obrigacoes").select("id, contrato_id, tipo, vencimento, valor_centavos, status").in("contrato_id", ids).in("status", ["pendente", "atrasada"]).lte("vencimento", somarDias(dia, 21)).order("vencimento") : Promise.resolve({ data: [] }),
    contratos.length ? admin.from("veiculos").select("id, placa, modelo").in("id", contratos.map((c) => c.veiculo_id)) : Promise.resolve({ data: [] }),
  ]);

  const nomeOrg = (id: string) => orgs?.find((o) => o.id === id)?.nome ?? "Locador";
  const primeiroNome = cadastros[0]?.nome.split(" ")[0];
  const principal = cadastros[0];
  const contrato = principal && contratos.find((k) => k.locatario_id === principal.id);
  const etapa = principal ? etapaAtual(principal, contrato) : 0;
  const ativo = contrato?.status === "ativo";
  const proximoPagamento = (obrigacoes ?? []).find((o) => o.contrato_id === contrato?.id && o.tipo !== "checkin");
  const veiculo = contrato && veiculos?.find((x) => x.id === contrato.veiculo_id);
  const vistoriaPendente = contrato && vistorias?.find((v) => v.contrato_id === contrato.id && !v.aceite_locatario_evidencia_id);

  return (
    <div className="-mx-4">
      {/* Topo azul */}
      <section className="fundo-marca relative overflow-hidden rounded-b-[2rem] px-5 pt-4 pb-8">
        <div className="grade-sutil absolute inset-0 opacity-60 [mask-image:radial-gradient(80%_80%_at_90%_0%,black,transparent)]" aria-hidden />
        <div className="relative flex items-center justify-between">
          <Marca inverso className="text-base" />
          <form action="/sair" method="post">
            <button className="grid size-10 place-items-center rounded-full bg-white/10 ring-1 ring-white/15" aria-label="Sair"><LogOut size={18} /></button>
          </form>
        </div>
        <p className="relative mt-6 text-sm text-white/75">Olá{primeiroNome ? `, ${primeiroNome}` : ""} 👋</p>

        {ativo ? (
          <div className="relative">
            <p className="mt-4 text-sm text-white/75">
              {proximoPagamento ? `Próximo pagamento · ${nomeDiaDaSemana(diaDaSemana(data(proximoPagamento.vencimento)))}, ${formatarData(data(proximoPagamento.vencimento)).slice(0, 5)}` : "Nenhum pagamento nos próximos dias"}
            </p>
            <p className="text-[2.6rem] leading-tight font-extrabold tracking-tight">{proximoPagamento ? formatarBRL(proximoPagamento.valor_centavos ?? 0) : "R$ 0,00"}</p>
            {proximoPagamento && <p className="text-sm text-white/75">{TIPO_OBRIGACAO[proximoPagamento.tipo]}</p>}
            <div className="mt-5 grid grid-cols-2 gap-2">
              {proximoPagamento ? (
                <BotaoLink href={`/m/pagar/${proximoPagamento.id}` as Route} variante="claro" className="h-12 rounded-2xl"><Wallet size={18} /> Pagar com Pix</BotaoLink>
              ) : (
                <span className="flex h-12 items-center justify-center rounded-2xl bg-white/15 text-sm font-semibold">Tudo pago</span>
              )}
              <BotaoLink href="/m/extrato" variante="vidro" className="h-12 rounded-2xl"><Receipt size={18} /> Extrato</BotaoLink>
            </div>
          </div>
        ) : principal && principal.status !== "recusado" ? (
          <div className="relative">
            <p className="mt-4 text-sm text-white/75">Seu andamento</p>
            <p className="text-3xl font-extrabold tracking-tight">{ETAPAS[etapa]}</p>
            <ol className="mt-5 flex gap-1.5" aria-label="Andamento">
              {ETAPAS.map((nome, i) => (
                <li key={nome} className={`h-1.5 flex-1 rounded-full ${i < etapa ? "bg-white" : i === etapa ? "bg-white/60" : "bg-white/20"}`} title={nome} />
              ))}
            </ol>
            <p className="mt-2 text-xs text-white/70">Etapa {etapa + 1} de {ETAPAS.length}</p>
          </div>
        ) : (
          <p className="relative mt-2 text-2xl font-extrabold tracking-tight">Bem-vindo ao Aluguei</p>
        )}
      </section>

      <div className="relative -mt-4 flex flex-col gap-4 px-4">
        {!cadastros.length && (
          <Vazio icone={Inbox} titulo="Nenhum convite por aqui" acao={<BotaoLink href="/bem-vindo" variante="secundario" tamanho="sm">Sou locador</BotaoLink>}>
            Para alugar, peça ao locador o link de convite e abra neste celular. Você entrou como {usuario.email ?? usuario.telefone}.
          </Vazio>
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
              <Acao icone={ClipboardCheck} titulo="Confirme a vistoria" texto="Confira as fotos e o estado do carro antes de sair com ele." destaque>
                <BotaoLink href={`/m/vistoria/${vistoriaPendente.id}` as Route} tamanho="lg" className="w-full">Conferir vistoria</BotaoLink>
              </Acao>
            )}
            {contrato?.status === "assinado" && !vistoriaPendente && (
              <Acao icone={ClipboardCheck} titulo="Contrato assinado" texto="Agora é a vistoria de entrega, feita com o locador na retirada do carro." />
            )}
          </>
        )}

        {veiculo && (
          <Cartao className="flex items-center gap-4">
            <Placa placa={veiculo.placa} />
            <div className="min-w-0 flex-1">
              <p className="line-clamp-2 leading-snug font-bold">{veiculo.modelo}</p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <Selo tom={ativo ? "ok" : "neutro"}>{ativo ? "Com você" : "Reservado"}</Selo>
                <span className="truncate text-xs text-suave">{nomeOrg(contrato!.organizacao_id)}</span>
              </div>
            </div>
          </Cartao>
        )}

        {ativo && (
          <div className="grid grid-cols-3 gap-3">
            {[
              { icone: Camera, rotulo: "Check-in", href: null },
              { icone: FileText, rotulo: "Contrato", href: `/m/contrato/${contrato.id}` },
              { icone: ClipboardCheck, rotulo: "Vistoria", href: vistorias?.find((v) => v.contrato_id === contrato.id) ? `/m/vistoria/${vistorias.find((v) => v.contrato_id === contrato.id)!.id}` : null },
            ].map(({ icone: Icone, rotulo, href }) => {
              const conteudo = (
                <>
                  <span className="grid size-12 place-items-center rounded-2xl bg-marca-suave text-marca"><Icone size={22} /></span>
                  <span className="text-xs font-semibold">{rotulo}</span>
                  {!href && <span className="text-[0.6rem] text-suave">em breve</span>}
                </>
              );
              return href ? (
                <Link key={rotulo} href={href as Route} className="flex flex-col items-center gap-2 rounded-[1.25rem] border border-borda bg-cartao p-3 shadow-cartao active:scale-[0.98]">{conteudo}</Link>
              ) : (
                <span key={rotulo} className="flex flex-col items-center gap-2 rounded-[1.25rem] border border-borda bg-cartao p-3 opacity-60">{conteudo}</span>
              );
            })}
          </div>
        )}

        {!!obrigacoes?.length && (
          <section>
            <h2 className="mt-2 mb-3 font-bold">Próximos compromissos</h2>
            <div className="divide-y divide-borda overflow-hidden rounded-[1.25rem] border border-borda bg-cartao shadow-cartao">
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
    <div className={`flex flex-col gap-4 rounded-[1.25rem] border bg-cartao p-5 shadow-cartao ${destaque ? "border-marca/40 ring-4 ring-marca/10" : "border-borda"}`}>
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
