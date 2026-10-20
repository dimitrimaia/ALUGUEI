# Hospedagem e domínio

## Recomendação: Vercel (plano Pro) para o app

- É a plataforma do Next.js: deploy a cada push no GitHub, HTTPS automático, prévia por branch.
- Região **gru1 (São Paulo)**, ao lado do Supabase (sa-east-1). Já configurado em `vercel.json`.
- Uso comercial exige o plano **Pro (US$ 20/mês por pessoa)**. O plano grátis (Hobby) não permite uso comercial.
- Fotos e vídeos vão direto do celular para o Supabase Storage (URL assinada). Isso evita o limite de
  4,5 MB por requisição das funções da Vercel.

### Hospedagem própria

Serve para o app **só se for um servidor (VPS) com Node.js 22**, rodando `pnpm build && pnpm start`
atrás de um proxy com HTTPS (Caddy ou Nginx), com reinício automático (pm2 ou Docker).
Hospedagem compartilhada (cPanel/PHP) não roda Next.js. Ela pode continuar com e-mail do domínio
ou um blog.

## Passo a passo na Vercel

1. vercel.com → *Add New Project* → importar `dimitrimaia/aluguei`.
2. *Environment Variables* (Production e Preview):
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`
   - `ASAAS_API_URL`, `ASAAS_API_KEY` (com ou sem o `$` inicial), `ASAAS_WALLET_ID_PLATAFORMA`, `ASAAS_WEBHOOK_TOKEN`
   - `CHAVE_CIFRA`: 64 caracteres hex; cifra as chaves das subcontas. **Nunca troque depois de criada**,
     ou as subcontas existentes ficam ilegíveis.
   - `CRON_SECRET`: a Vercel envia no cabeçalho da rotina diária (`/api/cron/diario`, 06:00).
   - `NEXT_PUBLIC_SITE_URL` = `https://seudominio.com.br` (quando o domínio estiver ligado)
3. *Deploy*.
4. *Settings → Domains*: adicionar `seudominio.com.br` e `www.seudominio.com.br`.
   No painel do registro do domínio (Registro.br ou outro):
   - apex (`@`): registro **A** → `76.76.21.21`
   - `www`: registro **CNAME** → `cname.vercel-dns.com`
   (A Vercel mostra os valores exatos ao adicionar o domínio.)
5. No Supabase: *Authentication → URL Configuration* → *Site URL* = `https://seudominio.com.br`.

## E-mail do domínio

O código de login por e-mail sai hoje pelo e-mail embutido do Supabase, que tem limite baixo.
Com o domínio, configure um SMTP (por exemplo, Resend, com `nao-responda@seudominio.com.br`) em
*Authentication → Emails → SMTP*. Isso exige registros DNS (SPF/DKIM) que o próprio provedor indica.
