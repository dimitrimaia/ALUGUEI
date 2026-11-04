# Asaas: do sandbox para a produção

## Como está hoje

- `ASAAS_API_URL` aponta para o **sandbox** (`https://api-sandbox.asaas.com/v3`): nada
  é cobrado de verdade.
- A conta do sandbox está aprovada (comercial, banco e documentos) e já tem subcontas
  de teste criadas pelo app.
- Cada locadora que ativa **Recebimentos** ganha uma **subconta** no Asaas. Ela já
  nasce com o webhook do Aluguei (`/api/webhooks/asaas`), então a conta principal
  não precisa de webhook próprio. A rotina diária também confere as cobranças em
  aberto (pega aviso perdido).
- O split manda a parte da plataforma para a carteira `ASAAS_WALLET_ID_PLATAFORMA`.

## Passo a passo para produção

1. **Crie a conta de produção** em asaas.com com o mesmo CNPJ (a conta do sandbox é
   separada). Envie os documentos e espere a aprovação (aparece em Minha conta →
   Status).
2. **Peça a liberação das subcontas.** Em produção, criar subcontas pela API
   normalmente precisa ser liberado pelo Asaas. Fale com o suporte ou com o
   gerente comercial: "uso a API para criar subcontas (contas filhas) para os meus
   clientes, com split de pagamento". Sem isso, ativar Recebimentos dá erro.
3. **Gere a chave da API de produção:** Integrações → Chaves de API → Gerar. Copie
   na hora (ela só aparece uma vez).
4. **Pegue o walletId da conta principal:** Minha conta → Integrações (ou
   `GET /v3/myAccount` com a chave). É a carteira que recebe a parte da plataforma.
5. **Invente um token do webhook:** 30+ letras e números aleatórios. Ele vai em cada
   subconta nova e o app confere em cada aviso.
6. **Vercel → Settings → Environment Variables (Production):**

   | Variável | Valor |
   |---|---|
   | `ASAAS_API_URL` | `https://api.asaas.com/v3` |
   | `ASAAS_API_KEY` | a chave de produção (com ou sem o `$` do começo) |
   | `ASAAS_WALLET_ID_PLATAFORMA` | o walletId do passo 4 |
   | `ASAAS_WEBHOOK_TOKEN` | o token do passo 5 |

   Depois, **Redeploy**.
7. **Teste com dinheiro de verdade, pequeno:** numa locadora de teste, ative
   Recebimentos, crie um contrato com aluguel de R$ 5, pague o Pix e confira:
   - a cobrança vira **paga** sozinha (em segundos);
   - o extrato do contrato mostra o pagamento;
   - no painel `/admin/cobrancas` aparece como paga, com a parte da plataforma.
8. **Subcontas do sandbox não vão para a produção.** Cada locadora real ativa os
   Recebimentos de novo depois da troca.

## Custos (confira no site do Asaas, mudam com frequência)

- Pix recebido: tarifa por transação na subconta.
- Saque/transferência para o banco: algumas grátis por mês.
- Abertura de subconta: grátis.

## Cuidados

- **MEI:** a parte da plataforma conta no faturamento do MEI (limite anual). Com
  volume, passe para ME. As atividades do CNPJ devem incluir intermediação ou
  plataforma digital (ver o cartão CNPJ com um contador).
- **Pix direto** continua como alternativa sem custo (sem baixa automática nem split).
- Estorno e cancelamento pela equipe: `/admin/cobrancas` → a cobrança.
