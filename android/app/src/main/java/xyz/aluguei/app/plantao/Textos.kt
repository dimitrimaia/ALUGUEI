package xyz.aluguei.app.plantao

import java.text.Normalizer

/** Utilidades de texto dos leitores (puras, testáveis na JVM). */
object Textos {
    private val MARCAS = Regex("\\p{Mn}+")
    private val ESPACOS = Regex("[\\s\\u00A0\\u2007\\u202F\\u2009\\u200A]+")

    /** "Santa Efigênia" → "santa efigenia". */
    fun semAcento(s: String): String =
        Normalizer.normalize(s, Normalizer.Form.NFD).replace(MARCAS, "").lowercase().replace(ESPACOS, " ").trim()

    /** Espaços esquisitos viram espaço comum; quebra de linha separa em textos. */
    fun limpar(textos: List<String>): List<String> = textos.asSequence()
        .flatMap { it.split('\n', '\r').asSequence() }
        .map { it.replace(ESPACOS, " ").trim() }
        .filter { it.isNotEmpty() }
        .toList()

    private val DINHEIRO = Regex("R\\$\\s*([0-9][0-9.,]*)")
    private val POR_KM_DEPOIS = Regex("^\\s*/\\s*[kK][mM]")

    /** Valores "R$ N" do texto, em centavos, ignorando os "R$ N/km". */
    fun dinheiros(texto: String): List<Long> = DINHEIRO.findAll(texto).mapNotNull { m ->
        val resto = texto.substring(m.range.last + 1)
        if (POR_KM_DEPOIS.containsMatchIn(resto)) return@mapNotNull null
        Formato.lerReais(m.groupValues[1].trimEnd('.', ','))
    }.toList()

    private val POR_KM = Regex("R\\$\\s*([0-9]+(?:[.,][0-9]{1,2})?)\\s*/\\s*[kK][mM]")

    /** "R$1,6/km" → 160 (centavos). */
    fun porKm(texto: String): Long? = POR_KM.find(texto)?.let { Formato.lerReais(it.groupValues[1]) }

    fun temPorKm(texto: String): Boolean = POR_KM.containsMatchIn(texto)

    /** "1,6" ou "1.6" → 1.6. */
    fun numero(s: String): Double? = s.replace(',', '.').toDoubleOrNull()
}
