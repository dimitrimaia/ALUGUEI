package xyz.aluguei.app.plantao

import kotlin.math.roundToLong

/**
 * Corrida em andamento medida pelo GPS: tempo e km de verdade, do aceite até o
 * fim (tela de avaliação do inDrive, outra oferta aceita ou "Finalizar" na bolha).
 *
 * Puro (sem Android): testado em TrajetoTest.kt. Só guarda a soma, nunca o caminho.
 */
data class Trajeto(
    /** Id da corrida na fila (CorridaAvaliada.id). */
    val corridaId: String,
    val valor: Long,
    val inicioMs: Long,
    val metros: Double = 0.0,
    val ultimo: Ponto? = null,
    val ultimoMs: Long = 0,
    /** Para os botões de navegação da pílula (o cartão some ao aceitar). */
    val embarque: String? = null,
    val destino: String? = null,
    /** Quantas posições do GPS chegaram (0 depois de 1 min = sem GPS). */
    val leituras: Int = 0,
) {
    val km: Double get() = metros / 1000

    fun minutos(agoraMs: Long): Double = (agoraMs - inicioMs).coerceAtLeast(0) / 60_000.0

    /**
     * Soma uma posição. Ignora leitura imprecisa (> 50 m), tremida parada (< 15 m)
     * e salto impossível (> 180 km/h): o GPS do celular erra assim.
     */
    fun somar(p: Ponto, precisaoM: Float, ms: Long): Trajeto = somarLeitura(p, precisaoM, ms).copy(leituras = leituras + 1)

    private fun somarLeitura(p: Ponto, precisaoM: Float, ms: Long): Trajeto {
        if (precisaoM > PRECISAO_MAXIMA_M) return this
        val anterior = ultimo ?: return copy(ultimo = p, ultimoMs = ms)
        val d = Volta.distanciaReta(anterior, p) * 1000
        if (d < PASSO_MINIMO_M) return this
        val segundos = (ms - ultimoMs) / 1000.0
        if (segundos <= 0 || d / segundos > VELOCIDADE_MAXIMA_MS) return copy(ultimo = p, ultimoMs = ms)
        return copy(metros = metros + d, ultimo = p, ultimoMs = ms)
    }

    /** "1h03 · 43,4 km"; sem nenhuma posição depois de 1 minuto: "1h03 · sem GPS". */
    fun resumo(agoraMs: Long): String {
        val min = minutos(agoraMs).toLong()
        val tempo = if (min >= 60) "${min / 60}h${(min % 60).toString().padStart(2, '0')}" else "$min min"
        val semGps = leituras == 0 && agoraMs - inicioMs > 60_000
        return if (semGps) "$tempo · sem GPS" else "$tempo · ${Formato.km(km)} km"
    }

    /** R$/km de verdade (centavos), com o km medido; null antes de 0,5 km. */
    fun porKmReal(): Long? = if (km < 0.5) null else (valor / km).roundToLong()

    companion object {
        const val PRECISAO_MAXIMA_M = 50f
        const val PASSO_MINIMO_M = 15.0
        const val VELOCIDADE_MAXIMA_MS = 50.0

        /** Corrida esquecida aberta: fecha sozinha depois disso. */
        const val DURACAO_MAXIMA_MS = 2 * 60 * 60_000L

        /** Fim antes disso (lista/procurando logo após aceitar) não conta como corrida feita. */
        const val MINIMO_PARA_FIM_MS = 3 * 60_000L
    }
}
