# Conta, perfil e configurações

## Uma conta, dois modos

Como no BlaBlaCar, a mesma pessoa pode oferecer e pegar. Toda conta tem o **modo
motorista** (buscar e alugar carros, `/m`). Qualquer conta pode ativar o **modo
locador** (anunciar e alugar os próprios carros, `/painel`) criando a locadora em
`/painel/comecar`, como pessoa física ou empresa. Quem é locador também pode alugar
o carro de outro locador.

- A troca de modo fica no menu ☰, na Conta e na **foto da aba Conta**: dois toques
  trocam de modo; tocar e segurar abre a escolha entre os dois (como no Instagram).
- Ao trocar, a pessoa vai para a **tela equivalente** do outro modo quando ela existe
  (Conta, Conversas, Meus carros/Frota); senão, para o início do modo
  (`src/lib/modo-equivalente.ts`, com teste). Com o menu aberto, ele continua aberto.
- O último modo usado fica no cookie `aluguei_modo`; "Minha área" e `/inicio` voltam
  para ele.
- O perfil (foto, nome, verificação, preferências) é um só para os dois modos, com as
  etiquetas "Motorista" e "Locador".
- **Meus carros** tem duas abas nos dois modos: "Que eu aluguei" e "Que eu anuncio".
- No anúncio do próprio carro, o dono vê "Este anúncio é seu · Editar" em vez de
  "Tenho interesse".
- Não existe mais a exigência de convite: o motorista encontra o carro, conversa, e o
  locador **aprova para alugar** na conversa. O link de cadastro continua existindo
  para quem o locador já conhece fora do app.

Área da conta para motoristas (`/m/conta`) e locadores (`/painel/conta`). Ela abre
pela caixa do perfil no menu ☰, pelo avatar no topo e pela aba **Conta** do app do
motorista. As telas são as mesmas para os dois perfis, com textos de cada um. O
locador tem também **Dados da locadora**.

## Estrutura

| Tela | O que tem |
|---|---|
| Início da conta | Cartão do perfil (foto, nome, e-mail, papel), progresso da verificação e a lista de configurações |
| Dados pessoais | Foto de perfil, nome de exibição, e-mail e celular (com situação) |
| Verificação da conta | E-mail confirmado, celular confirmado por SMS, foto, e: documentos e CNH (motorista) ou recebimentos no Pix (locador) |
| Senha e acesso | Criar ou trocar a senha, trocar o e-mail de login, sair de todos os aparelhos |
| Dados da locadora | Nome, cidade, UF e "Aprovar antes de enviar" (modo assistido). Só o dono edita |
| Aparência | Tema Claro (padrão), Escuro ou Automático |
| Notificações | Canais (WhatsApp, e-mail, notificação no celular) e assuntos |
| Privacidade e dados | O que guardamos, por quanto tempo, baixar meus dados, pedir exclusão |
| Ajuda e suporte | Perguntas frequentes, como funciona, e-mail do suporte |

## Requisitos funcionais

| Req. | Descrição | Prioridade |
|---|---|---|
| RF-130 | A pessoa vê e edita o nome de exibição e a foto de perfil. A foto é reduzida no próprio celular (512 px) antes do envio. | M |
| RF-131 | A conta mostra a situação da verificação (e-mail, celular, foto, documentos ou recebimentos), com atalho para resolver cada item pendente. | M |
| RF-132 | O celular é confirmado por código SMS antes de ser usado nos avisos pelo WhatsApp. | M |
| RF-133 | A pessoa cria ou troca a senha, troca o e-mail (com confirmação no endereço novo) e encerra a sessão em todos os aparelhos. | M |
| RF-134 | O tema padrão é claro. A pessoa escolhe Escuro ou Automático, e a escolha vale em todos os aparelhos em que ela entrar. | M |
| RF-135 | A pessoa escolhe por quais canais e sobre quais assuntos quer avisos. Avisos do contrato (cobrança, atraso, notificação formal) não podem ser desligados, e pelo menos um canal fica ligado. | M |
| RF-136 | A pessoa baixa um arquivo com os dados pessoais ligados à conta (LGPD, direito de acesso). | M |
| RF-137 | A pessoa pede a exclusão da conta. O pedido vai para o suporte. Nada é apagado automaticamente: contratos ativos precisam ser encerrados, e as provas seguem o prazo de retenção. | M |
| RF-138 | O dono da conta do locador edita nome, cidade, UF e o modo assistido. A alteração fica na auditoria. O CPF/CNPJ só muda pelo suporte. | M |
| RF-139 | Recuperação de senha: o link do e-mail abre a tela "Criar senha nova". Link expirado mostra a explicação e o botão para pedir outro. | M |

