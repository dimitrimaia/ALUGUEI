import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { ParametrosContrato } from "@/dominio/contrato/parametros";
import { formatarBRL } from "@/dominio/dinheiro/centavos";
import { MARCA_TRANSFERENCIA, historicoParaModelo, humanoAssumiu } from "@/dominio/suporte/conversa";
import { enviarEmail } from "@/integracoes/email";
import { conversarComGemini, geminiConfigurado, paraFerramentaGemini } from "@/integracoes/gemini";
import { enviarTextoWhatsApp } from "@/integracoes/whatsapp";
import { contaDoLocador } from "./cobrancas";
import { emailsDaEquipe } from "./equipe-aluguei";
import { locadoraDoUsuario } from "./modos";
import { cadastrosDoMotorista, contratosDoMotorista } from "./motorista";
import { notificar } from "./notificacoes";
import { supabaseAdmin } from "./supabase/admin";

/**
 * Agente do suporte: responde no chat do atendimento em nome da equipe do
 * Aluguei. Lê os dados da própria conta da pessoa (nunca de outra) e não altera
 * nada: explica, orienta e, quando o assunto pede uma pessoa, passa para a equipe.
 */

/**
 * Provedor, modelo e esforço do assistente.
 * - Claude (ANTHROPIC_API_KEY): padrão Haiku 5.5, o mais barato, com esforço baixo.
 *   Para respostas mais elaboradas: SUPORTE_MODELO=claude-sonnet-5-5.
 * - Gemini (GEMINI_API_KEY): nível gratuito do Google AI Studio, padrão gemini-2.5-flash.
 * Com as duas chaves, vale o Claude, a menos que SUPORTE_PROVEDOR=gemini.
 */
const PROVEDOR: "claude" | "gemini" | null =
  process.env.SUPORTE_PROVEDOR === "gemini" && geminiConfigurado() ? "gemini" : process.env.ANTHROPIC_API_KEY ? "claude" : geminiConfigurado() ? "gemini" : null;
const MODELO = process.env.SUPORTE_MODELO ?? (PROVEDOR === "gemini" ? "gemini-2.5-flash" : "claude-haiku-5-5");
const ESFORCO = (process.env.SUPORTE_ESFORCO ?? "low") as "low" | "medium" | "high";
const MAX_VOLTAS = 6;

// Texto fixo: fica em cache entre atendimentos (nada que mude por pessoa ou por dia aqui).
const SISTEMA = `Você é o assistente do suporte do Aluguei, um app brasileiro de locação de carros para motoristas de aplicativo (Uber, 99). Responda sempre em português do Brasil, com frases curtas e diretas, num tom cordial e profissional. Escreva como no chat de um app: sem títulos, no máximo uma lista curta quando ajudar, sem emojis em excesso.

## Como o Aluguei funciona
- Uma conta só, com dois modos. Modo motorista: buscar carros por cidade, conversar com o locador pelo chat, fazer o cadastro (CNH e documentos), assinar o contrato pelo celular, fazer a vistoria de entrega, pagar o aluguel semanal no Pix e fazer o check-in semanal. Modo locador: cadastrar e anunciar carros (o anúncio exige o CRLV verificado pela equipe), aprovar motoristas pelo chat, gerar o contrato, fazer as vistorias, receber no Pix e acompanhar o financeiro. Troca-se de modo no menu ☰, na tela Conta ou tocando duas vezes na foto da aba Conta.
- Pagamento: Pix com QR Code em "Pagar com Pix" (Meus carros → Pagamentos, ou o cartão do início). A baixa é automática em segundos quando o locador usa a conta de recebimento do Asaas. No "Pix direto" (chave do próprio locador), o motorista toca em "Já paguei" e o locador confere e dá baixa manualmente. Atraso tem multa e juros definidos no contrato.
- Check-in semanal: no dia combinado no contrato (abre na véspera), fotos do painel, da vareta do óleo, do líquido de arrefecimento e um vídeo dando a volta no carro, mais o km e o combustível. Fica no início do app quando abre.
- Caução: devolvida ao fim do contrato em até o prazo em dias úteis do contrato, descontadas as pendências (km excedente, avarias, aluguéis em aberto). O locador faz a vistoria de devolução e o demonstrativo.
- Emergência (acidente, roubo, pane): botão Emergência em Meu carro, que liga para 190, 192 e 193 e manda a localização. Depois, avisar o locador pelas Conversas.
- Conta: Perfil e configurações tem dados pessoais, verificação (e-mail, celular por SMS, foto, documentos), senha e e-mail, aparência (claro, escuro ou automático), notificações (no app, no celular e por e-mail) e privacidade (baixar meus dados, pedir exclusão).
- Login: e-mail e senha, código por e-mail ou SMS. "Esqueci a senha" manda um link; cada link e código valem uma vez, e só o último. Pedir de novo só depois de 1 minuto.

## Regras
- Use as ferramentas para olhar a conta da pessoa antes de responder sobre pagamento, contrato, carro, cadastro ou locadora. Não invente valores, datas ou situações: diga só o que as ferramentas mostram.
- Você não altera nada: não dá baixa, não cancela, não estorna, não muda contrato, não aprova cadastro e não promete reembolso, desconto ou prazo. Explique o caminho no app ou passe para a equipe.
- Valores do aluguel, regras do contrato e negociação são combinados entre motorista e locador: oriente a falar com o locador pelas Conversas.
- Chame transferir_para_equipe quando: houver cobrança indevida, pagamento feito e não reconhecido, contestação de valor ou de avaria, conflito entre motorista e locador, suspeita de golpe ou fraude, problema de segurança, pedido de exclusão de conta, erro do app que você não consegue explicar, ou quando a pessoa pedir para falar com alguém. Depois de transferir, diga à pessoa que a equipe vai responder por aqui, em horário comercial, em dias úteis.
- Nunca peça senha, código de login, número completo de cartão ou foto de documento pelo chat.
- Se a mensagem for só um agradecimento ou despedida, responda em uma frase.`;

