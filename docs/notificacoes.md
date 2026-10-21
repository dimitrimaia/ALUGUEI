# Notificações

RF-110 e RF-111. Todo aviso tem **três** destinos possíveis, e fica guardado na tabela
`notificacoes`, com uma linha por canal:

| Canal | Como funciona | Custo |
|---|---|---|
| **App** (central de avisos) | Sempre. Aparece em Avisos (menu ☰), com um ponto no ☰ quando há aviso novo | Grátis |
| **Notificação no celular** (Web Push) | A pessoa ativa em Conta → Notificações; funciona com o app fechado. No iPhone, só com o app instalado na tela inicial | Grátis |
| **E-mail** (Resend, `avisos@aluguei.xyz`) | Para cobranças, avisos formais, respostas do suporte e decisões de cadastro e contrato | Grátis até o limite do plano |
| WhatsApp (próximo) | API oficial da Meta, com modelos aprovados | Centavos por mensagem |

`src/lib/notificacoes.ts`, função `notificar()`:

- **Idempotente**: cada aviso tem uma chave (ex.: `pagamento:<obrigação>:amanha`). O
  mesmo aviso nunca sai duas vezes, mesmo que a rotina rode de novo.
- **Respeita as preferências** (Conta → Notificações): canais e assuntos. Avisos
  formais do contrato saem sempre.
- **Nunca derruba quem chamou**: uma falha de envio fica registrada na própria linha
  (`falha`), e o fluxo segue.
- Aparelho que desinstalou o app (push expirado) é removido sozinho.

## Quando avisamos

| Evento | Quem recebe | Canais |
|---|---|---|
| Mensagem nova no chat | A outra parte | App e push |
| Cadastro enviado para análise | Equipe do locador | App e push |
| Cadastro aprovado ou recusado | Motorista | App, push e e-mail |
| Contrato pronto para assinar | Motorista | App, push e e-mail |
| Aluguel ou caução: véspera, dia e 1 dia de atraso | Motorista | App, push e e-mail |
| Pagamento recebido / confirmado | Locador / motorista | App e push |
| "Já paguei" no Pix direto | Equipe do locador | App e push |
| Check-in abre (véspera e dia) | Motorista | App e push |
| Check-in enviado / atrasado além do prazo | Equipe do locador | App e push |
| Contrato encerrado, caução devolvida | Motorista | App, push e e-mail |
| Resposta do suporte | Quem abriu o atendimento | App, push e e-mail |

Os lembretes saem da rotina diária (`/api/cron/diario`, 06:00). Os outros saem na
hora em que o evento acontece.

## Configuração (Vercel)

- `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` e `NEXT_PUBLIC_VAPID_PUBLIC_KEY` (o mesmo valor
  da pública): chaves do Web Push. Geradas uma vez; trocar invalida os aparelhos já
  inscritos.
- `RESEND_API_KEY`: chave da API do Resend. Sem ela, o e-mail não sai, e o aviso fica
  no app e no push.
- `EMAIL_REMETENTE` (opcional): padrão `Aluguei <avisos@aluguei.xyz>`.

Precisa da migração **0006** (colunas `titulo` e `link`, tabela `inscricoes_push`).
