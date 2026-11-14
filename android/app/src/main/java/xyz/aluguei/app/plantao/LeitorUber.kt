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

    // "4,94 (33)" ou "★ 4,94 (33)": nota e nº de corridas do passageiro (Uber).
    private val NOTA_LINHA = Regex("^[*★]?\\s*([1-5][.,][0-9]{1,2})\\s*\\(([0-9]{1,5})\\)$")
    // Linha de tempo e distância: "8 min (2,6 km)", "19 minutos (8.5 km)".
    private val TEMPO_KM = Regex("[0-9]{1,3}\\s*[mM][iI][nN].*[0-9]\\s*[kK][mM]")
    private val FIM = listOf("aceitar", "tenho interesse", "recusar", "corresponder", "ver detalhes")
    private val PARADA = Regex("^[0-9]+\\s+paradas?$", RegexOption.IGNORE_CASE)

    /**
     * Endereços da oferta (Uber e 99): o texto logo depois de cada "tempo (km)" é o
     * embarque e depois o destino. Pode vir em 2 linhas (leitura pela imagem).
     */
    fun enderecos(linhas: List<String>): List<String> {
        val idx = linhas.indices.filter { TEMPO_KM.containsMatchIn(linhas[it]) }
        if (idx.size < 2) return emptyList()
        return idx.take(2).mapIndexedNotNull { n, i ->
            val ate = if (n == 0) idx[1] else linhas.size
            val partes = ArrayList<String>()
            for (j in i + 1 until ate) {
                val l = linhas[j].trim()
                val baixo = l.lowercase()
                if (FIM.any { baixo.startsWith(it) } || TEMPO_KM.containsMatchIn(l)) break
                if (PARADA.matches(l) || l.none { it.isLetter() }) continue
                partes.add(l.trimEnd(','))
                if (partes.size == 2) break
            }
            partes.joinToString(", ").takeIf { it.length >= 4 }
        }.takeIf { it.size == 2 } ?: emptyList()
    }

    fun ler(brutos: List<String>, app: String): TelaLida {
        val t = Textos.limpar(brutos)
        if (t.isEmpty()) return TelaLida.Nada
        val junto = t.joinToString(" ")
        val semPorKm = aPartirDoValor(junto.replace(POR_KM, " "))
        // Sem oferta na tela: corrida terminando (avaliar) ou em andamento (indo buscar,
        // iniciar/concluir viagem). Com isso a pílula e o "Fiz" automático valem na Uber.
        val lida = LeitorOferta.lerOferta(semPorKm)
            ?: return Aceite.gatilhoConcluida(t)?.let { TelaLida.Concluida(it) }
                ?: Aceite.gatilho(t)?.let { TelaLida.EmAndamento(it) }
                ?: TelaLida.Nada
        val notaLinha = t.firstNotNullOfOrNull { NOTA_LINHA.matchEntire(it.trim()) }
        val nota = NOTA.find(junto)?.let { m -> Textos.numero(m.groupValues[1].ifEmpty { m.groupValues[2] }) }
            ?: notaLinha?.let { Textos.numero(it.groupValues[1]) }
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
                corridasPassageiro = notaLinha?.groupValues?.get(2)?.toIntOrNull(),
                enderecos = enderecos(t),
            ),
        )
    }
}

/** Uber: "R$ 18,40 … 8 min (2,3 km) … Viagem de 15 min (7,4 km)". */
object LeitorUber {
    fun ler(textos: List<String>): TelaLida = LeitorGenerico.ler(textos, "uber")
}
