# App nativo (Android e iPhone)

O app nativo do Aluguei é uma "casca" feita com [Capacitor](https://capacitorjs.com) mais um
plugin próprio para Android, o **Copiloto** (plugin `Plantao` no código), que mostra se a
corrida compensa por cima da Uber, da 99 e da inDrive.

## Como o app é montado

```
celular
├── WebView (Capacitor, modo servidor remoto)
│     └── carrega https://aluguei.xyz  ← todas as telas vêm do site, como hoje
└── Plugin "Plantao" = Copiloto (Kotlin, só Android)
      ├── BolhaService          serviço em primeiro plano: bolha, menu em leque, cartão, painéis, notificação
      ├── LeitorCorridasService serviço de acessibilidade: junta os textos da tela (lista, na ordem da tela)
      ├── LeitorInDrive.kt      telas do inDrive: oferta aberta, lista, contraproposta, fim, área de risco
      ├── LeitorUber.kt / Leitor99.kt  leitor genérico (LeitorOferta) sem os "R$ x/km"
      ├── LeitorOferta.kt       mesmas regras de src/dominio/ganhos/oferta.ts
      ├── Calculo.kt            mesmas regras de custos.ts e corrida.ts (régua v2, faixas de horário, bateLista, precoIdeal)
      ├── Preferencias.kt       mesmas regras de copiloto.ts (preferências, mensagem pronta) e normalizarCriterios
      ├── Copiloto.kt           risco do app, lugares da bolha e contraproposta sugerida
      ├── Cartao.kt             textos dos campos do cartão e da voz ("Verde. Dois reais e dez por quilômetro.")
      ├── Volta.kt              volta destino → base (Photon + OSRM, reserva em linha reta), cache LRU
      ├── Localizacao.kt        posição pelo LocationManager (sem Google Play Services)
      ├── Avisos.kt             voz (TextToSpeech pt-BR) e bip
      ├── Armazenamento.kt      perfil, critérios, preferências, régua, lugares, base, resumo do dia e fila (SharedPreferences)
      └── PlantaoPlugin.kt      a ponte com a tela web (métodos e eventos abaixo)
```

- `capacitor.config.ts`: appId `xyz.aluguei.app`, nome "Aluguei", `server.url = https://aluguei.xyz`,
  `androidScheme: https`. O `webDir` é `public-nativo/`, só com a tela "Abrindo o Aluguei…"
  (o Capacitor exige uma pasta; o app de verdade vem do site).
- Atualizar o site atualiza o app na hora, sem passar pela loja. Só mudanças no código nativo
  (pasta `android/` ou `ios/`) pedem nova versão na loja.
- **Pouco gasto de bateria:** durante a jornada quem trabalha é só o serviço nativo pequeno
  (bolha + leitor). A WebView pode estar fechada. As corridas avaliadas ficam numa fila local e
  a tela web envia ao servidor quando for aberta (`corridasPendentes` → enviar → `confirmarEnvio`).
- **Mesma regra nos dois lados:** `Calculo.kt`, `Preferencias.kt` e `LeitorOferta.kt` são espelho
  exato do TypeScript. Mudou `custos.ts`, `corrida.ts`, `copiloto.ts` ou `oferta.ts`? Mude o `.kt`
  e os testes JUnit em `android/app/src/test/java/xyz/aluguei/app/plantao/` (`CalculoTest` e
  `ReguaTest` têm os casos de `ganhos.test.ts` e `regua.test.ts`; `PreferenciasTest` os de
  `copiloto.ts`).

## O que o motorista vê

1. Liga o Copiloto na tela web (ou pela tela de permissões, passo a passo).
2. Aparece a bolha azul com o símbolo do Aluguei (ponto verde = lendo, cinza = pausado) e a
   notificação fixa "Copiloto ligado", que mostra a última oferta
   ("Filipe · inDrive · R$ 58 · 🟢 R$ 1,57/km" + destino) com os botões **Pausar** e, quando há
   endereços, **Embarque** e **Destino** (abrem a navegação). Sem endereços: **Pausar**, **Abrir**
   e **Desligar** (o Android mostra no máximo 3 botões; tocar na notificação abre o Aluguei).
3. Chega uma oferta → o cartão desliza do topo (abaixo da barra de status, compacto para não
   cobrir o "Aceitar" nem os atalhos do inDrive): faixa e selo do sinal (verde "Vale a pena",
   âmbar "Avalie", vermelho "Não compensa"), ícone do app, "Filipe ★4,71 (38) · PIX", números
   grandes (R$/km, R$/h, lucro), "37,4 km no total · a 1,0 km do passageiro · 70 min" e o destino.
   Vibra 1 vez no verde e 2 no vermelho (dá para desligar com `configurar({ vibrar: false })`).
   Arrastar na vertical muda a posição (lembrada por app); arrastar para o lado fecha. Com
   endereços, os botões **Embarque** e **Destino** abrem a navegação (veja o item 17).
   **`fixarCentro`**: o cartão fica sempre no centro da largura e só sobe e desce (arrastar para o
   lado não faz nada; feche no ✕). A sombra do cartão, dos painéis e da bolha é desenhada à mão
   (cantos arredondados / redonda na bolha), numa folga pequena em volta da peça (6 dp dos lados,
   10 dp embaixo), porque a elevação em janela de serviço saía quadrada ou cortada.
4. **inDrive:** o cartão só aparece com a oferta aberta (botão "Aceitar por R$ X"); na lista de
   pedidos ele some. A linha de destaque sugere a contraproposta: "Toque em R$ 23" (menor atalho
   que deixa verde), "Use o lápis: R$ 27" ou "Nem o dobro (R$ X) fica verde"; se já é verde,
   "Pode aceitar". Enviada a contraproposta ("Oferecendo sua tarifa R$ 22"), o cartão recalcula
   com "Sua oferta: R$ 22" e esse passa a ser o valor final da corrida. Expirou / já aceita /
   procurando → o cartão some.
   **Lápis do valor final** (ao lado do chip "Contar volta para casa", também sem destino): "✎ R$ 22"
   abre um campo numérico (teclado só ao tocar; tocar fora ou Voltar fecha) para o valor com que o
   motorista aceitou / vai aceitar; grava `valorFinal` na fila e recalcula o cartão ("Valor final:
   R$ 25 (sua oferta R$ 22)"). Uma contraproposta nova depois disso volta a ser o valor.
   **Km e tempo totais** sempre visíveis no cartão completo (e no expandido das bordas): "17,3 km no
   total" com "2,1 até o passageiro + 15,2 de viagem" pequeno embaixo, e "28 min no total" com
   "6 até o passageiro + 22 de viagem" ("~" quando estimado; "≈" quando o km veio do R$/km).
5. **Área de risco** (aviso do inDrive): faixa "⚠ Área de risco" e botão "Evitar este lugar", que
   guarda o bairro (ou a rua) na lista local de lugares a evitar. Embarque ou destino com um lugar da
   lista (`criterios.evitar` + os da bolha) → cartão vermelho "Lugar que você evita: X". Nota abaixo de
   `criterios.notaMinima` → no mínimo amarelo, "Nota baixa".
6. **Régua v2** (a mesma de `corrida.ts`): duas linhas por métrica (mínimo e "bom"; com o bom em 0
   vale a régua simples com 15% de tolerância), valor mínimo, lucro mínimo (R$ e %), busca e viagem
   máximas (km e minutos), nota mínima, passageiro novo (menos de 5 corridas), corrida com parada
   (endereços além do embarque e do destino), lugares a evitar (embarque ou destino: vermelho) e
   destinos desejados (selo verde "📍 Destino desejado: Contagem"). Vale a faixa de horário do
   momento (relógio de Brasília); dentro de uma faixa o cartão mostra o nome dela, pequeno ("Madrugada").
7. **Campos do cartão** (`preferencias.campos`, na ordem): os 3 primeiros grandes, os demais numa
   linha pequena. Formatos: R$/km "R$ 2,10", R$/h "R$ 48", lucro, lucro/h "R$ 35/h", lucro "62%",
   valor, R$/min "R$ 0,70", nota "★4,71", tempo "21 min", distância "20,6 km", busca "a 2,1 km",
   volta "volta 18 km · R$ 11". Fonte p/m/g (0,9/1/1,15), opacidade da bolha e tema seguem as preferências.
8. **Volta para a base:** com `contarVolta` (ou o campo "volta") e destino na oferta, o cartão aparece
   na hora com "calculando volta…" e, numa thread de fundo (no máximo 4 s), o destino é procurado no
   Photon (só resultados do Brasil) e a rota destino → base no OSRM; se o OSRM falhar, linha reta × 1,35
   a 25 km/h. Cache por destino (50). Com `contarVolta`, o custo da volta sai do lucro e a
   contraproposta já considera a volta. Base = `preferencias.base`, ou a definida pela bolha, ou
   "onde estou agora". Selo verde **"🏠 Te leva para casa"** quando o destino fica pelo menos 30% mais
   perto da base (em linha reta) que a posição atual.
   **Chip "Contar volta para casa"** no cartão (completo e no expandido das bordas, quando há destino):
   liga/desliga o `contarVolta` só no cálculo do Copiloto (a régua salva não muda); recalcula na hora
   lucro, sinal e a contraproposta sugerida, e mostra "volta 18 km · R$ 11" (ou "calculando volta…").
   A escolha fica lembrada no aparelho; até o primeiro toque, segue o `contarVolta` da régua.
9. **Voz e bip:** com `voz`, fala curto ao aparecer a oferta ("Verde. Dois reais e dez por quilômetro.",
   "Vermelho. Não compensa."). Com `bip`, um bip curto só no verde.
10. **"Você aceitou?"** (`perguntarAceite`): se a oferta sai da tela (lista, fim, outra tela do inDrive,
    ou o tempo do cartão acaba) sem Aceitei/Recusei, aparece por 8 s "Você aceitou a corrida de R$ 26?"
    [Sim] [Não], **[Fiz com outro valor]** (campo numérico: grava a corrida como aceita com o valor
    digitado em `valorFinal`; `valor` continua o da oferta) e "Não perguntar mais" (desliga no aparelho
    e emite `preferencia`). A resposta vira a decisão da corrida na fila (`decisaoOrigem: "pergunta"`).
    Fechar o cartão no ✕ não pergunta.
    **Aceite automático (inDrive):** depois de uma oferta aberta (ou da contraproposta), se em até 3 min
    aparecer uma tela de corrida em andamento, a corrida é marcada como aceita sozinha
    (`decisaoOrigem: "automatica"`, `valorFinal` = a sua oferta, senão o valor da oferta) e o "Você
    aceitou?" não aparece (se já estava aberto, fecha). Os textos (sem acento/maiúscula, palavras
    inteiras) ficam só em `Aceite.TEXTOS_EM_ANDAMENTO`: "cheguei", "estou aqui", "iniciar viagem",
    "iniciar corrida", "comecar viagem", "a caminho do passageiro", "va ate o passageiro", "concluir
    viagem", "finalizar viagem", "encerrar viagem", "o passageiro foi notificado", "passageiro esta
    esperando", "embarque". "Solicitação já aceita", "expirou", "Procurando" e "cancelad…" nunca contam
    (e descartam a oferta pendente); tela com "Aceitar por"/"Oferecendo sua tarifa" também não. O
    Diagnóstico mostra o texto que disparou: `inDrive: aceita automaticamente · "cheguei" · R$ 22`.
11. **Mensagem pronta:** depois de Aceitei (ou do Sim), o botão **Copiar mensagem** monta a mensagem
    (`preferencias.mensagem`, com saudação pela hora de Brasília, nome do passageiro e minutos até o
    embarque) e copia; aviso "Mensagem copiada: cole no chat do app". O motorista cola no chat.
12. **Economia** (`preferencias.economia`, padrão ligada): com o inDrive offline ("Offline" sem
    "Online" na tela, ou o botão de ficar online), o leitor dorme: não monta a árvore da tela, só olha
    o texto dos eventos, e acorda ao ver "Online" ou uma oferta (confere a tela inteira no máximo a
    cada 2 s em telas novas e 20 s no geral). O Diagnóstico mostra "dormindo (offline)".
13. **Tela bloqueada:** a janela sobreposta não aparece sobre o bloqueio. O leitor continua lendo
   (com `flagRetrieveInteractiveWindows`, procura a janela do inDrive entre as janelas da tela quando
   a ativa é a do sistema) e, com `KeyguardManager.isKeyguardLocked` (ou a tela desligada/ligando), a
   oferta vai também numa **notificação heads-up** do canal **"Ofertas"** (`IMPORTANCE_HIGH`,
   `VISIBILITY_PUBLIC`, sem som/vibração do canal): título "🟢 Vale a pena · R$ 26 · R$ 1,50/km",
   texto "17,3 km · lucro R$ 12 · sugestão: toque em R$ 29" (+ destino). Voz, bip e vibração seguem as
   preferências. A contraproposta/volta só atualiza a notificação; ao desbloquear (`USER_PRESENT`) ela
   sai e o cartão normal (que já estava por baixo) aparece se a oferta ainda estiver aberta; quando a
   oferta acaba, ela sai também. Tocar abre o app de corrida.
14. **Aceitei** / **Recusei** só registram a decisão (`decisaoOrigem: "toque"`). "Recusei" (ou fechar) não deixa a mesma
   oferta reaparecer enquanto ela estiver aberta. **O app nunca toca no app de corrida e nunca
   aceita, recusa ou oferece tarifa pelo motorista** (sem performAction, sem gestos).
15. **Toque na bolha** → digitação rápida (o teclado só abre ao tocar no campo; toque fora fecha):
   valor, km, minutos e km até o passageiro, atalhos "+R$ 5" e "+1 km", resultado ao vivo.
16. **Segurar a bolha** → menu em leque: Pausar/Retomar, Digitar oferta, Tema claro/escuro, Régua
   rápida (+/− nos mínimos por km e por hora; emite `regua` e fica pendente para o app salvar),
   Resumo do dia, **Definir base aqui** (pega a posição, guarda no aparelho e emite `base`), Diagnóstico (rótulo junto da bolha com o último app/tela lida: "oferta lida",
   "lista", "sem oferta"…), Abrir o Aluguei, Desligar.
17. Arrastar a bolha até o **X** no rodapé desliga. Ao soltar em outro lugar, ela encosta na borda
   e a posição fica salva.
18. **App de navegação** (`preferencias.appNavegacao`) dos botões Embarque/Destino (cartão e
   notificação): `maps` → Google Maps já navegando (`google.navigation:q=…`, pacote
   `com.google.android.apps.maps`); `waze` → `https://waze.com/ul?q=…&navigate=yes` no Waze;
   `perguntar` → o Android pergunta qual app; `padrao` → `geo:0,0?q=…`. Se o app escolhido não
   estiver instalado, abre o padrão (por isso o manifesto declara os dois pacotes em `<queries>`).
19. **Estilo "bordas"** (`preferencias.estiloCartao = "bordas"`): no lugar do cartão, duas peças
   pequenas coladas na borda da tela (do lado oposto ao da bolha): uma pílula na cor do sinal com
   "● R$ 2,10/km" (e "Sua: R$ X" no inDrive depois da contraproposta) e outra com "Lucro R$ 12,30".
   Arrastar sobe e desce (posição salva); **tocar abre o cartão completo** (com o mesmo tempo na
   tela). A próxima oferta volta às bordas.
20. **Perfis de régua** (`preferencias.perfis`, até 6, ex.: Dia, Noite, Aeroporto): no menu da bolha,
   "Perfil: <atual>" abre a lista; escolher aplica os critérios do perfil na hora (normalizados como
   a régua: inválido volta ao padrão), guarda o nome no aparelho e emite `perfil` { nome, criterios }
   (guardado até a tela ouvir; também em `perfilPendente()`). Enquanto houver perfil pendente,
   `configurar({ criterios })` não sobrescreve os critérios. A régua rápida pendente sai (o perfil
   troca a régua inteira).
21. **Print das ofertas** (`preferencias.printOfertas`, desligado por padrão; Android 11+): quando
   uma oferta nova é lida (uma vez por oferta, 350 ms depois de o cartão aparecer), o serviço de
   acessibilidade tira um print (`takeScreenshot`) e salva um JPEG (80%) em
   **Pictures/Aluguei/Ofertas** com nome `oferta_2026-10-26_14-03-22_R18-40_indrive.jpg`
   (horário de Brasília). No máximo 1 a cada 3 s; compressão e gravação numa thread de fundo; erro
   = sem print (nunca trava a leitura). Precisa de `android:canTakeScreenshot="true"` no XML do
   leitor. Abaixo do Android 11 fica desligado (o Diagnóstico avisa; `estado().printDisponivel = false`).
   Serve de comprovante para contestar no app de corrida.
22. **Câmera de segurança** (opcional): serviço em primeiro plano tipo `camera` (e `microphone` se o
   motorista deu a permissão do microfone: aí grava com áudio) que grava vídeo com Camera2 +
   MediaRecorder (sem CameraX) em arquivos de `camera.minutosPorArquivo` minutos (1 a 30), em
   **Movies/Aluguei/Corridas** (MediaStore; no Android 9 ou anterior, na pasta do app em
   Android/data). Qualidade baixa 360p (1 Mbps), média 480p (2 Mbps), alta 720p (4 Mbps); lente
   frontal ou traseira. Passou de `camera.limiteGb`, apaga os mais antigos **que ela mesma gravou**
   (nunca outros vídeos do celular). Notificação fixa **"Câmera de segurança gravando"** com o botão
   **Parar** (obrigatória e transparente), e o menu da bolha ganha "Câmera: parar". Só começa com o
   Aluguei aberto (`cameraIniciar()`; regra do Android 14 para câmera em primeiro plano). Se outro
   app pegar a câmera ou der erro, a gravação para com um aviso (não derruba o Copiloto).
   **Recomendações:** cole no carro o adesivo **"Veículo monitorado por câmera"** (avisar o
   passageiro é o certo e evita problema); os vídeos ficam **só no celular** (o Aluguei não envia
   nada), e o motorista é responsável por guardar ou apagar.

**Desempenho:** o leitor junta os eventos e lê no máximo a cada 700 ms, com limite de nós
(500), profundidade (30), textos (250) e caracteres (6000). Desligado ou pausado, não lê nada.
Bolha e cartão não têm nenhum laço: só reagem a eventos.

## Bolha, cartão e corrida em andamento

- **Bolha** (44 dp): o toque abre o menu rápido (Calculadora, Pausar, Configurações).
  Segurar a bolha, ou tocar em Configurações, abre o leque completo.
- **Cartão**: abre no resumo (valor, sinal, R$/km, R$/h, lucro com a volta quando
  ela conta, nota, km e tempo totais, uma linha de dica e os botões). "▾ Detalhes"
  abre o cartão completo; "▴" volta ao resumo. Cada oferta nova começa no resumo.
- **Corrida em andamento**: ao aceitar (toque, pergunta ou aceite automático), uma
  pílula no topo mede tempo e km pelo GPS ("● 12 min · 4,3 km · R$ 2,80/km"). Ela
  fecha sozinha na tela de avaliar o passageiro / viagem concluída
  (`Aceite.TEXTOS_CONCLUIDA`), ao voltar à lista depois de 3 min, ao aceitar outra
  ou depois de 4 h; "Finalizar" fecha na hora e "✕" descarta. Só a soma é
  guardada (nunca o caminho), na fila `finalizadas`, e a tela web grava em
  `corridas_avaliadas` (`metros_reais`, `minutos_reais`, `finalizada_em`; migração 0011).

## Atualizar pelo próprio app (APK direto)

O APK baixado fora da Play Store mostra "Atualização do Copiloto" quando sai uma
versão nova; um toque baixa e abre o instalador do Android (a pessoa confirma).

- Cada build do GitHub Actions tem `versionCode` = número da execução.
- O passo "Publicar atualização no app" envia `copiloto-<n>.apk` e `versao.json`
  para o bucket público `app` do Supabase Storage. O app (`atualizar-app.tsx`)
  compara `versao.json` com a versão instalada.
- Para instalar por cima, todo APK precisa da **mesma assinatura**: o build usa a
  chave de envio da Play Store (segredos `ALUGUEI_KEYSTORE_*`, ver `play-store.md`).
  Sem ela, cada build sai com uma chave temporária diferente e não publica.
- Segredos do repositório (GitHub → Settings → Secrets and variables → Actions):
  `ALUGUEI_KEYSTORE_BASE64`, `ALUGUEI_KEYSTORE_SENHA`, `ALUGUEI_CHAVE_ALIAS`,
  `ALUGUEI_CHAVE_SENHA`, `SUPABASE_URL` e `SUPABASE_SECRET_KEY`.
- Só o APK direto (build debug) declara `REQUEST_INSTALL_PACKAGES`
  (`src/debug/AndroidManifest.xml`). O AAB da Play Store não tem: lá quem atualiza
  é a loja (a Play proíbe apps que se instalam sozinhos).
- Primeira vez com a chave nova: desinstale o APK antigo (assinatura diferente) e
  instale o novo. Daí em diante, as atualizações vão por cima.

## Como gerar o APK e o AAB

Pré-requisitos (num computador com acesso livre à internet):

- Node 22 e pnpm (`corepack enable`)
- JDK 21
- Android Studio (ou só o SDK de linha de comando) com **Android SDK Platform 36** e
  **Build-Tools** recentes. Se usar só a linha de comando:
  ```bash
  sdkmanager "platform-tools" "platforms;android-36" "build-tools;36.0.0"
  sdkmanager --licenses
  echo "sdk.dir=$HOME/Android/Sdk" > android/local.properties
  ```

Passo a passo:

```bash
pnpm install
npx cap sync android          # copia capacitor.config e os plugins para android/ (obrigatório)
cd android
./gradlew testDebugUnitTest   # testes JUnit do cálculo e do leitor
./gradlew assembleDebug       # APK de teste
# → android/app/build/outputs/apk/debug/app-debug.apk
```

Também dá para abrir no Android Studio: `npx cap open android`.

### Versão para a Play Store (AAB assinado)

1. Crie a chave de upload **uma vez** e guarde fora do repositório (perdeu, só o suporte do
   Google recupera):
   ```bash
   keytool -genkey -v -keystore ~/aluguei-upload.jks -keyalg RSA -keysize 2048 -validity 10000 -alias aluguei
   ```
2. Em `~/.gradle/gradle.properties` (nunca no repositório):
   ```
   ALUGUEI_KEYSTORE=/home/voce/aluguei-upload.jks
   ALUGUEI_KEYSTORE_SENHA=...
   ALUGUEI_CHAVE_ALIAS=aluguei
   ALUGUEI_CHAVE_SENHA=...
   ```
3. Em `android/app/build.gradle`, dentro de `android { }`:
   ```groovy
   signingConfigs {
       release {
           storeFile file(ALUGUEI_KEYSTORE)
           storePassword ALUGUEI_KEYSTORE_SENHA
           keyAlias ALUGUEI_CHAVE_ALIAS
           keyPassword ALUGUEI_CHAVE_SENHA
       }
   }
   buildTypes { release { signingConfig signingConfigs.release } }
   ```
4. A cada versão, suba `versionCode` (1, 2, 3…) e `versionName` em `android/app/build.gradle`.
5. `npx cap sync android && cd android && ./gradlew bundleRelease`
   → `android/app/build/outputs/bundle/release/app-release.aab` (é esse que vai para a Play Store).
   Ative o **Play App Signing** no Play Console (o Google guarda a chave final).

## Como instalar no celular para testar

**Opção 1: cabo USB (depuração)**

1. No celular: Configurações > Sobre o telefone > toque 7 vezes em "Número da versão".
2. Configurações > Sistema > Opções do desenvolvedor > ligue **Depuração USB**.
3. Ligue o cabo, aceite a pergunta no celular e rode:
   ```bash
   adb install -r android/app/build/outputs/apk/debug/app-debug.apk
   ```
   (ou o botão ▶ do Android Studio).

**Opção 2: mandar o APK** (WhatsApp, Drive, e-mail)

1. Abra o arquivo no celular e permita "Instalar apps desconhecidos" para o app que abriu o arquivo.
2. **Importante (Android 13+):** em apps instalados fora da Play Store, o Android bloqueia o
   serviço de acessibilidade como "configuração restrita". Para liberar: Configurações >
   Apps > Aluguei > menu ⋮ (canto de cima) > **Permitir configurações restritas**; depois
   ligue o leitor em Acessibilidade. Instalado pela Play Store isso não acontece.

**Conferir o leitor no celular:** com o plantão ligado, abra o app de corrida e use
`adb logcat | grep -i plantao` para ver erros, ou ligue o **Diagnóstico** no menu da bolha. Para testar o cartão sem corrida de verdade,
use o método `simular` (abaixo) ou o painel de digitação da bolha.

### Conferir o nome do pacote dos apps de corrida

A lista fica num lugar só: `android/app/src/main/res/values/plantao.xml`, string
`pacotes_corridas` (hoje `com.ubercab.driver,com.app99.driver,sinet.startup.inDriver`).
O filtro do Android (`res/xml/leitor_corridas.xml`) e o código (`Pacotes.kt`) leem essa string.

Para confirmar o pacote de um app:
- Play Store > página do app > ⋮ > Compartilhar: o link termina em `id=<pacote>`; ou
- com o celular no cabo: `adb shell pm list packages | grep -i -E "uber|99|indriv"`; ou
- Configurações > Apps > (app) > em alguns Androids o pacote aparece no rodapé.

Se aparecer um app novo (ex.: outra versão do motorista 99), acrescente o pacote na string,
separado por vírgula, e gere nova versão. Se a plataforma não for Uber/99/inDrive, ajuste
também `Pacotes.plataforma()`.

## Permissões e por quê

| Permissão | Para quê | Como o motorista concede |
|---|---|---|
| `INTERNET` | Carregar o site aluguei.xyz | automática |
| `SYSTEM_ALERT_WINDOW` (aparecer sobre outros apps) | Desenhar a bolha, o painel e o cartão por cima do app de corrida | tela "Aparecer sobre outros apps" (`pedirSobreposicao`) |
| Serviço de acessibilidade (`BIND_ACCESSIBILITY_SERVICE`) | Ler a oferta na tela da Uber/99/inDrive (valor, km, minutos, passageiro, pagamento, endereços) | Configurações > Acessibilidade > "Aluguei · Copiloto" (`pedirAcessibilidade`). Opcional: sem ele, só digitação |
| `VIBRATE` | Vibração curta quando o cartão aparece | automática |
| `FOREGROUND_SERVICE` + `FOREGROUND_SERVICE_SPECIAL_USE` | Manter o plantão vivo durante a jornada, com a notificação fixa | automática |
| `POST_NOTIFICATIONS` | Mostrar "Copiloto ligado" com a última oferta e os botões (Android 13+ pergunta) | caixa do sistema, ou tela de notificações do app (`pedirNotificacoes`) |
| `ACCESS_COARSE_LOCATION` / `ACCESS_FINE_LOCATION` | Volta para a base ("onde estou agora", selo "Te leva para casa") e "Definir base aqui". Só a posição do momento da oferta; não guarda trajeto. Opcional | explicação + caixa do sistema (`pedirLocalizacao`); negada de vez → configurações do app, com volta automática |
| `FOREGROUND_SERVICE_LOCATION` | O Android só entrega a posição a serviço em primeiro plano do tipo `location`; a bolha usa `specialUse` e, com a localização permitida, também `location` | automática (só vale com a localização permitida) |
| `<queries>` TTS_SERVICE | Achar o motor de voz (TextToSpeech) no Android 11+ para a voz do cartão | automática |
| `CAMERA` + `FOREGROUND_SERVICE_CAMERA` | Câmera de segurança da corrida (opcional; vídeo só no celular) | caixa do sistema (`pedirCamera`); negada de vez → configurações do app, com volta automática |
| `RECORD_AUDIO` + `FOREGROUND_SERVICE_MICROPHONE` | Áudio no vídeo da câmera de segurança (opcional: sem ela, grava sem som) | junto com a câmera (`pedirCamera`) |
| `<queries>` Maps, Waze e `geo:` | Saber se o Google Maps / Waze estão instalados para os botões Embarque e Destino | automática |
| Print (`canTakeScreenshot` no leitor) | Print de cada oferta lida (opcional, Android 11+) | vem com o serviço de acessibilidade; só funciona com `printOfertas` ligado |
| `REQUEST_IGNORE_BATTERY_OPTIMIZATIONS` | Pedir para o Android não matar o plantão no meio da jornada | caixa do sistema (`pedirSemOtimizacaoBateria`). Veja o alerta da Play Store abaixo |

**Volta automática:** depois de abrir a tela de configurações, o plugin confere a cada
400 ms (por até 2 min) se a permissão foi dada. Quando foi, traz o Aluguei de volta para a
frente e emite o evento `permissao`, e a tela web segue para o próximo passo. O Android só
deixa um app voltar sozinho para a frente em alguns casos, por isso a **ordem recomendada**
é: 1) sobreposição (depois dela a volta automática funciona nas outras), 2) notificações,
3) acessibilidade (o próprio leitor traz o app de volta ao ser ligado), 4) bateria. Se a
volta não acontecer, o evento fica guardado e chega quando o motorista voltar pelo botão Voltar.

