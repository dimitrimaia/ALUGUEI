# Busca de carros e chat

Hoje o motorista só entra por convite. Com a busca, quem procura carro encontra os
anúncios da cidade, conversa com o locador dentro do app e, fechado o negócio, o
locador transforma a conversa em convite. A partir daí o fluxo é o mesmo de sempre:
cadastro, análise, contrato e vistoria.

Antecipa os requisitos RF-021 (busca de veículos) e RF-113 (chat), que no documento
v0.1 estavam como S e C.

## Fluxo

1. **Locador anuncia** um carro disponível: cidade, valor semanal, caução, franquia,
   prazo mínimo, descrição e até 6 fotos. Pode pausar quando quiser.
2. **Motorista busca** em `/carros`, filtra pela cidade e abre o anúncio. A busca é
   pública e não precisa de login.
3. **"Tenho interesse"**: pede login (código ou senha), nome e celular, e abre uma
   conversa com uma primeira mensagem pronta. Uma conversa por anúncio e motorista.
4. **Conversa** em tempo real dentro do app, dos dois lados: painel do locador
   (`/painel/conversas`) e app do motorista (`/m/conversas`).
5. **"Enviar convite"** na conversa: o locador cria o convite com as condições do
   anúncio, já ligado à conta do motorista. A conversa recebe uma mensagem com o
   link do cadastro e segue aberta durante todo o processo.

## Regras

- O anúncio só existe para carro com situação **Disponível**. Quando o carro é
  alugado, o anúncio é pausado.
- A busca mostra só o que é público: carro, condições, fotos, cidade e o nome do
  locador. Nunca placa completa, nem dados de contato. O contato acontece pelo chat.
- No chat, o motorista vê só as próprias conversas, e o locador só as da sua conta
  (RLS no banco, verificado também no servidor).
- Mensagens não são apagadas nem editadas. Ficam como histórico da negociação
  (útil como prova, como as demais evidências).
- Valores combinados no chat não mudam nada sozinhos. O que vale é o convite e,
  depois, o contrato assinado.

## Modelo de dados (migração 0004)

| Tabela | O que guarda |
|---|---|
| `anuncios` | veículo (um anúncio por carro), cidade/UF, cidade normalizada para busca, valores, prazo mínimo, descrição, fotos (caminhos no bucket público `anuncios`), situação |
| `conversas` | anúncio, locador, usuário motorista, nome e celular informados, convite gerado (`locatario_id`), última mensagem e leituras de cada lado |
| `mensagens` | conversa, autor (`motorista`, `locador` ou `sistema`), texto, horário |

`mensagens` entra na publicação `supabase_realtime` para a conversa atualizar na
hora; a tela também confere a cada 8 s, caso a conexão em tempo real caia.

## Próximas etapas

- Notificação de mensagem nova (push e WhatsApp), junto com a régua de cobrança.
- Filtros por faixa de preço e por categoria do carro.
- Denúncia de anúncio ou conversa, e moderação pela equipe da plataforma (RF-123).
- Avaliação mútua depois do contrato (RF-124).
