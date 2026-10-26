package xyz.aluguei.app.plantao

import kotlin.math.abs
import kotlin.math.max
import kotlin.math.roundToLong
import kotlin.math.sign

/**
 * Espelho EXATO das regras TypeScript de:
 *  - src/dominio/ganhos/custos.ts  (Criterios, taxas, custoDe, criteriosNoHorario, bateLista)
 *  - src/dominio/ganhos/corrida.ts (avaliarCorrida v2, precoIdeal)
 * Mudou lá, mude aqui (e nos testes de CalculoTest.kt e ReguaTest.kt).
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

/** Faixa de horário com mínimos próprios (ex.: madrugada, pico). Horas "HH:MM", pode virar a meia-noite. */
data class FaixaHorario(
    val nome: String,
    val de: String,
    val ate: String,
    val minimoPorKm: Long,
    val minimoPorHora: Long,
    val bomPorKm: Long = 0,
    val bomPorHora: Long = 0,
)

/**
 * Régua do Copiloto: o que o próprio motorista considera uma boa corrida.
 * Cada métrica tem duas linhas: abaixo do mínimo é ruim (vermelho), a partir
 * do "bom" é boa (verde) e no meio é para avaliar (amarelo). Com o "bom" em 0,
 * vale a régua simples: o mínimo é o verde e até 15% abaixo dele é amarelo.
 */
