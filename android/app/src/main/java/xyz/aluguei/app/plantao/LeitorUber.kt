package xyz.aluguei.app.plantao

/**
 * Leitor genérico (Uber, 99 e outros): junta os textos da tela e usa o
 * [LeitorOferta] (espelho de oferta.ts), mas antes tira os "R$ x/km" para o
 * preço por km não ser lido como valor da corrida.
 */
object LeitorGenerico {
    private val POR_KM = Regex("R\\$\\s*[0-9]+(?:[.,][0-9]{1,2})?\\s*/\\s*[kK][mM]")
    private val NOTA = Regex("(?:★\\s*([1-5][.,][0-9]{2})|([1-5][.,][0-9]{2})\\s*★)")
    private val VALOR = Regex("R\\$\\s*([0-9]{1,3}(?:\\.[0-9]{3})*(?:,[0-9]{1,2})?|[0-9]+(?:[.,][0-9]{1,2})?)")
    private val PRIMEIRO_TEMPO = Regex("[0-9]{1,3}\\s*[mM][iI][nN]")

    /**
     * Começa o texto no valor da oferta: o último "R$" (maior que zero) antes do
     * primeiro tempo ("8 min (2,6 km)"). Na Uber, o ganho do dia ("R$ 0,00" no topo)
     * vem antes do cartão e era lido como o valor da corrida.
     */
    fun aPartirDoValor(junto: String): String {
        val tempo = PRIMEIRO_TEMPO.find(junto)?.range?.first ?: return junto
        val antes = VALOR.findAll(junto).filter { it.range.first < tempo }
            .filter { m -> Formato.lerReais(m.groupValues[1]).let { it != null && it > 0 } }
            .lastOrNull() ?: return junto
        return junto.substring(antes.range.first)
    }

    fun ler(brutos: List<String>, app: String): TelaLida {
        val t = Textos.limpar(brutos)
        if (t.isEmpty()) return TelaLida.Nada
        val junto = t.joinToString(" ")
        val semPorKm = aPartirDoValor(junto.replace(POR_KM, " "))
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
