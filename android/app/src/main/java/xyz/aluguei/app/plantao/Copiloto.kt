package xyz.aluguei.app.plantao

/**
 * Regras do Copiloto que vão além do cálculo da corrida (Calculo.kt, espelho do
 * TypeScript): aviso de risco do app, lugares adicionados pela bolha, a
 * sugestão de contraproposta do inDrive e a fala do resultado.
 *
 * Puro (sem Android): testado em CopilotoTest.kt.
 */
object Copiloto {

    const val MOTIVO_NOTA = "Nota baixa"
    const val MOTIVO_RISCO = "Área de risco"
    const val PREFIXO_EVITADO = "Lugar que você evita: "
    const val PREFIXO_DESEJADO = "Destino desejado: "

    /** Resultado final do cartão: o cálculo mais os avisos do Copiloto. */
    data class Resultado(
        val avaliacao: Avaliacao,
        /** Palavra da lista de lugares a evitar que bateu com o embarque ou o destino. */
        val lugarEvitado: String?,
        val notaBaixa: Boolean,
        val risco: Boolean,
    )

    /**
     * Avalia a oferta: [avaliarCorrida] (régua v2 completa, com nota, passageiro
     * novo, paradas, lugares e volta) com a contraproposta do motorista no lugar
     * do valor, mais o aviso de risco do app (no mínimo amarelo). `evitarExtra`
     * são os lugares adicionados pela bolha (somados a `c.evitar`).
     */
    fun avaliar(o: OfertaDetalhada, t: Taxas, c: Criterios, evitarExtra: List<String> = emptyList()): Resultado {
        val regua = if (evitarExtra.isEmpty()) c else c.copy(evitar = normalizarEvitar(c.evitar + evitarExtra))
        val base = avaliarCorrida(o.paraOferta().copy(valor = o.suaOferta ?: o.valor), t, regua)
        val lugar = base.motivos.firstOrNull { it.startsWith(PREFIXO_EVITADO) }?.removePrefix(PREFIXO_EVITADO)
        val motivos = base.motivos.toMutableList()
        var sinal = base.sinal
        if (o.risco) {
            motivos.add(MOTIVO_RISCO)
            if (sinal == Sinal.VERDE) sinal = Sinal.AMARELO
        }
        return Resultado(base.copy(sinal = sinal, motivos = motivos), lugar, MOTIVO_NOTA in base.motivos, o.risco)
    }

    /** O motivo que o cartão mostra: o lugar evitado primeiro, senão o primeiro motivo (sem o risco, que tem faixa própria). */
    fun motivoPrincipal(a: Avaliacao): String? =
        a.motivos.firstOrNull { it.startsWith(PREFIXO_EVITADO) } ?: a.motivos.firstOrNull { it != MOTIVO_RISCO }

    /** Primeira palavra da lista que aparece em algum endereço (sem acento nem maiúscula). */
    fun lugarEvitado(enderecos: List<String>, evitar: List<String>): String? {
        if (enderecos.isEmpty() || evitar.isEmpty()) return null
        val ends = enderecos.map { Textos.semAcento(it) }
        return evitar.firstOrNull { e ->
            val p = Textos.semAcento(e)
            p.length >= 3 && ends.any { p in it }
        }
    }

    private val PARENTESES = Regex("\\(([^()]+)\\)")
    private val NUMERO_RUA = Regex("^(.*?\\p{L}.*?)[\\s,]+(?:n[ºo°]?\\s*)?[0-9]+.*$")

    /**
     * O lugar de um endereço para a lista "evitar": o bairro entre parênteses
     * ("Rua F, 70 (Vila Nova Esperança, Contagem - MG)" → "Vila Nova Esperança"),
     * ou a rua sem o número ("Rua dos Otoni 927" → "Rua dos Otoni").
     */
    fun lugarDoEndereco(endereco: String): String? {
        val e = endereco.trim()
        PARENTESES.find(e)?.let { m ->
            val bairro = m.groupValues[1].split(',').first().trim()
            if (bairro.length >= 3) return bairro.take(60)
        }
        val antesDaVirgula = e.split(',').first().trim()
        val rua = NUMERO_RUA.matchEntire(antesDaVirgula)?.groupValues?.get(1)?.trim() ?: antesDaVirgula
        return rua.takeIf { it.length >= 3 }?.take(60)
    }

