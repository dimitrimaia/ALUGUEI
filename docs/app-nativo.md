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
      ├── Calculo.kt            mesmas regras de src/dominio/ganhos/custos.ts e corrida.ts
      ├── Copiloto.kt           lugares a evitar, nota mínima, risco e contraproposta sugerida
      ├── Armazenamento.kt      perfil, critérios, tema, régua, lugares, resumo do dia e fila (SharedPreferences)
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
- **Mesma regra nos dois lados:** `Calculo.kt` e `LeitorOferta.kt` são espelho exato do
  TypeScript. Mudou `custos.ts`, `corrida.ts` ou `oferta.ts`? Mude o `.kt` e os testes
  JUnit em `android/app/src/test/java/xyz/aluguei/app/plantao/` (mesmos casos de
  `ganhos.test.ts`).

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
   Arrastar na vertical muda a posição (lembrada por app); arrastar para o lado fecha.
4. **inDrive:** o cartão só aparece com a oferta aberta (botão "Aceitar por R$ X"); na lista de
   pedidos ele some. A linha de destaque sugere a contraproposta: "Toque em R$ 23" (menor atalho
   que deixa verde), "Use o lápis: R$ 27" ou "Nem o dobro (R$ X) fica verde"; se já é verde,
   "Pode aceitar". Enviada a contraproposta ("Oferecendo sua tarifa R$ 22"), o cartão recalcula
   com "Sua oferta: R$ 22". Expirou / já aceita / procurando → o cartão some.
5. **Área de risco** (aviso do inDrive): faixa "⚠ Área de risco" e botão "Evitar este lugar", que
   guarda o bairro (ou a rua) na lista local de lugares a evitar. Endereço com um lugar da lista
   (`criterios.evitar` + os da bolha) → cartão vermelho "Lugar que você evita: X". Nota abaixo de
   `criterios.notaMinima` → no mínimo amarelo, "Nota baixa".
6. **Aceitei** / **Recusei** só registram a decisão. "Recusei" (ou fechar) não deixa a mesma
   oferta reaparecer enquanto ela estiver aberta. **O app nunca toca no app de corrida e nunca
   aceita, recusa ou oferece tarifa pelo motorista** (sem performAction, sem gestos).
7. **Toque na bolha** → digitação rápida (o teclado só abre ao tocar no campo; toque fora fecha):
   valor, km, minutos e km até o passageiro, atalhos "+R$ 5" e "+1 km", resultado ao vivo.
8. **Segurar a bolha** → menu em leque: Pausar/Retomar, Digitar oferta, Tema claro/escuro, Régua
   rápida (+/− nos mínimos por km e por hora; emite `regua` e fica pendente para o app salvar),
   Resumo do dia, Diagnóstico (rótulo junto da bolha com o último app/tela lida: "oferta lida",
   "lista", "sem oferta"…), Abrir o Aluguei, Desligar.
9. Arrastar a bolha até o **X** no rodapé desliga. Ao soltar em outro lugar, ela encosta na borda
   e a posição fica salva.

**Desempenho:** o leitor junta os eventos e lê no máximo a cada 700 ms, com limite de nós
(500), profundidade (30), textos (250) e caracteres (6000). Desligado ou pausado, não lê nada.
Bolha e cartão não têm nenhum laço: só reagem a eventos.

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
6. **Alerta sobre `REQUEST_IGNORE_BATTERY_OPTIMIZATIONS`:** a Play Store só aceita essa
   permissão para alguns tipos de app e pode recusar a versão. Se recusar, tire a permissão do
   manifesto: `pedirSemOtimizacaoBateria` já cai sozinho na lista geral de otimização de
   bateria, onde o próprio motorista marca o Aluguei.
7. Ficha da loja: ícone 512×512, imagem de destaque 1024×500, capturas de tela, descrição
   deixando claro "não é da Uber, 99 ou inDrive" (não use as marcas delas no ícone ou nome).
8. Classificação de conteúdo, público-alvo (adultos) e país (Brasil).

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

## Interface do plugin para a tela web

O site, aberto dentro do app, recebe a ponte do Capacitor. Exemplo de uso (o pacote
`@capacitor/core` já está nas dependências):

