package xyz.aluguei.app.plantao

import java.net.URLEncoder

/**
 * Qual intent os botões Embarque e Destino (cartão e notificação) abrem, pela
 * preferência appNavegacao. Puro (os testes JUnit conferem): quem monta o
 * Intent de verdade é a BolhaService.
 *
 *  - maps: Google Maps já navegando (google.navigation:q=…, pacote do Maps);
 *  - waze: https://waze.com/ul?q=…&navigate=yes (pacote do Waze);
 *  - perguntar: o Android pergunta qual app usar (chooser);
 *  - padrao: geo:0,0?q=… (o app de mapas padrão do celular).
 * Se o app escolhido não estiver instalado, cai no padrão.
 */
object Navegacao {
    val APPS = setOf("padrao", "maps", "waze", "perguntar")

    const val PACOTE_MAPS = "com.google.android.apps.maps"
    const val PACOTE_WAZE = "com.waze"

    /** O que abrir: ACTION_VIEW com [uri], só no [pacote] (se não for null), dentro de um chooser se [perguntar]. */
    data class Alvo(val uri: String, val pacote: String?, val perguntar: Boolean)

    /** Igual ao Uri.encode do Android: espaço vira %20 (não +). */
    fun codificar(t: String): String = URLEncoder.encode(t, "UTF-8").replace("+", "%20")

    fun padrao(endereco: String) = Alvo("geo:0,0?q=" + codificar(endereco), null, false)

    fun escolher(app: String, endereco: String, instalado: (String) -> Boolean): Alvo = when (app) {
        "maps" -> if (instalado(PACOTE_MAPS)) Alvo("google.navigation:q=" + codificar(endereco), PACOTE_MAPS, false) else padrao(endereco)
        "waze" -> if (instalado(PACOTE_WAZE)) Alvo("https://waze.com/ul?q=" + codificar(endereco) + "&navigate=yes", PACOTE_WAZE, false) else padrao(endereco)
        "perguntar" -> padrao(endereco).copy(perguntar = true)
        else -> padrao(endereco)
    }
}
