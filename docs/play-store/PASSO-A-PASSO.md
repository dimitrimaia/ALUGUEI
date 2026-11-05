# Aluguei na Play Store: passo a passo completo

Siga em ordem. Tudo o que é para **copiar e colar** está em bloco cinza.
As imagens estão em `docs/play-store/imagens/`.

---

## Parte 0. Antes de começar (uma vez)

### 0.1 Chave do app no GitHub
O GitHub gera o arquivo da loja (AAB) assinado com a mesma chave do APK.
GitHub → repositório → **Settings → Secrets and variables → Actions → New repository secret**.
Crie os dois que estão no arquivo `segredos-github.txt` que te mandei:

- `ALUGUEI_APK_KEYSTORE_BASE64`
- `ALUGUEI_APK_SENHA`

Depois: **Actions → App Android (APK) → Run workflow**. No fim da execução, em
**Artifacts**, baixe **aluguei-play-store-aab** (é um .zip com o `.aab` dentro).

### 0.2 Conta de teste para o revisor do Google
1. Numa janela anônima, abra **aluguei.xyz/entrar → Criar conta**.
2. E-mail: `revisor@aluguei.xyz` (chega no seu Gmail pelo ImprovMX). Senha: invente uma
   forte e anote. Confirme o link do e-mail.
3. Entre, escolha **Motorista**, faça o assistente inicial com os valores padrão.

### 0.3 Gravar 3 vídeos (celular, 20 a 40 s cada)
Use o gravador de tela do Android. Suba no YouTube como **Não listado** e guarde os links.

1. **Acessibilidade:** abrir o Aluguei → Copiloto → Ligar. Mostrar o aviso do que o
   Copiloto lê → tocar em **Li e entendi. Quero usar o Copiloto** → ir até a permissão de acessibilidade
   do Android e ligar → voltar → tocar em **Testar oferta** e mostrar o cartão aparecendo.
   Se puder, mostre uma oferta real chegando e o cartão por cima, **sem tocar** no app de corrida.
2. **Bolha (serviço em primeiro plano):** Copiloto ligado → mostrar a notificação fixa
   "Copiloto ligado" → a bolha na tela → tocar na bolha e abrir o menu rápido.
3. **Câmera de segurança** (se for manter): ligar a câmera no app → mostrar a
   notificação "gravando" → parar.

---

## Parte 1. Criar o app
Play Console → **Criar app**:

| Campo | Valor |
|---|---|
| Nome do app | `Aluguei` |
| Idioma padrão | Português (Brasil) – pt-BR |
| App ou jogo | App |
| Gratuito ou pago | Gratuito |
| Declarações | marque as duas |

---

## Parte 2. Painel → "Configure seu app"

### 2.1 Política de privacidade
```
https://aluguei.xyz/privacidade
```

### 2.2 Detalhes do login (antigo "Acesso ao app")
Marque **Sim** → **Adicionar informações**:

- **Nome:** `Conta de motorista`
- **Usuário:** `revisor@aluguei.xyz`
- **Senha:** a que você criou no passo 0.2
- **Outras informações** (cole):
```
Login: open the app, tap "Entrar", enter the e-mail and password above.
After login, choose "Motorista" (driver) if asked.
To test the Copilot (accessibility feature): go to "Copiloto", tap "Ligar", read and accept the disclosure, enable the Aluguei accessibility service in Android settings, return to the app and tap "Testar oferta" (test offer). A card with the calculated profit appears over the screen. The Copilot only reads ride offers shown by ride-hailing apps (Uber, 99, inDrive, 37 City) and never taps or acts on them.
No payment is needed to review the app.

Português: entre com o e-mail e a senha acima, escolha "Motorista". Para testar o Copiloto, vá em Copiloto → Ligar → aceite o aviso → ative a acessibilidade do Aluguei → volte e toque em "Testar oferta".
```

### 2.3 Anúncios
**Não, meu app não contém anúncios.**

### 2.4 Classificação de conteúdo
- E-mail: `contato@dimitrimaia.com`
- Categoria: **Todos os outros tipos de app**
- Violência, medo, sexualidade, linguagem, drogas, jogos de azar: **Não** em tudo
- Os usuários podem interagir ou trocar conteúdo (mensagens)? **Sim**
- Compartilha a localização atual do usuário com outros usuários? **Não**
- Bloquear usuários ou conteúdo? **Não** (só a equipe bloqueia, pelo painel)
- Denunciar usuários ou conteúdo? **Sim** (botão Denunciar na conversa e no anúncio)
- Moderação de conversas por chat? **Sim**
- Interações limitadas a amigos convidados? **Não**
- Conteúdo online (destaca conteúdo de fora da instalação)? **Sim** (anúncios de carros)
- Permite compras de produtos digitais? **Não**
- É um navegador da Web ou mecanismo de pesquisa? **Não**
- Salvar → **Enviar**.

### 2.5 Público-alvo
- Faixa etária: só **18 anos ou mais**
- Atrai crianças sem querer? **Não**