data class Criterios(
    /** Mínimo por km rodado (contando o caminho até o passageiro), em centavos. */
    val minimoPorKm: Long,
    /** Mínimo por hora (contando o tempo até o passageiro), em centavos. */
    val minimoPorHora: Long,
    /** Distância máxima até o passageiro, em km (0 = sem limite). */
    val buscaMaximaKm: Double,
    /** Verde a partir de (0 = régua simples). */
    val bomPorKm: Long = 0,
    val bomPorHora: Long = 0,
    /** Tempo máximo até o passageiro (0 = sem limite). */
    val buscaMaximaMin: Double = 0.0,
    /** Viagem longa demais (0 = sem limite). */
    val viagemMaximaKm: Double = 0.0,
    val viagemMaximaMin: Double = 0.0,
    /** Corrida abaixo deste valor é vermelha (0 = sem). */
    val valorMinimo: Long = 0,
    /** Lucro mínimo em centavos e em % do valor (bps). Abaixo: amarelo. */
    val lucroMinimo: Long = 0,
    val lucroMinimoBps: Long = 0,
    /** Nota mínima do passageiro (0 = não olha a nota). */
    val notaMinima: Double = 0.0,
    /** Avisar passageiro com menos de 5 corridas e corrida com parada. */
    val alertaPassageiroNovo: Boolean = false,
    val alertaParadas: Boolean = false,
    /** Ruas, bairros ou palavras que o motorista evita (embarque ou destino): vermelho. */
    val evitar: List<String> = emptyList(),
    /** Destinos que interessam (perto de casa, aeroporto): selo positivo. */
    val destinosDesejados: List<String> = emptyList(),
    /** Mínimos por horário: na faixa, valem no lugar dos de cima. */
    val porHorario: List<FaixaHorario> = emptyList(),
    /** Contar o custo de voltar para a base (casa) no lucro. */
    val contarVolta: Boolean = false,
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

/** Régua que vale num horário: os critérios com os mínimos da faixa, e o nome da faixa (ou null). */
data class ReguaNoHorario(val criterios: Criterios, val faixa: String?)

/** "23:30" → minutos do dia. */
private fun minutosDoDia(h: String): Int = h.substring(0, 2).toInt() * 60 + h.substring(3, 5).toInt()

/**
 * Régua que vale agora (criteriosNoHorario de custos.ts): a faixa de horário que
 * cobre `minutoDoDia` (0..1439) substitui os mínimos gerais. Faixas que viram a
 * meia-noite (22:00 → 05:00) valem.
 */
fun criteriosNoHorario(c: Criterios, minutoDoDia: Int): ReguaNoHorario {
    val f = c.porHorario.firstOrNull { x ->
        val de = minutosDoDia(x.de)
        val ate = minutosDoDia(x.ate)
        if (de <= ate) minutoDoDia >= de && minutoDoDia < ate else minutoDoDia >= de || minutoDoDia < ate
    } ?: return ReguaNoHorario(c, null)
    return ReguaNoHorario(c.copy(minimoPorKm = f.minimoPorKm, minimoPorHora = f.minimoPorHora, bomPorKm = f.bomPorKm, bomPorHora = f.bomPorHora), f.nome)
}

private val MARCAS_COMBINANTES = Regex("[\\u0300-\\u036f]")

/** Igual ao `s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()` do TS. */
private fun normalizarParaLista(s: String): String =
    java.text.Normalizer.normalize(s, java.text.Normalizer.Form.NFD).replace(MARCAS_COMBINANTES, "").lowercase()

/** Comparação sem acento e sem maiúscula (bateLista de custos.ts): a primeira palavra da lista que aparece no texto. */
fun bateLista(texto: String?, lista: List<String>): String? {
    if (texto.isNullOrEmpty()) return null
    val t = normalizarParaLista(texto)
    return lista.firstOrNull { t.contains(normalizarParaLista(it)) }
}

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

/** Passageiro com menos corridas que isso é "novo". */
const val CORRIDAS_PASSAGEIRO_NOVO = 5

/** Régua simples: até 15% abaixo do mínimo ainda é amarelo. */
const val TOLERANCIA = 0.85

data class Oferta(
    /** Valor da corrida, em centavos. */
    val valor: Long,
    val kmCorrida: Double,
    /** Tempo da corrida. Sem ele, estima pela velocidade média. */
    val minutosCorrida: Double? = null,
    val kmBusca: Double? = null,
    val minutosBusca: Double? = null,
    /** Do cartão do app, quando aparecem. */
    val nota: Double? = null,
    val corridasPassageiro: Int? = null,
    val paradas: Int? = null,
    val embarque: String? = null,
    val destino: String? = null,
    /** Volta do destino até a base (casa), quando calculada. */
    val kmVolta: Double? = null,
    val minutosVolta: Double? = null,
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
    /** Custo de voltar vazio para a base (0 se não conta a volta). */
    val custoVolta: Long = 0,
    /** Lucro descontando a volta, quando a régua conta a volta. */
    val lucro: Long,
    val lucroPorHora: Long,
    val motivos: List<String>,
    /** Pontos a favor (destino desejado). */
    val destaques: List<String> = emptyList(),
)

/** Duas linhas (mínimo e bom) ou a régua simples (bom = 0). 0 ok, 1 amarelo, 2 vermelho. */
private fun nivelMetrica(valor: Long, minimo: Long, bom: Long): Int {
    if (bom > 0) return if (valor < minimo) 2 else if (valor < bom) 1 else 0
    if (minimo <= 0) return 0
    return if (valor < minimo * TOLERANCIA) 2 else if (valor < minimo) 1 else 0
}

/** Espelho de avaliarCorrida (corrida.ts): mesma ordem de regras e mesmos textos de motivos. */
/**
 * Chip "Contar volta para casa" do cartão: liga/desliga o contarVolta só no
 * cálculo do cartão (a régua salva não muda). null = segue a régua.
 */
fun comVoltaDoCartao(c: Criterios, chip: Boolean?): Criterios = if (chip == null || chip == c.contarVolta) c else c.copy(contarVolta = chip)

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
    val kmVolta = if (c.contarVolta) max(0.0, o.kmVolta ?: 0.0) else 0.0
    val custoVolta = if (kmVolta > 0) custoDe(t, kmVolta, o.minutosVolta ?: ((kmVolta / KM_POR_HORA_CIDADE) * 60)) else 0L
    val lucro = o.valor - custo - custoVolta
    val lucroPorHora = arredondar((lucro * 60).toDouble() / minutosTotal)

    val motivos = mutableListOf<String>()
    val destaques = mutableListOf<String>()
    var nivel = 0
    fun marcar(n: Int, motivo: String) {
        if (n == 0) return
        nivel = max(nivel, n)
        motivos.add(motivo)
    }

    if (lucro <= 0) marcar(2, if (custoVolta != 0L) "Não paga os custos com a volta" else "Não paga os custos")
    if (c.valorMinimo > 0 && o.valor < c.valorMinimo) marcar(2, "Abaixo do seu valor mínimo")
    marcar(nivelMetrica(porKm, c.minimoPorKm, c.bomPorKm), "Abaixo do seu mínimo por km")
    marcar(nivelMetrica(porHora, c.minimoPorHora, c.bomPorHora), "Abaixo do seu mínimo por hora")
    if (lucro > 0 && c.lucroMinimo > 0 && lucro < c.lucroMinimo) marcar(1, "Lucro abaixo do seu mínimo")
    if (lucro > 0 && c.lucroMinimoBps > 0 && lucro * 10_000 < c.lucroMinimoBps * o.valor) marcar(1, "Margem de lucro baixa")
    if (c.buscaMaximaKm > 0 && kmBusca > c.buscaMaximaKm) marcar(if (kmBusca > c.buscaMaximaKm * 1.5) 2 else 1, "Passageiro longe")
    if (c.buscaMaximaMin > 0 && minBusca > c.buscaMaximaMin) marcar(if (minBusca > c.buscaMaximaMin * 1.5) 2 else 1, "Embarque demorado")
    if (c.viagemMaximaKm > 0 && o.kmCorrida > c.viagemMaximaKm) marcar(1, "Viagem longa")
    if (c.viagemMaximaMin > 0 && minCorrida > c.viagemMaximaMin) marcar(1, "Viagem demorada")
    if (c.notaMinima > 0 && o.nota != null && o.nota < c.notaMinima) marcar(1, "Nota baixa")
    if (c.alertaPassageiroNovo && o.corridasPassageiro != null && o.corridasPassageiro < CORRIDAS_PASSAGEIRO_NOVO) marcar(1, "Passageiro novo")
    if (c.alertaParadas && (o.paradas ?: 0) > 0) marcar(1, "Corrida com parada")
    val evitado = bateLista(o.embarque, c.evitar) ?: bateLista(o.destino, c.evitar)
    if (evitado != null) marcar(2, "Lugar que você evita: $evitado")
    val desejado = bateLista(o.destino, c.destinosDesejados)
    if (desejado != null) destaques.add("Destino desejado: $desejado")

    val sinal = when (nivel) {
        2 -> Sinal.VERMELHO
        1 -> Sinal.AMARELO
        else -> Sinal.VERDE
    }
    return Avaliacao(
        sinal = sinal,
        kmTotal = kmTotal,
        minutosTotal = jsRound(minutosTotal),
        tempoEstimado = tempoEstimado,
        porKm = porKm,
        porHora = porHora,
        custo = custo,
        custoVolta = custoVolta,
        lucro = lucro,
        lucroPorHora = lucroPorHora,
        motivos = motivos,
        destaques = destaques,
    )
}

/**
 * Contraproposta (precoIdeal de corrida.ts): o menor valor em reais inteiros que
 * deixa a corrida verde, até o dobro da oferta. Null se nem o dobro fica verde.
 */
fun precoIdeal(o: Oferta, t: Taxas, c: Criterios): Long? {
    if (avaliarCorrida(o, t, c).sinal == Sinal.VERDE) return o.valor
    val maximo = o.valor * 2
    var v = -Math.floorDiv(-o.valor, 100L) * 100 // Math.ceil(valor / 100) * 100
    while (v <= maximo) {
        if (avaliarCorrida(o.copy(valor = v), t, c).sinal == Sinal.VERDE) return v
        v += 100
    }
    return null
}

/** Math.round do JavaScript (meio para cima, inclusive nos negativos). */
fun jsRound(v: Double): Long = Math.floor(v + 0.5).toLong()
