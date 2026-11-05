# Publicar na Play Store (quando for a hora)

> Guia completo, com textos e imagens: [play-store/PASSO-A-PASSO.md](play-store/PASSO-A-PASSO.md).

Tudo já está preparado no código. Faltam só os passos que dependem de você.

## Por que vale a pena
- Sem o aviso do Play Protect ("app não verificado").
- Sem o bloqueio da acessibilidade ("configuração restrita") que aparece em app instalado fora da loja.
- Atualização automática pela loja.

## 1. Conta de desenvolvedor (uma vez)
1. Acesse play.google.com/console com a conta Google da empresa.
2. Pague a taxa única (US$ 25) e preencha os dados. Conta pessoal pede verificação de identidade;
   conta de empresa pede o D-U-N-S (grátis, demora uns dias).
3. Contas novas pessoais precisam fazer um **teste fechado com 12 testadores por 14 dias** antes de
   publicar para todos. O teste interno (até 100 pessoas) pode começar na hora.

## 2. Chave de envio (uma vez, no seu computador)
O Google guarda a chave definitiva do app (Play App Signing). Você só cria a **chave de envio**:

```
keytool -genkeypair -v -keystore envio.jks -alias aluguei -keyalg RSA -keysize 2048 -validity 10000
```
(o `keytool` vem com o Java; no Windows, instale o "Temurin JDK 21".)

Guarde o arquivo `envio.jks` e as senhas num lugar seguro (gerenciador de senhas). **Não coloque no
repositório.** Se perder, dá para pedir ao Google uma chave de envio nova.

## 3. Segredos no GitHub
GitHub → repositório → Settings → Secrets and variables → Actions → New repository secret:

| Nome | Valor |
|---|---|
| `ALUGUEI_KEYSTORE_BASE64` | o arquivo em base64: `base64 -w0 envio.jks` (Mac: `base64 -i envio.jks`) |
| `ALUGUEI_KEYSTORE_SENHA` | senha do arquivo |
| `ALUGUEI_CHAVE_ALIAS` | `aluguei` |
| `ALUGUEI_CHAVE_SENHA` | senha da chave |

Depois disso, cada execução de **Actions → App Android (APK)** gera também o
`aluguei-play-store-aab` (o arquivo que a loja aceita).

## 4. Criar o app no Play Console
1. Criar app: nome "Aluguei", idioma português (Brasil), app, gratuito.
2. **Teste interno** → Criar versão → enviar o `.aab` → adicionar os e-mails dos testadores.
3. Preencher: classificação de conteúdo, público-alvo (18+), segurança dos dados, política de
   privacidade (URL no site).
4. **Declarações especiais** (o Copiloto usa recursos sensíveis):
   - **Acessibilidade (AccessibilityService)**: uso "não é ferramenta de acessibilidade". Texto do
     aviso em destaque e vídeo da demonstração: ver `app-nativo.md`.
   - **Serviço em primeiro plano**: tipos specialUse (bolha), location (volta para casa) e
     camera/microphone (câmera de segurança). Cada um pede um vídeo curto mostrando o uso.
   - **Localização**: explicar que é só com o Copiloto ligado, para a volta para casa.
   - Se a revisão recusar `REQUEST_IGNORE_BATTERY_OPTIMIZATIONS`, tirar do manifesto.

## 5. Vídeos para a revisão (gravar no celular)
1. Ligar o Copiloto mostrando o aviso em destaque e o "Li e entendi".
2. Uma oferta do inDrive chegando e o cartão aparecendo (sem tocar em nada no inDrive pelo app).
3. Câmera de segurança: começar a gravar pelo app e a notificação "gravando".

## iPhone (App Store)
Conta da Apple: US$ 99/ano. No iPhone não há bolha nem leitura (a Apple não permite); o app tem o
resto. Precisa de um Mac para compilar (ver `app-nativo.md`).
