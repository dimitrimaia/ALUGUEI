# App nativo (Android e iPhone)

O app nativo do Aluguei é uma "casca" feita com [Capacitor](https://capacitorjs.com) mais um
plugin próprio para Android, o **Plantão**, que mostra o semáforo das corridas por cima da
Uber, da 99 e da inDrive.

## Como o app é montado

```
celular
├── WebView (Capacitor, modo servidor remoto)
│     └── carrega https://aluguei.xyz  ← todas as telas vêm do site, como hoje
└── Plugin "Plantao" (Kotlin, só Android)
      ├── BolhaService          serviço em primeiro plano: bolha, painel de digitação, cartão colorido
      ├── LeitorCorridasService serviço de acessibilidade: lê valor/km/min da oferta na tela
      ├── LeitorOferta.kt       mesmas regras de src/dominio/ganhos/oferta.ts
      ├── Calculo.kt            mesmas regras de src/dominio/ganhos/custos.ts e corrida.ts
      ├── Armazenamento.kt      perfil, critérios e fila de corridas (SharedPreferences)
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

1. Liga o plantão na tela web (ou pela tela de permissões, passo a passo).
2. Aparece uma bolha redonda "R$" por cima de tudo, e a notificação fixa "Plantão ligado"
   com o botão **Desligar**.
3. Chega uma oferta na Uber/99/inDrive → o leitor pega valor, km e minutos → aparece um
   cartão no topo da tela, verde/amarelo/vermelho, com R$/km, R$/hora, lucro estimado, km
   total e "a X km do passageiro". Some em 12 s (configurável) ou ao tocar fora.
4. Botões **Aceitei** / **Recusei** só registram a decisão. **O app nunca toca no app de
   corrida e nunca aceita nem recusa corrida pelo motorista.**
5. Sem o leitor (ou num app que ele não lê): toca na bolha → painel de digitação rápida
   (valor, km, minutos opcional, km até o passageiro opcional) → mesmo cartão.
6. Arrastar a bolha até o **X** no rodapé desliga o plantão. Ao soltar em outro lugar, ela
   encosta na borda e a posição fica salva.

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
`adb logcat | grep -i plantao` para ver erros. Para testar o cartão sem corrida de verdade,
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
| Serviço de acessibilidade (`BIND_ACCESSIBILITY_SERVICE`) | Ler valor, km e minutos da oferta na tela da Uber/99/inDrive | Configurações > Acessibilidade > "Aluguei: leitor de corridas" (`pedirAcessibilidade`). Opcional: sem ele, só digitação |
| `FOREGROUND_SERVICE` + `FOREGROUND_SERVICE_SPECIAL_USE` | Manter o plantão vivo durante a jornada, com a notificação fixa | automática |
| `POST_NOTIFICATIONS` | Mostrar "Plantão ligado" com o botão Desligar (Android 13+ pergunta) | caixa do sistema, ou tela de notificações do app (`pedirNotificacoes`) |
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
     > **O Aluguei vai ler a tela dos apps de corrida.** Com o plantão ligado, o Aluguei usa
     > o serviço de acessibilidade do Android para ler, na tela da Uber, da 99 e da inDrive,
     > apenas o valor, a distância e o tempo das ofertas de corrida, e mostrar na bolha se a
     > corrida compensa. O Aluguei não guarda nem envia o texto da tela, não lê outros apps e
     > nunca toca, aceita ou recusa corridas por você. Os números das corridas avaliadas ficam
     > no seu histórico do Aluguei. Você pode desligar quando quiser.
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
  achar os números ou ler errado. A digitação rápida continua funcionando. Ajuste
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

export type EstadoPlantao = {
  android: true;
  sobreposicao: boolean;
  acessibilidade: boolean;
  notificacoes: boolean;
  semOtimizacaoBateria: boolean;
  /** Plantão ligado e serviço rodando. */
  ligado: boolean;
  /** Já recebeu perfil por configurar(). */
  configurado: boolean;
  corridasPendentes: number;
};

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
};

export interface PlantaoPlugin {
  estado(): Promise<EstadoPlantao>;
  configurar(o: { perfil?: PerfilCusto; criterios?: Criterios; segundosCartao?: number }): Promise<EstadoPlantao>;
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

  addListener(e: "oferta", f: (c: CorridaNativa & Omit<AvaliacaoNativa, "sinal" | "porKm" | "porHora" | "lucro">) => void): Promise<PluginListenerHandle>;
  addListener(e: "decisao", f: (d: { id: string; decisao: "aceitei" | "recusei" }) => void): Promise<PluginListenerHandle>;
  addListener(e: "permissao", f: (p: { tipo: TipoPermissao; concedida: true }) => void): Promise<PluginListenerHandle>;
  addListener(e: "estado", f: (s: EstadoPlantao) => void): Promise<PluginListenerHandle>;
}

export const Plantao = registerPlugin<PlantaoPlugin>("Plantao");
export const temPlantaoNativo = () => Capacitor.getPlatform() === "android" && Capacitor.isPluginAvailable("Plantao");
```

Observações:
- `segundosCartao` aceita de 4 a 120 (padrão 12).
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
4. Abra o Aluguei, entre na conta e vá em **Plantão → Semáforo**.
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
