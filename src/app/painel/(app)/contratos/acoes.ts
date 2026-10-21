"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { formatarPlaca } from "@/dominio/cadastro/documentos";
import { renderizarModelo, VariavelAusente } from "@/dominio/contrato/modelo";
import { PARAMETROS_CONTRATO_REFERENCIA, parametrosContratoSchema } from "@/dominio/contrato/parametros";
import { variaveisDoContrato } from "@/dominio/contrato/variaveis";
import { type DiaDaSemana, data as lerData, hoje, proximoDiaDaSemana, somarDias, somarMeses } from "@/dominio/datas/data";
import { lerReais } from "@/dominio/dinheiro/centavos";
import { auditar } from "@/lib/auditoria";
import { versaoVigenteModeloBase } from "@/lib/contratos";
import { guardarEvidencia } from "@/lib/evidencias";
import { gerarPdfContrato } from "@/lib/pdf/contrato";
import { exigirEquipe } from "@/lib/sessao";
import { supabaseServidor } from "@/lib/supabase/servidor";
import { notificar } from "@/lib/notificacoes";

const reais = (rotulo: string) =>
  z.string().transform((s, ctx) => {
    const v = lerReais(s);
    if (v === null) ctx.addIssue({ code: "custom", message: `${rotulo} inválido` });
    return v ?? 0;
  });

const esquema = z.object({
  locatarioId: z.string().uuid(),
  veiculoId: z.string().uuid({ message: "Escolha o veículo" }),
  inicio: z.string().transform((s, ctx) => {
    try {
      return lerData(s);
    } catch {
      ctx.addIssue({ code: "custom", message: "Data de início inválida" });
      return z.NEVER;
    }
  }),
  prazoMeses: z.coerce.number().int().min(1).max(36),
  diaVencimento: z.coerce.number().int().min(0).max(6),
  aluguelSemanal: reais("Aluguel"),
  caucao: reais("Caução"),
  parcelasCaucao: z.coerce.number().int().min(1).max(4),
  franquiaKmMensal: z.coerce.number().int().positive(),
  valorKmExcedente: reais("Valor do km"),
  areaCirculacao: z.string().trim().min(3, "Informe a área de circulação"),
});

export type EstadoNovoContrato = { erros?: Record<string, string>; mensagem?: string };

/** Divide a caução em parcelas iguais (a primeira leva o resto dos centavos), vencendo junto com os primeiros aluguéis. */
function parcelasDaCaucao(total: number, n: number, inicio: string, diaVencimento: DiaDaSemana) {
  const base = Math.floor(total / n);
  const datas = [inicio];
  let d = lerData(inicio);
  while (datas.length < n) {
    d = proximoDiaDaSemana(somarDias(d, 1), diaVencimento);
    datas.push(d);
  }
  return datas.map((vencimento, i) => ({ vencimento, valor: i === 0 ? total - base * (n - 1) : base }));
}

