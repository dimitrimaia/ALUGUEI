# Suporte pelo WhatsApp

A pessoa manda mensagem para o número do Aluguei no WhatsApp. O mesmo assistente do
chat do app responde por lá, e a equipe vê e responde a conversa em `/admin/suporte`
(aparece como "WhatsApp · +55…"). A resposta da equipe também sai pelo WhatsApp.

## Como funciona

1. A Meta manda cada mensagem recebida para `POST /api/webhooks/whatsapp`.
2. O servidor confere a assinatura (`X-Hub-Signature-256`, feita com a chave secreta
   do app) e ignora mensagem repetida (`webhook_eventos`).
3. O número é procurado nas contas com **celular confirmado** (função
   `usuario_por_telefone`, testa com e sem o 9). Achou: o assistente pode ver os
   dados da conta, como no app. Não achou: ele só tira dúvidas gerais e orienta a
   confirmar o celular em Conta → Dados pessoais.
4. A mensagem entra no atendimento aberto daquele número (ou abre um novo).
5. O assistente responde, a mensagem fica marcada como lida (os dois tiques azuis)
   e a resposta vai pelo WhatsApp em texto simples (`*negrito*`, sem títulos).
6. Se ele transferir, a equipe recebe o e-mail e responde pelo painel.

**Janela de 24 h:** a Meta só deixa mandar texto livre até 24 h depois da última
mensagem da pessoa. Depois disso, só com um **modelo aprovado** (template). Se a
equipe responder fora da janela, o painel mostra "Não foi entregue no WhatsApp".

**Só texto por enquanto:** áudio, foto e figurinha recebem a resposta "Por enquanto
eu só consigo ler mensagens de texto".

## Passo a passo na Meta

### 1. Conta e app

1. Tenha um **Portfólio empresarial** (Business Manager) em business.facebook.com.
   Se não tiver, crie com os dados da empresa.
2. Entre em **developers.facebook.com** → **Meus apps** → **Criar app**.
   - Caso de uso: **Outro** → tipo **Empresa** (Business).
   - Nome: "Aluguei Suporte". Ligue ao portfólio empresarial.
3. No painel do app, em **Adicionar produtos**, escolha **WhatsApp → Configurar**.

### 2. Testar com o número de teste

1. Em **WhatsApp → Configuração da API** (API Setup), a Meta já dá um **número de
   teste** e um token temporário (vale 24 h).
2. Em "Para", cadastre o seu celular (recebe um código) — o número de teste só
   conversa com até 5 números cadastrados.
3. Anote o **Identificador do número de telefone** (Phone number ID). É o
   `WHATSAPP_PHONE_NUMBER_ID`.

### 3. Token permanente

O token da tela de teste expira. Para produção:

1. business.facebook.com → **Configurações** → **Usuários → Usuários do sistema** →
   **Adicionar**. Nome "aluguei-api", função **Admin**.
2. **Atribuir ativos**: o app "Aluguei Suporte" (controle total) e a conta do
   WhatsApp (controle total).
3. **Gerar novo token**: escolha o app, validade **Nunca**, permissões
   `whatsapp_business_messaging` e `whatsapp_business_management`.
4. Copie o token. É o `WHATSAPP_TOKEN`.

### 4. Chave secreta do app

developers.facebook.com → o app → **Configurações do app → Básico** → **Chave
secreta do app** → Mostrar. É o `WHATSAPP_APP_SECRET` (usado para conferir que a
mensagem veio mesmo da Meta).

### 5. Variáveis na Vercel

Settings → Environment Variables (Production), e depois **Redeploy**:

| Variável | Valor |
|---|---|
| `WHATSAPP_TOKEN` | token permanente do usuário do sistema |
| `WHATSAPP_PHONE_NUMBER_ID` | identificador do número |
| `WHATSAPP_APP_SECRET` | chave secreta do app |
| `WHATSAPP_VERIFY_TOKEN` | uma senha que você inventa (ex.: 30 letras e números aleatórios) |
| `ANTHROPIC_API_KEY` | a do assistente (ver `suporte.md`) |

Rode também a migração `supabase/migracoes/0007_low_baron_zemo.sql` no SQL Editor.

### 6. Webhook

Depois do redeploy, em developers.facebook.com → **WhatsApp → Configuração**:

1. **Webhook → Editar**:
   - URL de retorno: `https://aluguei.xyz/api/webhooks/whatsapp`
   - Token de verificação: o mesmo `WHATSAPP_VERIFY_TOKEN`.
   - **Verificar e salvar**. Se der erro, o redeploy ainda não terminou ou o token
     está diferente.
2. Em **Campos do webhook**, assine **messages**.
3. Mande "oi" do seu celular para o número de teste. O assistente responde, e a
   conversa aparece em `/admin/suporte`.

### 7. Número de verdade

1. **WhatsApp → Configuração da API → Adicionar número de telefone**. Use um número
   que **não** esteja no WhatsApp do celular (ou apague a conta dele antes). Pode
   ser um chip novo ou fixo; a confirmação é por SMS ou ligação.
2. Nome de exibição: "Aluguei" (a Meta aprova).
3. **Verificação da empresa** no portfólio (CNPJ e documento): sem ela, o limite é
   baixo de conversas iniciadas pela empresa. Atender quem escreve funciona antes.
4. Cadastre uma forma de pagamento em **Configurações → Pagamentos** do WhatsApp.
5. Troque o `WHATSAPP_PHONE_NUMBER_ID` na Vercel pelo do número novo e faça redeploy.

## Custo

- **Responder quem escreveu** (dentro das 24 h): grátis na Meta. Paga só o
  assistente (alguns centavos de real por conversa com o Haiku).
- **Mensagens iniciadas pela empresa** (lembrete de vencimento, aviso de atraso):
  cobradas por mensagem com modelo aprovado, categoria utilidade, centavos cada.
  Ainda não ligadas aqui; o envio de modelo já existe (`enviarModeloWhatsApp`).

## Para usar em outro projeto

O módulo foi feito para ser copiado. Os três pedaços:

| Arquivo | O que é | Depende de |
|---|---|---|
| `src/dominio/whatsapp/mensagens.ts` (+ teste) | Lê o corpo do webhook, variações do número BR, janela de 24 h, markdown → WhatsApp | nada |
| `src/integracoes/whatsapp.ts` | Assinatura, enviar texto, enviar modelo, marcar como lida | só `fetch` e `crypto` do Node |
| `src/app/api/webhooks/whatsapp/route.ts` | O webhook (GET de verificação, POST das mensagens) | o banco deste projeto |

E o agente (`src/lib/agente-suporte.ts`) mostra o padrão:

1. Guardar cada mensagem num histórico (aqui, `mensagens_suporte`).
2. Montar o histórico para o modelo (`historicoParaModelo`: alterna pessoa e
   assistente, junta mensagens seguidas).
3. Chamar o Claude com instruções fixas (em cache), ferramentas **só de leitura**
   presas a quem está falando, e o contexto do momento numa mensagem de sistema.
4. Repetir enquanto o modelo pedir ferramenta (até 6 voltas).
5. Mandar a resposta pelo canal (`enviarTextoWhatsApp(telefone, texto)`).
6. Sempre ter uma saída para pessoa: ferramenta `transferir_para_equipe`, e qualquer
   erro ou recusa também transfere.

No outro projeto, troque as ferramentas e as instruções; o resto se reaproveita.
Use um número de WhatsApp e um app da Meta para cada projeto (cada app tem o seu
webhook).
