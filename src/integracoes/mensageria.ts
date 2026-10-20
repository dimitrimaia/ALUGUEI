/**
 * Porta de envio de mensagens. WhatsApp oficial exige modelos aprovados pela
 * Meta, então o envio é sempre "modelo + variáveis", nunca texto livre.
 */
export interface ProvedorMensagens {
  readonly canal: "whatsapp" | "email" | "push";
  enviar(dados: {
    destino: string;
    modelo: string;
    variaveis: Record<string, string>;
  }): Promise<{ provedorId: string }>;
}
