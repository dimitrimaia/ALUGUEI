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

## 2. Login por código

**E-mail (funciona já):** Authentication → Emails → Templates → *Magic Link*.
Troque o corpo para mostrar o código em vez do link:

```html
<h2>Seu código do Aluguei</h2>
<p>Use este código para entrar: <strong>{{ .Token }}</strong></p>
<p>Ele vale por 1 hora.</p>
```

O envio de e-mail embutido do Supabase tem limite baixo (poucos por hora). Para o
piloto, configure um SMTP próprio (Authentication → Emails → SMTP), por exemplo Resend.

**Celular (SMS):** Authentication → Sign In / Providers → *Phone*: ligue e
escolha um provedor de SMS (Twilio, MessageBird, Vonage ou Textlocal). Precisa de
conta e créditos no provedor. Twilio Verify também permite enviar o código por WhatsApp.

## 3. URLs

Authentication → URL Configuration: *Site URL* = endereço do site em produção.
Em desenvolvimento, adicione `http://localhost:3000` em *Redirect URLs*.
