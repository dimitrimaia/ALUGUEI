package xyz.aluguei.app.plantao

/**
 * Lê o texto de um cartão de oferta de corrida (Uber, 99, inDrive) e tira valor,
 * distâncias e tempos.
 *
 * Espelho EXATO de src/dominio/ganhos/oferta.ts (mesmas regex, mesma ordem de
 * tentativa). Mudou lá, mude aqui (e em LeitorOfertaTest.kt).
 *
 * Para dar o mesmo resultado do JavaScript tanto na JVM (testes) quanto no
 * Android (que usa o motor de regex do ICU), as classes que mudam de motor para
 * motor estão escritas por extenso:
 *  - `\d` do JS (sem a flag u) é só 0-9            → [0-9]
 *  - `\s` do JS inclui espaço não separável etc.   → ESPACO
 *  - `\b` do JS considera só [A-Za-z0-9_]          → (?![A-Za-z0-9_]) depois de letra
 *  - flag `i` do JS (sem u) só junta letras ASCII  → [kK][mM], [mM][iI][nN]...
 *
 * Os cartões trazem pares "tempo (distância)" na ordem: primeiro até o
 * passageiro, depois a viagem. Ex.: "8 min (2,3 km)" e "Viagem: 15 min (7,4 km)".
 */
object LeitorOferta {

    /** Mesma lista do `\s` do JavaScript. */
    private const val ESPACO = "[\\t\\n\\x0B\\f\\r \\u00A0\\u1680\\u2000-\\u200A\\u2028\\u2029\\u202F\\u205F\\u3000\\uFEFF]"
    private const val S = "$ESPACO*"
    private const val FIM_PALAVRA = "(?![A-Za-z0-9_])"
    private const val KM_ = "[kK][mM]"
    private const val MIN_ = "[mM][iI][nN]"

    private const val NUM = "([0-9]{1,4}(?:[.,][0-9]{1,2})?)"
    private val DINHEIRO = Regex("R\\$" + S + "([0-9]{1,3}(?:\\.[0-9]{3})*(?:,[0-9]{1,2})?|[0-9]+(?:[.,][0-9]{1,2})?)")
    private val PAR = Regex("$NUM$S$MIN_(?:[uU][tT][oO][sS]?)?$S\\(?$S(?:[•·-]$S)?$NUM$S$KM_$FIM_PALAVRA")
    private val PAR_INVERTIDO = Regex("$NUM$S$KM_$S\\)?$S(?:[•·,-]$S)?$NUM$S$MIN_")
    private val KM = Regex("$NUM$S$KM_$FIM_PALAVRA")
    private val MIN = Regex("$NUM$S$MIN_")
    private val METROS = Regex("([0-9]{2,4})$S[mM]$FIM_PALAVRA(?![iI][nN])")
    private val ESPACOS = Regex("$ESPACO+")
    private val PONTO_DECIMAL = Regex("\\.[0-9]{1,2}$")

    /** Number(s.replace(",", ".")) do JS: troca só a primeira vírgula. */
    private fun numero(s: String): Double = s.replaceFirst(",", ".").toDouble()

    private fun lerValor(texto: String): Long? {
        val m = DINHEIRO.find(texto) ?: return null
        val bruto = m.groupValues[1]
        // "1.234,56" ou "12,50" (vírgula decimal); "12.50" (ponto decimal, raro)
        val reais = when {
            bruto.contains(",") -> bruto.replace(".", "").replaceFirst(",", ".").toDoubleOrNull()
            PONTO_DECIMAL.containsMatchIn(bruto) -> bruto.toDoubleOrNull()
            else -> bruto.replace(".", "").toDoubleOrNull()
        } ?: return null
        return if (reais.isFinite() && reais > 0) jsRound(reais * 100) else null
    }

    private data class Par(val min: Double, val km: Double)

    fun lerOferta(texto: String): OfertaLida? {
        val t = texto.replace(ESPACOS, " ")
        val valor = lerValor(t) ?: return null

        var pares = PAR.findAll(t).map { Par(min = numero(it.groupValues[1]), km = numero(it.groupValues[2])) }.toList()
        if (pares.isEmpty()) pares = PAR_INVERTIDO.findAll(t).map { Par(km = numero(it.groupValues[1]), min = numero(it.groupValues[2])) }.toList()
        if (pares.size >= 2) {
            val busca = pares[0]
            val corrida = pares[1]
            return OfertaLida(valor, kmBusca = busca.km, minutosBusca = busca.min, kmCorrida = corrida.km, minutosCorrida = corrida.min, completa = true)
        }
        val kms = KM.findAll(t).map { numero(it.groupValues[1]) }.toList()
        val metros = METROS.findAll(t).map { it.groupValues[1].toDouble() / 1000 }.toList()
        val mins = MIN.findAll(t).map { numero(it.groupValues[1]) }.toList()
        if (pares.size == 1) {
            // Um par só: é a viagem; a busca pode vir em metros ("a 800 m").
            return OfertaLida(valor, kmCorrida = pares[0].km, minutosCorrida = pares[0].min, kmBusca = metros.firstOrNull(), minutosBusca = null, completa = true)
        }
        val distancias = metros + kms
        if (kms.isEmpty()) return null
        if (distancias.size >= 2) {
            return OfertaLida(
                valor,
                kmBusca = distancias[0],
                kmCorrida = distancias[1],
                minutosBusca = if (mins.size >= 2) mins[0] else null,
                minutosCorrida = if (mins.size >= 2) mins[1] else mins.firstOrNull(),
                completa = mins.size >= 2,
            )
        }
        return OfertaLida(valor, kmCorrida = kms[0], minutosCorrida = mins.lastOrNull(), kmBusca = null, minutosBusca = null, completa = false)
    }
}

/** Oferta lida da tela; `completa` = achou tempo e distância da busca e da viagem. */
data class OfertaLida(
    val valor: Long,
    val kmCorrida: Double,
    val minutosCorrida: Double?,
    val kmBusca: Double?,
    val minutosBusca: Double?,
    val completa: Boolean,
) {
    fun paraOferta() = Oferta(valor = valor, kmCorrida = kmCorrida, minutosCorrida = minutosCorrida, kmBusca = kmBusca, minutosBusca = minutosBusca)
}