    private val FALA_DO_EMBARQUE = Regex("embarque|partida|origem|buscar|passageiro esta")

    /** Endereço de que o aviso de risco fala: o embarque se o aviso disser, senão o destino. */
    fun enderecoDoRisco(o: OfertaDetalhada): String? {
        val aviso = o.avisoRisco?.let { Textos.semAcento(it) } ?: ""
        return if (FALA_DO_EMBARQUE.containsMatchIn(aviso)) o.embarque ?: o.destino else o.destino ?: o.embarque
    }

    /** Lista "evitar" normalizada como no TS: sem espaços repetidos, 3 a 60 letras, sem repetidos, até 100. */
    fun normalizarEvitar(lista: List<String>): List<String> {
        val vistos = mutableSetOf<String>()
        val saida = mutableListOf<String>()
        for (x in lista) {
            val v = x.trim().replace(Regex("\\s+"), " ").take(60)
            if (v.length < 3) continue
            if (vistos.add(Textos.semAcento(v))) saida.add(v)
            if (saida.size >= 100) break
        }
        return saida
    }

    // ------------------------------------------------------------------ contraproposta (inDrive)

    sealed class Sugestao {
        /** A oferta já é verde. */
        object PodeAceitar : Sugestao()

        /** Um atalho do app já deixa verde: "Toque em R$ 23". */
        data class Atalho(val valor: Long, val avaliacao: Avaliacao) : Sugestao()

        /** Nenhum atalho chega: "Use o lápis: R$ 27". */
        data class Lapis(val valor: Long, val avaliacao: Avaliacao) : Sugestao()

        /** Nem o dobro fica verde: "Nem o dobro (R$ 116) fica verde". */
        data class NemODobro(val dobro: Long) : Sugestao()
    }

    fun sugerir(o: OfertaDetalhada, t: Taxas, c: Criterios, sinalFinal: Sinal): Sugestao? {
        // Só o que o preço muda (valor, distâncias, tempos e a volta): nota, lugares e paradas não se resolvem com dinheiro.
        val base = o.paraOfertaDePreco()
        if (sinalFinal == Sinal.VERDE) return Sugestao.PodeAceitar
        if (avaliarCorrida(base, t, c).sinal == Sinal.VERDE) return null // o problema não é o preço
        val ideal = precoIdeal(base, t, c) ?: return Sugestao.NemODobro(base.valor * 2)
        val atalho = o.atalhos.filter { it >= ideal }.minOrNull()
        return if (atalho != null) {
            Sugestao.Atalho(atalho, avaliarCorrida(base.copy(valor = atalho), t, c))
        } else {
            Sugestao.Lapis(ideal, avaliarCorrida(base.copy(valor = ideal), t, c))
        }
    }

    /** "R$ 23" (sem centavos quando redondo). */
    fun reais(centavos: Long): String = if (centavos < 0) "-" + reais(-centavos) else if (centavos % 100 == 0L) "R$ ${Formato.brl(centavos).removePrefix("R$ ").removeSuffix(",00")}" else Formato.brl(centavos)

    fun textoSugestao(s: Sugestao): String = when (s) {
        Sugestao.PodeAceitar -> "Pode aceitar"
        is Sugestao.Atalho -> "Toque em ${reais(s.valor)}"
        is Sugestao.Lapis -> "Use o lápis: ${reais(s.valor)}"
        is Sugestao.NemODobro -> "Nem o dobro (${reais(s.dobro)}) fica verde"
    }

    /** "com R$ 23: R$ 2,10/km · R$ 48/h" */
    fun textoComValor(valor: Long, a: Avaliacao): String =
        "com ${reais(valor)}: ${Formato.brl(a.porKm)}/km · ${reais(jsRound(a.porHora / 100.0) * 100)}/h"
}
