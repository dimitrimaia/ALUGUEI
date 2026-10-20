// Teste manual do adaptador contra o sandbox: cria subconta, cliente, cobrança Pix,
// lê o QR Code e dá baixa em dinheiro. Uso: pnpm tsx --env-file=.env.local scripts/testar-asaas.ts
import { criarChavePixAleatoria, consultarCobranca, criarCliente, criarCobrancaPix, criarSubconta, qrCodePix, receberEmDinheiro, walletPlataforma } from "../src/integracoes/asaas";
import { hoje, somarDias } from "../src/dominio/datas/data";

const sufixo = Date.now().toString(36);
function cpfAleatorio() {
  const n = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10));
  for (const t of [10, 11]) {
    const soma = n.reduce((s, d, i) => s + d * (t - i), 0);
    n.push(((soma * 10) % 11) % 10);
  }
  return n.join("");
}
const sub = await criarSubconta({
  nome: "Locadora Teste Sandbox",
  email: `teste+${sufixo}@aluguei.app`,
  documento: cpfAleatorio(),
  dataNascimento: "1985-03-10" as never,
  celular: "+5537999990002",
  rendaMensal: 1000000,
  endereco: { logradouro: "Rua Teste", numero: "100", bairro: "Centro", cep: "35700000" },
});
console.log("subconta", sub.contaId, sub.walletId, sub.chaveApi.slice(0, 12) + "…");
console.log("chave pix", await criarChavePixAleatoria(sub.chaveApi));
const cliente = await criarCliente(sub.chaveApi, { nome: "João Teste", cpf: cpfAleatorio(), celular: "+5537999990001", referencia: `teste-${sufixo}` });
console.log("cliente", cliente);
const cob = await criarCobrancaPix(sub.chaveApi, {
  cliente,
  valor: 60000,
  vencimento: somarDias(hoje(), 2),
  descricao: "Aluguel semanal (teste)",
  referencia: `teste-${sufixo}`,
  multaBps: 500,
  jurosMensaisBps: 100,
  split: { walletId: walletPlataforma(), valor: 5753 },
});
console.log("cobranca", cob.id, cob.status, cob.value, cob.invoiceUrl);
const qr = await qrCodePix(sub.chaveApi, cob.id);
console.log("pix", qr.copiaECola.slice(0, 40) + "…", qr.imagemBase64.length);
const baixa = await receberEmDinheiro(sub.chaveApi, cob.id, hoje(), 60000);
console.log("baixa", baixa.status);
console.log("consulta", (await consultarCobranca(sub.chaveApi, cob.id)).status);