const FERRAMENTAS: Anthropic.Beta.BetaTool[] = [
  {
    name: "ver_conta",
    description: "Dados da conta de quem abriu o atendimento: nome, e-mail, celular, o que está verificado e quais modos estão ativos (motorista, locador).",
    input_schema: { type: "object", properties: {}, required: [], additionalProperties: false },
    strict: true,
  },
  {
    name: "ver_aluguel",
    description: "Lado motorista: cadastros enviados a locadores (situação da análise), contratos (carro, situação, aluguel semanal, caução), próximos vencimentos e atrasos, saldo em aberto, caução paga, último check-in e, se o contrato acabou, a caução a devolver.",
    input_schema: { type: "object", properties: {}, required: [], additionalProperties: false },
    strict: true,
  },
  {
    name: "ver_locadora",
    description: "Lado locador (só se o modo locador estiver ativo): frota e verificação dos carros, contratos ativos, cobranças em aberto e atrasadas, e se os recebimentos (Asaas ou Pix direto) estão configurados.",
    input_schema: { type: "object", properties: {}, required: [], additionalProperties: false },
    strict: true,
  },
  {
    name: "transferir_para_equipe",
    description: "Passa o atendimento para uma pessoa da equipe do Aluguei. Use nos casos listados nas regras. A pessoa continua no mesmo chat.",
    input_schema: {
      type: "object",
      properties: {
        motivo: { type: "string", description: "Por que precisa de uma pessoa, em uma frase." },
        resumo: { type: "string", description: "Resumo do caso para a equipe: o que a pessoa relatou e o que você já verificou." },
      },
      required: ["motivo", "resumo"],
      additionalProperties: false,
    },
    strict: true,
  },
];

const br = (iso: string | null | undefined) => (iso ? iso.slice(0, 10).split("-").reverse().join("/") : "—");

