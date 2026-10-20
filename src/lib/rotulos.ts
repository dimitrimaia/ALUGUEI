import type { Tom } from "@/components/ui";
import type { Linha } from "@/db/tipos";
import type { Pendencia } from "@/dominio/cadastro/elegibilidade";

export const STATUS_VEICULO: Record<Linha<"veiculos">["status"], { rotulo: string; tom: Tom }> = {
  disponivel: { rotulo: "Disponível", tom: "ok" },
  alugado: { rotulo: "Alugado", tom: "marca" },
  em_manutencao: { rotulo: "Em manutenção", tom: "alerta" },
  em_recuperacao: { rotulo: "Em recuperação", tom: "perigo" },
  vendido: { rotulo: "Vendido", tom: "neutro" },
};

export const STATUS_LOCATARIO: Record<Linha<"locatarios">["status"], { rotulo: string; tom: Tom }> = {
  convidado: { rotulo: "Convite enviado", tom: "neutro" },
  em_cadastro: { rotulo: "Preenchendo cadastro", tom: "neutro" },
  em_analise: { rotulo: "Aguardando análise", tom: "alerta" },
  aprovado: { rotulo: "Aprovado", tom: "ok" },
  recusado: { rotulo: "Recusado", tom: "perigo" },
};

export const PENDENCIAS: Record<Pendencia, string> = {
  idade_minima: "Abaixo da idade mínima",
  tempo_de_cnh: "Tempo de CNH abaixo do mínimo",
  cnh_vencida: "CNH vencida",
  cnh_sem_ear: "CNH sem a observação EAR",
  sem_comprovante_app: "Sem comprovante do Uber/99",
};

export const STATUS_CONTRATO: Record<Linha<"contratos">["status"], { rotulo: string; tom: Tom }> = {
  rascunho: { rotulo: "Rascunho", tom: "neutro" },
  aguardando_assinatura: { rotulo: "Aguardando assinatura", tom: "alerta" },
  assinado: { rotulo: "Assinado · falta a vistoria", tom: "marca" },
  ativo: { rotulo: "Ativo", tom: "ok" },
  encerrado: { rotulo: "Encerrado", tom: "neutro" },
  rescindido: { rotulo: "Rescindido", tom: "perigo" },
};

export const TIPO_OBRIGACAO: Record<Linha<"obrigacoes">["tipo"], string> = {
  aluguel: "Aluguel",
  caucao_parcela: "Parcela da caução",
  checkin: "Check-in semanal",
};
