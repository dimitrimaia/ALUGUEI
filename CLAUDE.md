# Aluguei: guia para agentes

- Idioma do código, comentários e textos: português (pt-BR). Fuso America/Sao_Paulo, moeda BRL.
- Dinheiro sempre em centavos inteiros (`Centavos`); percentuais em bps. Nunca use float para dinheiro.
- Datas de vencimento são `DataISO` ("AAAA-MM-DD"); use as funções de `src/dominio/datas`, nunca `new Date()` direto para dia civil.
- Regras de contrato vêm de `ParametrosContrato`, congelados no contrato. Não fixe valores do contrato no código.
- `src/dominio` é puro (sem banco ou rede) e toda regra financeira nova vem com teste.
- `lancamentos`, `evidencias` e `auditoria` só recebem inserções.
- Efeitos externos (cobrança, mensagem) sempre com chave de idempotência.
- Ações drásticas (rescisão, retomada, protesto) só viram `acoes_pendentes`; nunca execute automaticamente.
- Antes de commitar: `pnpm typecheck && pnpm test`.
