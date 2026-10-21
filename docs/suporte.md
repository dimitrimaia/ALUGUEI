# Suporte

Atendimento por chat dentro do app, para motoristas e locadores (menu ☰ → "Falar com o
suporte", e Conta → Ajuda).

- A pessoa escolhe o assunto e escreve. O atendimento abre com uma resposta automática
  ("respondemos em horário comercial…").
- A conversa é em tempo real (Supabase Realtime), com a mesma tela do chat da
  negociação, e fica registrada.
- A equipe do Aluguei (e-mails em `ADMINS`) responde em `/admin/suporte`. Abertos
  (esperando resposta) aparecem primeiro. Cada nova mensagem chega por e-mail para a
  equipe; cada resposta chega para a pessoa no app, no push e por e-mail.
- Situações: **aberto** (esperando a equipe), **respondido** e **encerrado**. Quem
  escreve de novo num atendimento respondido o reabre.

## Assistente (agente com Claude)

`src/lib/agente-suporte.ts`. Quando a pessoa escreve, o assistente responde em
segundos no mesmo chat ("Suporte Aluguei · assistente"), enquanto a tela mostra
"respondendo…".

- **Modelo:** Claude Haiku 5.5 (`claude-haiku-5-5`), o mais barato, com esforço
  `low`. Dá para trocar sem mexer no código: `SUPORTE_MODELO` (ex.:
  `claude-sonnet-5-5`) e `SUPORTE_ESFORCO` (`low`, `medium` ou `high`). Nos modelos
  maiores, a troca automática de modelo do servidor entra se ele recusar.
- **Canais:** o chat do app e o WhatsApp (ver `whatsapp.md`). É o mesmo assistente e
  a mesma fila da equipe em `/admin/suporte`.
- **Ferramentas, todas só de leitura e presas à conta de quem abriu o atendimento:**
  - `ver_conta`: nome, e-mail, verificação e modos ativos;
  - `ver_aluguel`: cadastros, contratos, próximos vencimentos, saldo, último
    check-in e caução a devolver;
  - `ver_locadora`: frota, verificação dos carros, contratos, cobranças em atraso e
    recebimentos;
  - `transferir_para_equipe`: passa para uma pessoa, com motivo e resumo do caso.
- **O que ele não faz:** dar baixa, cancelar, estornar, aprovar ou prometer
  reembolso. Não pede senha, código nem foto de documento.
- **Transfere para a equipe** quando o assunto é cobrança contestada, pagamento não
  reconhecido, avaria contestada, conflito entre motorista e locador, golpe,
  segurança, exclusão de conta, erro que ele não explica, ou quando a pessoa pede.
  A equipe recebe um e-mail com o resumo.
- Depois que alguém da equipe responde ou recebe a transferência, o assistente para
  de responder naquele atendimento.
- **Falha do modelo ou recusa:** o atendimento vai para a equipe, nunca fica sem
  resposta.
- **Custo:** o texto fixo das instruções e as ferramentas ficam em cache entre os
  atendimentos. O que muda (modo, assunto e data) vai numa mensagem de sistema no fim.

### Opção grátis: Gemini

O assistente também funciona com o Gemini do Google, no nível gratuito
(`src/integracoes/gemini.ts`).

1. Entre em **aistudio.google.com** com a conta Google.
2. **Get API key → Create API key** (ele cria um projeto no Google Cloud, sem cartão).
3. Na Vercel: `GEMINI_API_KEY` = a chave, em Production. Redeploy.

Limites do gratuito: poucos pedidos por minuto e por dia (o suficiente para o
piloto), e o Google pode usar as conversas para melhorar os produtos dele. Para
produção com dados de clientes, ligue o faturamento no projeto do Google ou use o
Claude. Com as duas chaves, vale o Claude (ou `SUPORTE_PROVEDOR=gemini`).
Modelo padrão `gemini-2.5-flash`; troca com `SUPORTE_MODELO`.

### Como ligar o Claude (passo a passo)

1. Entre em **console.anthropic.com** e crie a conta (ou entre com a sua). Se pedir,
   crie a organização (pode ser "Aluguei").
2. **Créditos:** menu **Settings → Billing** → **Buy credits** (ou "Add funds").
   Cadastre o cartão e coloque um valor pequeno para começar (ex.: US$ 10). Ligue a
   recarga automática só se quiser.
3. **Limite de gasto (recomendado):** **Settings → Limits** → defina um limite mensal
   (ex.: US$ 20). Se passar, a API para e o suporte cai na equipe, sem susto na fatura.
4. **Chave:** **Settings → API Keys** → **Create Key**. Nome: `aluguei-producao`.
   Workspace: o padrão. Clique em criar e **copie na hora**: ela começa com
   `sk-ant-` e não aparece de novo. Não mande por chat nem coloque no código.
5. **Vercel:** projeto → **Settings → Environment Variables** → **Add**:
   - Key `ANTHROPIC_API_KEY`, Value a chave copiada, ambiente **Production** (e
     Preview, se quiser testar lá). Salve.
6. **Redeploy:** aba **Deployments** → no último deploy, **⋯ → Redeploy**. Variável
   nova só vale depois de um deploy.
7. **Teste:** no app, Conta → Ajuda e suporte → abra um atendimento. O assistente
   responde em poucos segundos. Em `/admin/suporte` a conversa aparece para a equipe.

Sem a chave, o atendimento recebe a resposta automática e vai direto para a equipe.
Para a equipe receber o e-mail das transferências, `RESEND_API_KEY` e `ADMINS`
precisam estar na Vercel. Para desligar sem apagar a chave: `SUPORTE_AGENTE=desligado`.
Se a chave vazar, apague em API Keys e crie outra.

**Para melhorar as respostas:** o conhecimento do app está nas instruções do
arquivo. Quando surgir uma dúvida que ele não sabe responder, acrescente lá.

Tabelas (migração 0006): `atendimentos` e `mensagens_suporte`, com RLS (a pessoa lê só
os próprios).
