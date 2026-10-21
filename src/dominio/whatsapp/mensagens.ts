/**
 * Partes puras da integração com a WhatsApp Cloud API (Meta): ler o webhook,
 * casar o número com a conta e preparar o texto. Sem rede: dá para levar para
 * outro projeto como está.
 */

export interface MensagemRecebida {
  id: string;
  /** Número de quem escreveu, só dígitos (ex.: 5537998293020). */
  de: string;
  nome: string | null;
  tipo: string;
  /** Texto da mensagem; nulo para áudio, foto, figurinha etc. */
  texto: string | null;
  /** Segundos desde 1970, como a Meta envia. */
  enviadaEm: number;
}

interface CorpoWebhook {
  object?: string;
  entry?: {
    changes?: {
      field?: string;
      value?: {
        contacts?: { wa_id?: string; profile?: { name?: string } }[];
        messages?: { id?: string; from?: string; type?: string; timestamp?: string; text?: { body?: string }; button?: { text?: string }; interactive?: { button_reply?: { title?: string }; list_reply?: { title?: string } } }[];
      };
    }[];
  }[];
}

/** Só as mensagens novas (o webhook também traz avisos de entrega e leitura, que ignoramos). */
export function lerWebhook(corpo: unknown): MensagemRecebida[] {
  const c = corpo as CorpoWebhook;
  if (c?.object !== "whatsapp_business_account") return [];
  const saida: MensagemRecebida[] = [];
  for (const entrada of c.entry ?? []) {
    for (const mudanca of entrada.changes ?? []) {
      if (mudanca.field !== "messages") continue;
      const contatos = mudanca.value?.contacts ?? [];
      for (const m of mudanca.value?.messages ?? []) {
        if (!m.id || !m.from) continue;
        const texto = m.text?.body ?? m.button?.text ?? m.interactive?.button_reply?.title ?? m.interactive?.list_reply?.title ?? null;
        saida.push({
          id: m.id,
          de: m.from.replace(/\D/g, ""),
          nome: contatos.find((x) => x.wa_id === m.from)?.profile?.name ?? null,
          tipo: m.type ?? "desconhecido",
          texto: texto?.trim() || null,
          enviadaEm: Number(m.timestamp ?? 0),
        });
      }
    }
  }
  return saida;
}

/**
 * O WhatsApp às vezes identifica celulares brasileiros sem o 9 depois do DDD
 * (5537 98293020). Devolve as duas formas, para achar a conta de qualquer jeito.
 */
export function variantesTelefoneBR(numero: string): string[] {
  const d = numero.replace(/\D/g, "");
  if (!d.startsWith("55")) return [d];
  if (d.length === 12) return [d, `${d.slice(0, 4)}9${d.slice(4)}`];
  if (d.length === 13 && d[4] === "9") return [d, `${d.slice(0, 4)}${d.slice(5)}`];
  return [d];
}

/** A janela de atendimento: fora de 24 h da última mensagem da pessoa, só modelos aprovados pela Meta. */
export const JANELA_HORAS = 24;

export function dentroDaJanela(ultimaDaPessoa: Date, agora: Date = new Date()): boolean {
  return agora.getTime() - ultimaDaPessoa.getTime() < JANELA_HORAS * 3600 * 1000;
}

/** Markdown do modelo → formatação do WhatsApp (*negrito*, _itálico_), sem títulos nem links em colchetes. */
export function paraWhatsApp(texto: string): string {
  return texto
    .replace(/\*\*(.+?)\*\*/g, "*$1*")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\[([^\]]+)\]\((https?:[^)]+)\)/g, "$1: $2")
    .slice(0, 4096);
}
