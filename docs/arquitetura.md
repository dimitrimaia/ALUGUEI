# Arquitetura

## Os quatro pilares

1. **Contrato = parâmetros + modelo versionado.** `ParametrosContrato`
   (`src/dominio/contrato/parametros.ts`) é validado com zod e copiado para
   `contratos.parametros` na assinatura. A agenda, o PDF, os encargos e o
   extrato leem dessa cópia, nunca do modelo atual.
2. **Agenda de obrigações.** `gerarAgenda` cria aluguéis, parcelas da caução e
   check-ins com chave `contrato:tipo:data`. A chave tem índice único no banco,
   então nenhum job cobra duas vezes.
3. **Extrato único.** A tabela `lancamentos` só recebe inserções: débito
   positivo, crédito negativo, em centavos. Correção se faz com outro
   lançamento. Cada lançamento tem origem, justificativa e chave de
   idempotência.
4. **Cofre de provas.** A tabela `evidencias` guarda SHA-256, hora do servidor,
   geolocalização, IP e dispositivo. O bucket do Storage não permite update nem
   delete.

**Regra de ouro:** ação drástica (rescisão, retomada, protesto) vira um
registro em `acoes_pendentes`, e um humano decide. No modo assistido, cobrança
extra e notificação formal também passam por lá.

## Camadas

```
src/
  app/            Next.js: painel do locador (/painel) e PWA do motorista (/m), rotas de API
  dominio/        regras puras, sem banco nem rede, 100% testáveis
    dinheiro/     centavos, percentuais em bps, extenso
    datas/        datas civis em São Paulo, dias úteis, feriados
    contrato/     parâmetros, encargos (multa/juros)
    agenda/       geração da agenda de obrigações
    cadastro/     pré-análise do candidato
  integracoes/    portas (interfaces) de pagamento, assinatura e mensagens
  jobs/           funções Inngest (cron e eventos), idempotentes por chave
  db/             schema Drizzle e cliente
supabase/rls.sql  isolamento por locador e imutabilidade
drizzle/          migrações geradas
```

Dependências só apontam para dentro: `app` e `jobs` usam `dominio` e
`integracoes`, e `dominio` não importa nada de fora.

## Convenções

- Dinheiro em centavos (`integer`), percentuais em pontos-base (1% = 100 bps),
  arredondamento meio-para-cima no centavo.
- Datas de vencimento são `date` ("AAAA-MM-DD") no fuso de São Paulo. Instantes
  (assinatura, upload) são `timestamptz`.
- Todo efeito externo (cobrança, mensagem) recebe uma chave de idempotência
  derivada da obrigação.
- Multi-tenant: toda tabela de dado do locador tem `organizacao_id` e RLS.
