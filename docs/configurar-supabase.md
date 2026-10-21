# Configurar o Supabase

Projeto: `wwmehpiomzfflticagmx`. As chaves ficam só no `.env.local`, que não vai para o Git.

## 1. Banco

Com conexão direta ao banco:

```bash
pnpm db:preparar   # migrações do Drizzle + supabase/rls.sql
```

Sem conexão direta (ex.: ambiente na nuvem que só libera HTTPS): rode
`pnpm db:setup-sql` e cole `supabase/setup.sql` no **SQL Editor** do Supabase.
O arquivo registra as migrações como aplicadas, então o `db:migrate` continua funcionando depois.

Se a senha do banco tiver `&` ou `+`, codifique na `DATABASE_URL` (`&` vira `%26`, `+` vira `%2B`).
A conexão direta (`db.<projeto>.supabase.co:5432`) usa só IPv6; se a sua rede
não tiver IPv6, use a URL do **Session pooler** (Project Settings → Database → Connect).

## 2. Login e e-mails

O app tem três jeitos de entrar: **e-mail e senha**, **código no e-mail** e
**código por SMS**. Criar conta e "Esqueci a senha" mandam um link por e-mail.

### Como os links funcionam

Os pedidos de e-mail saem por um cliente de **fluxo implícito**
(`src/lib/supabase/links.ts`). O Supabase valida o link no servidor dele e devolve a
sessão para `/auth/confirmar`, que grava a sessão e segue para a tela certa
(`/nova-senha` na recuperação de senha). Por isso o link funciona **em qualquer
navegador**: no app do Gmail, em outro celular, no computador.

> Antes usávamos o fluxo PKCE, em que o link só funciona no mesmo navegador que
> pediu. Quem abria o e-mail no app do Gmail via "link expirou". Era esse o erro do
> login por código e da recuperação de senha.

Cada link e cada código valem **uma vez** e só o **último** pedido vale. O Supabase
também recusa um novo e-mail para o mesmo endereço em menos de 60 s; a tela mostra
a contagem para reenviar.

### Modelos de e-mail (Authentication → Emails → Templates)

Cole os modelos abaixo. Eles mostram o código **e** o link, em português. O
`{{ .ConfirmationURL }}` já aponta para o endereço certo; não troque por outro.

**Magic Link** (assunto: `Seu código para entrar no Aluguei`):

```html
<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;color:#0b1630">
  <p style="font-size:20px;font-weight:bold;color:#1f56e8;letter-spacing:2px">ALUGUEI</p>
  <p>Use este código para entrar:</p>
  <p style="font-size:32px;font-weight:bold;letter-spacing:8px;margin:16px 0">{{ .Token }}</p>
  <p>Ou toque no botão:</p>
  <p><a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#1f56e8;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:bold">Entrar no Aluguei</a></p>
  <p style="color:#5b6880;font-size:13px">O código e o link valem por 1 hora e uma vez só. Se você não pediu, ignore este e-mail.</p>
</div>
```

**Confirm signup** (assunto: `Confirme seu e-mail no Aluguei`): o mesmo modelo, com
o texto "Confirme seu e-mail para ativar a conta", o código `{{ .Token }}` e o
botão "Confirmar e-mail" em `{{ .ConfirmationURL }}`.

**Reset Password** (assunto: `Criar senha nova no Aluguei`):

```html
<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;color:#0b1630">
  <p style="font-size:20px;font-weight:bold;color:#1f56e8;letter-spacing:2px">ALUGUEI</p>
  <p>Recebemos um pedido para criar uma senha nova para a sua conta.</p>
  <p><a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#1f56e8;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:bold">Criar senha nova</a></p>
  <p style="color:#5b6880;font-size:13px">O link vale por 1 hora e uma vez só. Se você não pediu, ignore: sua senha continua a mesma.</p>
</div>
```

**Change Email Address** (assunto: `Confirme seu novo e-mail no Aluguei`): o mesmo
modelo, com o botão "Confirmar novo e-mail" em `{{ .ConfirmationURL }}`.

O envio usa o SMTP próprio (Resend, domínio `aluguei.xyz`), configurado em
Authentication → Emails → SMTP. O envio embutido do Supabase só manda poucos e-mails
por hora.

**Celular (SMS):** Authentication → Sign In / Providers → *Phone*: ligue e
escolha um provedor de SMS (Twilio, MessageBird, Vonage ou Textlocal). Precisa de
conta e créditos no provedor. Twilio Verify também permite enviar o código por WhatsApp.

## 3. URLs

Authentication → URL Configuration:

- *Site URL*: `https://aluguei.xyz`
- *Redirect URLs*: `https://aluguei.xyz/**`, `https://www.aluguei.xyz/**`,
  `https://*.vercel.app/**` e, em desenvolvimento, `http://localhost:3000/**`.

Se um endereço de volta não estiver na lista, o Supabase manda o link para a *Site
URL*; a página inicial percebe e encaminha para `/auth/confirmar`.

## 4. Fotos de perfil

O bucket público `avatares` é criado sozinho na primeira foto enviada (limite de
2 MB; JPEG, PNG ou WebP). Cada foto fica em `avatares/<id do usuário>/`. A foto
anterior é apagada quando a pessoa troca.
