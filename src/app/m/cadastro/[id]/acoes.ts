"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { cpfValido } from "@/dominio/cadastro/documentos";
import { preAnalisar } from "@/dominio/cadastro/elegibilidade";
import { data as lerData, hoje } from "@/dominio/datas/data";
import { auditar } from "@/lib/auditoria";
import { FINALIDADES, VERSAO_CONSENTIMENTO } from "@/lib/consentimentos";
import { ArquivoInvalido, guardarEvidencia } from "@/lib/evidencias";
import { cadastroDoMotorista } from "@/lib/motorista";
import { exigirUsuario } from "@/lib/sessao";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { headers } from "next/headers";

const dataISO = (rotulo: string) =>
  z.string().transform((s, ctx) => {
    try {
      return lerData(s);
    } catch {
      ctx.addIssue({ code: "custom", message: `${rotulo} inválida` });
      return z.NEVER;
    }
  });

const esquema = z.object({
  nome: z.string().trim().min(5, "Nome completo"),
  cpf: z.string().transform((s) => s.replace(/\D/g, "")).refine(cpfValido, "CPF inválido"),
  email: z.string().trim().email("E-mail inválido").optional().or(z.literal("").transform(() => undefined)),
  dataNascimento: dataISO("Data de nascimento"),
  cep: z.string().transform((s) => s.replace(/\D/g, "")).refine((s) => s.length === 8, "CEP com 8 dígitos"),
  logradouro: z.string().trim().min(3, "Informe a rua"),
  numero: z.string().trim().min(1, "Informe o número"),
  complemento: z.string().trim().optional(),
  bairro: z.string().trim().min(2, "Informe o bairro"),
  cidade: z.string().trim().min(2, "Informe a cidade"),
  uf: z.string().trim().length(2, "UF").toUpperCase(),
  cnhNumero: z.string().transform((s) => s.replace(/\D/g, "")).refine((s) => s.length === 11, "Número da CNH tem 11 dígitos"),
  cnhPrimeiraHabilitacao: dataISO("Data da 1ª habilitação"),
  cnhValidade: dataISO("Validade"),
  cnhTemEar: z.literal("sim").optional(),
});

const ARQUIVOS = [
  { campo: "cnh", finalidade: "cadastro.cnh", obrigatorio: true },
  { campo: "identidade", finalidade: "cadastro.identidade", obrigatorio: false },
  { campo: "comprovanteEndereco", finalidade: "cadastro.comprovante_endereco", obrigatorio: true },
  { campo: "comprovanteApp", finalidade: "cadastro.comprovante_app", obrigatorio: true },
] as const;

export type EstadoCadastro = { erros?: Record<string, string>; mensagem?: string };

export async function enviarCadastro(locatarioId: string, _: EstadoCadastro, form: FormData): Promise<EstadoCadastro> {
  const usuario = await exigirUsuario(`/m/cadastro/${locatarioId}`);
  const l = await cadastroDoMotorista(usuario.id, locatarioId);
  if (!l || l.status !== "em_cadastro") return { mensagem: "Este cadastro não pode mais ser alterado." };

  const campos = Object.fromEntries([...form.entries()].filter(([, v]) => typeof v === "string"));
  const lido = esquema.safeParse(campos);
  const erros: Record<string, string> = lido.success
    ? {}
    : Object.fromEntries(lido.error.issues.map((i) => [String(i.path[0]), i.message]));

  const arquivos = ARQUIVOS.map((a) => ({ ...a, arquivo: form.get(a.campo) }));
  for (const a of arquivos) {
    const vazio = !(a.arquivo instanceof File) || a.arquivo.size === 0;
    if (a.obrigatorio && vazio) erros[a.campo] = "Envie a foto";
  }
  const naoAceitos = FINALIDADES.filter((f) => form.get(`consentimento.${f.id}`) !== "sim");
  if (naoAceitos.length) erros.consentimentos = "É preciso aceitar os três itens para continuar";
  if (!lido.success || Object.keys(erros).length) return { erros };

  const d = lido.data;
  const admin = supabaseAdmin();
  try {
    for (const a of arquivos) {
      if (a.arquivo instanceof File && a.arquivo.size > 0) {
        await guardarEvidencia(a.arquivo, {
          organizacaoId: l.organizacao_id,
          enviadoPor: usuario.id,
          finalidade: a.finalidade,
          locatarioId: l.id,
        });
      }
    }
  } catch (e) {
    if (e instanceof ArquivoInvalido) return { mensagem: e.message };
    throw e;
  }

  const h = await headers();
  await admin.from("consentimentos").insert(
    FINALIDADES.map((f) => ({
      organizacao_id: l.organizacao_id,
      locatario_id: l.id,
      finalidade: f.id,
      versao_texto: VERSAO_CONSENTIMENTO,
      ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
      dispositivo: h.get("user-agent"),
    })),
  );

  const pendencias = preAnalisar(
    {
      dataNascimento: d.dataNascimento,
      cnhPrimeiraHabilitacao: d.cnhPrimeiraHabilitacao,
      cnhValidade: d.cnhValidade,
      cnhTemEar: d.cnhTemEar === "sim",
      enviouComprovanteApp: true,
    },
    hoje(),
  );

  const { error } = await admin
    .from("locatarios")
    .update({
      nome: d.nome,
      cpf: d.cpf,
      email: d.email ?? null,
      data_nascimento: d.dataNascimento,
      endereco: { cep: d.cep, logradouro: d.logradouro, numero: d.numero, complemento: d.complemento ?? "", bairro: d.bairro, cidade: d.cidade, uf: d.uf },
      cnh_numero: d.cnhNumero,
      cnh_primeira_habilitacao: d.cnhPrimeiraHabilitacao,
      cnh_validade: d.cnhValidade,
      cnh_tem_ear: d.cnhTemEar === "sim",
      pendencias_pre_analise: pendencias,
      status: "em_analise",
    })
    .eq("id", l.id)
    .eq("usuario_id", usuario.id);
  if (error) return { mensagem: "Não foi possível enviar o cadastro. Tente de novo." };

  await auditar({ organizacaoId: l.organizacao_id, usuarioId: usuario.id, acao: "locatario.enviar_cadastro", entidade: "locatarios", entidadeId: l.id, depois: { pendencias } });
  redirect("/m");
}
