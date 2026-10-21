import "server-only";
import type { ItemVerificacao } from "@/components/conta/secoes";
import { contaDoLocador } from "./cobrancas";
import type { PerfilConta } from "./conta";
import { cadastrosDoMotorista } from "./motorista";

function basicos(perfil: PerfilConta, base: string): ItemVerificacao[] {
  return [
    perfil.email
      ? { rotulo: "E-mail", detalhe: perfil.emailConfirmado ? `${perfil.email} confirmado` : "Toque no link que enviamos para confirmar", estado: perfil.emailConfirmado ? "ok" : "pendente" }
      : { rotulo: "E-mail", detalhe: "Adicione um e-mail para receber os comprovantes", estado: "pendente", href: `${base}/seguranca` },
    { rotulo: "Celular", detalhe: perfil.telefoneConfirmado ? "Confirmado por SMS" : "Confirme com um código por SMS", estado: perfil.telefoneConfirmado ? "ok" : "pendente" },
    { rotulo: "Foto de perfil", detalhe: perfil.foto ? "Adicionada" : "Ajuda a outra parte a reconhecer você", estado: perfil.foto ? "ok" : "pendente", href: `${base}/perfil` },
  ];
}

/** Verificação da conta inteira: o básico, os documentos de quem aluga e, se for locador, os recebimentos. */
export async function verificacaoDaConta(perfil: PerfilConta, base: string, locadoraId: string | null): Promise<ItemVerificacao[]> {
  const [cadastros, conta] = await Promise.all([cadastrosDoMotorista(perfil.id), locadoraId ? contaDoLocador(locadoraId).catch(() => null) : Promise.resolve(null)]);
  const aprovado = cadastros.find((c) => c.status === "aprovado");
  const emAnalise = cadastros.find((c) => c.status === "em_analise");
  const aberto = cadastros.find((c) => c.status === "em_cadastro");
  const documentos: ItemVerificacao = aprovado
    ? { rotulo: "Documentos e CNH", detalhe: "Aprovados pelo locador", estado: "ok" }
    : emAnalise
      ? { rotulo: "Documentos e CNH", detalhe: "Em análise pelo locador", estado: "andamento" }
      : aberto
        ? { rotulo: "Documentos e CNH", detalhe: "Termine o cadastro para enviar", estado: "pendente", href: `/m/cadastro/${aberto.id}` }
        : { rotulo: "Documentos e CNH", detalhe: "Você envia quando um locador aprovar o seu aluguel", estado: "pendente" };
  const itens = [...basicos(perfil, base), documentos];
  if (locadoraId) {
    itens.push(
      conta
        ? { rotulo: "Recebimentos no Pix", detalhe: "Conta de recebimento ativa", estado: "ok" }
        : { rotulo: "Recebimentos no Pix", detalhe: "Ative para os motoristas pagarem no Pix", estado: "pendente", href: "/painel/recebimentos" },
    );
  }
  return itens;
}
