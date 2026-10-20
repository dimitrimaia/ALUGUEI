import { notFound } from "next/navigation";
import { Cartao, Selo, Suave, Titulo } from "@/components/ui";
import { formatarPlaca } from "@/dominio/cadastro/documentos";
import type { ParametrosContrato } from "@/dominio/contrato/parametros";
import { nomeDiaDaSemana } from "@/dominio/contrato/variaveis";
import { data, formatarData } from "@/dominio/datas/data";
import { formatarBRL } from "@/dominio/dinheiro/centavos";
import { linkTemporario } from "@/lib/evidencias";
import { exigirEquipe } from "@/lib/sessao";
import { STATUS_CONTRATO, TIPO_OBRIGACAO } from "@/lib/rotulos";
import { urlDoSite } from "@/lib/site";
import { supabaseServidor } from "@/lib/supabase/servidor";
import { CompartilharConvite } from "../../motoristas/[id]/compartilhar";

const quando = (iso: string) => new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });

export default async function FichaContrato({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { organizacao } = await exigirEquipe();
  const supabase = await supabaseServidor();
  const { data: c } = await supabase.from("contratos").select("*").eq("id", id).eq("organizacao_id", organizacao.id).maybeSingle();
  if (!c) notFound();

  const [{ data: l }, { data: v }, { data: provas }, { data: agenda }] = await Promise.all([
    supabase.from("locatarios").select("nome, telefone").eq("id", c.locatario_id).single(),
    supabase.from("veiculos").select("placa, modelo").eq("id", c.veiculo_id).single(),
    supabase.from("evidencias").select("id, tipo, finalidade, caminho_storage, recebido_em, ip, sha256").eq("contrato_id", id).order("recebido_em"),
    supabase.from("obrigacoes").select("id, tipo, vencimento, valor_centavos, status").eq("contrato_id", id).order("vencimento").limit(30),
  ]);
  const p = c.parametros as unknown as ParametrosContrato;
  const pdf = provas?.find((e) => e.id === c.pdf_evidencia_id);
  const linkPdf = pdf ? await linkTemporario(pdf.caminho_storage) : null;
  const aceites = (provas ?? []).filter((e) => e.tipo === "aceite");
  const status = STATUS_CONTRATO[c.status];

  return (
    <>
      <Titulo acao={<Selo tom={status.tom}>{status.rotulo}</Selo>}>Contrato · {l?.nome}</Titulo>
      <div className="grid gap-4 lg:grid-cols-2">
        {c.status === "aguardando_assinatura" && l && (
          <Cartao className="flex flex-col gap-3 lg:col-span-2">
            <p className="font-medium">Enviar para o motorista assinar</p>
            <CompartilharConvite link={`${await urlDoSite()}/m`} telefone={l.telefone} nome={l.nome} locador={organizacao.nome} mensagem="Seu contrato está pronto. Entre no app para ler e assinar:" />
          </Cartao>
        )}
        <Cartao className="flex flex-col gap-1">
          <p className="mb-1 font-medium">Condições</p>
          <Suave>Veículo: {v ? `${formatarPlaca(v.placa)} · ${v.modelo}` : "—"}</Suave>
          <Suave>Vigência: {formatarData(p.inicio)} a {formatarData(p.fim)}</Suave>
          <Suave>Aluguel: {formatarBRL(p.aluguelSemanal)} toda {nomeDiaDaSemana(p.diaVencimento)}</Suave>
          <Suave>Caução: {formatarBRL(p.caucao.total)} em {p.caucao.parcelas.length}x</Suave>
          <Suave>Franquia: {p.km.franquiaMensal.toLocaleString("pt-BR")} km/mês · excedente {formatarBRL(p.km.valorExcedente)}/km</Suave>
        </Cartao>
        <Cartao className="flex flex-col gap-2">
          <p className="font-medium">Documento e assinaturas</p>
          {linkPdf && <a href={linkPdf} target="_blank" rel="noreferrer" className="underline">Abrir contrato (PDF)</a>}
          {c.pdf_sha256 && <Suave>Código de verificação: <span className="font-mono text-xs break-all">{c.pdf_sha256}</span></Suave>}
          {aceites.map((a) => (
            <Suave key={a.id}>
              {a.finalidade.endsWith("locador") ? "Locador" : "Motorista"} assinou em {quando(a.recebido_em)}{a.ip ? ` · IP ${a.ip}` : ""}
            </Suave>
          ))}
        </Cartao>
        {!!agenda?.length && (
          <Cartao className="lg:col-span-2">
            <p className="mb-2 font-medium">Agenda do contrato</p>
            <ul className="divide-y divide-[var(--borda)] text-sm">
              {agenda.map((o) => (
                <li key={o.id} className="flex justify-between gap-2 py-2">
                  <span className="w-24">{formatarData(data(o.vencimento))}</span>
                  <span className="flex-1">{TIPO_OBRIGACAO[o.tipo]}</span>
                  <span>{o.valor_centavos !== null ? formatarBRL(o.valor_centavos) : ""}</span>
                </li>
              ))}
            </ul>
          </Cartao>
        )}
      </div>
    </>
  );
}
