import { notFound } from "next/navigation";
import { FileText } from "lucide-react";
import { Avatar, Botao, BotaoLink, CabecalhoPagina, Cartao, DadoRotulado, Selo, Suave } from "@/components/ui";
import type { Oferta } from "@/db/schema/pessoas";
import { formatarCpf, formatarPlaca } from "@/dominio/cadastro/documentos";
import type { Pendencia } from "@/dominio/cadastro/elegibilidade";
import { data, formatarData } from "@/dominio/datas/data";
import { formatarBRL } from "@/dominio/dinheiro/centavos";
import { FINALIDADES } from "@/lib/consentimentos";
import { exigirEquipe } from "@/lib/sessao";
import { PENDENCIAS, STATUS_LOCATARIO } from "@/lib/rotulos";
import { urlDoSite } from "@/lib/site";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServidor } from "@/lib/supabase/servidor";
import { renovarConvite } from "../acoes";
import { CompartilharConvite } from "./compartilhar";
import { FormularioDecisao } from "./decisao";

const DOCUMENTOS: Record<string, string> = {
  "cadastro.cnh": "CNH",
  "cadastro.identidade": "Documento de identidade",
  "cadastro.comprovante_app": "Print do Uber/99",
  "cadastro.comprovante_endereco": "Comprovante de endereço",
};

