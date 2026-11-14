package xyz.aluguei.app.plantao

/**
 * Aceite da corrida sem o motorista precisar tocar "Aceitei".
 *
 * Depois de uma oferta aberta no inDrive (ou da contraproposta dele), se em até
 * [JANELA_MS] aparecer uma tela de corrida em andamento (um dos
 * [TEXTOS_EM_ANDAMENTO]), a corrida é marcada como aceita (origem "automatica"),
 * com o valor final = a contraproposta, se houve, senão o valor da oferta.
 * "Solicitação já aceita", "expirou" e "Procurando" nunca contam como aceite.
 *
 * O Copiloto só LÊ a tela: nada aqui toca no app de corrida.
 *
 * Puro (sem Android): testado em AceiteTest.kt.
 */
object Aceite {

    /** Até quanto tempo depois da última vez que a oferta (ou a contraproposta) foi vista. */
    const val JANELA_MS = 180_000L

    /** Origem da decisão gravada na fila (decisaoOrigem). */
    const val ORIGEM_TOQUE = "toque"
    const val ORIGEM_PERGUNTA = "pergunta"
    const val ORIGEM_AUTOMATICA = "automatica"

    /**
     * Textos típicos da corrida em andamento no inDrive, sem acento e em
     * minúsculas. A LISTA FICA SÓ AQUI. Comparados como palavras inteiras.
     */
    val TEXTOS_EM_ANDAMENTO: List<String> = listOf(
        "cheguei",
        "estou aqui",
        "iniciar viagem",
        "iniciar corrida",
        "comecar viagem",
        "a caminho do passageiro",
        "va ate o passageiro",
        "concluir viagem",
        "finalizar viagem",
        "encerrar viagem",
        "o passageiro foi notificado",
        "passageiro esta esperando",
        "embarque",
        // Uber
        "indo buscar",
        "deslize para iniciar",
        "confirmar embarque",
        "voce chegou",
    )

    /**
     * Fim da corrida feita: a tela de avaliar o passageiro / viagem concluída.
     * Ganha da lista de "em andamento" (a tela final às vezes repete "embarque").
     */
    val TEXTOS_CONCLUIDA: List<String> = listOf(
        "avalie o passageiro",
        "avaliar o passageiro",
        "avalie a viagem",
        "como foi a viagem",
        "viagem concluida",
        "corrida concluida",
        "viagem finalizada",
        "corrida finalizada",
    )

    /** O texto da lista de fim de corrida nesta tela, ou null. */
    fun gatilhoConcluida(brutos: List<String>): String? {
        val n = Textos.limpar(brutos).map { Textos.semAcento(it) }
        if (n.isEmpty()) return null
        val junto = n.joinToString("\n")
        if (TEXTOS_OFERTA.any { it in junto }) return null
        return TEXTOS_CONCLUIDA.firstOrNull { it in junto }
    }

    /** Telas que dizem que a corrida NÃO ficou com o motorista (ganham da lista acima). */
    val TEXTOS_NAO_ACEITA: List<String> = listOf("ja aceita", "ja foi aceita", "expirou", "procurando", "cancelad")

    /** Textos da oferta ainda aberta / esperando o passageiro (não é corrida em andamento). */
    private val TEXTOS_OFERTA = listOf("aceitar por", "oferecendo sua tarifa", "aguarde a resposta")

    private val PADROES: List<Pair<String, Regex>> = TEXTOS_EM_ANDAMENTO.map { t ->
        t to Regex("(?<![\\p{L}0-9])" + Regex.escape(t) + "(?![\\p{L}0-9])")
    }

    /** O texto da lista que mostra a corrida em andamento nesta tela, ou null. */
    fun gatilho(brutos: List<String>): String? {
        val n = Textos.limpar(brutos).map { Textos.semAcento(it) }
        if (n.isEmpty()) return null
        val junto = n.joinToString("\n")
        if (TEXTOS_NAO_ACEITA.any { it in junto }) return null
        if (TEXTOS_OFERTA.any { it in junto }) return null
        return PADROES.firstOrNull { (_, re) -> n.any { re.containsMatchIn(it) } }?.first
    }

    /** A tela de corrida em andamento veio a tempo de contar para a oferta vista em [vistaEm]? */
    fun dentroDaJanela(vistaEm: Long?, agora: Long): Boolean =
        vistaEm != null && agora >= vistaEm && agora - vistaEm <= JANELA_MS

    /** Valor final da corrida aceita: o corrigido, senão a sua oferta, senão o da oferta. */
    fun valorFinal(o: OfertaDetalhada): Long = o.valorUsado

    /** Maior valor que o campo "valor final" aceita (R$ 10.000). */
    const val VALOR_MAXIMO = 1_000_000L

    /** Lê o que o motorista digitou no campo de valor final ("22", "22,50"); null se inválido. */
    fun lerValorFinal(texto: String): Long? = Formato.lerReais(texto)?.takeIf { it in 100..VALOR_MAXIMO }
}
