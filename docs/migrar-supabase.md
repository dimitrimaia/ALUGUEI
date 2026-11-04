# Migrar o Supabase para outra região

O projeto foi criado nos Estados Unidos (NA). Como o servidor da Vercel e os
motoristas estão no Brasil, cada consulta atravessa o continente. Migrar para
**South America (São Paulo)** deixa as telas mais rápidas.

O Supabase não muda a região de um projeto existente: cria-se um projeto novo em
São Paulo e copia-se tudo para ele. O workflow **Migrar Supabase** do GitHub
Actions faz a cópia; dá para fazer tudo pelo celular.

O que vai junto: tabelas, dados, contas de login (com as senhas) e arquivos (fotos
de vistoria e check-in, avatares, anúncios, APK). O que não vai, e você refaz no
painel novo: configurações de Auth (URLs, SMTP, modelos de e-mail) e as chaves.

**Todos vão precisar entrar de novo** (as sessões são do projeto antigo). Escolha
um horário calmo; leva uns 30 a 60 minutos no total.

## 1. Criar o projeto novo

1. supabase.com → **New project**, mesma organização.
2. Nome: `aluguei-sp`. **Region: South America (São Paulo)**. Crie uma senha
   forte para o banco e guarde.
3. Espere ficar pronto (uns 2 minutos). **Não crie tabelas**: o projeto novo tem
   que estar vazio.

## 2. Pegar os endereços dos dois projetos

Em cada projeto (antigo e novo):

- **Connect** (botão no topo) → **Session pooler** → copie a URI
  (`postgresql://postgres.xxxx:[SENHA]@aws-0-...pooler.supabase.com:5432/postgres`)
  e troque `[SENHA]` pela senha do banco daquele projeto. Use o **Session pooler**:
  o endereço direto (`db.xxxx.supabase.co`) não funciona no GitHub.
- **Project Settings → API Keys**: a **secret key** (`sb_secret_...`) e, em
  **Data API**, a **URL** do projeto (`https://xxxx.supabase.co`).

## 3. Cadastrar os segredos da migração

GitHub → repositório ALUGUEI → **Settings → Secrets and variables → Actions →
New repository secret**:

| Nome | Valor |
|---|---|
| `MIGRAR_ORIGEM_DB_URL` | URI do Session pooler do projeto **antigo** |
| `MIGRAR_DESTINO_DB_URL` | URI do Session pooler do projeto **novo** |
| `MIGRAR_ORIGEM_URL` | URL do projeto antigo |
| `MIGRAR_ORIGEM_CHAVE` | secret key do projeto antigo |
| `MIGRAR_DESTINO_URL` | URL do projeto novo |
| `MIGRAR_DESTINO_CHAVE` | secret key do projeto novo |

## 4. Rodar a cópia

GitHub → **Actions → Migrar Supabase → Run workflow**, digite `MIGRAR` e
confirme. Ele copia o banco e depois os arquivos. Ficou verde: deu certo. Ficou
vermelho: abra o passo que falhou e me mande o erro (dá para rodar de novo depois
de limpar o projeto novo: Database → Tables, ou recriar o projeto).

## 5. Configurar o projeto novo

No painel do projeto **novo**:

1. **Authentication → URL Configuration**: Site URL `https://aluguei.xyz` e, em
   Redirect URLs, as mesmas do projeto antigo (copie de lá).
2. **Authentication → Emails / SMTP**: mesmo SMTP e mesmos modelos de e-mail do
   antigo (copie o texto de cada modelo).
3. **Authentication → Sign In / Providers**: as mesmas opções ligadas (e-mail,
   celular, confirmação de e-mail).

## 6. Trocar as chaves no app

1. **Vercel → Settings → Environment Variables** (Production), troque pelos
   valores do projeto novo e faça **Redeploy**:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (API Keys → publishable)
   - `SUPABASE_SECRET_KEY`
   - `DATABASE_URL` (a URI do Session pooler do novo)
2. **GitHub → Secrets**: troque `SUPABASE_URL` e `SUPABASE_SECRET_KEY` pelos do
   novo (o APK passa a publicar as atualizações lá).
3. Teste: entre no app (vai pedir login de novo), abra o Plantão, um contrato e
   uma foto de vistoria.

## 7. Depois

- Deixe o projeto antigo parado uns dias (Project Settings → **Pause project**) e,
  com tudo certo, apague. Apague também os segredos `MIGRAR_*` do GitHub.
- O APK não precisa mudar: ele abre o site, e o site já usa o projeto novo.
