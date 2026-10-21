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

## Agentes (próximo passo)

O formato já prevê um autor `agente` (`mensagens_suporte.autor`), mostrado como
"Suporte Aluguei · assistente". O plano:

1. Um agente lê a fila (`atendimentos` abertos) e responde as dúvidas comuns com a
   documentação do app e os dados da própria conta da pessoa (extrato, contrato,
   próximos vencimentos), sempre com o escopo do usuário.
2. Quando não souber, ou quando o assunto for dinheiro, contrato ou conflito, passa
   para a equipe humana, avisando a pessoa.
3. O agente nunca executa ação no contrato: só explica e encaminha.

Tabelas (migração 0006): `atendimentos` e `mensagens_suporte`, com RLS (a pessoa lê só
os próprios).
