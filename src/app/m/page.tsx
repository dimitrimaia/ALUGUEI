import { Check, ClipboardCheck, FileSignature, Hourglass, Inbox, UserRoundPen, XCircle } from "lucide-react";
import type { Route } from "next";
import { BotaoLink, Cartao, Selo, Suave, Vazio } from "@/components/ui";
import type { Linha } from "@/db/tipos";
import { exigirUsuario } from "@/lib/sessao";
import { cadastrosDoMotorista, contratosDoMotorista } from "@/lib/motorista";
import { STATUS_LOCATARIO } from "@/lib/rotulos";
import { supabaseAdmin } from "@/lib/supabase/admin";

const ETAPAS = ["Cadastro", "Análise", "Contrato", "Vistoria", "Carro com você"] as const;

function etapaAtual(cadastro: Linha<"locatarios">, contrato?: Linha<"contratos">): number {
  if (contrato?.status === "ativo") return 4;
  if (contrato?.status === "assinado") return 3;
  if (contrato || cadastro.status === "aprovado") return 2;
  if (cadastro.status === "em_analise") return 1;
  return 0;
}

function Progresso({ etapa }: { etapa: number }) {
  return (
    <ol className="flex items-center gap-1.5" aria-label="Andamento">
      {ETAPAS.map((nome, i) => (
        <li key={nome} className="flex flex-1 flex-col gap-1.5">
          <span className={`h-1.5 rounded-full ${i < etapa ? "bg-marca" : i === etapa ? "bg-marca/50" : "bg-borda"}`} />
          <span className={`text-[0.65rem] leading-tight font-semibold ${i <= etapa ? "text-texto" : "text-suave"}`}>{nome}</span>
        </li>
      ))}
    </ol>
  );
}

/** Tela inicial do motorista (RF-121). Pagamento, km e check-in aparecem quando o contrato estiver ativo. */
export default async function Motorista() {
  const usuario = await exigirUsuario("/m");
  const [cadastros, contratos] = await Promise.all([cadastrosDoMotorista(usuario.id), contratosDoMotorista(usuario.id)]);
  const orgs = cadastros.length
    ? (await supabaseAdmin().from("organizacoes").select("id, nome").in("id", cadastros.map((c) => c.organizacao_id))).data ?? []
    : [];
  const vistoriasPendentes = contratos.length
    ? (await supabaseAdmin().from("vistorias").select("id, contrato_id").in("contrato_id", contratos.map((c) => c.id)).is("aceite_locatario_evidencia_id", null)).data ?? []
    : [];
  const nomeOrg = (id: string) => orgs.find((o) => o.id === id)?.nome ?? "Locador";
  const primeiroNome = cadastros[0]?.nome.split(" ")[0];

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold tracking-tight">Olá{primeiroNome ? `, ${primeiroNome}` : ""}!</h1>

      {!cadastros.length && (
        <Vazio icone={Inbox} titulo="Nenhum convite por aqui">
          Para alugar, peça ao locador o link de convite e abra pelo celular.
        </Vazio>
      )}

      {cadastros.map((c) => {
        const contrato = contratos.find((k) => k.locatario_id === c.id);
        const vistoria = contrato && vistoriasPendentes.find((v) => v.contrato_id === contrato.id);
        const etapa = etapaAtual(c, contrato);
        const s = STATUS_LOCATARIO[c.status];
        return (
          <Cartao key={c.id} className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-2">
              <p className="font-semibold">{nomeOrg(c.organizacao_id)}</p>
              {c.status === "recusado" ? <Selo tom="perigo">{s.rotulo}</Selo> : <Selo tom="marca">{ETAPAS[etapa]}</Selo>}
            </div>
            {c.status !== "recusado" && <Progresso etapa={etapa} />}

            {c.status === "em_cadastro" && (
              <Proximo icone={UserRoundPen} titulo="Falta terminar seu cadastro" texto="Dados, CNH e fotos dos documentos. Leva uns 5 minutos.">
                <BotaoLink href={`/m/cadastro/${c.id}` as Route} tamanho="lg">Continuar cadastro</BotaoLink>
              </Proximo>
            )}
            {c.status === "em_analise" && (
              <Proximo icone={Hourglass} titulo="Cadastro em análise" texto="O locador vai conferir seus dados. Você recebe um aviso quando ele decidir." />
            )}
            {c.status === "recusado" && (
              <Proximo icone={XCircle} titulo="Cadastro não aprovado" texto="O locador não aprovou o cadastro desta vez. Fale com ele para saber mais." />
            )}
            {c.status === "aprovado" && !contrato && (
              <Proximo icone={Check} titulo="Cadastro aprovado!" texto="O locador está preparando o seu contrato." />
            )}
            {contrato?.status === "aguardando_assinatura" && (
              <Proximo icone={FileSignature} titulo="Seu contrato está pronto" texto="Leia o resumo e assine pelo celular.">
                <BotaoLink href={`/m/contrato/${contrato.id}` as Route} tamanho="lg">Ver e assinar</BotaoLink>
              </Proximo>
            )}
            {vistoria && (
              <Proximo icone={ClipboardCheck} titulo="Confirme a vistoria de entrega" texto="Confira as fotos e o estado do carro antes de sair com ele.">
                <BotaoLink href={`/m/vistoria/${vistoria.id}` as Route} tamanho="lg">Conferir vistoria</BotaoLink>
              </Proximo>
            )}
            {contrato?.status === "assinado" && !vistoria && (
              <Proximo icone={ClipboardCheck} titulo="Contrato assinado" texto="Agora é a vistoria de entrega, feita com o locador na retirada do carro." />
            )}
            {contrato && contrato.status !== "aguardando_assinatura" && (
              <BotaoLink href={`/m/contrato/${contrato.id}` as Route} variante="secundario">Ver meu contrato</BotaoLink>
            )}
          </Cartao>
        );
      })}
    </div>
  );
}

function Proximo({ icone: Icone, titulo, texto, children }: { icone: typeof Check; titulo: string; texto: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 rounded-xl bg-cartao-2 p-4">
      <div className="flex gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-marca-suave text-marca"><Icone size={20} aria-hidden /></span>
        <div>
          <p className="font-semibold">{titulo}</p>
          <Suave>{texto}</Suave>
        </div>
      </div>
      {children}
    </div>
  );
}
