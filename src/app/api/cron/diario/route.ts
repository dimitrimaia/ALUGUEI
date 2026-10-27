import { diasDeAtraso } from "@/dominio/checkin/checkin";
import type { ParametrosContrato } from "@/dominio/contrato/parametros";
import { data, formatarData, hoje, somarDias } from "@/dominio/datas/data";
import { formatarBRL } from "@/dominio/dinheiro/centavos";
import { conciliar, contaDoLocador, emitirCobranca } from "@/lib/cobrancas";
import { notificar, notificarEquipe, usuarioDoContrato } from "@/lib/notificacoes";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { lembretesDoDia, normalizarAluguel } from "@/dominio/ganhos/aluguel";
import { leiturasDeKm } from "@/lib/aluguel-externo";

const DIAS_DE_ANTECEDENCIA = 3;

/**
 * Rotina diária (Vercel Cron, 06:00 de São Paulo). Cada passo é idempotente,
 * então rodar duas vezes no mesmo dia não cobra nem lança nada em dobro (RNF-032).
 *  1. emite as cobranças que vencem nos próximos 3 dias;
 *  2. concilia as cobranças em aberto com o Asaas (cobre aviso de pagamento perdido);
 *  3. marca como atrasadas as obrigações vencidas e não pagas;
 *  4. check-in sem envio há mais dias que o contrato tolera vira uma decisão
 *     pendente para o locador (RF-073). O sistema só sugere; não notifica nem multa;
 *  5. lembretes ao motorista: pagamento na véspera e no dia, atraso no dia
 *     seguinte e check-in aberto (cada aviso tem chave própria e sai uma vez);
 *  6. lembretes do carro alugado fora do Aluguei.
 */
