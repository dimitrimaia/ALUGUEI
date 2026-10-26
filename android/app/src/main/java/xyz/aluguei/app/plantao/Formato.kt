package xyz.aluguei.app.plantao

import kotlin.math.abs

/** Formatação e leitura de números em pt-BR, sem depender do Android (testável na JVM). */
object Formato {

    /** 1840 → "R$ 18,40"; 102000 → "R$ 1.020,00"; -350 → "-R$ 3,50". */
    fun brl(centavos: Long): String {
        val a = abs(centavos)
        val reais = (a / 100).toString().reversed().chunked(3).joinToString(".").reversed()
        val cent = (a % 100).toString().padStart(2, '0')
        return (if (centavos < 0) "-" else "") + "R$ $reais,$cent"
    }

    /** 7.4 → "7,4"; 7.0 → "7"; com no máximo 1 casa decimal. */
    fun km(valor: Double): String {
        val decimos = jsRound(valor * 10)
        val inteiro = decimos / 10
        val resto = abs(decimos % 10)
        return if (resto == 0L) inteiro.toString() else "$inteiro,$resto"
    }

    /**
     * Lê o que o motorista digitou no painel: "18,40", "18.40", "1.020,00", "18".
     * Mesma lógica de lerValor de oferta.ts (vírgula decimal; ponto com 1-2 casas
     * no fim é decimal; outros pontos são milhar). Null se vazio ou inválido.
     */
    fun lerReais(texto: String): Long? {
        val bruto = texto.replace("R$", "").replace(Regex("\\s"), "")
        if (bruto.isEmpty() || !Regex("[0-9.,]+").matches(bruto)) return null
        val reais = when {
            bruto.contains(",") -> bruto.replace(".", "").replaceFirst(",", ".").toDoubleOrNull()
            Regex("\\.[0-9]{1,2}$").containsMatchIn(bruto) -> bruto.toDoubleOrNull()
            else -> bruto.replace(".", "").toDoubleOrNull()
        } ?: return null
        return if (reais.isFinite() && reais > 0) jsRound(reais * 100) else null
    }

    /** "7,4" ou "7.4" → 7.4. Null se vazio ou inválido; negativo vira null. */
    fun lerNumero(texto: String): Double? {
        val limpo = texto.trim().replace(",", ".")
        if (limpo.isEmpty()) return null
        val n = limpo.toDoubleOrNull() ?: return null
        return if (n.isFinite() && n >= 0) n else null
    }
}
