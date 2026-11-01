package xyz.aluguei.app.plantao

/**
 * 37 City (Divinópolis, pacote br.com.devbase.tressetecity.prestador). A oferta
 * mostra (print de 29/10/2026):
 *   "R$ 13,81" · "3,0 km (R$ 4,60/km)" · "6 min (R$ 2,30/min)"
 *   "3 m (1 min)"     ← até o passageiro, antes do endereço de embarque
 *   "3,0 km (6 min)"  ← a viagem, antes do endereço de destino
 *   "ACEITAR (9)"     ← contagem regressiva
 * Sem "Aceitar" na tela, não é oferta.
 *
 * Puro (sem Android): testado em Leitor37CityTest.kt.
 */
object Leitor37City {
    private const val NUM = "([0-9]{1,4}(?:[.,][0-9]{1,2})?)"
    private val VALOR = Regex("R\\$\\s*([0-9]{1,3}(?:\\.[0-9]{3})*,[0-9]{2}|[0-9]+(?:[.,][0-9]{1,2})?)(?!\\s*/)")
    private val POR_UNIDADE = Regex("R\\$\\s*[0-9]+(?:[.,][0-9]{1,2})?\\s*/\\s*(?:km|min)", RegexOption.IGNORE_CASE)
    /** "3 m (1 min)", "3,0 km (6 min)": distância e tempo de um trecho. */
    private val TRECHO = Regex("^$NUM\\s*(km|m)\\s*\\(\\s*$NUM\\s*min\\s*\\)$", RegexOption.IGNORE_CASE)
    /** O mesmo trecho no meio do texto da tela inteira (quando o app quebra em pedaços). */
    private val TRECHO_SOLTO = Regex("(?<![0-9,.])$NUM\\s*(km|m)\\s*\\(\\s*$NUM\\s*min\\s*\\)", RegexOption.IGNORE_CASE)
    /** Endereço: tem vírgula e "- UF" ou "Brasil" ou CEP. */
    private val ENDERECO = Regex(",.*(?:-\\s*[A-Z]{2}\\b|Brasil|[0-9]{5}-[0-9]{3})")
    private val NOTA = Regex("^([1-5][.,][0-9]{2})\\s*★?$")
    private val ACEITAR = Regex("\\baceitar\\b", RegexOption.IGNORE_CASE)

    private fun numero(s: String) = s.replace(".", "").replace(",", ".").toDoubleOrNull()
    private fun km(n: String, unidade: String): Double? = numero(n)?.let { if (unidade.equals("m", true)) it / 1000 else it }

    fun ler(brutos: List<String>): TelaLida {
        val t = Textos.limpar(brutos)
        if (t.none { ACEITAR.containsMatchIn(it.trim()) }) return TelaLida.Nada
        val junto = t.joinToString(" ")
        val valor = (t.firstNotNullOfOrNull { linha -> VALOR.find(linha.replace(POR_UNIDADE, " "))?.groupValues?.get(1) } ?: VALOR.find(junto.replace(POR_UNIDADE, " "))?.groupValues?.get(1))
            ?.let { Formato.lerReais(it) } ?: return TelaLida.Nada
        // Trechos na ordem da tela: o primeiro é até o passageiro, o segundo é a viagem.
        val trechos = t.withIndex().mapNotNull { (i, linha) -> TRECHO.matchEntire(linha.trim())?.let { m -> Triple(i, km(m.groupValues[1], m.groupValues[2]), numero(m.groupValues[3])) } }
            .ifEmpty { TRECHO_SOLTO.findAll(junto).map { m -> Triple(-1, km(m.groupValues[1], m.groupValues[2]), numero(m.groupValues[3])) }.toList() }
        val busca = if (trechos.size >= 2) trechos[0] else null
        val viagem = trechos.getOrNull(if (trechos.size >= 2) 1 else 0)
        // Sem o trecho da viagem: o "3,0 km (R$ 4,60/km)" do topo.
        val kmTopo = Regex("(?<![0-9,.])$NUM\\s*km\\s*\\(\\s*R\\$", RegexOption.IGNORE_CASE).find(junto)?.groupValues?.get(1)?.let(::numero)
        val kmCorrida = viagem?.second ?: kmTopo ?: return TelaLida.Nada
        // Endereço: a linha logo depois de cada trecho.
        val enderecos = trechos.mapNotNull { (i, _, _) -> t.getOrNull(i + 1)?.takeIf { i >= 0 && it.length >= 8 && !TRECHO.matches(it.trim()) && !it.contains("R$") } }
            .ifEmpty { t.filter { ENDERECO.containsMatchIn(it) && !it.contains("R$") }.take(2) }
        val nota = t.firstNotNullOfOrNull { NOTA.matchEntire(it.trim())?.groupValues?.get(1)?.let(::numero) }
        return TelaLida.ComOferta(
            OfertaDetalhada(
                app = "37city",
                valor = valor,
                kmCorrida = kmCorrida,
                minutosCorrida = viagem?.third,
                kmBusca = busca?.second,
                minutosBusca = busca?.third,
                porKmApp = Textos.porKm(t.joinToString(" ")),
                nota = nota,
                enderecos = enderecos,
            ),
        )
    }
}