## Publicar na Play Store

1. **Conta de desenvolvedor:** US$ 25, pagamento único, em play.google.com/console.
   Contas pessoais novas precisam de um **teste fechado com pelo menos 12 testadores por
   14 dias seguidos** antes de liberar a produção. Conta de empresa (CNPJ + D-U-N-S) não
   tem essa exigência.
2. **Política de privacidade** pública (ex.: `https://aluguei.xyz/privacidade`), dizendo o
   que o leitor lê, que o texto da tela não é guardado nem enviado, e que só os números das
   corridas (valor, km, minutos, sinal, decisão) vão para a conta do motorista.
3. **Segurança dos dados** (Data safety): declarar "Informações do app e desempenho" e
   "Atividade no app" coletadas, vinculadas à conta, com criptografia em trânsito, e que o
   usuário pode pedir exclusão.
4. **Declaração do serviço de acessibilidade** (Play Console > Conteúdo do app >
   Permissões confidenciais > Acessibilidade):
   - marcar que o uso **não** é uma ferramenta de acessibilidade (o XML já tem
     `isAccessibilityTool="false"`);
   - **aviso em destaque dentro do app, antes de abrir a tela de acessibilidade**, com
     botão de aceitar e de recusar. O aviso precisa estar no app (não só na loja). Texto sugerido
     para a tela web mostrar antes de chamar `pedirAcessibilidade()`:
     > **O Aluguei vai ler a tela dos apps de corrida.** Com o Copiloto ligado, o Aluguei usa
     > o serviço de acessibilidade do Android para ler, na tela da Uber, da 99 e da inDrive,
     > apenas as ofertas de corrida (valor, distâncias, tempos e, quando aparecem, nome e nota
     > do passageiro, forma de pagamento e endereços), e mostrar num cartão se a corrida
     > compensa. O Aluguei não guarda nem envia a tela, não lê outros apps e nunca toca, aceita,
     > recusa ou oferece tarifa por você. Os dados das ofertas avaliadas (números, nome, nota,
     > pagamento e destino) ficam no seu histórico do Aluguei. Você pode desligar quando quiser.
     > [Concordo e quero ligar] [Agora não]
   - **vídeo de demonstração** (link do YouTube, pode ser não listado) mostrando: o aviso em
     destaque, o motorista concordando, a ativação em Configurações > Acessibilidade, uma oferta
     chegando na Uber/99 e o cartão aparecendo, e que o app não toca em nada.
