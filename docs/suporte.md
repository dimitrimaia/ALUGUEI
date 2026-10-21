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

- **Modelo:** Claude Opus 5.5 (`claude-opus-5-5`), esforço `medium`, com a troca
  automática de modelo do servidor se ele recusar (`fallbacks: "default"`).
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

**Para ligar:** crie `ANTHROPIC_API_KEY` na Vercel (chave em console.anthropic.com).
Sem ela, o atendimento recebe a resposta automática e vai direto para a equipe.
Para desligar sem apagar a chave: `SUPORTE_AGENTE=desligado`.

**Para melhorar as respostas:** o conhecimento do app está nas instruções do
arquivo. Quando surgir uma dúvida que ele não sabe responder, acrescente lá.

Tabelas (migração 0006): `atendimentos` e `mensagens_suporte`, com RLS (a pessoa lê só
os próprios).