export async function GET(request: Request) {
  if (request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("não autorizado", { status: 401 });
  }
  const admin = supabaseAdmin();
  const dia = hoje();
  const resultado = { emitidas: 0, conciliadas: 0, atrasadas: 0, checkinsAtrasados: 0, lembretesAluguel: 0, erros: [] as string[] };

  const { data: ativos } = await admin.from("contratos").select("id, organizacao_id").eq("status", "ativo");
  const comConta = new Set<string>();
  for (const org of new Set((ativos ?? []).map((c) => c.organizacao_id))) {
    if (await contaDoLocador(org)) comConta.add(org);
  }
  const contratos = (ativos ?? []).filter((c) => comConta.has(c.organizacao_id)).map((c) => c.id);

  if (contratos.length) {
    const { data: aVencer } = await admin
      .from("obrigacoes")
      .select("id")
      .in("contrato_id", contratos)
      .in("tipo", ["aluguel", "caucao_parcela"])
      .in("status", ["pendente", "atrasada"])
      .lte("vencimento", somarDias(dia, DIAS_DE_ANTECEDENCIA));
    for (const o of aVencer ?? []) {
      try {
        await emitirCobranca(o.id);
        resultado.emitidas++;
      } catch (e) {
        resultado.erros.push(`emitir ${o.id}: ${String(e)}`);
      }
    }
  }

  const { data: abertas } = await admin.from("cobrancas").select("*").in("status", ["emitida", "vencida"]).lte("vencimento", somarDias(dia, DIAS_DE_ANTECEDENCIA));
  for (const c of abertas ?? []) {
    try {
      await conciliar(c);
      resultado.conciliadas++;
    } catch (e) {
      resultado.erros.push(`conciliar ${c.id}: ${String(e)}`);
    }
  }

  const { data: vencidas } = await admin
    .from("obrigacoes")
    .update({ status: "atrasada" })
    .eq("status", "pendente")
    .in("tipo", ["aluguel", "caucao_parcela", "checkin"])
    .lt("vencimento", dia)
    .select("id");
  resultado.atrasadas = vencidas?.length ?? 0;

  const { data: semCheckin } = await admin.from("obrigacoes").select("id, organizacao_id, contrato_id, vencimento").eq("tipo", "checkin").eq("status", "atrasada");
  for (const o of semCheckin ?? []) {
    const { data: c } = await admin.from("contratos").select("parametros, status").eq("id", o.contrato_id).single();
    if (c?.status !== "ativo") continue;
    const tolerancia = (c.parametros as unknown as ParametrosContrato).prazos.diasSemCheckinParaNotificar;
    const atraso = diasDeAtraso(data(o.vencimento), dia);
    if (atraso < tolerancia) continue;
    // Idempotente: uma sugestão por check-in.
    const { data: existe } = await admin.from("acoes_pendentes").select("id").eq("contrato_id", o.contrato_id).eq("tipo", "checkin_atrasado").contains("proposta", { obrigacaoId: o.id }).maybeSingle();
    if (existe) continue;
    await admin.from("acoes_pendentes").insert({
      organizacao_id: o.organizacao_id,
      contrato_id: o.contrato_id,
      tipo: "checkin_atrasado",
      proposta: { obrigacaoId: o.id, vencimento: o.vencimento, diasDeAtraso: atraso },
      motivo: `Check-in de ${formatarData(data(o.vencimento))} sem envio há ${atraso} dias. O contrato trata como infração grave: registre ou dispense.`,
    });
    resultado.checkinsAtrasados++;
    await notificarEquipe(o.organizacao_id, { contratoId: o.contrato_id, modelo: "checkin.atrasado", titulo: "Check-in atrasado: decida", texto: `Check-in de ${formatarData(data(o.vencimento))} sem envio há ${atraso} dias.`, link: `/painel/contratos/${o.contrato_id}`, assunto: "lembretes", chave: `checkin:${o.id}:decisao` });
  }

  const amanha = somarDias(dia, 1);
  const ativosIds = (ativos ?? []).map((c) => c.id);
  if (ativosIds.length) {
    const { data: proximas } = await admin
      .from("obrigacoes")
      .select("id, organizacao_id, contrato_id, tipo, vencimento, valor_centavos, status")
      .in("contrato_id", ativosIds)
      .in("status", ["pendente", "atrasada"])
      .gte("vencimento", somarDias(dia, -1))
      .lte("vencimento", amanha);
    for (const o of proximas ?? []) {
      const usuarioId = await usuarioDoContrato(o.contrato_id);
      if (!usuarioId) continue;
      const comum = { usuarioId, organizacaoId: o.organizacao_id, contratoId: o.contrato_id };
      if (o.tipo === "checkin") {
        if (o.vencimento < dia) continue;
        await notificar({ ...comum, modelo: "checkin.aberto", titulo: o.vencimento === dia ? "Hoje é dia de check-in" : "Check-in amanhã", texto: "Fotos do painel, do óleo e do arrefecimento, e um vídeo do carro. Leva 3 minutos.", link: `/m/checkin/${o.id}`, assunto: "lembretes", chave: `checkin:${o.id}:aberto` });
      } else {
        const valor = formatarBRL(o.valor_centavos ?? 0);
        const nome = o.tipo === "aluguel" ? "Aluguel" : "Parcela da caução";
        const etapa = o.vencimento < dia ? "atraso" : o.vencimento === dia ? "hoje" : "amanha";
        await notificar({
          ...comum,
          modelo: `pagamento.${etapa}`,
          titulo: etapa === "atraso" ? `${nome} em atraso: ${valor}` : etapa === "hoje" ? `${nome} vence hoje: ${valor}` : `${nome} vence amanhã: ${valor}`,
          texto: etapa === "atraso" ? "Pague hoje pelo Pix para evitar mais juros. Se já pagou, desconsidere." : "Toque para pagar com Pix em segundos.",
          link: `/m/pagar/${o.id}`,
          assunto: "lembretes",
          porEmail: true,
          chave: `pagamento:${o.id}:${etapa}`,
        });
      }
    }
  }

  // 6. Carro alugado fora do Aluguei (user_metadata.aluguel): vistoria, pagamento,
  //    prazo mínimo, km do mês e troca de óleo. Cada aviso sai uma vez (chave por evento).
  for (let pagina = 1; pagina <= 50; pagina++) {
    const { data: lote, error } = await admin.auth.admin.listUsers({ page: pagina, perPage: 1000 });
    if (error) {
      resultado.erros.push(`usuarios: ${error.message}`);
      break;
    }
    for (const u of lote.users) {
      const aluguel = normalizarAluguel((u.user_metadata as Record<string, unknown> | undefined)?.aluguel);
      if (!aluguel) continue;
      try {
        for (const l of lembretesDoDia(aluguel, dia, await leiturasDeKm(u.id, aluguel))) {
          await notificar({ usuarioId: u.id, modelo: "aluguel_externo.lembrete", titulo: l.titulo, texto: l.texto, link: "/m/plantao/aluguel", assunto: "lembretes", chave: `aluguel:${u.id}:${l.chave}` });
          resultado.lembretesAluguel++;
        }
      } catch (e) {
        resultado.erros.push(`aluguel ${u.id}: ${String(e)}`);
      }
    }
    if (lote.users.length < 1000) break;
  }

  return Response.json(resultado);
}
