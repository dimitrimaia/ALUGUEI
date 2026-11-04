import type { Centavos } from "@/dominio/dinheiro/centavos";
import type { DataISO } from "@/dominio/datas/data";

/**
 * Adaptador do Asaas (API v3). A conta da plataforma cria as subcontas dos
 * locadores; as cobranças são emitidas com a chave da subconta, e o Pix cai
 * direto para o locador, com a parte da plataforma por split.
 */

export class ErroAsaas extends Error {
  constructor(
    mensagem: string,
    readonly status: number,
    readonly detalhes: unknown,
  ) {
    super(mensagem);
  }
}

const reais = (c: Centavos) => Math.round(c) / 100;
const centavos = (r: number) => Math.round(r * 100);

function urlBase() {
  const url = process.env.ASAAS_API_URL;
  if (!url) throw new Error("ASAAS_API_URL não configurada");
  return url.replace(/\/$/, "");
}

async function chamar<T>(chaveApi: string, metodo: "GET" | "POST" | "DELETE", caminho: string, corpo?: unknown): Promise<T> {
  const r = await fetch(`${urlBase()}${caminho}`, {
    method: metodo,
    headers: { access_token: chaveApi, "Content-Type": "application/json", "User-Agent": "aluguei" },
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
    cache: "no-store",
  });
  const texto = await r.text();
  const json = texto ? JSON.parse(texto) : null;
  if (!r.ok) {
    const descricao = json?.errors?.map((e: { description: string }) => e.description).join("; ") || `HTTP ${r.status}`;
    throw new ErroAsaas(descricao, r.status, json);
  }
  return json as T;
}

/**
 * Chave da conta da plataforma. As chaves do Asaas começam com "$", que alguns
 * carregadores de .env tentam expandir como variável; por isso aceitamos a chave
 * com ou sem o "$" e o recolocamos aqui.
 */
export function chavePlataforma(): string {
  const chave = process.env.ASAAS_API_KEY?.trim().replace(/^\\/, "");
  if (!chave) throw new Error("ASAAS_API_KEY não configurada");
  return chave.startsWith("$") ? chave : `$${chave}`;
}

export function walletPlataforma(): string {
  const w = process.env.ASAAS_WALLET_ID_PLATAFORMA;
  if (!w) throw new Error("ASAAS_WALLET_ID_PLATAFORMA não configurada");
  return w;
}

export const EVENTOS_PAGAMENTO = [
  "PAYMENT_RECEIVED",
  "PAYMENT_CONFIRMED",
  "PAYMENT_OVERDUE",
  "PAYMENT_REFUNDED",
  "PAYMENT_DELETED",
  "PAYMENT_RECEIVED_IN_CASH_UNDONE",
] as const;

export interface DadosSubconta {
  nome: string;
  email: string;
  documento: string;
  /** Obrigatório para pessoa física. */
  dataNascimento?: DataISO;
  /** Para CNPJ: MEI, LIMITED, INDIVIDUAL ou ASSOCIATION. */
  tipoEmpresa?: "MEI" | "LIMITED" | "INDIVIDUAL" | "ASSOCIATION";
  celular: string;
  rendaMensal: Centavos;
  endereco: { logradouro: string; numero: string; complemento?: string; bairro: string; cep: string };
  webhook?: { url: string; token: string; email: string };
}

export async function criarSubconta(d: DadosSubconta) {
  const r = await chamar<{ id: string; walletId: string; apiKey: string }>(chavePlataforma(), "POST", "/accounts", {
    name: d.nome,
    email: d.email,
    cpfCnpj: d.documento,
    birthDate: d.dataNascimento,
    companyType: d.tipoEmpresa,
    mobilePhone: d.celular.replace(/^\+55/, ""),
    incomeValue: reais(d.rendaMensal),
    address: d.endereco.logradouro,
    addressNumber: d.endereco.numero,
    complement: d.endereco.complemento,
    province: d.endereco.bairro,
    postalCode: d.endereco.cep,
    webhooks: d.webhook
      ? [
          {
            name: "Aluguei",
            url: d.webhook.url,
            email: d.webhook.email,
            sendType: "SEQUENTIALLY",
            apiVersion: 3,
            enabled: true,
            interrupted: false,
            authToken: d.webhook.token,
            events: EVENTOS_PAGAMENTO,
          },
        ]
      : undefined,
  });
  return { contaId: r.id, walletId: r.walletId, chaveApi: r.apiKey };
}