/** Tudo é lido com a chave do servidor, mas sempre filtrado pelo dono do atendimento. */
async function executar(nome: string, usuarioId: string | null): Promise<unknown> {
  const admin = supabaseAdmin();
  if (!usuarioId) {
    return { contaVinculada: false, orientacao: "Este número de WhatsApp não está ligado a uma conta do Aluguei. Para ver dados do aluguel, a pessoa confirma este celular no app (Conta → Verificação da conta → Celular) ou continua pelo chat de suporte do app." };
  }
  if (nome === "ver_conta") {
    const [{ data: u }, locadora] = await Promise.all([admin.auth.admin.getUserById(usuarioId), locadoraDoUsuario(usuarioId)]);
    const meta = (u.user?.user_metadata ?? {}) as Record<string, unknown>;
    return {
      nome: meta.nome ?? null,
      email: u.user?.email ?? null,
      emailConfirmado: Boolean(u.user?.email_confirmed_at),
      celular: u.user?.phone ? `final ${u.user.phone.slice(-4)}` : null,
      celularConfirmado: Boolean(u.user?.phone_confirmed_at),
      temFoto: typeof meta.foto === "string",
      modos: { motorista: true, locador: locadora ? { nome: locadora.nome, papel: locadora.papel } : false },
      contaCriadaEm: br(u.user?.created_at),
    };
  }
  if (nome === "ver_aluguel") {
    const [cadastros, contratos] = await Promise.all([cadastrosDoMotorista(usuarioId), contratosDoMotorista(usuarioId)]);
    const ids = contratos.map((c) => c.id);
    const orgIds = [...new Set([...cadastros, ...contratos].map((x) => x.organizacao_id))];
    const [{ data: orgs }, { data: veiculos }, { data: obrigacoes }, { data: lancamentos }, { data: checkins }] = await Promise.all([
      orgIds.length ? admin.from("organizacoes").select("id, nome").in("id", orgIds) : Promise.resolve({ data: [] }),
      contratos.length ? admin.from("veiculos").select("id, modelo, placa").in("id", contratos.map((c) => c.veiculo_id)) : Promise.resolve({ data: [] }),
      ids.length ? admin.from("obrigacoes").select("contrato_id, tipo, vencimento, valor_centavos, status, pagamento_informado_em").in("contrato_id", ids).in("status", ["pendente", "atrasada"]).order("vencimento").limit(12) : Promise.resolve({ data: [] }),
      ids.length ? admin.from("lancamentos").select("contrato_id, tipo, valor_centavos").in("contrato_id", ids) : Promise.resolve({ data: [] }),
      ids.length ? admin.from("checkins").select("contrato_id, referencia, enviado_em").in("contrato_id", ids).order("enviado_em", { ascending: false }).limit(3) : Promise.resolve({ data: [] }),
    ]);
    const org = (id: string) => orgs?.find((o) => o.id === id)?.nome ?? "Locador";
    return {
      cadastros: cadastros.map((c) => ({ locador: org(c.organizacao_id), situacao: c.status, motivoDaDecisao: c.motivo_decisao ?? null })),
      contratos: contratos.map((c) => {
        const p = c.parametros as unknown as ParametrosContrato;
        const v = veiculos?.find((x) => x.id === c.veiculo_id);
        const saldo = (lancamentos ?? []).filter((l) => l.contrato_id === c.id).reduce((s, l) => s + l.valor_centavos, 0);
        return {
          locador: org(c.organizacao_id),
          carro: v ? `${v.modelo} (placa final ${v.placa.slice(-2)})` : null,
          situacao: c.status,
          vigencia: `${br(c.inicio)} a ${br(c.fim)}`,
          aluguelSemanal: formatarBRL(p.aluguelSemanal),
          caucao: formatarBRL(p.caucao.total),
          franquiaKmMensal: p.km.franquiaMensal,
          saldoEmAberto: formatarBRL(Math.max(0, saldo)),
          proximos: (obrigacoes ?? []).filter((o) => o.contrato_id === c.id).map((o) => ({ tipo: o.tipo, vencimento: br(o.vencimento), valor: o.valor_centavos !== null ? formatarBRL(o.valor_centavos) : null, situacao: o.status, avisouQuePagou: Boolean(o.pagamento_informado_em) })),
          ultimoCheckin: checkins?.find((k) => k.contrato_id === c.id) ? br(checkins.find((k) => k.contrato_id === c.id)!.referencia) : null,
          encerramento: c.encerrado_em ? { devolucao: br(c.devolucao_em), caucaoADevolver: formatarBRL(c.caucao_devolver_centavos ?? 0), prazo: br(c.caucao_devolver_ate), devolvida: Boolean(c.caucao_devolvida_em) } : null,
        };
      }),
    };
  }
  if (nome === "ver_locadora") {
    const locadora = await locadoraDoUsuario(usuarioId);
    if (!locadora) return { modoLocadorAtivo: false };
    const [{ data: veiculos }, { data: contratos }, { data: abertas }, conta, { data: org }] = await Promise.all([
      admin.from("veiculos").select("status, verificacao").eq("organizacao_id", locadora.id),
      admin.from("contratos").select("status").eq("organizacao_id", locadora.id),
      admin.from("obrigacoes").select("valor_centavos, status, tipo").eq("organizacao_id", locadora.id).in("status", ["pendente", "atrasada"]).neq("tipo", "checkin"),
      contaDoLocador(locadora.id).catch(() => null),
      admin.from("organizacoes").select("chave_pix_direto").eq("id", locadora.id).single(),
    ]);
    const conta_ = (lista: { status: string }[] | null, s: string) => (lista ?? []).filter((x) => x.status === s).length;
    const atrasadas = (abertas ?? []).filter((o) => o.status === "atrasada");
    return {
      locadora: locadora.nome,
      papel: locadora.papel,
      frota: { total: veiculos?.length ?? 0, alugados: conta_(veiculos, "alugado"), disponiveis: conta_(veiculos, "disponivel"), verificados: (veiculos ?? []).filter((v) => v.verificacao === "verificado").length, emAnalise: (veiculos ?? []).filter((v) => v.verificacao === "em_analise").length },
      contratos: { ativos: conta_(contratos, "ativo"), aguardandoAssinatura: conta_(contratos, "aguardando_assinatura"), encerrados: conta_(contratos, "encerrado") + conta_(contratos, "rescindido") },
      cobrancas: { emAberto: abertas?.length ?? 0, atrasadas: atrasadas.length, totalAtrasado: formatarBRL(atrasadas.reduce((s, o) => s + (o.valor_centavos ?? 0), 0)) },
      recebimentos: { contaAsaasAtiva: Boolean(conta), pixDiretoLigado: Boolean(org?.chave_pix_direto) },
    };
  }
  return { erro: `Ferramenta desconhecida: ${nome}` };
}