5. **Declaração do serviço em primeiro plano** (Conteúdo do app > Serviços em primeiro
   plano): tipo **specialUse**, descrição igual à do manifesto ("Mostrar o cálculo de ganho
   da corrida por cima do app de corrida, a pedido do motorista"), com o mesmo vídeo
   mostrando a notificação fixa e o botão Desligar.
6. **Localização:** declarar em Segurança dos dados "Local aproximado/exato", usado só no aparelho
   (para a volta até a base; a base salva vai para a conta). O serviço em primeiro plano passa a ter
   também o tipo **location**: na declaração de serviços em primeiro plano, explicar "calcular a
   volta do destino da corrida até a base do motorista enquanto a bolha está ligada" e mostrar no
   vídeo. Não pedimos localização em segundo plano (`ACCESS_BACKGROUND_LOCATION`). Os endereços de
   destino vão para photon.komoot.io e router.project-osrm.org (serviços públicos, sem conta) só
   para calcular a volta: citar na política de privacidade.
7. **Alerta sobre `REQUEST_IGNORE_BATTERY_OPTIMIZATIONS`:** a Play Store só aceita essa
   permissão para alguns tipos de app e pode recusar a versão. Se recusar, tire a permissão do
   manifesto: `pedirSemOtimizacaoBateria` já cai sozinho na lista geral de otimização de
   bateria, onde o próprio motorista marca o Aluguei.
8. Ficha da loja: ícone 512×512, imagem de destaque 1024×500, capturas de tela, descrição
   deixando claro "não é da Uber, 99 ou inDrive" (não use as marcas delas no ícone ou nome).
9. Classificação de conteúdo, público-alvo (adultos) e país (Brasil).

## Publicar na App Store (iPhone)

- **Conta Apple Developer:** US$ 99 por ano. Precisa de um Mac com Xcode.
- O projeto iOS já foi gerado em `ios/` (Capacitor 8 usa Swift Package Manager; não precisa
  de CocoaPods). No Mac: `pnpm install && npx cap sync ios && npx cap open ios`, escolha o
  time de assinatura em Signing & Capabilities, e Product > Archive > enviar ao App Store
  Connect / TestFlight.
- **No iPhone não há bolha nem leitor:** o iOS não deixa um app desenhar por cima de outro
  nem ler a tela de outro app. O app iOS é só o Aluguei (as telas do site).
- **Atenção à regra 4.2 (funcionalidade mínima):** a Apple recusa apps que só embalam um
  site. Para passar, o app precisa ter algo de nativo e explicar isso nas notas da revisão.
  Hoje o app iOS **não tem** nada nativo além da casca. Antes de enviar, vale acrescentar ao
  menos: notificações push nativas (APNs) para avisos de pagamento e de corrida,
  tela offline própria, compartilhamento nativo de recibos, e talvez um widget ou Live Activity
  com o ganho do dia. Sem isso, o mais provável é recusa; a alternativa é manter no iPhone o
  site instalado como PWA ("Adicionar à Tela de Início").
- Nas notas da revisão, explique o que é o Aluguei, deixe uma conta de teste e diga o que é nativo.

## Limitações (honestas)

- **As telas da Uber/99/inDrive mudam sem aviso.** Quando mudarem, o leitor pode parar de
  achar os números ou ler errado (ligue o Diagnóstico no menu da bolha para ver o que está lendo). A digitação rápida continua funcionando. No inDrive, ajuste `LeitorInDrive.kt` e `LeitorInDriveTest.kt`; na Uber/99, ajuste
  `oferta.ts`, `LeitorOferta.kt` e os testes juntos.
- **Termos de uso:** os termos da Uber/99/inDrive podem proibir apps que leem a tela deles.
  O Aluguei só lê e mostra; não aceita corridas nem automatiza nada, o que reduz o risco, mas
  não elimina. Avise o motorista.
- **Play Store:** a análise de apps com serviço de acessibilidade é rigorosa e pode recusar ou
  pedir mudanças; sem o leitor, o app continua útil com a digitação.
- **Só Android** tem bolha e leitor. Alguns fabricantes (Xiaomi, Samsung, Motorola) matam
  serviços em segundo plano mesmo com a permissão de bateria; pode ser preciso liberar
  "início automático" nas configurações do fabricante.
- O cálculo usa o perfil de custo e os critérios que o app web mandou por `configurar`. Sem
  isso, vale o padrão (`PERFIL_PADRAO`, `CRITERIOS_PADRAO`).
- **Volta:** Photon e OSRM são serviços públicos gratuitos, sem garantia; sem internet ou fora do
  ar, a linha mostra "volta —" e a régua não desconta a volta. Endereços muito curtos ("Rua F, 70")
  podem não ser achados; aí tenta o bairro/cidade entre parênteses. Sem base salva, a volta usa a
  última posição conhecida (até 10 min); se o Android recusar o primeiro plano com localização
  (reinício em segundo plano), só a base salva funciona.
- **Câmera de segurança:** alguns celulares não deixam duas câmeras abertas ao mesmo tempo (se o app
  de corrida pedir a câmera para uma selfie de verificação, a gravação para com um aviso; ligue de
  novo no Aluguei). O vídeo gira pela orientação do sensor (celular em pé no suporte); com o celular
  deitado, o vídeo pode sair de lado. Gravar gasta bateria e esquenta o aparelho: use carregador.
  A gravação só começa com o Aluguei aberto e não volta sozinha se o Android matar o serviço.
- **Print das ofertas:** só Android 11+; telas protegidas (FLAG_SECURE) saem pretas ou sem print. O
  print inclui o cartão do Copiloto por cima (é proposital: mostra a conta junto).
- **Economia:** reconhece "Offline"/"Online" e "Ficar online" na tela do inDrive; se o inDrive mudar
  esses textos, o leitor não dorme (gasta um pouco mais, mas não perde oferta).

## Interface do plugin para a tela web

O site, aberto dentro do app, recebe a ponte do Capacitor. Exemplo de uso (o pacote
`@capacitor/core` já está nas dependências):

```ts
import { Capacitor, registerPlugin, type PluginListenerHandle } from "@capacitor/core";
import type { Criterios, PerfilCusto } from "@/dominio/ganhos/custos";
import type { PreferenciasCopiloto } from "@/dominio/ganhos/copiloto";

export type TipoPermissao = "sobreposicao" | "acessibilidade" | "notificacoes" | "bateria" | "localizacao" | "camera";

export type Tema = "claro" | "escuro" | "auto";

export type EstadoPlantao = {
  android: true;
  sobreposicao: boolean;
  acessibilidade: boolean;
  notificacoes: boolean;
  semOtimizacaoBateria: boolean;
  /** Copiloto ligado e serviço rodando. */
  ligado: boolean;
  /** Já recebeu perfil por configurar(). */
  configurado: boolean;
  corridasPendentes: number;
  /** Pausado pelo menu da bolha ou pela notificação (bolha na tela, leitor parado). */
  pausado: boolean;
  tema: Tema;
  vibrar: boolean;
  /** Permissão de localização dada (volta para a base, "Definir base aqui"). */
  localizacao: boolean;
  /** Economia: o inDrive está offline e o leitor está dormindo. */
  dormindo: boolean;
  /** Permissões da câmera de segurança (microfone é opcional). */
  camera: boolean;
  microfone: boolean;
  /** A câmera de segurança está gravando. */
  gravando: boolean;
  /** Print das ofertas funciona neste Android (11+). */
  printDisponivel: boolean;
  /** Nome do último perfil de régua escolhido na bolha (só no aparelho), ou null. */
  perfilAtivo: string | null;
};

/** Câmera de segurança: desde = ISO (UTC) do início da gravação atual; usadoMb = vídeos que ela gravou. */
export type EstadoCamera = { gravando: boolean; desde: string | null; arquivos: number; usadoMb: number };

/** Perfil de régua escolhido na bolha (criterios no formato de custos.ts, ou null). */
export type PerfilEscolhido = { nome: string; criterios: unknown };

/** Critérios v2 (Criterios de custos.ts, já com nota, evitar, destinos, faixas e contarVolta). */
export type CriteriosCopiloto = Criterios;

/** Régua mudada pela bolha, em centavos. */
export type Regua = { minimoPorKm: number; minimoPorHora: number };

/** Resposta de pedir*(): concedida = já tinha; aberto = abriu a tela de configurações. */
export type PedidoPermissao = { tipo: TipoPermissao; concedida: boolean; aberto: boolean };

export type AvaliacaoNativa = {
  sinal: "verde" | "amarelo" | "vermelho";
  kmTotal: number; minutosTotal: number; tempoEstimado: boolean;
  porKm: number; porHora: number; custo: number; lucro: number; lucroPorHora: number; // centavos
  custoVolta: number;         // centavos (0 sem volta)
  motivos: string[];
  destaques: string[];        // ex.: "Destino desejado: Contagem"
};

export type CorridaNativa = {
  id: string;                 // UUID gerado no celular (use como chave de idempotência no envio)
  valor: number;              // centavos
  kmCorrida: number;
  minutosCorrida: number | null;
  kmBusca: number | null;
  minutosBusca: number | null;
  sinal: "verde" | "amarelo" | "vermelho";
  decisao: "aceitei" | "recusei" | "sem_resposta";
  origem: "leitura" | "digitada";
  app: "uber" | "99" | "indrive" | "outra" | null; // null quando digitada
  momento: string;            // ISO 8601 em UTC, ex. "2026-10-26T23:10:05.123Z"
  porKm: number; porHora: number; lucro: number;   // centavos (o servidor pode recalcular)
  nome: string | null;        // passageiro, quando o app mostra (inDrive)
  nota: number | null;        // nota do passageiro
  pagamento: "PIX" | "Dinheiro" | "Cartão" | null;
  destino: string | null;     // endereço de destino como o app mostrou
  risco: boolean;             // o app avisou que a região é perigosa
  suaOferta: number | null;   // inDrive: contraproposta do motorista (centavos)
  kmVolta: number | null;     // volta destino → base (km), quando calculada
  custoVolta: number | null;  // custo da volta (centavos), quando calculada (mesmo sem contarVolta)
  paradas: number;            // endereços além do embarque e do destino
  faixa: string | null;       // faixa de horário da régua no momento (ex.: "Madrugada")
  valorFinal: number | null;  // centavos: valor com que aceitou (lápis / "Fiz com outro valor" / sua oferta / valor)
  decisaoOrigem: "toque" | "pergunta" | "automatica" | null; // como a decisão foi tomada
};

export interface PlantaoPlugin {
  estado(): Promise<EstadoPlantao>;
  /**
   * preferencias (formato de copiloto.ts) manda; segundosCartao/vibrar soltos ficam por
   * compatibilidade. tema = tema do app web, usado quando preferencias.tema = "app".
   */
  configurar(o: { perfil?: PerfilCusto; criterios?: CriteriosCopiloto; preferencias?: PreferenciasCopiloto; segundosCartao?: number; tema?: Tema; vibrar?: boolean }): Promise<EstadoPlantao>;
  pedirSobreposicao(): Promise<PedidoPermissao>;
  pedirAcessibilidade(): Promise<PedidoPermissao>;
  pedirNotificacoes(): Promise<PedidoPermissao>;
  pedirSemOtimizacaoBateria(): Promise<PedidoPermissao>;
  /** Explicação + caixa do sistema; negada de vez → configurações do app (volta automática + evento "permissao"). */
  pedirLocalizacao(): Promise<PedidoPermissao & { tipo: "localizacao" }>;
  /** Posição atual para salvar como base (o app web dá o nome). Rejeita com code "SEM_LOCALIZACAO". */
  definirBaseAqui(): Promise<{ lat: number; lon: number }>;
  /** Rejeita com code "SEM_SOBREPOSICAO" ou "NAO_INICIOU". */
  ligar(): Promise<EstadoPlantao>;
  desligar(): Promise<EstadoPlantao>;
  /** Mostra o cartão com uma oferta de teste (liga o plantão se preciso). valor em centavos. */
  simular(o: { valor: number; kmCorrida: number; minutosCorrida?: number; kmBusca?: number; minutosBusca?: number }): Promise<AvaliacaoNativa>;
  corridasPendentes(): Promise<{ corridas: CorridaNativa[] }>;
  /** Corridas acompanhadas até o fim pelo GPS (km e tempo reais). */
  corridasFinalizadas(): Promise<{ corridas: { id: string; metros: number; minutos: number; inicio: string; fim: string; status: "concluida" }[] }>;
  confirmarFinalizadas(o: { ids: string[] }): Promise<void>;
  /** Tira da fila as enviadas: momento <= ate e/ou os ids. */
  confirmarEnvio(o: { ate?: string; ids?: string[] }): Promise<{ corridasPendentes: number }>;
  /** Lugares que o motorista adicionou pelo botão "Evitar este lugar" do cartão. */
  lugaresAdicionados(): Promise<{ lugares: string[] }>;
  limparLugaresAdicionados(): Promise<{ lugares: [] }>;
  /** Régua mudada no menu da bolha e ainda não salva na conta. */
  reguaPendente(): Promise<{ regua: Regua | null }>;
  limparReguaPendente(): Promise<{ regua: null }>;
  /** Perfil escolhido na bolha e ainda não salvo na conta. */
  perfilPendente(): Promise<{ perfil: PerfilEscolhido | null }>;
  limparPerfilPendente(): Promise<{ perfil: null }>;
  /** Câmera + microfone (caixa do sistema; negada de vez → configurações, volta automática + "permissao"). */
  pedirCamera(): Promise<PedidoPermissao & { tipo: "camera"; microfone?: boolean }>;
  /** Começa a gravar (só com o app visível). Rejeita "SEM_CAMERA", "NAO_VISIVEL" ou "NAO_INICIOU". */
  cameraIniciar(): Promise<EstadoCamera>;
  cameraParar(): Promise<EstadoCamera>;
  cameraEstado(): Promise<EstadoCamera>;

  addListener(e: "oferta", f: (c: CorridaNativa & Omit<AvaliacaoNativa, "sinal" | "porKm" | "porHora" | "lucro">) => void): Promise<PluginListenerHandle>;
  addListener(e: "decisao", f: (d: { id: string; decisao: "aceitei" | "recusei"; decisaoOrigem?: "toque" | "pergunta" | "automatica"; valorFinal?: number }) => void): Promise<PluginListenerHandle>;
  addListener(e: "permissao", f: (p: { tipo: TipoPermissao; concedida: true }) => void): Promise<PluginListenerHandle>;
  addListener(e: "estado", f: (s: EstadoPlantao) => void): Promise<PluginListenerHandle>;
  addListener(e: "regua", f: (r: Regua) => void): Promise<PluginListenerHandle>;
  /** "Definir base aqui" no menu da bolha: salve na conta com um nome (preferencias.base). */
  addListener(e: "base", f: (b: { lat: number; lon: number }) => void): Promise<PluginListenerHandle>;
  /** Preferência mudada na bolha ("Não perguntar mais"): salve na conta. */
  addListener(e: "preferencia", f: (p: { perguntarAceite?: boolean }) => void): Promise<PluginListenerHandle>;
  /** Perfil de régua escolhido no menu da bolha (guardado até a tela ouvir): salve na conta. */
  addListener(e: "perfil", f: (p: PerfilEscolhido) => void): Promise<PluginListenerHandle>;
}

export const Plantao = registerPlugin<PlantaoPlugin>("Plantao");
export const temPlantaoNativo = () => Capacitor.getPlatform() === "android" && Capacitor.isPluginAvailable("Plantao");
```

Observações:
- `preferencias` segue `normalizarPreferenciasCopiloto` (campo inválido volta ao padrão daquele
  campo). Se vier, ela manda em `segundosCartao` e `vibrar`. `preferencias.tema = "app"` usa o `tema`
  solto de `configurar` (ou "auto"). `voz` liga o TextToSpeech só quando ligada (e libera ao desligar).
- **Pendentes da bolha:** "Definir base aqui" e "Não perguntar mais" valem na hora no aparelho e
  emitem `base` / `preferencia` (guardados até a tela ouvir). Enquanto o `configurar({ preferencias })`
  não trouxer a mesma base (ou `perguntarAceite: false`), o valor do aparelho continua valendo. Fluxo:
  ouvir o evento → salvar na conta → `configurar` de novo.
- `definirBaseAqui()` também guarda a base no aparelho (nome "Base") até o app mandar a base com nome.
- A régua aplicada é `criteriosNoHorario(criterios, minuto de agora em America/Sao_Paulo)`; a régua
  rápida da bolha muda os mínimos gerais (dentro de uma faixa, valem os da faixa).
- `segundosCartao` aceita de 4 a 120 (padrão 12). No inDrive (leitura) o cartão fica enquanto a
  oferta estiver aberta (até 60 s) e some quando a tela vira lista ou a oferta acaba.
- `tema`: "claro" | "escuro" | "auto" (padrão "auto", segue o modo escuro do sistema); o menu da
  bolha também troca. `vibrar` padrão true.
- `criterios.evitar` é normalizada como no TS (espaços, 3 a 60 letras, sem repetidos, até 100);
  `criterios.notaMinima` de 0 a 5. A lista usada no cartão é `evitar` + `lugaresAdicionados()`.
- **Régua pendente:** mexer na régua rápida da bolha salva os mínimos no aparelho, emite `regua`
  e deixa `reguaPendente()` preenchida. Enquanto houver pendente, `configurar({ criterios })` não
  sobrescreve `minimoPorKm`/`minimoPorHora`. Fluxo: `reguaPendente()` → salvar na conta →
  `limparReguaPendente()` → `configurar` de novo.
- O evento `regua` também é guardado até a tela ouvir.
- **Perfil pendente:** escolher um perfil na bolha troca os critérios no aparelho, emite `perfil` e
  deixa `perfilPendente()` preenchido. Enquanto houver pendente, `configurar({ criterios })` não
  mexe nos critérios. Fluxo: `perfilPendente()` (ou o evento) → salvar os critérios na conta →
  `limparPerfilPendente()` → `configurar` de novo.
- **Câmera:** `pedirCamera()` → `cameraIniciar()` com a tela aberta → `cameraEstado()` para mostrar
  "gravando desde…", quantos arquivos e quanto espaço. O evento `estado` sai quando a câmera começa
  ou para (inclusive pelo botão Parar da notificação).
- `configurar` aceita só uma parte (ex.: só `criterios`); o que não vier fica como estava.
  Campo inválido volta ao padrão daquele campo, como `normalizarPerfil`/`normalizarCriterios`.
- O evento `permissao` é guardado até a tela ouvir (se a WebView ainda estiver voltando).
- O evento `estado` sai quando o plantão é desligado pela bolha (X) ou pela notificação.
- A fila guarda no máximo 500 corridas (as mais antigas saem primeiro).
- Fluxo de envio sugerido: `corridasPendentes()` → enviar ao servidor usando `id` como chave de
  idempotência → `confirmarEnvio({ ids })`.

## Gerar o APK sem instalar nada (GitHub Actions)

O GitHub compila o app na nuvem (`.github/workflows/android.yml`):

1. No GitHub, abra o repositório → aba **Actions** → **App Android (APK)**.
2. **Run workflow** → escolha o branch → **Run workflow**. Leva uns 10 minutos.
   (Também roda sozinho quando algo em `android/` muda.)
3. Abra a execução (bolinha verde) → no fim da página, em **Artifacts**, baixe
   `aluguei-debug-apk` (vem em .zip; dentro está o `app-debug.apk`).

## Instalar no celular Android

1. Mande o `app-debug.apk` para o celular (Google Drive, WhatsApp para você mesmo
   ou cabo USB) e toque nele.
2. O Android pergunta se permite instalar de "fonte desconhecida": toque em
   **Configurações** → ligue **Permitir desta fonte** → volte e **Instalar**.
3. Se aparecer o Play Protect, toque em **Instalar mesmo assim** (é normal para
   app fora da loja).
4. Abra o Aluguei, entre na conta e vá em **Plantão → Copiloto**.
5. **Leitura automática no Android 13 ou mais novo:** app instalado fora da loja
   tem a acessibilidade bloqueada ("configuração restrita"). Libere em
   Configurações → Apps → Aluguei → **⋮** (canto de cima) → **Permitir
   configurações restritas**. Depois ative de novo pelo app. Na versão da Play
   Store isso não acontece.

Para atualizar: gere de novo e instale por cima (os dados continuam).

## Se um dia quiser o Android Studio

1. Baixe em developer.android.com/studio e instale com as opções padrão.
2. Na primeira abertura, deixe ele baixar o SDK (Next até o fim).
3. No projeto: `pnpm install` e `npx cap open android` (abre o Android Studio).
4. Ligue o celular no cabo com a **Depuração USB** ativa (Configurações → Sobre
   o telefone → toque 7 vezes em "Número da versão" → Opções do desenvolvedor →
   Depuração USB) e aperte o ▶ verde.