## Requisitos não funcionais

| Req. | Descrição |
|---|---|
| RNF-130 | **Links de e-mail funcionam em qualquer navegador** (fluxo implícito, ver `configurar-supabase.md`). Cada link vale uma vez, por 1 hora. |
| RNF-131 | **Reenvio com espera:** 60 s entre pedidos de código ou link para o mesmo endereço, com contagem na tela. |
| RNF-132 | **Sem piscar de tema:** o tema é aplicado por um script antes da primeira pintura; a escolha fica no aparelho e na conta. |
| RNF-133 | **Resposta ao toque:** ao tocar numa opção, uma barra de progresso aparece no topo na hora e a tela mostra um esqueleto enquanto carrega. |
| RNF-134 | **Privacidade da foto:** a foto fica num bucket público, num caminho com o id do usuário; a anterior é apagada na troca. Só o servidor gera o endereço de envio. |
| RNF-135 | **Preferências validadas no servidor:** os metadados do usuário são editáveis pelo próprio usuário, então o servidor sempre normaliza o que lê (`normalizarPreferencias`, com teste). |
| RNF-136 | **Retenção:** contratos, vistorias, check-ins e conversas ficam 5 anos após o fim do contrato (RNF-005). O resto sai na exclusão. |

## Onde ficam os dados

- **Nome, foto e preferências:** metadados do usuário no Supabase Auth
  (`user_metadata.nome`, `.foto`, `.preferencias`). Não precisou de migração.
  Quando a régua de notificações chegar, as preferências passam a ser lidas pelo
  servidor de lá mesmo (com o admin), sem mudar a tela.
- **Foto:** bucket `avatares`, criado sozinho na primeira foto.
- **Tema neste aparelho:** `localStorage` (`aluguei_tema`), para aplicar antes da
  primeira pintura.
- **Dados da locadora:** tabela `organizacoes`, alterada pelo servidor depois de
  conferir que quem pede é o dono, com registro na `auditoria`.

## Navegação das áreas logadas

- **Logo** leva ao início do app (`/m` ou `/painel`). "Início" não aparece no menu ☰.
- **Menu ☰** abre pela direita, no mesmo estilo do menu do site: caixa do perfil no
  topo (leva à conta), opções em faixas por seção, "Ver o site", "Sair" e rodapé.
- **Cabeçalho e rodapé são os mesmos componentes nos dois modos**
  (`src/components/app/barras.tsx`). Telas das abas mostram o logo no topo e o título
  na página; telas internas mostram voltar + título no topo. Só as abas mudam.
- **Voltar** (seta do topo) volta para a tela anterior, como o voltar do celular. Só
  quando a pessoa chegou direto por um link ele vai para a tela-mãe.
- **Menu ☰** cabe inteiro na tela, sem rolar, inclusive em celulares pequenos, e abre
  sempre por cima da página (vai direto para o `<body>`).
- **Abas do motorista:** Início, Buscar, Meus carros, Conversas (com contador) e Conta.
- **Abas do locador:** Início, Frota, botão +, Financeiro e Conta. Conversas,
  Motoristas, Contratos, Anúncios e Recebimentos ficam no menu ☰ (com contador).
  A busca de carros tem versão dentro do app (`/m/buscar`), com as abas.


## Velocidade

- Telas já vistas voltam na hora por 30 s (`staleTimes` do Next).
- Menus e cabeçalhos leem nome, foto e tema do token da sessão, sem ir ao servidor de
  autenticação; as ações que mudam esses dados renovam o token.
- Consultas repetidas na mesma tela são feitas uma vez só (`cache` do React), e as
  independentes vão em paralelo.
- A região das funções da Vercel precisa ser a mesma do banco do Supabase: cada tela
  faz várias consultas, e cada ida e volta entre continentes custa ~120 ms.

## Próximas etapas

- Instalar o app (PWA) a partir de Notificações, com o pedido de permissão do push.
- Equipe do locador (convidar operador) em Dados da locadora.
- Termos de uso e política de privacidade, depois da revisão do advogado.