export function agenteLigado() {
  return PROVEDOR !== null && process.env.SUPORTE_AGENTE !== "desligado";
}

async function avisarEquipe(atendimentoId: string, assunto: string, texto: string) {
  for (const para of emailsDaEquipe()) await enviarEmail({ para, assunto, texto, link: `/admin/suporte/${atendimentoId}`, chave: `agente:${atendimentoId}:${Date.now()}:${para}` });
}

/**
 * Responde a última mensagem da pessoa. Roda depois da resposta HTTP (after()),
 * e nunca derruba nada: em qualquer falha, passa o atendimento para a equipe.
 */
export async function responderComAgente(atendimentoId: string): Promise<void> {
  if (!agenteLigado()) return;
  const admin = supabaseAdmin();
  const [{ data: a }, { data: mensagens }] = await Promise.all([
    admin.from("atendimentos").select("*").eq("id", atendimentoId).single(),
    admin.from("mensagens_suporte").select("id, autor, texto, criado_em").eq("atendimento_id", atendimentoId).order("criado_em"),
  ]);
  if (!a || a.status === "encerrado" || !mensagens?.length || humanoAssumiu(mensagens)) return;
  const ultimaDaPessoa = [...mensagens].reverse().find((m) => m.autor === "usuario");
  if (!ultimaDaPessoa || mensagens.at(-1)?.autor !== "usuario") return;

  const historico = historicoParaModelo(mensagens);
  // Contexto que muda por atendimento vai numa mensagem de sistema no fim, para não quebrar o cache do prefixo.
  const whatsapp = a.canal === "whatsapp";
  const contexto = [
    whatsapp
      ? `Atendimento pelo WhatsApp${a.usuario_id ? "" : ", de um número sem conta no app"}. Escreva texto simples, sem títulos e sem tabelas; para destacar, use *asteriscos*. Mensagens curtas.`
      : `Atendimento no chat do app, aberto no modo ${a.modo === "locador" ? "locador" : "motorista"}, assunto "${a.assunto}".`,
    `Hoje é ${new Date().toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}.`,
  ].join(" ");

  let transferencia: { motivo: string; resumo: string } | null = null;
  let resposta = "";
  try {
    if (PROVEDOR === "gemini") {
      const r = await conversarComGemini({
        modelo: MODELO,
        sistema: `${SISTEMA}\n\n${contexto}`,
        historico,
        ferramentas: FERRAMENTAS.map(paraFerramentaGemini),
        maxVoltas: MAX_VOLTAS,
        executar: async (nome, args) => {
          if (nome !== "transferir_para_equipe") return executar(nome, a.usuario_id);
          transferencia = { motivo: String(args.motivo ?? "").slice(0, 300), resumo: String(args.resumo ?? "").slice(0, 2000) };
          return "Transferido. Agora avise a pessoa que a equipe responde por aqui, em horário comercial, em dias úteis.";
        },
      });
      resposta = r.texto;
      if (r.bloqueado) transferencia = { motivo: "O assistente não pôde responder a esta mensagem.", resumo: ultimaDaPessoa.texto.slice(0, 500) };
    }
    const client = PROVEDOR === "claude" ? new Anthropic() : null;
    const conversa: Anthropic.Beta.BetaMessageParam[] = [...historico, { role: "system", content: contexto } as unknown as Anthropic.Beta.BetaMessageParam];
    for (let volta = 0; client && volta < MAX_VOLTAS; volta++) {
      const r = await client.beta.messages.create({
        model: MODELO,
        max_tokens: 16000,
        // Se o modelo recusar, o servidor tenta outro (o Haiku não tem essa troca: aí a equipe assume).
        ...(MODELO.startsWith("claude-haiku") ? {} : { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const }),
        output_config: { effort: ESFORCO },
        cache_control: { type: "ephemeral" },
        system: SISTEMA,
        tools: FERRAMENTAS,
        messages: conversa,
      });
      if (r.stop_reason === "refusal") {
        transferencia = { motivo: "O assistente não pôde responder a esta mensagem.", resumo: ultimaDaPessoa.texto.slice(0, 500) };
        break;
      }
      conversa.push({ role: "assistant", content: r.content });
      const usos = r.content.filter((b): b is Anthropic.Beta.BetaToolUseBlock => b.type === "tool_use");
      resposta = r.content.filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text").map((b) => b.text).join("\n").trim() || resposta;
      if (r.stop_reason !== "tool_use" || !usos.length) break;

      const resultados: Anthropic.Beta.BetaToolResultBlockParam[] = [];
      for (const uso of usos) {
        try {
          if (uso.name === "transferir_para_equipe") {
            const e = uso.input as { motivo?: unknown; resumo?: unknown };
            transferencia = { motivo: String(e.motivo ?? "").slice(0, 300), resumo: String(e.resumo ?? "").slice(0, 2000) };
            resultados.push({ type: "tool_result", tool_use_id: uso.id, content: "Transferido. Agora avise a pessoa que a equipe responde por aqui, em horário comercial, em dias úteis." });
          } else {
            resultados.push({ type: "tool_result", tool_use_id: uso.id, content: JSON.stringify(await executar(uso.name, a.usuario_id)) });
          }
        } catch {
          resultados.push({ type: "tool_result", tool_use_id: uso.id, content: "Não foi possível consultar agora.", is_error: true });
        }
      }
      conversa.push({ role: "user", content: resultados });
    }
  } catch (e) {
    console.error("agente-suporte", atendimentoId, e instanceof Anthropic.APIError ? `${e.status} ${e.message}` : e);
    transferencia = { motivo: "O assistente ficou indisponível.", resumo: ultimaDaPessoa.texto.slice(0, 500) };
    resposta = "";
  }

  // Se a pessoa escreveu de novo enquanto o agente pensava, a próxima rodada responde tudo junto.
  const { data: maisRecente } = await admin.from("mensagens_suporte").select("id").eq("atendimento_id", atendimentoId).eq("autor", "usuario").order("criado_em", { ascending: false }).limit(1).single();
  if (maisRecente?.id !== ultimaDaPessoa.id) return;

  const agora = new Date().toISOString();
  const linhas = [];
  if (resposta) linhas.push({ atendimento_id: atendimentoId, autor: "agente" as const, texto: resposta.slice(0, 4000) });
  const avisoTransferencia = "Uma pessoa da equipe responde por aqui em horário comercial, em dias úteis.";
  if (transferencia) linhas.push({ atendimento_id: atendimentoId, autor: "sistema" as const, texto: `${MARCA_TRANSFERENCIA}: ${transferencia.motivo} ${avisoTransferencia}` });
  if (!linhas.length) return;
  await admin.from("mensagens_suporte").insert(linhas);
  await admin.from("atendimentos").update({ ultima_mensagem_em: agora, status: transferencia ? "aberto" : "respondido" }).eq("id", atendimentoId);

  if (whatsapp && a.telefone) {
    // No WhatsApp a resposta vai pelo próprio WhatsApp (dentro da janela de 24 h, porque a pessoa acabou de escrever).
    const texto = resposta || (transferencia ? `Recebemos sua mensagem. ${avisoTransferencia}` : "");
    if (texto) {
      const envio = await enviarTextoWhatsApp(a.telefone, texto);
      if (!envio.ok) await admin.from("mensagens_suporte").insert({ atendimento_id: atendimentoId, autor: "sistema", texto: `Falha ao enviar pelo WhatsApp: ${envio.erro}` });
    }
  }
  if (transferencia) {
    await avisarEquipe(atendimentoId, `Suporte: atendimento transferido (${whatsapp ? "WhatsApp" : a.assunto})`, `${transferencia.motivo}\n\n${transferencia.resumo}`);
  } else if (a.usuario_id && !whatsapp) {
    await notificar({ usuarioId: a.usuario_id, organizacaoId: a.organizacao_id, modelo: "suporte.resposta", titulo: "O suporte respondeu", texto: resposta.length > 120 ? `${resposta.slice(0, 117)}…` : resposta, link: `${a.modo === "locador" ? "/painel" : "/m"}/suporte/${atendimentoId}`, assunto: "mensagens", chave: `suporte:agente:${ultimaDaPessoa.id}` });
  }
}

export { humanoAssumiu };
