package xyz.aluguei.app.plantao

import kotlin.math.abs
import kotlin.math.max
import kotlin.math.roundToLong
import kotlin.math.sign

/**
 * Espelho EXATO das regras TypeScript de:
 *  - src/dominio/ganhos/custos.ts  (taxas, custoDe)
 *  - src/dominio/ganhos/corrida.ts (avaliarCorrida)
 * Mudou lá, mude aqui (e nos testes de CalculoTest.kt).
 *
 * Dinheiro sempre em centavos inteiros (Long). As TAXAS (centavos por km,
 * centavos por hora) podem ter fração e ficam em Double; só viram dinheiro
 * multiplicadas por km ou horas, e aí são arredondadas.
 *
 * Este arquivo é puro (sem Android) para rodar nos testes JUnit da JVM.
 */

/** Gasto que acontece a cada tantos km (troca de óleo, pneus, revisão). */
data class ItemDesgaste(val nome: String, val valor: Long, val cadaKm: Double)

/** Gasto fixo por mês (aluguel, seguro, internet, IPVA ÷ 12). */
data class ItemFixo(val nome: String, val valor: Long, val doContrato: Boolean = false)

data class PerfilCusto(
    /** gasolina | etanol | gnv | diesel | eletrico */
    val combustivel: String,
    /** km por litro (ou m³, ou kWh). */
    val consumo: Double,
    /** Preço por litro (ou m³, ou kWh), em centavos. */
    val precoCombustivel: Long,
    val desgaste: List<ItemDesgaste>,
    val fixosMensais: List<ItemFixo>,
    val diasPorMes: Double,
    val horasPorDia: Double,
)

/** Critérios do semáforo (o Copiloto): o que o próprio motorista considera uma boa corrida. */
data class Criterios(
    /** Mínimo por km rodado (contando o caminho até o passageiro), em centavos. */
    val minimoPorKm: Long,
    /** Mínimo por hora (contando o tempo até o passageiro), em centavos. */
    val minimoPorHora: Long,
    /** Distância máxima até o passageiro, em km. */
    val buscaMaximaKm: Double,
    /** Nota mínima do passageiro (0 = não olha a nota). Usada pelo Copiloto, não por avaliarCorrida. */
    val notaMinima: Double = 0.0,
    /** Ruas, bairros ou palavras que o motorista evita. Usado pelo Copiloto, não por avaliarCorrida. */
    val evitar: List<String> = emptyList(),
)

/** Mesmo PERFIL_PADRAO de custos.ts. */
val PERFIL_PADRAO = PerfilCusto(
    combustivel = "gasolina",
    consumo = 11.0,
    precoCombustivel = 619,
    desgaste = listOf(
        ItemDesgaste("Troca de óleo e filtros", 30000, 10000.0),
        ItemDesgaste("Pneus", 160000, 40000.0),
        ItemDesgaste("Revisão, freios e suspensão", 150000, 20000.0),
    ),
    fixosMensais = emptyList(),
    diasPorMes = 26.0,
    horasPorDia = 10.0,
)

/** Mesmo CRITERIOS_PADRAO de custos.ts. */
val CRITERIOS_PADRAO = Criterios(minimoPorKm = 200, minimoPorHora = 4000, buscaMaximaKm = 4.0)

data class Taxas(
    val combustivelPorKm: Double,
    val desgastePorKm: Double,
    /** Combustível + desgaste: o que cada km a mais custa. */
    val variavelPorKm: Double,
    val fixoMensal: Long,
    /** Custo fixo de cada hora trabalhada (fixos ÷ horas do mês). */
    val fixoPorHora: Double,
)

/**
 * Arredondamento do sistema (src/dominio/dinheiro/centavos.ts):
 * Math.sign(v) * Math.round(Math.abs(v)). Para valores positivos, Math.round do
 * JavaScript e roundToLong (meio para cima) dão o mesmo resultado.
 */
fun arredondar(valor: Double): Long {
    val r = abs(valor).roundToLong()
    return if (sign(valor) < 0) -r else r
}

