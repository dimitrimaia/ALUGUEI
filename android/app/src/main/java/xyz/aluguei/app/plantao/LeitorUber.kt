package xyz.aluguei.app.plantao

/**
 * Leitor genérico (Uber, 99 e outros): junta os textos da tela e usa o
 * [LeitorOferta] (espelho de oferta.ts), mas antes tira os "R$ x/km" para o
 * preço por km não ser lido como valor da corrida.
 */
object LeitorGenerico {
    private val POR_KM = Regex("R\\$\\s*[0-9]+(?:[.,][0-9]{1,2})?\\s*/\\s*[kK][mM]")
    private val NOTA = Regex("(?:★\\s*([1-5][.,][0-9]{2})|([1-5][.,][0-9]{2})\\s*★)")

    fun ler(brutos: List<String>, app: String): TelaLida {
        val t = Textos.limpar(brutos)
        if (t.isEmpty()) return TelaLida.Nada
        val junto = t.joinToString(" ")
        val semPorKm = junto.replace(POR_KM, " ")
        val lida = LeitorOferta.lerOferta(semPorKm) ?: return TelaLida.Nada
        val nota = NOTA.find(junto)?.let { m -> Textos.numero(m.groupValues[1].ifEmpty { m.groupValues[2] }) }
        return TelaLida.ComOferta(
            OfertaDetalhada(
                app = app,
                valor = lida.valor,
                kmCorrida = lida.kmCorrida,
                minutosCorrida = lida.minutosCorrida,
                kmBusca = lida.kmBusca,
                minutosBusca = lida.minutosBusca,
                porKmApp = Textos.porKm(junto),
                nota = nota,
            ),
        )
    }
}

/** Uber: "R$ 18,40 … 8 min (2,3 km) … Viagem de 15 min (7,4 km)". */
object LeitorUber {
    fun ler(textos: List<String>): TelaLida = LeitorGenerico.ler(textos, "uber")
}
