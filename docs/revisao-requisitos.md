# Revisão: documento de requisitos v0.1 × proposta inicial

Revisão do *Documento de Requisitos v0.1* contra a proposta de produto
(posicionamento, 4 pilares, stack e MVP de 12 semanas). Objetivo: garantir que
nada do documento ficou de fora sem uma decisão explícita.

## 1. Correções na proposta

| # | O que estava | Correção |
|---|---|---|
| 1 | Mensalidade de R$ 29 a R$ 49 por carro | **R$ 250 por carro/mês** (definido por você). Ver seção 4. |
| 2 | "A terça-feira não bate com 28/04" | **Errado, tanto no documento quanto na proposta.** 28/04/2026 é terça, e 21/04/2026 (início) também. As cláusulas 3.1 e 3.2 são coerentes. Isso está verificado em teste (`src/dominio/datas/datas.test.ts`). |
| 3 | — | O contrato começou em **21/04, feriado de Tiradentes**, e a 2ª parcela da caução vence em **10/05/2026, um domingo**. Pix funciona nesses dias, mas o sistema precisa de uma regra para vencimento em dia não útil (parâmetro `vencimentoEmDiaNaoUtil`, a validar com o advogado). |
| 4 | — | O contrato de referência terminou em 21/07/2026. No piloto o locador já terá **contratos em andamento**: o MVP precisa importar contrato vigente (com caução já paga e odômetro atual), e não só criar contratos do zero. |

Os outros dois erros do contrato continuam válidos: "R$ 600,00 (seiscentos e
cinquenta reais)" (resolvido: `reaisPorExtenso` gera o extenso do mesmo
número) e a numeração que pula alíneas (resolvido na renderização do modelo).

## 2. Requisitos "M" do documento que a proposta não cobria

| Req. | O que pede | Como fica |
|---|---|---|
| RF-035 | Rescisão com multa compensatória calculada e abatimento da caução | **Entra no MVP** (semanas 10–11). A fórmula "menor entre 50% do saldo vincendo e o proporcional ao período não cumprido" é ambígua (proporcional a quê?). O advogado precisa defini-la antes da implementação. |
| RF-051 | Cartão de crédito como meio de pagamento | A proposta empurrou para a Fase 2. **Decisão sua.** Recomendo manter fora: aluguel semanal no cartão traz risco de chargeback, e o Pix cobre o público. |
| RF-006 / RNF-003 | Consentimento LGPD por finalidade (documentos, GPS, autoridades) | **Incluído.** Tabela `consentimentos`, com versão do texto, IP e dispositivo. |
| RF-020 | Locador publica o veículo com condições | Sem marketplace, isso vira a **oferta anexada ao convite**: valor, caução, franquia e prazo, vistos pelo motorista antes do cadastro. |
| RF-054 | Correção monetária, além de juros e multa | Juros e multa estão implementados. A correção depende de uma fonte para a série do índice (IGP-M/IPCA, por exemplo o SGS do Banco Central). Fica parametrizada e entra na semana 8. |
| RF-060 | Devolução da caução em até 30 **dias úteis** | Precisa de calendário de feriados. **Feito:** feriados nacionais e Páscoa calculada, com campo para feriados de MG e de Sete Lagoas cadastrados pelo locador. |
| RF-061 | Relatório financeiro **com exportação** | Incluído (CSV) nas semanas 10–11. |
| RF-073 | Check-in atrasado vira "infração grave" registrada | A proposta não previa registro de infrações contratuais. Fica como ação pendente/registro no histórico do contrato. A consequência continua sendo decisão humana. |
| RF-002 | Permissões do administrador (ex.: cobrar e notificar, mas não alterar valores) | Os papéis "Dono" e "Operador" cobrem o exemplo do documento: o operador cobra e notifica, mas não altera valores nem contratos. Permissões finas ficam para a Fase 2. |
| RF-110 | E-mail, além de push e WhatsApp | Incluído. O e-mail é o canal barato de prova para as notificações formais. |
| RF-045 | Demonstrativo de pendências na devolução | Já estava na vistoria de devolução. Agora está ligado ao encerramento e à devolução da caução. |

## 3. Requisitos não funcionais que faltavam na proposta

- **RNF-004/005/008 (LGPD):** direitos do titular, política de retenção e DPO. O
  contrato prevê cobrança em até 5 anos, então contrato, fotos e logs ficam
  guardados por pelo menos 5 anos após o encerramento. **O DPO precisa ser
  nomeado antes do piloto.**
- **RNF-031 (backup, RPO 24 h / RTO 4 h):** o plano Pro do Supabase tem backup
  diário. Precisamos agendar um teste de restauração antes do piloto.