### 2.6 Apps de notícias: **Não**
### 2.7 Apps de COVID-19: **Meu app não é**
### 2.8 Recursos financeiros: **Meu app não oferece nenhum recurso financeiro**
### 2.9 Saúde: **Meu app não tem recursos de saúde**
### 2.10 Apps governamentais: **Não**

### 2.11 Segurança dos dados
**Visão geral:**
- Coleta ou compartilha dados? **Sim**
- Todos os dados são criptografados em trânsito? **Sim**
- Como os usuários podem pedir exclusão? **Os usuários podem pedir a exclusão** → URL:
```
https://aluguei.xyz/excluir-conta
```
- Permite excluir alguns dados sem excluir a conta? **Sim**

**Tipos de dados.** Marque só estes. Para todos: **Coletado = Sim, Compartilhado = Não**
(enviar para a locadora a pedido do usuário e para prestadores de serviço não conta como
compartilhar), **Processado temporariamente = Não**.

| Categoria → tipo | Obrigatório? | Finalidades |
|---|---|---|
| Local → Local aproximado | Opcional | Funcionalidade do app |
| Local → Local exato | Opcional | Funcionalidade do app |
| Informações pessoais → Nome | Obrigatório | Funcionalidade, Gerenciamento da conta |
| Informações pessoais → Endereço de e-mail | Obrigatório | Funcionalidade, Gerenciamento da conta, Comunicações do desenvolvedor |
| Informações pessoais → IDs do usuário | Obrigatório | Funcionalidade, Gerenciamento da conta, Prevenção de fraudes e segurança |
| Informações pessoais → Endereço | Opcional | Funcionalidade, Prevenção de fraudes e segurança |
| Informações pessoais → Número de telefone | Opcional | Funcionalidade, Gerenciamento da conta |
| Informações pessoais → Outras informações (CPF, CNH, data de nascimento) | Opcional | Funcionalidade, Prevenção de fraudes e segurança |
| Informações financeiras → Histórico de compras (pagamentos do aluguel) | Opcional | Funcionalidade |
| Informações financeiras → Outras informações financeiras (ganhos e gastos) | Opcional | Funcionalidade |
| Fotos e vídeos → Fotos | Opcional | Funcionalidade |
| Fotos e vídeos → Vídeos (vistoria do carro) | Opcional | Funcionalidade |
| Arquivos e documentos | Opcional | Funcionalidade |
| Mensagens → Outras mensagens no app | Opcional | Funcionalidade |
| Atividade no app → Interações com o app | Obrigatório | Funcionalidade, Análise |
| Atividade no app → Outros conteúdos gerados pelo usuário (ofertas de corrida lidas) | Opcional | Funcionalidade |
| Informações e desempenho do app → Registros de falhas | Obrigatório | Análise |
| Informações e desempenho do app → Diagnóstico | Obrigatório | Análise |

**Não** marque: contatos, agenda, áudio, saúde, navegação na web, IDs de publicidade.
(A gravação da câmera de segurança e os prints ficam só no celular, então não contam.)

### 2.12 Exclusão de conta
Já entra na Segurança dos dados. Se pedir de novo:
```
https://aluguei.xyz/excluir-conta
```

---

## Parte 3. Ficha da loja principal
**Crescer → Presença na loja → Ficha da loja principal**

**Nome do app** (até 30):
```
Aluguei: carro e copiloto
```

**Descrição curta** (até 80):
```
Alugue carro para app e saiba na hora se a corrida compensa.
```

**Descrição completa** (até 4.000):
```
O Aluguei é o app de quem dirige por aplicativo e de quem aluga carro para motoristas.

PARA O MOTORISTA

• Copiloto: quando uma oferta de corrida aparece, o Copiloto mostra na hora o seu lucro de verdade, já descontando combustível, aluguel e os custos do carro. Verde compensa, vermelho não. Você decide e toca no app de corrida normalmente: o Copiloto só lê a oferta, nunca aceita ou recusa por você.
• Volta para a base: o cálculo considera quanto você vai rodar para voltar para casa ou para a sua região.
• Plantão: ganhos, gastos e km do dia, meta do mês e quanto sobra depois do aluguel. Sem planilha.
• Calculadoras: corrida particular com paradas e valor por passageiro, viagem com pedágios, entregas e abastecimento.
• Alertas da comunidade: motoristas avisam sobre endereços perigosos.
• Alugue um carro: encontre carros de locadoras para motoristas de app e faça o cadastro pelo celular.

PARA A LOCADORA

• Anuncie os seus carros e receba cadastros de motoristas com documentos e pré-análise da CNH.
• Contratos com regras claras, cobrança por Pix com baixa automática e aviso de atraso.
• Check-in e vistoria com fotos e vídeos, guardados como prova.
• Mensagens com os motoristas e painel com tudo o que está em aberto.

PRIVACIDADE

O Copiloto usa o serviço de acessibilidade do Android somente para ler os dados das ofertas de corrida (valor, distância, tempo e endereços) nos apps de corrida suportados. Ele não lê outros apps, não guarda imagens da tela e só funciona quando você liga. Saiba mais em aluguei.xyz/privacidade.

O Aluguei não tem ligação com Uber, 99, inDrive ou 37 City.
```

