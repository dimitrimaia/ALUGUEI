# Aluguei

Gestão de locação de veículos para o pequeno locador (de 1 a 30 carros) que
aluga por semana para motoristas de Uber/99. O motorista entra por convite;
o marketplace fica para a Fase 3.

- **Locador:** painel web com cobrança, check-ins, vistorias, manutenção e caução.
- **Motorista:** PWA no celular para cadastro, assinatura, Pix, check-in de segunda e extrato.
- **Dinheiro:** o Pix cai na subconta do locador. A plataforma não guarda dinheiro e recebe a mensalidade por split.

## Documentos

- [Revisão dos requisitos](docs/revisao-requisitos.md): o que faltava na proposta, correções e decisões em aberto
- [Roadmap do MVP](docs/roadmap-mvp.md): 12 semanas, com rastreio dos requisitos
- [Decisões de produto](docs/decisoes.md): Pix, PWA, mensalidade por split, o app como administrador
- [Configurar o Supabase](docs/configurar-supabase.md): banco, login por código, SMS
- [Arquitetura](docs/arquitetura.md): os quatro pilares e as camadas

## Stack

Next.js 16 (painel + PWA) · Supabase (Postgres, Auth OTP, Storage, região São Paulo) ·
Drizzle · Inngest · Asaas · ZapSign · WhatsApp Cloud API · Vitest

## Como rodar

```bash
pnpm install
cp .env.example .env.local   # preencha as chaves
pnpm dev                     # http://localhost:3000
pnpm test                    # regras de domínio
pnpm typecheck
pnpm db:generate             # gera migração a partir do schema
pnpm db:preparar             # aplica migrações + RLS no banco de DATABASE_URL
```