- **RNF-042 (WCAG 2.1 AA)** e **RNF-052 (observabilidade):** Sentry e logs
  estruturados desde a semana 1.
- **RNF-050 (iOS):** o PWA funciona no iOS, mas o push só chega com o app
  instalado na tela inicial (iOS 16.4+). O cadastro precisa ter o passo
  "instalar o app". O impacto é pequeno, porque o público é majoritariamente
  Android.
- **RNF-053 (CI):** feito (`.github/workflows/ci.yml`: typecheck, testes e build).

## 4. Itens novos (não estavam no documento nem na proposta)

1. **CNH: usar a data da 1ª habilitação, não a de emissão.** A data de emissão
   muda a cada renovação, e quem usasse ela reprovaria motoristas experientes.
2. **CNH com observação EAR** ("Exerce Atividade Remunerada"): Uber e 99
   exigem. Incluído na pré-análise.
3. **Importação de contratos em andamento** (ver seção 1, item 4).
4. **Renovação simples no MVP:** com contratos de 3 meses, a renovação acontece
   já no piloto. O RF-034 é S, mas um "renovar com os mesmos parâmetros" é
   barato. O reajuste por IGP-M (a cada 12 meses) continua na Fase 2.
5. **Área de circulação sem rastreador:** a geolocalização dos check-ins já
   mostra se o carro está fora de Sete Lagoas/RMBH. Fica como alerta simples,
   antes do GPS da Fase 2.
6. **Cadastros externos levam tempo e precisam começar na semana 1:**
   verificação do WhatsApp Business pela Meta (com aprovação dos modelos de
   mensagem), conta Asaas da plataforma e KYC da subconta de cada locador, e
   sandbox do ZapSign.
7. **Taxas do provedor:** são cerca de 4,3 cobranças Pix por carro por mês.
   Precisa ficar definido quem paga a tarifa do Asaas (locador ou embutida na
   mensalidade).

## 5. Modelo de receita com R$ 250/carro/mês

- Um carro a R$ 600/semana rende cerca de R$ 2.600/mês ao locador, então a
  mensalidade equivale a **cerca de 9,6% do aluguel**. É um valor defensável se
  o produto reduzir a inadimplência e o trabalho manual de forma visível.
  Precisa ser validado na descoberta.
- **Recomendação: cobrar só por carro com contrato ativo**, e cobrar via
  **split automático** em cada Pix semanal (R$ 57,53 por semana cheia; ver `taxaPlataformaDoPeriodo`). A
  plataforma recebe sem emitir fatura e sem correr atrás do locador, e o
  dinheiro do aluguel continua indo direto para a subconta dele. Com isso o
  **RF-062 (split) passa de S para M.**
- Ponto a decidir: carro parado (sem contrato) paga? A recomendação é não. Isso
  alinha o incentivo e facilita a venda.

## 6. Itens do documento que continuam fora do MVP (decisão explícita)

Fase 2: RF-007, RF-011, RF-014, RF-015, RF-034 (reajuste), RF-037, RF-038,
RF-044, RF-055, RF-057, RF-058, RF-063, RF-068, RF-072, RF-074, RF-076,
RF-082, RF-084, RF-090 a RF-092, RF-100 a RF-102, RF-112, RF-122 e RF-123.
Durante o piloto, o suporte interno é feito com acesso auditado.

Fase 3 ou não fazer: RF-008, RF-021, RF-036, RF-069, RF-075, RF-077 (bloqueio
remoto: não fazer), RF-085, RF-093, RF-103, RF-104, RF-113 e RF-124.

Até a Fase 2, km excedente, lucros cessantes e multas de trânsito podem ser
lançados à mão como cobrança extra (RF-056), com justificativa e prova.

## 7. Pontos para o advogado (lista de entrada da semana 1)

1. Fórmula exata da multa rescisória (RF-035).
2. Vencimento em dia não útil: mantém a data ou prorroga?
3. Validade do aceite da vistoria e do check-in pelo app como prova.
4. Variações do modelo por tipo de locação, removendo as cláusulas herdadas
   (funcionários, minério, escolta, PJ).
5. Redação do que o app comunica sobre a "Proteção".
6. Texto do consentimento LGPD e base legal da geolocalização.
7. Requisitos locais para carro alugado em app: placa, seguro APP e documentos
   que Uber e 99 pedem.
8. Responsabilidade da plataforma (fornecedora de ferramenta) nos termos de uso.
9. Cláusula 1.2: notificações e cobranças feitas pelo app em nome do locador (a plataforma não é mandatária).