export async function criarContrato(_: EstadoNovoContrato, form: FormData): Promise<EstadoNovoContrato> {
  const { organizacao, usuario } = await exigirEquipe();
  const lido = esquema.safeParse(Object.fromEntries(form));
  if (!lido.success) return { erros: Object.fromEntries(lido.error.issues.map((i) => [String(i.path[0]), i.message])) };
  const f = lido.data;
  if (f.inicio < hoje()) return { erros: { inicio: "O início não pode ser no passado" } };

  const supabase = await supabaseServidor();
  const [{ data: l }, { data: v }, { data: ocupado }] = await Promise.all([
    supabase.from("locatarios").select("*").eq("id", f.locatarioId).eq("organizacao_id", organizacao.id).maybeSingle(),
    supabase.from("veiculos").select("*").eq("id", f.veiculoId).eq("organizacao_id", organizacao.id).maybeSingle(),
    supabase.from("contratos").select("id").eq("veiculo_id", f.veiculoId).in("status", ["aguardando_assinatura", "assinado", "ativo"]).limit(1),
  ]);
  if (!l || l.status !== "aprovado") return { mensagem: "O cadastro do motorista precisa estar aprovado." };
  if (!v || v.status !== "disponivel") return { erros: { veiculoId: "Este veículo não está disponível" } };
  if (ocupado?.length) return { erros: { veiculoId: "Este veículo já tem um contrato em andamento" } };

  const diaVencimento = f.diaVencimento as DiaDaSemana;
  const parametros = parametrosContratoSchema.parse({
    ...PARAMETROS_CONTRATO_REFERENCIA,
    inicio: f.inicio,
    fim: somarMeses(f.inicio, f.prazoMeses),
    aluguelSemanal: f.aluguelSemanal,
    diaVencimento,
    caucao: { total: f.caucao, parcelas: parcelasDaCaucao(f.caucao, f.parcelasCaucao, f.inicio, diaVencimento) },
    km: { franquiaMensal: f.franquiaKmMensal, valorExcedente: f.valorKmExcedente },
    areaCirculacao: f.areaCirculacao,
  });

  const endereco = l.endereco as Record<string, string> | null;
  const versao = await versaoVigenteModeloBase();
  let documento;
  try {
    documento = renderizarModelo(
      versao.corpo,
      variaveisDoContrato(
        parametros,
        {
          locador: { nome: organizacao.nome, documento: organizacao.documento, cidade: organizacao.cidade, uf: organizacao.uf },
          locatario: {
            nome: l.nome,
            cpf: l.cpf ?? "",
            cnh: l.cnh_numero ?? "",
            endereco: endereco ? [endereco.logradouro, endereco.numero, endereco.complemento, endereco.bairro, `${endereco.cidade}/${endereco.uf}`].filter(Boolean).join(", ") : "",
          },
          veiculo: {
            modelo: v.modelo,
            placa: formatarPlaca(v.placa),
            ano: v.ano_fabricacao && v.ano_modelo ? `${v.ano_fabricacao}/${v.ano_modelo}` : String(v.ano_modelo ?? ""),
            cor: v.cor ?? "",
            renavam: v.renavam ?? "",
            odometro: v.odometro_atual,
          },
        },
        hoje(),
      ),
    );
  } catch (e) {
    if (e instanceof VariavelAusente) return { mensagem: `Faltam dados para gerar o contrato: ${e.message}` };
    throw e;
  }

  const { data: contrato, error } = await supabase
    .from("contratos")
    .insert({
      organizacao_id: organizacao.id,
      locatario_id: l.id,
      veiculo_id: v.id,
      versao_modelo_id: versao.id,
      parametros: JSON.parse(JSON.stringify(parametros)),
      inicio: parametros.inicio,
      fim: parametros.fim,
      status: "aguardando_assinatura",
    })
    .select("id")
    .single();
  if (error || !contrato) return { mensagem: "Não foi possível criar o contrato." };

  const pdf = await gerarPdfContrato(documento, { minuta: !versao.revisado_por_advogado_em, locador: organizacao.nome, locatario: l.nome });
  const evidencia = await guardarEvidencia(new Blob([new Uint8Array(pdf)], { type: "application/pdf" }), {
    organizacaoId: organizacao.id,
    enviadoPor: usuario.id,
    finalidade: "contrato.pdf",
    tipo: "pdf",
    contratoId: contrato.id,
  });

  // Emitir o contrato é a assinatura do locador: o aceite fica no cofre, ligado ao hash do PDF.
  await guardarEvidencia(
    new Blob([JSON.stringify({ contratoId: contrato.id, papel: "locador", usuarioId: usuario.id, nome: organizacao.nome, pdfSha256: evidencia.sha256, aceitoEm: new Date().toISOString() })], { type: "application/json" }),
    { organizacaoId: organizacao.id, enviadoPor: usuario.id, finalidade: "contrato.aceite.locador", tipo: "aceite", contratoId: contrato.id },
  );

  await supabase.from("contratos").update({ pdf_evidencia_id: evidencia.id, pdf_sha256: evidencia.sha256 }).eq("id", contrato.id);
  await auditar({ organizacaoId: organizacao.id, usuarioId: usuario.id, acao: "contrato.emitir", entidade: "contratos", entidadeId: contrato.id, depois: { versaoModelo: versao.versao, pdfSha256: evidencia.sha256 } });
  if (l.usuario_id) await notificar({ usuarioId: l.usuario_id, organizacaoId: organizacao.id, contratoId: contrato.id, modelo: "contrato.pronto", titulo: "Seu contrato está pronto", texto: `${organizacao.nome} preparou o contrato. Leia o resumo e assine pelo celular.`, link: `/m/contrato/${contrato.id}`, assunto: "formal", porEmail: true, chave: `contrato:${contrato.id}:pronto` });
  redirect(`/painel/contratos/${contrato.id}`);
}
