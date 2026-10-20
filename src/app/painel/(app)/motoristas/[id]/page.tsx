import { notFound } from "next/navigation";
import { Botao, Cartao, Selo, Suave, Titulo } from "@/components/ui";
import type { Oferta } from "@/db/schema/pessoas";
import { formatarCpf, formatarPlaca } from "@/dominio/cadastro/documentos";
import type { Pendencia } from "@/dominio/cadastro/elegibilidade";
import { data, formatarData } from "@/dominio/datas/data";
import { formatarBRL } from "@/dominio/dinheiro/centavos";
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
      <Titulo acao={<Selo tom={status.tom}>{status.rotulo}</Selo>}>{m.nome}</Titulo>

      <div className="grid gap-4 lg:grid-cols-2">
        {conviteAberto && linkConvite && (
          <Cartao className="flex flex-col gap-3 lg:col-span-2">
            <p className="font-medium">Convite</p>
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
            <p className="font-medium">Análise do cadastro</p>
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
          <Cartao className="lg:col-span-2">
            <p className="font-medium">Decisão</p>
            <Suave>
              {status.rotulo} em {m.decidido_em ? new Date(m.decidido_em).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }) : "—"}
              {m.motivo_decisao ? ` · Motivo: ${m.motivo_decisao}` : ""}
            </Suave>
          </Cartao>
        ) : null}

        <Cartao className="flex flex-col gap-1">
          <p className="mb-1 font-medium">Oferta</p>
          <Suave>Veículo: {veiculo ? `${formatarPlaca(veiculo.placa)} · ${veiculo.modelo}` : "a definir"}</Suave>
          {oferta && (
            <>
              <Suave>Aluguel: {formatarBRL(oferta.aluguelSemanal)} por semana</Suave>
              <Suave>Caução: {formatarBRL(oferta.caucao)}</Suave>
              <Suave>Franquia: {oferta.franquiaKmMensal.toLocaleString("pt-BR")} km/mês</Suave>
              <Suave>Prazo: {oferta.prazoMeses} meses</Suave>
            </>
          )}
        </Cartao>

        <Cartao className="flex flex-col gap-1">
          <p className="mb-1 font-medium">Dados</p>
          <Suave>Celular: {m.telefone}</Suave>
          {m.cpf && <Suave>CPF: {formatarCpf(m.cpf)}</Suave>}
          {m.data_nascimento && <Suave>Nascimento: {formatarData(data(m.data_nascimento))}</Suave>}
          {m.cnh_numero && <Suave>CNH: {m.cnh_numero} · EAR: {m.cnh_tem_ear ? "sim" : "não"}</Suave>}
          {m.cnh_primeira_habilitacao && <Suave>1ª habilitação: {formatarData(data(m.cnh_primeira_habilitacao))}</Suave>}
          {m.cnh_validade && <Suave>Validade da CNH: {formatarData(data(m.cnh_validade))}</Suave>}
          {endereco && <Suave>Endereço: {[endereco.logradouro, endereco.numero, endereco.bairro, endereco.cidade, endereco.uf].filter(Boolean).join(", ")}</Suave>}
        </Cartao>

        <Cartao className="flex flex-col gap-2">
          <p className="font-medium">Documentos</p>
          {links.length ? (
            links.map((d) => (
              <a key={d.id} href={d.url} target="_blank" rel="noreferrer" className="underline">
                {DOCUMENTOS[d.finalidade] ?? d.finalidade}
              </a>
            ))
          ) : (
            <Suave>Nenhum documento enviado.</Suave>
          )}
        </Cartao>

        <Cartao className="flex flex-col gap-1">
          <p className="mb-1 font-medium">Consentimentos (LGPD)</p>
          {consentimentos?.length ? (
            consentimentos.map((c) => (
              <Suave key={c.finalidade}>
                {c.finalidade} · {new Date(c.aceito_em).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })} · v{c.versao_texto}
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
