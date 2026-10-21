import { CabecalhoMotorista } from "@/components/motorista/cabecalho";
import { FileText } from "lucide-react";
import { notFound } from "next/navigation";
import { Cartao, Suave } from "@/components/ui";
import { formatarPlaca } from "@/dominio/cadastro/documentos";
import type { ParametrosContrato } from "@/dominio/contrato/parametros";
import { nomeDiaDaSemana } from "@/dominio/contrato/variaveis";
import { formatarData } from "@/dominio/datas/data";
import { formatarBRL } from "@/dominio/dinheiro/centavos";
import { linkTemporario } from "@/lib/evidencias";
import { contratoDoMotorista } from "@/lib/motorista";
import { exigirUsuario } from "@/lib/sessao";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { FormularioAssinatura } from "./assinar";

/** Resumo sem juridiquês (RNF-041) antes da assinatura, com o PDF completo a um toque. */
export default async function ContratoMotorista({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const usuario = await exigirUsuario(`/m/contrato/${id}`);
  const c = await contratoDoMotorista(usuario.id, id);
  if (!c) notFound();

  const admin = supabaseAdmin();
  const [{ data: v }, { data: org }, { data: pdf }] = await Promise.all([
    admin.from("veiculos").select("placa, modelo").eq("id", c.veiculo_id).single(),
    admin.from("organizacoes").select("nome").eq("id", c.organizacao_id).single(),
    c.pdf_evidencia_id ? admin.from("evidencias").select("caminho_storage").eq("id", c.pdf_evidencia_id).single() : Promise.resolve({ data: null }),
  ]);
  const p = c.parametros as unknown as ParametrosContrato;
  const linkPdf = pdf ? await linkTemporario(pdf.caminho_storage) : null;

  const pontos = [
    ["Carro", v ? `${v.modelo} · ${formatarPlaca(v.placa)}` : "—"],
    ["Período", `${formatarData(p.inicio)} a ${formatarData(p.fim)}`],
    ["Aluguel", `${formatarBRL(p.aluguelSemanal)} toda ${nomeDiaDaSemana(p.diaVencimento)}, pago antes da semana`],
    ["Caução", `${formatarBRL(p.caucao.total)}: ${p.caucao.parcelas.map((x) => `${formatarBRL(x.valor)} em ${formatarData(x.vencimento)}`).join(", ")}`],
    ["Km", `${p.km.franquiaMensal.toLocaleString("pt-BR")} km por mês; o que passar custa ${formatarBRL(p.km.valorExcedente)} por km`],
  ] as const;

  const regras = [
    `Toda ${nomeDiaDaSemana(p.checkin.diaSemana)} você manda pelo app as fotos do painel, do óleo, da água e um vídeo do carro.`,
    `Se atrasar o aluguel, entra multa de ${p.encargos.multaBps / 100}% e juros de ${p.encargos.jurosMensaisBps / 100}% ao mês. Com mais de ${p.prazos.diasParaInadimplencia} dias de atraso, você recebe uma notificação formal e tem ${p.prazos.horasParaRegularizar} horas para pagar.`,
    `O carro só pode rodar em ${p.areaCirculacao}.`,
    `Só você pode dirigir. Não pode emprestar nem sublocar.`,
    `Acidente, roubo ou defeito: avise em até 24 horas.`,
    `Multas de trânsito do período são suas, com taxa de ${p.taxaAdministracaoMultaBps / 100}%.`,
    `Ao devolver, a caução volta em até ${p.prazos.diasUteisDevolucaoCaucao} dias úteis, descontando o que estiver pendente.`,
  ];

  return (
    <div className="flex flex-col gap-4">
      <CabecalhoMotorista titulo="Contrato" />
      <div>
        <Suave>Contrato com {org?.nome}</Suave>
        <h1 className="text-2xl font-bold tracking-tight">Resumo do contrato</h1>
      </div>
      {(c.status === "encerrado" || c.status === "rescindido") && (
        <Cartao className="flex flex-col gap-2 border-marca/30">
          <p className="font-semibold">{c.status === "rescindido" ? "Contrato rescindido" : "Contrato encerrado"}{c.devolucao_em ? ` · carro devolvido em ${c.devolucao_em.split("-").reverse().join("/")}` : ""}</p>
          {(c.caucao_devolver_centavos ?? 0) > 0 ? (
            <p className="text-sm">
              {c.caucao_devolvida_em ? "O locador informou que devolveu " : "Caução a receber: "}
              <strong>{formatarBRL(c.caucao_devolver_centavos ?? 0)}</strong>
              {c.caucao_devolvida_em ? ` em ${new Date(c.caucao_devolvida_em).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}.` : ` até ${(c.caucao_devolver_ate ?? "").split("-").reverse().join("/")}.`}
            </p>
          ) : (
            <p className="text-sm text-suave">A caução foi usada para quitar as pendências da devolução. O detalhe está no seu extrato.</p>
          )}
        </Cartao>
      )}
      <Cartao className="flex flex-col gap-3">
        {pontos.map(([rotulo, texto]) => (
          <div key={rotulo}>
            <Suave>{rotulo}</Suave>
            <p className="font-medium">{texto}</p>
          </div>
        ))}
      </Cartao>
      <Cartao>
        <p className="mb-2 font-semibold">O que é importante saber</p>
        <ul className="flex list-disc flex-col gap-2 pl-5 text-sm">
          {regras.map((r) => <li key={r}>{r}</li>)}
        </ul>
      </Cartao>
      {linkPdf && (
        <a href={linkPdf} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 rounded-xl border border-borda bg-cartao p-4 font-semibold hover:bg-cartao-2">
          <FileText size={18} className="text-marca" aria-hidden /> Ler o contrato completo (PDF)
        </a>
      )}
      {c.status === "aguardando_assinatura" ? (
        <FormularioAssinatura contratoId={c.id} pdfSha256={c.pdf_sha256 ?? ""} />
      ) : (
        <Cartao>
          <p className="font-semibold">Contrato assinado{c.assinado_em ? ` em ${new Date(c.assinado_em).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}` : ""}.</p>
        </Cartao>
      )}
    </div>
  );
}
