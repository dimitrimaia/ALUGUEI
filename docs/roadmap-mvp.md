# Roadmap do MVP (12 semanas, piloto em modo assistido)

Cada entrega aponta os requisitos do documento v0.1 que ela cobre. Um
requisito "M" que não aparece aqui está listado com sua decisão em
[revisao-requisitos.md](revisao-requisitos.md).

## Trilha paralela (semanas 1–3): descoberta e cadastros externos

- [ ] Entrevistar 5 a 10 locadores e 10 a 15 motoristas, e acompanhar o fluxo manual do locador piloto.
- [ ] Medir a linha de base das métricas (tempo do locador por carro/semana, inadimplência acima de 5 dias, check-ins no prazo).
- [x] Preço: R$ 250/carro com contrato ativo, por split semanal proporcional (ver decisoes.md).
- [ ] Confirmar com o Asaas: split por valor fixo, tarifa do Pix e baixa manual.
- [ ] Mandar ao advogado o modelo de contrato e a lista de pontos da revisão (seção 7).
- [ ] Abrir as contas: Asaas (plataforma + subconta do piloto), ZapSign (sandbox), Meta WhatsApp Business (verificação + modelos).
- [ ] Nomear o DPO e redigir a política de privacidade e os termos de uso.

## Semana 1: fundação

- [x] Estrutura do repositório, CI, schema inicial e regras de domínio com testes.
- [x] Projeto Supabase criado.
- [x] Visual: sistema de design, painel responsivo (menu lateral / abas no celular), página inicial, tema escuro, app instalável (PWA).
- [ ] Deploy (Vercel, região gru1), Sentry.
- [x] Login por código (OTP) por celular ou e-mail (RF-001), com proteção de /painel e /m.
- [ ] Aplicar migrações e RLS no projeto (`pnpm db:preparar`) e ligar o provedor de SMS.
- [ ] Protótipo navegável das telas do motorista e do locador.

## Semanas 2–4: pessoas, frota e entrada do motorista

- [x] Conta do locador com papel Dono (RF-002). Convidar operador: falta.
- [x] Veículos: cadastro, status e ficha com histórico de km (RF-010, RF-012; RF-013 cresce com contratos e manutenção).
- [x] Convite por link no WhatsApp com a oferta: valor, caução, franquia e prazo (RF-023, RF-020).
- [x] Cadastro do motorista: dados, CNH, documento e print do app (RF-003, RF-005).
- [x] Consentimentos LGPD por finalidade (RF-006).
- [x] Pré-análise automática: idade, 1ª habilitação, validade e EAR (RF-004).
- [x] Fila de análise com decisão e motivo (RF-022).
- [ ] Importação de contrato em andamento.

## Semanas 5–6: contrato e entrega

- [x] Modelo versionado, parâmetros congelados na assinatura (RF-030, RF-033).
- [x] PDF gerado do modelo, com extenso automático e numeração automática (RF-031).
- [x] Resumo "sem juridiquês" antes de assinar (RNF-041).
- [x] Assinatura eletrônica no próprio app, com aceite, hash do PDF, IP e dispositivo no cofre (RF-032, RNF-011, RNF-012). ZapSign fica como opção depois.
- [x] Cofre de provas: upload com hash, hora do servidor, geolocalização e dispositivo (RNF-010).
- [x] Vistoria de entrega guiada: checklist, fotos com carimbo de data/hora/local, odômetro, combustível e aceite do motorista (RF-040 a RF-043).

## Semanas 7–9: dinheiro e régua

- [x] Agenda de obrigações gerada na assinatura (já implementada em `gerarAgenda`).
- [x] Cobrança semanal Pix na subconta do locador, com split da mensalidade (RF-050, RF-051 só Pix, RF-062).
- [x] Webhook com deduplicação, baixa automática e conciliação diária (RF-052, RNF-033).
- [ ] Multa, juros (já implementados) e correção monetária (RF-054).
- [x] Caução: parcelas cobradas no Pix e saldo pago no extrato (RF-053). Uso e devolução: falta.
- [ ] Cobrança extra com justificativa, anexos e fila de aprovação do modo assistido (RF-056).
- [x] Extrato do motorista (RF-059).
- [ ] Lembretes, notificação formal com 24 h e sugestão de rescisão para decisão humana (RF-065, RF-066, RF-067).
- [ ] Notificações guardadas com status de entrega e leitura em app, push, WhatsApp e e-mail (RF-110, RF-111).

## Semanas 10–11: rotina semanal, encerramento e painéis

- [ ] Check-in de segunda: câmera guiada, galeria bloqueada, upload resiliente (RF-070, RF-071, RNF-021).
- [ ] Escalonamento do check-in atrasado e registro de infração (RF-073).
- [ ] Linha do tempo de km, plano de manutenção, alertas de revisão e registro de manutenção (RF-080, RF-081, RF-083).
- [ ] Alerta de check-in fora da área de circulação.
- [ ] Vistoria de devolução e demonstrativo de pendências (RF-045).
- [ ] Encerramento e rescisão com multa calculada (RF-035), devolução da caução em dias úteis (RF-060).
- [ ] Renovação com os mesmos parâmetros.
- [x] Relatório financeiro com CSV (RF-061).
- [ ] Painéis do locador e do motorista com km e check-in (RF-120, RF-121).

## Semana 12: piloto

- [ ] Teste de restauração de backup (RNF-031).
- [ ] Piloto com o locador do contrato, em modo assistido.
- [ ] Comparar as métricas com a linha de base.

**Risco de prazo:** as semanas 7–9 e 10–11 estão cheias. Se atrasar, o
primeiro corte é a renovação e o alerta de área,.

## Antecipado: busca de carros e chat

Ver [marketplace-chat.md](marketplace-chat.md).

- [x] Anúncios com fotos, cidade e condições; pausar e reativar (RF-020).
- [x] Busca pública por cidade em /carros e página do anúncio (RF-021).
- [x] "Tenho interesse" abre conversa; chat em tempo real dos dois lados (RF-113).
- [x] "Enviar convite" na conversa, já ligado à conta do motorista.
- [ ] Notificação de mensagem nova (push e WhatsApp).
- [ ] Filtros por preço e categoria; denúncia e moderação.
