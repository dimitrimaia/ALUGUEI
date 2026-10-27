package xyz.aluguei.app.plantao

/**
 * O que o Copiloto entendeu de uma tela de app de corrida.
 *
 * Arquivo puro (sem Android) para rodar nos testes JUnit da JVM.
 */
sealed class TelaLida {
    /** Uma oferta aberta, pronta para o cartão. */
    data class ComOferta(val oferta: OfertaDetalhada) : TelaLida()

    /** inDrive: o motorista mandou a própria tarifa e espera a resposta ("Oferecendo sua tarifa R$ 22"). */
    data class Contraproposta(val valor: Long) : TelaLida()

    /**
     * inDrive: tela de corrida em andamento ("Cheguei", "Iniciar viagem"...). Depois
     * de uma oferta aberta, quer dizer que o motorista aceitou (ver [Aceite]).
     * `gatilho` é o texto da lista [Aceite.TEXTOS_EM_ANDAMENTO] que bateu.
     */
    data class EmAndamento(val gatilho: String) : TelaLida()

    /** inDrive: lista de pedidos (vários R$/km, sem "Aceitar por"). O cartão some. */
    object Lista : TelaLida()

    /** A oferta acabou (expirou, já aceita, procurando pedidos). O cartão some. */
    object Fim : TelaLida()

    /** Nada que interesse (outra tela do app). Não muda o cartão. */
    object Nada : TelaLida()

    /** Rótulo curto para o modo diagnóstico da bolha. */
    fun rotulo(): String = when (this) {
        is ComOferta -> "oferta lida"
        is Contraproposta -> "sua oferta"
        is EmAndamento -> "corrida em andamento (\"$gatilho\")"
        Lista -> "lista"
        Fim -> "oferta encerrada"
        Nada -> "sem oferta"
    }
}

/** Oferta lida da tela, com tudo o que o app mostrou (o que não apareceu fica nulo). */
data class OfertaDetalhada(
    /** indrive | uber | 99 | outra */
    val app: String,
    /** Centavos. */
    val valor: Long,
    val kmCorrida: Double,
    val minutosCorrida: Double? = null,
    val kmBusca: Double? = null,
    val minutosBusca: Double? = null,
    /** R$/km que o próprio app mostrou (centavos), ex.: inDrive "R$1,6/km" → 160. */
    val porKmApp: Long? = null,
    /** inDrive: km da viagem calculado por valor ÷ (R$/km) − busca (sem os rótulos do mapa). */
    val kmCorridaEstimado: Boolean = false,
    /** inDrive: valores prontos para contraproposta ("R$ 64", "R$ 69"), em centavos. */
    val atalhos: List<Long> = emptyList(),
    val nome: String? = null,
    val nota: Double? = null,
    /** Nº de corridas do passageiro ("(38)"). */
    val corridasPassageiro: Int? = null,
    /** PIX | Dinheiro | Cartão */
    val pagamento: String? = null,
    /** Embarque, paradas e destino, nessa ordem. */
    val enderecos: List<String> = emptyList(),
    /** O app avisou que a região é perigosa. */
    val risco: Boolean = false,
    /** Texto do aviso de risco (para saber se fala do embarque ou do destino). */
    val avisoRisco: String? = null,
    /** inDrive: tarifa que o motorista ofereceu (centavos); null = a do passageiro. */
    val suaOferta: Long? = null,
    /** Volta do destino até a base, quando calculada (fora da tela: Photon + OSRM). */
    val kmVolta: Double? = null,
    val minutosVolta: Double? = null,
    /**
     * Valor com que o motorista aceitou / vai aceitar (centavos), quando ele
     * corrigiu no lápis do cartão ou no "Fiz com outro valor". null = usa a sua
     * oferta (contraproposta) ou o valor da oferta.
     */
    val valorFinal: Long? = null,
) {
    /** Valor que o cálculo e a fila usam: o final, senão a sua oferta, senão o da oferta. */
    val valorUsado: Long get() = valorFinal ?: suaOferta ?: valor

    val embarque: String? get() = enderecos.firstOrNull()
    val destino: String? get() = if (enderecos.size >= 2) enderecos.last() else null

    /** Paradas no meio do caminho: endereços além do embarque e do destino. */
    val paradas: Int get() = (enderecos.size - 2).coerceAtLeast(0)

    /** Tudo o que a régua v2 olha (valor original; a contraproposta entra em Copiloto.avaliar). */
    fun paraOferta() = Oferta(
        valor = valor,
        kmCorrida = kmCorrida,
        minutosCorrida = minutosCorrida,
        kmBusca = kmBusca,
        minutosBusca = minutosBusca,
        nota = nota,
        corridasPassageiro = corridasPassageiro,
        paradas = paradas,
        embarque = embarque,
        destino = destino,
        kmVolta = kmVolta,
        minutosVolta = minutosVolta,
    )

    /** Só o que o preço muda (para a contraproposta): valor, distâncias, tempos e a volta. */
    fun paraOfertaDePreco() = Oferta(
        valor = valor,
        kmCorrida = kmCorrida,
        minutosCorrida = minutosCorrida,
        kmBusca = kmBusca,
        minutosBusca = minutosBusca,
        kmVolta = kmVolta,
        minutosVolta = minutosVolta,
    )

    /** Identifica a oferta enquanto ela está aberta (para "Recusei" não deixar reaparecer). */
    fun chave(): String = listOf(
        app,
        (suaOferta ?: valor).toString(),
        kmBusca?.let { Formato.km(it) } ?: "-",
        Formato.km(kmCorrida),
        nome ?: "-",
    ).joinToString("|")

    /** Chave da oferta original (sem a contraproposta). */
    fun chaveOriginal(): String = copy(suaOferta = null).chave()

    /** Mesma oferta de outra leitura, sem perder a volta já calculada. */
    fun comVoltaDe(outra: OfertaDetalhada?): OfertaDetalhada =
        if (outra != null && kmVolta == null && outra.destino == destino) copy(kmVolta = outra.kmVolta, minutosVolta = outra.minutosVolta) else this

    companion object {
        fun de(o: Oferta, app: String) = OfertaDetalhada(
            app = app,
            valor = o.valor,
            kmCorrida = o.kmCorrida,
            minutosCorrida = o.minutosCorrida,
            kmBusca = o.kmBusca,
            minutosBusca = o.minutosBusca,
        )
    }
}

/** Escolhe o leitor de cada app. */
object Leitores {
    fun ler(app: String, textos: List<String>): TelaLida = try {
        when (app) {
            "indrive" -> LeitorInDrive.ler(textos)
            "uber" -> LeitorUber.ler(textos)
            "99" -> Leitor99.ler(textos)
            else -> LeitorGenerico.ler(textos, app)
        }
    } catch (e: RuntimeException) {
        // Tela inesperada nunca derruba o leitor.
        TelaLida.Nada
    }
}