fun taxas(p: PerfilCusto): Taxas {
    val combustivelPorKm = if (p.consumo > 0) p.precoCombustivel / p.consumo else 0.0
    val desgastePorKm = p.desgaste.fold(0.0) { s, i -> s + (if (i.cadaKm > 0) i.valor / i.cadaKm else 0.0) }
    val fixoMensal = p.fixosMensais.fold(0L) { s, i -> s + i.valor }
    val horasMes = p.diasPorMes * p.horasPorDia
    return Taxas(
        combustivelPorKm = combustivelPorKm,
        desgastePorKm = desgastePorKm,
        variavelPorKm = combustivelPorKm + desgastePorKm,
        fixoMensal = fixoMensal,
        fixoPorHora = if (horasMes > 0) fixoMensal / horasMes else 0.0,
    )
}

/** Custo de rodar `km` em `minutos` (variável pelo km, fixo pelo tempo). */
fun custoDe(t: Taxas, km: Double, minutos: Double): Long =
    arredondar(t.variavelPorKm * km + (t.fixoPorHora * minutos) / 60)

/** Velocidade média na cidade, para estimar o tempo quando a oferta não mostra. */
const val KM_POR_HORA_CIDADE = 24.0

/** Margem abaixo do mínimo que ainda é "amarelo" (avaliar). Abaixo disso, vermelho. */
const val TOLERANCIA = 0.85

data class Oferta(
    /** Valor da corrida, em centavos. */
    val valor: Long,
    val kmCorrida: Double,
    /** Tempo da corrida. Sem ele, estima pela velocidade média. */
    val minutosCorrida: Double? = null,
    val kmBusca: Double? = null,
    val minutosBusca: Double? = null,
)

enum class Sinal(val codigo: String) {
    VERDE("verde"),
    AMARELO("amarelo"),
    VERMELHO("vermelho"),
}

data class Avaliacao(
    val sinal: Sinal,
    val kmTotal: Double,
    val minutosTotal: Long,
    val tempoEstimado: Boolean,
    /** Valor ÷ km total (corrida + busca), como os apps de motorista mostram. */
    val porKm: Long,
    /** Valor ÷ horas totais (corrida + busca). */
    val porHora: Long,
    val custo: Long,
    val lucro: Long,
    val lucroPorHora: Long,
    val motivos: List<String>,
)

fun avaliarCorrida(o: Oferta, t: Taxas, c: Criterios): Avaliacao {
    val kmBusca = max(0.0, o.kmBusca ?: 0.0)
    val kmTotal = max(0.1, o.kmCorrida + kmBusca)
    val tempoEstimado = o.minutosCorrida == null
    val minCorrida = o.minutosCorrida ?: ((o.kmCorrida / KM_POR_HORA_CIDADE) * 60)
    val minBusca = o.minutosBusca ?: ((kmBusca / KM_POR_HORA_CIDADE) * 60)
    val minutosTotal = max(1.0, minCorrida + minBusca)
    val porKm = arredondar(o.valor / kmTotal)
    val porHora = arredondar((o.valor * 60).toDouble() / minutosTotal)
    val custo = custoDe(t, kmTotal, minutosTotal)
    val lucro = o.valor - custo
    val lucroPorHora = arredondar((lucro * 60).toDouble() / minutosTotal)

    val motivos = mutableListOf<String>()
    var pontos = 0 // 0 = verde; cada critério abaixo soma
    var vermelho = lucro <= 0
    if (lucro <= 0) motivos.add("Não paga os custos")
    for ((valor, minimo, rotulo) in listOf(
        Triple(porKm, c.minimoPorKm, "por km"),
        Triple(porHora, c.minimoPorHora, "por hora"),
    )) {
        if (minimo > 0 && valor < minimo) {
            pontos++
            if (valor < minimo * TOLERANCIA) vermelho = true
            motivos.add("Abaixo do seu mínimo $rotulo")
        }
    }
    if (c.buscaMaximaKm > 0 && kmBusca > c.buscaMaximaKm) {
        pontos++
        if (kmBusca > c.buscaMaximaKm * 1.5) vermelho = true
        motivos.add("Passageiro longe")
    }
    val sinal = if (vermelho) Sinal.VERMELHO else if (pontos > 0) Sinal.AMARELO else Sinal.VERDE
    return Avaliacao(
        sinal = sinal,
        kmTotal = kmTotal,
        minutosTotal = jsRound(minutosTotal),
        tempoEstimado = tempoEstimado,
        porKm = porKm,
        porHora = porHora,
        custo = custo,
        lucro = lucro,
        lucroPorHora = lucroPorHora,
        motivos = motivos,
    )
}

/** Math.round do JavaScript (meio para cima, inclusive nos negativos). */
fun jsRound(v: Double): Long = Math.floor(v + 0.5).toLong()
