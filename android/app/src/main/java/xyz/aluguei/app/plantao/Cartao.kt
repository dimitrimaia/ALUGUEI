package xyz.aluguei.app.plantao

import java.util.Locale

/** Situação do cálculo da volta para a base de uma oferta. */
sealed class EstadoVolta {
    /** Não se aplica (sem destino, sem base nem localização, ou o motorista não usa a volta). */
    object Nenhuma : EstadoVolta()

    /** Geocodificando o destino e buscando a rota (na thread de fundo). */
    object Calculando : EstadoVolta()

    /** Não deu para calcular (sem internet, endereço não achado). */
    object Indisponivel : EstadoVolta()

    /** Rota destino → base. `levaParaCasa`: o destino fica bem mais perto da base que a posição atual. */
    data class Pronta(val km: Double, val minutos: Double, val levaParaCasa: Boolean = false) : EstadoVolta()
}

/**
 * Textos do cartão (campos escolhidos pelo motorista) e da voz. Puro (sem
 * Android): testado em CartaoTest.kt.
 */
object Cartao {

    /** O que os campos precisam: a oferta, a avaliação e a volta (com o custo dela, mesmo sem contarVolta). */
    data class Dados(
        val oferta: OfertaDetalhada,
        val avaliacao: Avaliacao,
        val volta: EstadoVolta = EstadoVolta.Nenhuma,
        /** Custo de rodar a volta (centavos), para mostrar mesmo quando a régua não desconta. */
        val custoVolta: Long? = null,
    ) {
        /** Valor que a avaliação usou (o final, senão a contraproposta, senão o da oferta). */
        val valor: Long get() = oferta.valorUsado
    }

    private val PT_BR: Locale = Locale.forLanguageTag("pt-BR")

    /** "R$ 48" a partir de centavos (arredonda para o real). */
    private fun reaisRedondos(centavos: Long): String = Copiloto.reais(jsRound(centavos / 100.0) * 100)

    fun nota(n: Double): String = "★" + String.format(PT_BR, "%.2f", n)

    /** Formato do campo (o número grande do cartão). */
    fun valor(campo: String, d: Dados): String {
        val a = d.avaliacao
        return when (campo) {
            "porKm" -> Formato.brl(a.porKm)
            "porHora" -> reaisRedondos(a.porHora)
            "lucro" -> reaisRedondos(a.lucro)
            "lucroHora" -> reaisRedondos(a.lucroPorHora) + "/h"
            "lucroPct" -> if (d.valor > 0) "${jsRound(a.lucro * 100.0 / d.valor)}%" else "—"
            "valor" -> Copiloto.reais(d.valor)
            "porMin" -> Formato.brl(arredondar(d.valor.toDouble() / a.minutosTotal.coerceAtLeast(1)))
            "nota" -> d.oferta.nota?.let { nota(it) } ?: "—"
            "tempoTotal" -> (if (a.tempoEstimado) "~" else "") + "${a.minutosTotal} min"
            "distanciaTotal" -> (if (d.oferta.kmCorridaEstimado) "≈" else "") + "${Formato.km(a.kmTotal)} km"
            "busca" -> d.oferta.kmBusca?.let { "a ${Formato.km(it)} km" } ?: "—"
            "volta" -> textoVolta(d)
            else -> ""
        }
    }

    /** "volta 18 km · R$ 11", "calculando volta…" ou "volta —". */
    fun textoVolta(d: Dados): String = when (val v = d.volta) {
        is EstadoVolta.Pronta -> "volta ${jsRound(v.km)} km" + (d.custoVolta?.let { " · ${reaisRedondos(it)}" } ?: "")
        EstadoVolta.Calculando -> "calculando volta…"
        else -> "volta —"
    }

    /** Rótulo pequeno embaixo do número grande. */
    fun rotulo(campo: String): String = when (campo) {
        "porKm" -> "por km"
        "porHora" -> "por hora"
        "lucro" -> "lucro"
        "lucroHora" -> "lucro por hora"
        "lucroPct" -> "lucro %"
        "valor" -> "valor"
        "porMin" -> "por minuto"
        "nota" -> "nota"
        "tempoTotal" -> "tempo total"
        "distanciaTotal" -> "distância total"
        "busca" -> "até o passageiro"
        "volta" -> "volta"
        else -> ""
    }

    /** Campo grande: (número, rótulo). A volta grande vira "R$ 11" com "volta 18 km" embaixo. */
    fun grande(campo: String, d: Dados): Pair<String, String> = when {
        campo == "volta" -> when (val v = d.volta) {
            is EstadoVolta.Pronta -> Pair(d.custoVolta?.let { reaisRedondos(it) } ?: "${jsRound(v.km)} km", "volta ${jsRound(v.km)} km")
            EstadoVolta.Calculando -> Pair("…", "calculando volta")
            else -> Pair("—", "volta")
        }
        campo == "busca" -> Pair(d.oferta.kmBusca?.let { "${Formato.km(it)} km" } ?: "—", rotulo(campo))
        else -> Pair(valor(campo, d), rotulo(campo))
    }

    /** Campo na linha pequena: o formato com o que falta para entender ("R$ 2,10/km", "lucro 62%"). */
    fun pequeno(campo: String, d: Dados): String {
        val v = valor(campo, d)
        return when (campo) {
            "porKm" -> "$v/km"
            "porHora" -> "$v/h"
            "lucro", "lucroHora", "lucroPct" -> "lucro $v"
            "porMin" -> "$v/min"
            else -> v
        }
    }

    /** Os 3 primeiros campos são os grandes; os demais vão juntos na linha pequena. */
    fun dividir(campos: List<String>): Pair<List<String>, List<String>> = Pair(campos.take(3), campos.drop(3))

    // ------------------------------------------------------------------ km e tempo totais

