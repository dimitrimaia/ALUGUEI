"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { normalizarCelular } from "@/dominio/cadastro/telefone";
import { data as lerData } from "@/dominio/datas/data";
import { lerReais } from "@/dominio/dinheiro/centavos";
import { ErroAsaas } from "@/integracoes/asaas";
import { configurarRecebimentos } from "@/lib/cobrancas";
import { exigirEquipe } from "@/lib/sessao";
import { urlDoSite } from "@/lib/site";

const esquema = z.object({
  email: z.string().trim().email("E-mail inválido"),
  celular: z.string().transform((s, ctx) => {
    const c = normalizarCelular(s);
    if (!c) ctx.addIssue({ code: "custom", message: "Celular com DDD" });
    return c ?? "";
  }),
  dataNascimento: z.string().optional(),
  tipoEmpresa: z.enum(["MEI", "LIMITED", "INDIVIDUAL", "ASSOCIATION"]).optional().or(z.literal("").transform(() => undefined)),
  rendaMensal: z.string().transform((s, ctx) => {
    const v = lerReais(s);
    if (!v) ctx.addIssue({ code: "custom", message: "Informe o faturamento mensal aproximado" });
    return v ?? 0;
  }),
  cep: z.string().transform((s) => s.replace(/\D/g, "")).refine((s) => s.length === 8, "CEP com 8 dígitos"),
  logradouro: z.string().trim().min(3, "Informe a rua"),
  numero: z.string().trim().min(1, "Informe o número"),
  complemento: z.string().trim().optional(),
  bairro: z.string().trim().min(2, "Informe o bairro"),
});

export type EstadoRecebimentos = { erros?: Record<string, string>; mensagem?: string; ok?: boolean };

export async function ativarRecebimentos(_: EstadoRecebimentos, form: FormData): Promise<EstadoRecebimentos> {
  const { organizacao, usuario, papel } = await exigirEquipe();
  if (papel !== "dono") return { mensagem: "Só o dono da conta pode ativar os recebimentos." };
  const lido = esquema.safeParse(Object.fromEntries(form));
  if (!lido.success) return { erros: Object.fromEntries(lido.error.issues.map((i) => [String(i.path[0]), i.message])) };
  const d = lido.data;
  const pf = organizacao.documento.length === 11;
  if (pf && !d.dataNascimento) return { erros: { dataNascimento: "Obrigatória para pessoa física" } };
  if (!pf && !d.tipoEmpresa) return { erros: { tipoEmpresa: "Escolha o tipo de empresa" } };

  try {
    await configurarRecebimentos(organizacao.id, usuario.id, {
      nome: organizacao.nome,
      email: d.email,
      documento: organizacao.documento,
      dataNascimento: pf ? lerData(d.dataNascimento!) : undefined,
      tipoEmpresa: pf ? undefined : d.tipoEmpresa,
      celular: d.celular,
      rendaMensal: d.rendaMensal,
      endereco: { logradouro: d.logradouro, numero: d.numero, complemento: d.complemento, bairro: d.bairro, cep: d.cep },
      webhook: process.env.ASAAS_WEBHOOK_TOKEN
        ? { url: `${await urlDoSite()}/api/webhooks/asaas`, token: process.env.ASAAS_WEBHOOK_TOKEN, email: d.email }
        : undefined,
    });
  } catch (e) {
    if (e instanceof ErroAsaas) return { mensagem: `O Asaas recusou: ${e.message}` };
    throw e;
  }
  revalidatePath("/painel/recebimentos");
  return { ok: true };
}
