package xyz.aluguei.app.plantao

/**
 * Leitor das telas do inDrive (motorista), trabalhando sobre a LISTA de textos
 * dos nós, na ordem da tela.
 *
 * Por que não serve o leitor genérico: no inDrive o primeiro "R$" da tela é o
 * preço por km ("R$1,6/km"), não o valor da corrida. A âncora confiável do
 * valor é o botão "Aceitar por R$ 58".
 *
 * Telas reconhecidas:
 *  - oferta aberta: tem "Aceitar por R$ X" → [TelaLida.ComOferta];
 *  - contraproposta enviada: "Oferecendo sua tarifa" / "Aguarde a resposta" → [TelaLida.Contraproposta];
 *  - lista de pedidos: vários "R$x/km", sem "Aceitar por" → [TelaLida.Lista];
 *  - fim: "Sua solicitação expirou", "Solicitação já aceita", "Procurando…" → [TelaLida.Fim];
 *  - corrida em andamento: "Cheguei", "Iniciar viagem"... ([Aceite.TEXTOS_EM_ANDAMENTO]) → [TelaLida.EmAndamento].
 *
 * Puro (sem Android): testado em LeitorInDriveTest.kt.
 */
object LeitorInDrive {

    enum class Conexao { ONLINE, OFFLINE, DESCONHECIDA }

    private val ACEITAR = Regex("[Aa]ceitar\\s+por\\s*R\\$\\s*([0-9][0-9.,]*)")
    private val BUSCA_KM = Regex("~\\s*([0-9]{1,3}(?:[.,][0-9]{1,2})?)\\s*[kK][mM](?![A-Za-z])")
    private val BUSCA_M = Regex("~\\s*([0-9]{2,4})\\s*m(?![A-Za-z])")
    private val PAR = Regex("(?<![~/0-9.,])([0-9]{1,3})\\s*[mM][iI][nN]\\.?\\s+([0-9]{1,4}(?:[.,][0-9]{1,2})?)\\s*[kK][mM](?![A-Za-z])")
    private val PAR_INVERTIDO = Regex("(?<![~/0-9.,])([0-9]{1,4}(?:[.,][0-9]{1,2})?)\\s*[kK][mM]\\s+([0-9]{1,3})\\s*[mM][iI][nN](?![A-Za-z])")
    private val NOTA = Regex("★?\\s*([1-5][.,][0-9]{2})\\s*★?(?:\\s*\\(([0-9]{1,5})\\))?")
    private val NOME = Regex("\\p{L}+(?:[ '\\-]\\p{L}+){0,2}")
    private val NOME_NOTA = Regex("(\\p{L}+(?:[ '\\-]\\p{L}+){0,2})\\s+★?\\s*([1-5][.,][0-9]{2})\\s*★?(?:\\s*\\(([0-9]{1,5})\\))?")
    private val CORRIDAS = Regex("\\(([0-9]{1,5})\\)")
    private val RISCO = Regex("perigos|risco|insegur|cuidado com a regiao")
    private val SO_NUMEROS = Regex("[~0-9.,:\\s]*(?:min\\.?|km|m)?[0-9.,\\s]*")
    private val LETRA = Regex("\\p{L}")

    private val NAO_SAO_NOMES = setOf("pedido de viagem", "preco justo", "fechar", "pix", "dinheiro", "cartao", "aceitar", "novo", "nova")

    private data class Par(val min: Double, val km: Double)

    private val FICAR_ONLINE = Regex("(?:ficar|ir|entrar|fique|va) (?:em |para )?on-?line(?![a-z])")
    private val FICAR_OFFLINE = Regex("(?:ficar|ir|sair|fique|va) (?:em |para )?off-?line(?![a-z])")
    private val ONLINE = Regex("(?<![a-z])on-?line(?![a-z])")
    private val OFFLINE = Regex("(?<![a-z])off-?line(?![a-z])")

    /**
     * O motorista está online no inDrive? Usado pela economia de bateria: offline,
     * o leitor dorme (não monta a árvore da tela) até ver "Online" ou uma oferta.
     *  - oferta ("Aceitar por") ou lista de pedidos (R$/km) → ONLINE;
     *  - botão para ficar online ("Ficar online") → OFFLINE;
     *  - botão para ficar offline → ONLINE;
     *  - "Offline" sem nenhum "Online" na tela → OFFLINE.
     */
    fun conexao(brutos: List<String>): Conexao {
        val t = Textos.limpar(brutos)
        if (t.isEmpty()) return Conexao.DESCONHECIDA
        val n = t.map { Textos.semAcento(it) }
        val junto = t.joinToString(" ")
        if (ACEITAR.containsMatchIn(junto) || Textos.temPorKm(junto)) return Conexao.ONLINE
        if (n.any { FICAR_ONLINE.containsMatchIn(it) }) return Conexao.OFFLINE
        if (n.any { FICAR_OFFLINE.containsMatchIn(it) }) return Conexao.ONLINE
        val online = n.any { ONLINE.containsMatchIn(it) }
        if (online) return Conexao.ONLINE
        if (n.any { OFFLINE.containsMatchIn(it) }) return Conexao.OFFLINE
        return Conexao.DESCONHECIDA
    }