    /** Linha em destaque e detalhe pequeno (null quando não há o que somar). */
    data class Total(val principal: String, val detalhe: String?)

    /** "17,3 km no total" com "2,1 até o passageiro + 15,2 de viagem". */
    fun kmTotal(o: OfertaDetalhada, a: Avaliacao): Total {
        val aprox = if (o.kmCorridaEstimado) "≈" else ""
        val busca = o.kmBusca?.takeIf { it > 0 }
        return Total(
            "$aprox${Formato.km(a.kmTotal)} km no total",
            busca?.let { "${Formato.km(it)} até o passageiro + $aprox${Formato.km(o.kmCorrida)} de viagem" },
        )
    }

    /** "28 min no total" com "6 até o passageiro + 22 de viagem" (estimado: "~"). */
    fun minutosTotal(o: OfertaDetalhada, a: Avaliacao): Total {
        val aprox = if (a.tempoEstimado) "~" else ""
        val kmBusca = o.kmBusca?.takeIf { it > 0 }
        val detalhe = if (kmBusca == null) null else {
            val minBusca = o.minutosBusca ?: ((kmBusca / KM_POR_HORA_CIDADE) * 60)
            val minViagem = o.minutosCorrida ?: ((o.kmCorrida / KM_POR_HORA_CIDADE) * 60)
            val ab = if (o.minutosBusca == null) "~" else ""
            val av = if (o.minutosCorrida == null) "~" else ""
            "$ab${jsRound(minBusca)} até o passageiro + $av${jsRound(minViagem)} de viagem"
        }
        return Total("$aprox${a.minutosTotal} min no total", detalhe)
    }

    // ------------------------------------------------------------------ notificação (tela bloqueada)

    private fun selo(s: Sinal): String = when (s) {
        Sinal.VERDE -> "🟢 Vale a pena"
        Sinal.AMARELO -> "🟡 Avalie"
        Sinal.VERMELHO -> "🔴 Não compensa"
    }

    /** Título da notificação da oferta: "🟢 Vale a pena · R$ 26 · R$ 1,50/km". */
    fun tituloNotificacao(o: OfertaDetalhada, a: Avaliacao): String =
        "${selo(a.sinal)} · ${Copiloto.reais(o.valorUsado)} · ${Formato.brl(a.porKm)}/km"

    /** Texto: "17,3 km · lucro R$ 12 · sugestão: toque em R$ 29" (a sugestão só quando há valor). */
    fun textoNotificacao(o: OfertaDetalhada, a: Avaliacao, sugestao: Copiloto.Sugestao? = null): String {
        val partes = mutableListOf("${Formato.km(a.kmTotal)} km", "lucro ${reaisRedondos(a.lucro)}")
        when (sugestao) {
            is Copiloto.Sugestao.Atalho, is Copiloto.Sugestao.Lapis ->
                partes.add("sugestão: " + Copiloto.textoSugestao(sugestao).replaceFirstChar { it.lowercase(PT_BR) })
            else -> {}
        }
        return partes.joinToString(" · ")
    }

    // ------------------------------------------------------------------ voz

    /** "Verde. Dois reais e dez por quilômetro." / "Vermelho. Não compensa." */
    fun fala(a: Avaliacao): String = when (a.sinal) {
        Sinal.VERMELHO -> "Vermelho. Não compensa."
        Sinal.VERDE -> "Verde. ${extensoReais(a.porKm)} por quilômetro."
        Sinal.AMARELO -> "Amarelo. ${extensoReais(a.porKm)} por quilômetro."
    }

    /** 210 → "Dois reais e dez"; 100 → "Um real"; 50 → "Cinquenta centavos". */
    fun extensoReais(centavos: Long): String {
        val c = kotlin.math.abs(centavos)
        val reais = c / 100
        val cent = c % 100
        val t = when {
            reais == 0L && cent == 0L -> "zero real"
            reais == 0L -> "${extenso(cent)} ${if (cent == 1L) "centavo" else "centavos"}"
            cent == 0L -> "${extenso(reais)} ${if (reais == 1L) "real" else "reais"}"
            else -> "${extenso(reais)} ${if (reais == 1L) "real" else "reais"} e ${extenso(cent)}"
        }
        return t.replaceFirstChar { it.uppercase(PT_BR) }
    }

    private val ATE_DEZENOVE = listOf(
        "zero", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove", "dez",
        "onze", "doze", "treze", "catorze", "quinze", "dezesseis", "dezessete", "dezoito", "dezenove",
    )
    private val DEZENAS = listOf("", "", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa")
    private val CENTENAS = listOf("", "cento", "duzentos", "trezentos", "quatrocentos", "quinhentos", "seiscentos", "setecentos", "oitocentos", "novecentos")

    /** Número por extenso em pt-BR (0 a 999.999; acima disso, os algarismos). */
    fun extenso(n: Long): String {
        if (n < 0 || n > 999_999) return n.toString()
        if (n < 20) return ATE_DEZENOVE[n.toInt()]
        if (n < 100) {
            val d = DEZENAS[(n / 10).toInt()]
            return if (n % 10 == 0L) d else "$d e ${ATE_DEZENOVE[(n % 10).toInt()]}"
        }
        if (n < 1000) {
            if (n == 100L) return "cem"
            val c = CENTENAS[(n / 100).toInt()]
            return if (n % 100 == 0L) c else "$c e ${extenso(n % 100)}"
        }
        val milhares = n / 1000
        val resto = n % 1000
        val m = if (milhares == 1L) "mil" else "${extenso(milhares)} mil"
        return when {
            resto == 0L -> m
            resto < 100 || resto % 100 == 0L -> "$m e ${extenso(resto)}"
            else -> "$m ${extenso(resto)}"
        }
    }
}
