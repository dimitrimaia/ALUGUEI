# Hospedagem e domínio

Domínio: **aluguei.xyz** (DNS na Vercel). E-mail de login: Resend (domínio verificado).

## Recomendação: Vercel (plano Pro) para o app

- É a plataforma do Next.js: deploy a cada push no GitHub, HTTPS automático, prévia por branch.
- Região **iad1 (Washington, EUA)**, a mesma do banco do Supabase (us-east-1, Virgínia do Norte). Cada tela faz várias consultas ao banco: com as funções do lado do banco, cada consulta leva ~2 ms em vez de ~120 ms. Configurado em `vercel.json`.
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
   - `ADMINS`: e-mails da equipe do Aluguei, separados por vírgula (acesso a `/admin/verificacoes`).
   - `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`: notificação no celular (ver `notificacoes.md`).
   - `RESEND_API_KEY`: e-mails de aviso pelo Resend.
   - `ANTHROPIC_API_KEY`: assistente do suporte (Claude). Opcionais: `SUPORTE_MODELO`, `SUPORTE_ESFORCO` e `SUPORTE_AGENTE=desligado` (ver `suporte.md`).
   - `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_APP_SECRET`, `WHATSAPP_VERIFY_TOKEN`: suporte pelo WhatsApp (ver `whatsapp.md`).
   - `NEXT_PUBLIC_SITE_URL` = `https://aluguei.xyz` (só em Production; nas prévias o app usa o endereço acessado)
3. *Deploy*.
4. *Settings → Domains*: adicionar `seudominio.com.br` e `www.seudominio.com.br`.
   No painel do registro do domínio (Registro.br ou outro):
   - apex (`@`): registro **A** → `76.76.21.21`
   - `www`: registro **CNAME** → `cname.vercel-dns.com`
   (A Vercel mostra os valores exatos ao adicionar o domínio.)
5. No Supabase: *Authentication → URL Configuration* → *Site URL* = `https://aluguei.xyz`;
   *Redirect URLs*: `https://aluguei.xyz/**`, `https://www.aluguei.xyz/**` e `https://*.vercel.app/**`.

## E-mail do domínio

O código de login por e-mail sai hoje pelo e-mail embutido do Supabase, que tem limite baixo.
Com o domínio, configure um SMTP (por exemplo, Resend, com `nao-responda@seudominio.com.br`) em
*Authentication → Emails → SMTP*. Isso exige registros DNS (SPF/DKIM) que o próprio provedor indica.