    fun ler(brutos: List<String>): TelaLida {
        val t = Textos.limpar(brutos)
        if (t.isEmpty()) return TelaLida.Nada
        val n = t.map { Textos.semAcento(it) }
        val junto = t.joinToString(" ")
        val nJunto = n.joinToString(" ")

        // 1) fim da oferta (aviso por cima do cartão também conta)
        if ("expirou" in nJunto || "ja aceita" in nJunto || "ja foi aceita" in nJunto || "cancelad" in nJunto) return TelaLida.Fim

        // 2) contraproposta enviada, esperando o passageiro
        val iContra = n.indexOfFirst { "oferecendo sua tarifa" in it || "aguarde a resposta" in it }
        if (iContra >= 0) {
            val inicio = n.indexOfFirst { "oferecendo sua tarifa" in it }.takeIf { it >= 0 } ?: iContra
            val valor = (inicio until t.size).asSequence()
                .filterNot { "aceitar" in n[it] }
                .flatMap { Textos.dinheiros(t[it]).asSequence() }
                .firstOrNull()
                ?: (0 until t.size).asSequence().filterNot { "aceitar" in n[it] }.flatMap { Textos.dinheiros(t[it]).asSequence() }.firstOrNull()
            return if (valor != null) TelaLida.Contraproposta(valor) else TelaLida.Nada
        }

        // 3) oferta aberta
        val aceitar = ACEITAR.find(junto)
        if (aceitar != null) return lerOferta(t, n, junto, aceitar) ?: TelaLida.Nada

        // 4) lista de pedidos
        if (Textos.temPorKm(junto)) return TelaLida.Lista

        // 5) esperando pedidos
        if ("procurando" in nJunto || "aguarde que os pedidos" in nJunto) return TelaLida.Fim

        // 6) corrida em andamento ("Cheguei", "Iniciar viagem"...): o motorista aceitou
        Aceite.gatilho(t)?.let { return TelaLida.EmAndamento(it) }
        return TelaLida.Nada
    }