export default async function FichaMotorista({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { organizacao } = await exigirEquipe();
  const supabase = await supabaseServidor();
  const { data: m } = await supabase.from("locatarios").select("*").eq("id", id).eq("organizacao_id", organizacao.id).maybeSingle();
  if (!m) notFound();

  const [{ data: docs }, { data: consentimentos }, { data: veiculo }] = await Promise.all([
    supabase.from("evidencias").select("id, finalidade, caminho_storage, recebido_em").eq("locatario_id", id).order("recebido_em"),
    supabase.from("consentimentos").select("finalidade, versao_texto, aceito_em").eq("locatario_id", id),
    m.veiculo_ofertado_id
      ? supabase.from("veiculos").select("placa, modelo").eq("id", m.veiculo_ofertado_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  // O RLS já garantiu que os documentos são deste locador; o link assinado vale 10 minutos.
  const links = await Promise.all(
    (docs ?? []).map(async (d) => {
      const { data: url } = await supabaseAdmin().storage.from("evidencias").createSignedUrl(d.caminho_storage, 600);
      return { ...d, url: url?.signedUrl };
    }),
  );

  const status = STATUS_LOCATARIO[m.status];
  const oferta = m.oferta as Oferta | null;
  const pendencias = (m.pendencias_pre_analise as Pendencia[] | null) ?? [];
  const conviteAberto = m.status === "convidado" || m.status === "em_cadastro";
  const conviteVencido = m.convite_expira_em ? new Date(m.convite_expira_em) < new Date() : false;
  const linkConvite = m.token_convite ? `${await urlDoSite()}/convite/${m.token_convite}` : null;
  const endereco = m.endereco as Record<string, string> | null;

  return (
    <>
      <CabecalhoPagina
        voltar={{ href: "/painel/motoristas", rotulo: "Motoristas" }}
        titulo={
          <span className="flex flex-wrap items-center gap-3">
            <Avatar nome={m.nome} tamanho="lg" />
            <span>{m.nome}</span>
            <Selo tom={status.tom}>{status.rotulo}</Selo>
          </span>
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        {conviteAberto && linkConvite && (
          <Cartao className="flex flex-col gap-3 lg:col-span-2">
            <p className="font-semibold">Convite</p>
            {conviteVencido ? (
              <form action={renovarConvite.bind(null, m.id)} className="flex flex-col items-start gap-2">
                <Suave>O link venceu. Gere um novo e envie de novo.</Suave>
                <Botao variante="secundario">Gerar novo link</Botao>
              </form>
            ) : (
              <CompartilharConvite link={linkConvite} telefone={m.telefone} nome={m.nome} locador={organizacao.nome} />
            )}
          </Cartao>
        )}

        {m.status === "em_analise" && (
          <Cartao className="flex flex-col gap-3 lg:col-span-2">
            <p className="font-semibold">Análise do cadastro</p>
            {pendencias.length ? (
              <ul className="flex flex-wrap gap-2">
                {pendencias.map((p) => <Selo key={p} tom="perigo">{PENDENCIAS[p]}</Selo>)}
              </ul>
            ) : (
              <Selo tom="ok">Pré-análise sem pendências</Selo>
            )}
            <Suave>A pré-análise só aponta. Quem aprova ou recusa é você, e o motivo fica registrado.</Suave>
            <FormularioDecisao locatarioId={m.id} />
          </Cartao>
        )}

        {m.status === "aprovado" || m.status === "recusado" ? (
          <Cartao className="flex flex-col items-start gap-2 lg:col-span-2">
            <p className="font-semibold">Decisão</p>
            <Suave>
              {status.rotulo} em {m.decidido_em ? new Date(m.decidido_em).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }) : "—"}
              {m.motivo_decisao ? ` · Motivo: ${m.motivo_decisao}` : ""}
            </Suave>
            {m.status === "aprovado" && (
              <BotaoLink href={`/painel/contratos/novo?locatario=${m.id}`}>Gerar contrato</BotaoLink>
            )}
          </Cartao>
        ) : null}

        <Cartao>
          <p className="mb-1 font-semibold">Oferta</p>
          <dl className="divide-y divide-borda">
            <DadoRotulado rotulo="Veículo">{veiculo ? `${formatarPlaca(veiculo.placa)} · ${veiculo.modelo}` : "A definir"}</DadoRotulado>
            {oferta && (
              <>
                <DadoRotulado rotulo="Aluguel">{formatarBRL(oferta.aluguelSemanal)}/semana</DadoRotulado>
                <DadoRotulado rotulo="Caução">{formatarBRL(oferta.caucao)}</DadoRotulado>
                <DadoRotulado rotulo="Franquia">{oferta.franquiaKmMensal.toLocaleString("pt-BR")} km/mês</DadoRotulado>
                <DadoRotulado rotulo="Prazo">{oferta.prazoMeses} meses</DadoRotulado>
              </>
            )}
          </dl>
        </Cartao>

        <Cartao>
          <p className="mb-1 font-semibold">Dados</p>
          <dl className="divide-y divide-borda">
            <DadoRotulado rotulo="Celular">{m.telefone}</DadoRotulado>
            {m.cpf && <DadoRotulado rotulo="CPF">{formatarCpf(m.cpf)}</DadoRotulado>}
            {m.data_nascimento && <DadoRotulado rotulo="Nascimento">{formatarData(data(m.data_nascimento))}</DadoRotulado>}
            {m.cnh_numero && <DadoRotulado rotulo="CNH">{m.cnh_numero} · EAR {m.cnh_tem_ear ? "sim" : "não"}</DadoRotulado>}
            {m.cnh_primeira_habilitacao && <DadoRotulado rotulo="1ª habilitação">{formatarData(data(m.cnh_primeira_habilitacao))}</DadoRotulado>}
            {m.cnh_validade && <DadoRotulado rotulo="Validade da CNH">{formatarData(data(m.cnh_validade))}</DadoRotulado>}
            {endereco && <DadoRotulado rotulo="Endereço">{[endereco.logradouro, endereco.numero, endereco.bairro, endereco.cidade, endereco.uf].filter(Boolean).join(", ")}</DadoRotulado>}
          </dl>
        </Cartao>

        <Cartao className="flex flex-col gap-2">
          <p className="font-semibold">Documentos</p>
          {links.length ? (
            links.map((d) => (
              <a key={d.id} href={d.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-xl border border-borda px-3 py-2.5 font-medium hover:bg-cartao-2">
                <FileText size={18} className="text-marca" aria-hidden /> {DOCUMENTOS[d.finalidade] ?? d.finalidade}
              </a>
            ))
          ) : (
            <Suave>Nenhum documento enviado.</Suave>
          )}
        </Cartao>

        <Cartao className="flex flex-col gap-1">
          <p className="mb-1 font-semibold">Consentimentos (LGPD)</p>
          {consentimentos?.length ? (
            consentimentos.map((c) => (
              <Suave key={c.finalidade}>
                {FINALIDADES.find((f) => f.id === c.finalidade)?.titulo ?? c.finalidade} · {new Date(c.aceito_em).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })} · v{c.versao_texto}
              </Suave>
            ))
          ) : (
            <Suave>Ainda não registrados.</Suave>
          )}
        </Cartao>
      </div>
    </>
  );
}
