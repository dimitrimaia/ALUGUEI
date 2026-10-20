import { hoje } from "@/dominio/datas/data";
import { inngest } from "./cliente";

/**
 * Roda todo dia às 06:00 (São Paulo): emite as cobranças das obrigações que
 * vencem hoje. Cada passo usa a chave da obrigação, então reprocessar o dia
 * não duplica nada (RNF-032).
 */
export const cobrancaDiaria = inngest.createFunction(
  { id: "cobranca-diaria", triggers: [{ cron: "TZ=America/Sao_Paulo 0 6 * * *" }] },
  async ({ step }) => {
    const dia = await step.run("data-de-referencia", () => hoje());
    // TODO(semana 7): buscar obrigações pendentes de `dia` e, para cada uma,
    // step.run(`emitir:${obrigacao.chave}`, ...) chamando ProvedorPagamentos.
    return { dia, emitidas: 0 };
  },
);

export const funcoes = [cobrancaDiaria];
