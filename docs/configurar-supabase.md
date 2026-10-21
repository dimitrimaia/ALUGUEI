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

Os botões apontam para o **nosso domínio** (`aluguei.xyz/auth/confirmar`), não para
`supabase.co`. E-mail enviado por `aluguei.xyz` com link para outro domínio é um dos
sinais que mais levam ao spam. O `token_hash` é validado pela tela de confirmação e
funciona em qualquer navegador.

Troque só o `href` do botão de cada modelo:

| Modelo | `href` do botão |
|---|---|
| Magic Link | `{{ .SiteURL }}/auth/confirmar?token_hash={{ .TokenHash }}&type=magiclink&next={{ .RedirectTo }}` |
| Confirm signup | `{{ .SiteURL }}/auth/confirmar?token_hash={{ .TokenHash }}&type=signup&next={{ .RedirectTo }}` |
| Reset Password | `{{ .SiteURL }}/auth/confirmar?token_hash={{ .TokenHash }}&type=recovery` |
| Change Email Address | `{{ .SiteURL }}/auth/confirmar?token_hash={{ .TokenHash }}&type=email_change&next={{ .RedirectTo }}` |

Exemplo completo do **Magic Link** (assunto: `Seu código para entrar no Aluguei`):

```html
<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;color:#0b1630">
  <p style="font-size:20px;font-weight:bold;color:#1f56e8;letter-spacing:2px">ALUGUEI</p>
  <p>Olá! Use este código para entrar no Aluguei:</p>
  <p style="font-size:32px;font-weight:bold;letter-spacing:8px;margin:16px 0">{{ .Token }}</p>
  <p>Ou toque no botão:</p>
  <p><a href="{{ .SiteURL }}/auth/confirmar?token_hash={{ .TokenHash }}&type=magiclink&next={{ .RedirectTo }}" style="display:inline-block;background:#1f56e8;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:bold">Entrar no Aluguei</a></p>
  <p style="color:#5b6880;font-size:13px">O código e o link valem por 1 hora e uma vez só. Se você não pediu, ignore este e-mail.</p>
  <p style="color:#5b6880;font-size:12px">Aluguei · aluguei.xyz</p>
</div>
```

Os outros três seguem o mesmo modelo, com o texto e o `href` da tabela.

### Para o e-mail não cair no spam

1. **DMARC**: no DNS do domínio, crie um registro TXT `_dmarc` com
   `v=DMARC1; p=none; rua=mailto:dmarc@aluguei.xyz`. Gmail e Yahoo cobram DMARC de
   quem envia. O SPF e o DKIM do Resend você já verificou.
2. **Remetente**: em Authentication → Emails → SMTP, use o nome `Aluguei` e o
   endereço `nao-responda@aluguei.xyz` (o mesmo domínio verificado no Resend).
3. **Links do mesmo domínio**: os modelos acima.
4. **Domínio novo** leva algumas semanas para ganhar reputação. Nos primeiros envios,
   peça para quem recebeu marcar "Não é spam": isso ensina o Gmail.
5. Confira a nota em [mail-tester.com](https://www.mail-tester.com): mande um código
   para o endereço que ele mostra e veja o que falta.

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
