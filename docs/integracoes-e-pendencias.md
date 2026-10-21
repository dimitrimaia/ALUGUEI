# Integrações possíveis e o que falta

## Verificação do carro (placa e documento)

**O que já está feito:**
- **Placa** no formato antigo ou Mercosul.
- **RENAVAM** conferido pelo dígito verificador (pega erro de digitação).
- **CRLV** (foto ou PDF) enviado pelo locador na ficha do veículo e guardado no cofre
  de provas.
- A equipe do Aluguei confere o CRLV em `/admin/verificacoes`. Ver placa, RENAVAM,
  modelo, ano, cor e se o titular é o locador.
- Carro novo **só vai para a busca depois de verificado**. A busca mostra o selo
  "Verificado".
- Quem acessa a fila: os e-mails da variável `ADMINS` (separados por vírgula). Para
  qualquer outra pessoa, a página não existe.

**Para automatizar depois**, sem a conferência manual:

| Opção | O que faz | Custo |
|---|---|---|
| APIs de consulta de placa (ex.: API Placas, WDAPI, Consultar Placa) | Pela placa, devolvem modelo, ano, cor, município, situação de roubo/furto e FIPE | Centavos a poucos reais por consulta |
| SERPRO Consulta Veículo (dados do RENAVAM, oficial) | Dados oficiais do veículo, inclusive o proprietário | Contrato com o SERPRO, por consulta |
| QR Code do CRLV-e | O CRLV digital tem QR Code que abre a validação no site do governo | Grátis, conferência manual |

Sugestão: manter a conferência manual no piloto e ligar uma API de placa quando
houver volume. O adaptador entra em `src/integracoes/`, como o do Asaas.

## Verificação de documentos do motorista (CNH, identidade, rosto)

Hoje: o motorista envia as fotos da CNH e dos documentos no cadastro. O app confere a
CNH pela regra (1ª habilitação, observação EAR), e o locador analisa.

Para automatizar:

| Opção | O que faz | Custo |
|---|---|---|
| SERPRO Datavalid | Compara nome, CPF, CNH e a selfie com a base oficial (Denatran e TSE) | Por consulta, contrato com o SERPRO |
| unico, idwall, CAF, Serasa Identidade | Validação de documento e prova de vida (selfie) prontas para app | Por consulta, a partir de ~R$ 1 |
| Consulta de CPF na Receita | Só confirma CPF e nome | Barato ou grátis (limitado) |

Sugestão para o piloto: uma dessas com selfie e prova de vida, chamada no fim do
cadastro. É o que mais reduz fraude e golpe de carro.

## Rastreador

Dá para integrar. O caminho depende do rastreador:

1. **Rastreador com plataforma da empresa** (Getrak, Positron, Ituran, Sascar e
   similares): quase todas têm uma **API** para parceiros. Pedimos o acesso à empresa
   do rastreador do locador e mostramos no app a posição, a velocidade e os alertas
   (ignição, cerca virtual).
2. **Rastreador "genérico"** (modelos chineses comuns, como Coban, Concox, Suntech):
   eles mandam a posição para um servidor configurável. Usamos o **Traccar**, um
   servidor de rastreamento de código aberto e grátis, numa máquina pequena (uns
   R$ 30/mês). O app lê a posição pela API do Traccar.

No app:
- **Locador**: mapa do carro, último ponto e alerta de saída da área permitida
  (cláusula de circulação do contrato).
- **Motorista**: o botão **Emergência** (já feito) liga para 190, 192 e 193 e
  manda a localização do celular pelo WhatsApp. Funciona sem rastreador.
- **Bloqueio remoto** continua fora (decisão RF-077): risco jurídico e de acidente.
  Fica só com a empresa do rastreador, acionada pelo locador.

Antes de ligar: o motorista precisa concordar no contrato com o rastreamento
(LGPD, consentimento de geolocalização já previsto).

## Receber pagamentos sem custo

- **Pix direto (feito):** em Recebimentos, o locador cadastra a própria chave Pix.
  - O motorista paga por um QR Code gerado pelo app (padrão do Banco Central, em
    `src/dominio/pix/brcode.ts`) e toca em "Já paguei".
  - O locador confere no banco e dá baixa no Financeiro.
  - Custo zero, mas sem baixa automática e sem split.
  - Nesse modo, a mensalidade da plataforma precisa ser cobrada à parte (ainda a fazer).
- **Pix com baixa automática e baixo custo:** a API Pix de bancos como Inter
  (conta PJ) e Efí manda um aviso a cada Pix recebido. Dá para ligar a baixa
  automática sem o Asaas. Custo baixo ou zero.
  - **Quem paga** pode usar qualquer banco: o QR Code é o padrão do Banco Central.
  - **Quem recebe** (o locador) precisa de conta no banco integrado. Cada banco tem
    a sua API e o seu cadastro (certificado digital, chave da API).
  - Para "todos os bancos", o caminho é um intermediário (Asaas, Efí, Mercado Pago)
    ou o Open Finance. Este último ainda não oferece aviso de Pix recebido para
    qualquer conta.
- **Asaas (atual):** baixa automática e split, com tarifa por Pix recebido.

## SMS sem custo

Não existe SMS grátis de verdade: toda operadora cobra por mensagem. As alternativas:
- **Código por e-mail** (já é o padrão): grátis.
- **WhatsApp Cloud API (Meta)**: barato. Mensagens de serviço dentro de 24 h da
  última mensagem do cliente são grátis. Os avisos de pagamento usam modelos
  aprovados, a poucos centavos cada. É o canal certo para o motorista.
- **Firebase Phone Auth**: tem uma cota grátis pequena por dia; depois cobra por SMS.

Sugestão: e-mail para login e WhatsApp para avisos. SMS só como reserva.

## O que falta no projeto (revisão geral)

**Para o piloto:**
1. ~~Check-in semanal~~ (feito, ver `checkin.md`).
2. **Notificações**: lembrete de vencimento, mensagem nova no chat e aviso de atraso,
   por WhatsApp, e-mail e push.
3. **Devolução e encerramento**: vistoria de saída, demonstrativo de pendências,
   devolução da caução e rescisão (precisa da fórmula do advogado).
4. **Verificação de identidade do motorista** (ver acima).
5. **Asaas**: pedir a homologação das subcontas, ou usar o Pix direto no início.
6. **Termos de uso e política de privacidade** revisados pelo advogado, e o DPO nomeado.
7. **Mensalidade da plataforma** para quem usa Pix direto (fatura mensal por carro alugado).

**Qualidade:**
- Monitoramento de erros (Sentry) e logs.
- Testes de ponta a ponta automáticos no CI (hoje rodam à mão).
- Região da Vercel igual à do Supabase (velocidade).
- Limpar os dados de teste do banco antes do piloto.