    private fun lerOferta(t: List<String>, n: List<String>, junto: String, aceitar: MatchResult): TelaLida? {
        val valor = Formato.lerReais(aceitar.groupValues[1].trimEnd('.', ',')) ?: return null
        val porKm = Textos.porKm(junto)
        val busca = BUSCA_KM.find(junto)?.let { Textos.numero(it.groupValues[1]) }
            ?: BUSCA_M.find(junto)?.let { it.groupValues[1].toDouble() / 1000 }

        // Rótulos do mapa (podem não estar acessíveis): "4 min 1,0 km" e "66 min 36,4 km".
        var pares = PAR.findAll(junto).mapNotNull { m ->
            val min = Textos.numero(m.groupValues[1]) ?: return@mapNotNull null
            val km = Textos.numero(m.groupValues[2]) ?: return@mapNotNull null
            Par(min, km)
        }.toList()
        if (pares.isEmpty()) {
            pares = PAR_INVERTIDO.findAll(junto).mapNotNull { m ->
                val km = Textos.numero(m.groupValues[1]) ?: return@mapNotNull null
                val min = Textos.numero(m.groupValues[2]) ?: return@mapNotNull null
                Par(min, km)
            }.toList()
        }
        var parBusca: Par? = null
        var parViagem: Par? = null
        if (pares.isNotEmpty()) {
            if (busca != null) {
                val iBusca = pares.indexOfFirst { kotlin.math.abs(it.km - busca) < 0.06 }
                if (iBusca >= 0) parBusca = pares[iBusca]
                parViagem = pares.filterIndexed { i, _ -> i != iBusca }.maxByOrNull { it.km }
            } else if (pares.size >= 2) {
                parBusca = pares[0]
                parViagem = pares[1]
            } else {
                parViagem = pares[0]
            }
        }
        val kmBusca = busca ?: parBusca?.km

        var estimado = false
        val kmCorrida: Double = parViagem?.km ?: run {
            val pk = porKm ?: return null
            if (pk <= 0) return null
            estimado = true
            val total = valor.toDouble() / pk
            val v = total - (kmBusca ?: 0.0)
            arredondar2(if (v >= 0.1) v else total)
        }
        if (kmCorrida <= 0 || kmCorrida > 1000) return null

        // Atalhos de contraproposta: os "R$ N" depois de "Ofereça sua tarifa".
        val iOfereca = n.indexOfFirst { "ofereca sua tarifa" in it || "oferecer sua tarifa" in it || "ofereca a sua tarifa" in it }
        val atalhos = if (iOfereca < 0) emptyList() else (iOfereca + 1 until t.size).asSequence()
            .filterNot { "aceitar" in n[it] }
            .flatMap { Textos.dinheiros(t[it]).asSequence() }
            .distinct().take(6).toList()

        // Passageiro: nome, nota e nº de corridas.
        var nome: String? = null
        var nota: Double? = null
        var corridas: Int? = null
        for (i in t.indices) {
            val s = t[i]
            NOTA.matchEntire(s)?.let { m ->
                nota = Textos.numero(m.groupValues[1])
                corridas = m.groupValues[2].toIntOrNull() ?: t.getOrNull(i + 1)?.let { CORRIDAS.matchEntire(it)?.groupValues?.get(1)?.toIntOrNull() }
                nome = (i - 1 downTo maxOf(0, i - 2)).asSequence().map { t[it] }.firstOrNull { pareceNome(it) }
            }
            if (nota == null) {
                NOME_NOTA.matchEntire(s)?.let { m ->
                    if (pareceNome(m.groupValues[1])) nome = m.groupValues[1]
                    nota = Textos.numero(m.groupValues[2])
                    corridas = m.groupValues[3].toIntOrNull() ?: t.getOrNull(i + 1)?.let { CORRIDAS.matchEntire(it)?.groupValues?.get(1)?.toIntOrNull() }
                }
            }
            if (nota != null) break
        }

        val iPagamento = n.indexOfFirst { pagamento(it) != null }
        val pagamento = if (iPagamento >= 0) pagamento(n[iPagamento]) else null

        // Endereços: entre o valor / "Preço justo" e o PIX / "Aceitar por".
        val iPrecoJusto = n.indexOfLast { it == "preco justo" }
        val iValor = t.indices.lastOrNull { i ->
            "aceitar" !in n[i] && !Textos.temPorKm(t[i]) && Textos.dinheiros(t[i]).let { d -> d.size == 1 && d[0] == valor } &&
                (iOfereca < 0 || i < iOfereca)
        } ?: -1
        val iBusca = n.indexOfFirst { it.startsWith("~") }
        val inicio = maxOf(iPrecoJusto, iValor).takeIf { it >= 0 } ?: iBusca
        val enderecos = mutableListOf<String>()
        if (inicio >= 0) {
            val fim = (inicio + 1 until t.size).firstOrNull { i ->
                pagamento(n[i]) != null || "aceitar por" in n[i] || "ofereca sua tarifa" in n[i]
            } ?: t.size
            for (i in inicio + 1 until fim) {
                if (pareceEndereco(t[i], n[i])) enderecos.add(t[i])
                if (enderecos.size >= 6) break
            }
        }

        val iRisco = n.indexOfFirst { RISCO.containsMatchIn(it) }

        return TelaLida.ComOferta(
            OfertaDetalhada(
                app = "indrive",
                valor = valor,
                kmCorrida = kmCorrida,
                minutosCorrida = parViagem?.min,
                kmBusca = kmBusca,
                minutosBusca = parBusca?.min,
                porKmApp = porKm,
                kmCorridaEstimado = estimado,
                atalhos = atalhos,
                nome = nome,
                nota = nota,
                corridasPassageiro = corridas,
                pagamento = pagamento,
                enderecos = enderecos,
                risco = iRisco >= 0,
                avisoRisco = if (iRisco >= 0) t[iRisco] else null,
            ),
        )
    }

    private fun arredondar2(v: Double): Double = Math.round(v * 100) / 100.0

    private fun pagamento(n: String): String? = when {
        n == "pix" -> "PIX"
        n == "dinheiro" -> "Dinheiro"
        n == "cartao" || n.startsWith("cartao de ") -> "Cartão"
        else -> null
    }

    private fun pareceNome(s: String): Boolean =
        s.length in 2..30 && NOME.matches(s) && Textos.semAcento(s) !in NAO_SAO_NOMES

    private fun pareceEndereco(s: String, n: String): Boolean {
        if (s.length < 4 || s.length > 160) return false
        if (!LETRA.containsMatchIn(s)) return false
        if ("R$" in s || n.startsWith("~") || n == "preco justo" || n in NAO_SAO_NOMES) return false
        if (SO_NUMEROS.matches(n)) return false
        if (RISCO.containsMatchIn(n)) return false
        if (NOTA.matches(s) || CORRIDAS.matches(s)) return false
        if ("ofereca" in n || "aguarde" in n || "pedido de viagem" in n) return false
        return true
    }
}