/** Chave Pix aleatória (EVP) da subconta: sem ela o Asaas não gera o QR Code das cobranças. */
export async function criarChavePixAleatoria(chaveApi: string) {
  const r = await chamar<{ id: string; key: string | null; status: string }>(chaveApi, "POST", "/pix/addressKeys", { type: "EVP" });
  return { id: r.id, chave: r.key, status: r.status };
}

export async function listarChavesPix(chaveApi: string) {
  const r = await chamar<{ data: { id: string; key: string; status: string }[] }>(chaveApi, "GET", "/pix/addressKeys?status=ACTIVE");
  return r.data;
}

export async function criarCliente(chaveApi: string, d: { nome: string; cpf: string; celular: string; email?: string | null; referencia: string }) {
  const r = await chamar<{ id: string }>(chaveApi, "POST", "/customers", {
    name: d.nome,
    cpfCnpj: d.cpf,
    mobilePhone: d.celular.replace(/^\+55/, ""),
    email: d.email ?? undefined,
    externalReference: d.referencia,
    // Os avisos saem pelo Aluguei, com a régua do contrato; o Asaas não manda os dele.
    notificationDisabled: true,
  });
  return r.id;
}

export interface CobrancaAsaas {
  id: string;
  status: string;
  value: number;
  netValue?: number;
  dueDate: string;
  invoiceUrl: string;
  paymentDate?: string | null;
  clientPaymentDate?: string | null;
  confirmedDate?: string | null;
  externalReference?: string | null;
}

export async function criarCobrancaPix(
  chaveApi: string,
  d: {
    cliente: string;
    valor: Centavos;
    vencimento: DataISO;
    descricao: string;
    referencia: string;
    multaBps: number;
    jurosMensaisBps: number;
    split?: { walletId: string; valor: Centavos };
  },
) {
  return chamar<CobrancaAsaas>(chaveApi, "POST", "/payments", {
    customer: d.cliente,
    billingType: "PIX",
    value: reais(d.valor),
    dueDate: d.vencimento,
    description: d.descricao,
    externalReference: d.referencia,
    // O Asaas aplica a multa e os juros do contrato se o Pix for pago depois do vencimento.
    fine: { value: d.multaBps / 100, type: "PERCENTAGE" },
    interest: { value: d.jurosMensaisBps / 100 },
    split: d.split && d.split.valor > 0 ? [{ walletId: d.split.walletId, fixedValue: reais(d.split.valor) }] : undefined,
  });
}

export async function qrCodePix(chaveApi: string, cobrancaId: string) {
  const r = await chamar<{ encodedImage: string; payload: string; expirationDate: string }>(chaveApi, "GET", `/payments/${cobrancaId}/pixQrCode`);
  return { imagemBase64: r.encodedImage, copiaECola: r.payload };
}

/** Cobranças já criadas com uma referência: evita cobrar duas vezes se o envio for repetido. */
export async function cobrancasPorReferencia(chaveApi: string, referencia: string) {
  const r = await chamar<{ data: CobrancaAsaas[] }>(chaveApi, "GET", `/payments?externalReference=${encodeURIComponent(referencia)}`);
  return r.data.filter((c) => c.status !== "DELETED");
}

export async function consultarCobranca(chaveApi: string, cobrancaId: string) {
  return chamar<CobrancaAsaas>(chaveApi, "GET", `/payments/${cobrancaId}`);
}

/** Cancela (apaga) uma cobrança ainda não paga. */
export async function cancelarCobrancaAsaas(chaveApi: string, cobrancaId: string) {
  return chamar<{ deleted: boolean }>(chaveApi, "DELETE", `/payments/${cobrancaId}`);
}

/** Estorna uma cobrança paga por Pix (devolve o valor ao pagador). */
export async function estornarCobrancaAsaas(chaveApi: string, cobrancaId: string, descricao: string) {
  return chamar<CobrancaAsaas>(chaveApi, "POST", `/payments/${cobrancaId}/refund`, { description: descricao.slice(0, 200) });
}

/** Baixa manual de um valor recebido por fora (dinheiro ou outro Pix). */
export async function receberEmDinheiro(chaveApi: string, cobrancaId: string, data: DataISO, valor: Centavos) {
  return chamar<CobrancaAsaas>(chaveApi, "POST", `/payments/${cobrancaId}/receiveInCash`, {
    paymentDate: data,
    value: reais(valor),
    notifyCustomer: false,
  });
}

const PAGO = new Set(["RECEIVED", "CONFIRMED", "RECEIVED_IN_CASH"]);

export function estaPaga(status: string) {
  return PAGO.has(status);
}

export function valorEmCentavos(r: number) {
  return centavos(r);
}
