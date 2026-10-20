import type { Centavos } from "@/dominio/dinheiro/centavos";
import type { DataISO } from "@/dominio/datas/data";

/**
 * Porta de pagamentos. O domínio só conhece esta interface; o Asaas é um
 * adaptador. Trocar de provedor não muda regra de negócio.
 */
export interface ProvedorPagamentos {
  readonly nome: string;
  /** Subconta do locador: o Pix cai direto para ele, a plataforma não custodia dinheiro. */
  criarSubconta(dados: { nome: string; documento: string; email: string; telefone: string }): Promise<{ id: string }>;
  emitirCobranca(dados: {
    subcontaId: string;
    /** Chave de idempotência (a da obrigação). Reenviar não duplica a cobrança. */
    referenciaExterna: string;
    cliente: { nome: string; cpf: string; telefone: string };
    valor: Centavos;
    vencimento: DataISO;
    descricao: string;
  }): Promise<{ id: string; pixCopiaECola: string | null; link: string }>;
  cancelarCobranca(id: string): Promise<void>;
  /** Valida autenticidade do webhook e normaliza o evento. Nulo = evento que ignoramos. */
  interpretarWebhook(cabecalhos: Headers, corpo: unknown): EventoPagamento | null;
}

export interface EventoPagamento {
  eventoId: string;
  tipo: "pago" | "vencido" | "estornado" | "cancelado";
  cobrancaId: string;
  referenciaExterna: string;
  valorPago: Centavos | null;
  pagoEm: Date | null;
}
