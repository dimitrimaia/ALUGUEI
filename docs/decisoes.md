# Decisões de produto

| Data | Decisão | Motivo |
|---|---|---|
| 20/10/2026 | Só Pix no MVP; cartão fica de fora (RF-051 adiado) | Risco de chargeback em aluguel semanal |
| 20/10/2026 | PWA primeiro (site oficial + app do motorista); app nativo depois | Entrega mais rápida; migrar quando precisar de GPS em segundo plano ou loja |
| 20/10/2026 | Asaas (pagamentos e split) e ZapSign (assinatura) | — |
| 20/10/2026 | Mensalidade de R$ 250 por carro **com contrato ativo**; carro parado não paga | Alinha o incentivo: a plataforma ganha quando o carro está rodando |
| 20/10/2026 | A mensalidade é cobrada por split em cada aluguel pago, proporcional aos dias (R$ 250 × 12 / 365 por dia = R$ 57,53/semana) | O locador não recebe fatura separada; semanas incompletas ficam corretas |
| 20/10/2026 | O app faz o papel do administrador do contrato (cláusula 1.2): rotina automática, decisão drástica humana | Ver "O app como administrador" abaixo |

## Split: regras

- O split só existe na cobrança de **aluguel**. Caução, multa, juros e cobranças extras vão 100% para o locador.
- Se o motorista não paga, não há split naquela semana. Quando ele paga com atraso, o split sai junto.
- Se o locador der baixa manual (recebeu por fora), a taxa daquele período vira um débito do locador com a plataforma, descontado no próximo split. A validar com o Asaas.
- A tarifa do Pix cobrada pelo Asaas sai da parte do locador (a confirmar).

## O app como administrador do contrato

O app faz o que hoje o locador ou um administrador humano faz, **em nome do
locador e pelas regras que ele configurou**:

| Rotina | Hoje (manual) | No app |
|---|---|---|
| Cobrança semanal | Mensagem no WhatsApp toda terça | Pix emitido sozinho, lembrete antes e no dia, baixa automática |
| Atraso | Locador percebe, cobra, calcula juros | Juros e multa calculados, notificação formal com prazo de 24 h, prova guardada |
| Fotos de segunda | Pedir, conferir, cobrar quem não mandou | Check-in guiado, lembrete, escalonamento, registro de infração |
| Km e revisão | Anotar e fazer contas | Linha do tempo de km, alerta de revisão a 7.000 km, km excedente |
| Caução | Planilha | Parcelas, saldo, devolução em 30 dias úteis com demonstrativo |
| Vistorias | Fotos soltas no celular | Checklist guiado, aceite no app, comparação entrega × devolução |

O que **não** é automático, e vai para o locador aprovar: rescisão, retomada do
veículo, protesto/negativação, e (no modo assistido) cobranças extras e
notificações formais.

**Ponto jurídico:** a plataforma age como ferramenta do locador, não como sua
mandatária. O contrato e os termos de uso devem dizer que as notificações são
enviadas pelo locador por meio da plataforma. Item incluído na lista do advogado.