**Gráficos** (pasta `docs/play-store/imagens/`):
- Ícone do app: `icone-512.png`
- Recurso gráfico: `destaque-1024x500.png`
- Capturas de tela do telefone: os 5 arquivos `celular-*.png`, em ordem
- Tablet: pode pular

**Categoria e contato** (Presença na loja → Configurações da loja):
- Categoria: **Mapas e navegação** (ou **Produtividade**)
- Tags: Motoristas, Finanças pessoais
- E-mail: `suporte@aluguei.xyz`
- Site: `https://aluguei.xyz`
- Telefone: opcional

---

## Parte 4. Declarações das permissões
**Política → Conteúdo do app**. Aparecem depois do primeiro envio do AAB (Parte 5).

### 4.1 Serviço de acessibilidade
- O app é uma ferramenta de acessibilidade? **Não**
- Descrição (cole):
```
O Aluguei ajuda motoristas de aplicativo a decidir se uma oferta de corrida compensa. Com o "Copiloto" ligado pelo próprio motorista, o serviço de acessibilidade lê, apenas nos apps de corrida suportados (Uber, 99, inDrive e 37 City), os dados da oferta exibida na tela: valor, distância, tempo e, quando aparecem, endereços, nota e forma de pagamento. Com esses dados, o app mostra por cima da tela o lucro estimado da corrida, descontando os custos que o motorista cadastrou. O serviço não executa nenhuma ação: não toca, não aceita, não recusa e não digita nada. Não lê outros apps, não guarda imagens da tela e não coleta senhas. Antes de ativar, o app mostra um aviso explicando o que é lido e pede o consentimento do usuário. O motorista pode desligar a qualquer momento.
```
- Vídeo: link do vídeo 1.

### 4.2 Permissões de serviço em primeiro plano
| Tipo | Descrição (cole) | Vídeo |
|---|---|---|
| Uso especial (specialUse) | `Mostra, por cima do app de corrida, a bolha e o cartão com o lucro estimado da oferta, enquanto o motorista mantém o Copiloto ligado. O usuário vê a notificação fixa e pode desligar a qualquer momento.` | vídeo 2 |
| Localização | `Com o Copiloto ligado e a localização permitida pelo motorista, lê a posição atual para calcular a distância da volta do destino da corrida até a base dele. A posição não é gravada nem enviada como trajeto.` | vídeo 2 |
| Câmera / Microfone | `Câmera de segurança da corrida: grava, só quando o motorista liga, vídeo e áudio durante a corrida para a segurança dele. O arquivo fica apenas no celular. Uma notificação mostra que está gravando.` | vídeo 3 |

Pergunta "a tarefa pode ser interrompida ou adiada?": **Não**.

### 4.3 Otimização de bateria (se perguntar)
```
O Copiloto precisa continuar ativo enquanto o motorista trabalha para mostrar as ofertas na hora. O app só pede a isenção quando o motorista liga o Copiloto, e explica o motivo antes.
```

### 4.4 Sobreposição (SYSTEM_ALERT_WINDOW)
Não tem formulário, mas se perguntarem: a bolha e o cartão do Copiloto aparecem por cima
do app de corrida, só com o Copiloto ligado.

---

## Parte 5. Enviar a primeira versão

### 5.1 Teste interno (recomendado, uns dias)
1. **Testar e lançar → Testes → Teste interno → Criar nova versão**.
2. Assinatura do app: aceite **Usar a assinatura de apps do Google Play**.
3. Envie o `.aab` da Parte 0.1.
4. Nome da versão: deixe o automático. **Notas da versão**:
```
<pt-BR>
Primeira versão do Aluguei na Play Store.
</pt-BR>
```
5. **Testadores**: crie a lista com `dimitrionpb@gmail.com` e mais quem quiser.
6. Salvar → Revisar → **Iniciar lançamento**. Abra o link de teste no celular e instale.
   (Desinstale antes o APK antigo.)

### 5.2 Produção
1. **Produção → Países/regiões → Adicionar → Brasil**.
2. **Criar nova versão → Adicionar da biblioteca** (o mesmo AAB do teste interno).
3. Mesmas notas da versão → Revisar → **Enviar para revisão**.
4. A primeira revisão leva de 1 a 7 dias. Pode levar mais por causa da acessibilidade.

---

## Parte 6. Se for recusado
O e-mail diz o motivo. Os mais comuns:

- **Acessibilidade:** responda pelo formulário de recurso com o texto da 4.1 e um vídeo
  mais claro do aviso antes de ativar.
- **Serviço em primeiro plano:** o vídeo precisa mostrar o recurso em uso, com a notificação.
- **Câmera:** se travar a aprovação, dá para tirar a câmera de segurança desta versão.
  Me avise que eu removo.
- **Login não funcionou:** confira se a conta do revisor entra e se a senha está certa.

---

## Parte 7. Depois de publicado
- Cada versão nova: Actions → App Android (APK) → baixar o AAB → Produção → Criar versão.
- Responda as avaliações em **Avaliações**.
- O link da loja: `https://play.google.com/store/apps/details?id=aluguei.app`.