```ts
import { Capacitor, registerPlugin, type PluginListenerHandle } from "@capacitor/core";
import type { Criterios, PerfilCusto } from "@/dominio/ganhos/custos";

export type TipoPermissao = "sobreposicao" | "acessibilidade" | "notificacoes" | "bateria";

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
};

/** Critérios do app mais os do Copiloto (ver custos.ts). */
export type CriteriosCopiloto = Criterios & {
  /** Nota mínima do passageiro (0 = desligado). Abaixo → amarelo "Nota baixa". */
  notaMinima?: number;
  /** Ruas, bairros ou palavras que o motorista evita (sem acento/maiúscula). Bateu → vermelho. */
  evitar?: string[];
};

/** Régua mudada pela bolha, em centavos. */
export type Regua = { minimoPorKm: number; minimoPorHora: number };

/** Resposta de pedir*(): concedida = já tinha; aberto = abriu a tela de configurações. */
export type PedidoPermissao = { tipo: TipoPermissao; concedida: boolean; aberto: boolean };

export type AvaliacaoNativa = {
  sinal: "verde" | "amarelo" | "vermelho";
  kmTotal: number; minutosTotal: number; tempoEstimado: boolean;
  porKm: number; porHora: number; custo: number; lucro: number; lucroPorHora: number; // centavos
  motivos: string[];
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
};

export interface PlantaoPlugin {
  estado(): Promise<EstadoPlantao>;
  configurar(o: { perfil?: PerfilCusto; criterios?: CriteriosCopiloto; segundosCartao?: number; tema?: Tema; vibrar?: boolean }): Promise<EstadoPlantao>;
  pedirSobreposicao(): Promise<PedidoPermissao>;
  pedirAcessibilidade(): Promise<PedidoPermissao>;
  pedirNotificacoes(): Promise<PedidoPermissao>;
  pedirSemOtimizacaoBateria(): Promise<PedidoPermissao>;
  /** Rejeita com code "SEM_SOBREPOSICAO" ou "NAO_INICIOU". */
  ligar(): Promise<EstadoPlantao>;
  desligar(): Promise<EstadoPlantao>;
  /** Mostra o cartão com uma oferta de teste (liga o plantão se preciso). valor em centavos. */
  simular(o: { valor: number; kmCorrida: number; minutosCorrida?: number; kmBusca?: number; minutosBusca?: number }): Promise<AvaliacaoNativa>;
  corridasPendentes(): Promise<{ corridas: CorridaNativa[] }>;
  /** Tira da fila as enviadas: momento <= ate e/ou os ids. */
  confirmarEnvio(o: { ate?: string; ids?: string[] }): Promise<{ corridasPendentes: number }>;
  /** Lugares que o motorista adicionou pelo botão "Evitar este lugar" do cartão. */
  lugaresAdicionados(): Promise<{ lugares: string[] }>;
  limparLugaresAdicionados(): Promise<{ lugares: [] }>;
  /** Régua mudada no menu da bolha e ainda não salva na conta. */
  reguaPendente(): Promise<{ regua: Regua | null }>;
  limparReguaPendente(): Promise<{ regua: null }>;

  addListener(e: "oferta", f: (c: CorridaNativa & Omit<AvaliacaoNativa, "sinal" | "porKm" | "porHora" | "lucro">) => void): Promise<PluginListenerHandle>;
  addListener(e: "decisao", f: (d: { id: string; decisao: "aceitei" | "recusei" }) => void): Promise<PluginListenerHandle>;
  addListener(e: "permissao", f: (p: { tipo: TipoPermissao; concedida: true }) => void): Promise<PluginListenerHandle>;
  addListener(e: "estado", f: (s: EstadoPlantao) => void): Promise<PluginListenerHandle>;
  addListener(e: "regua", f: (r: Regua) => void): Promise<PluginListenerHandle>;
}

export const Plantao = registerPlugin<PlantaoPlugin>("Plantao");
export const temPlantaoNativo = () => Capacitor.getPlatform() === "android" && Capacitor.isPluginAvailable("Plantao");
```

Observações:
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
