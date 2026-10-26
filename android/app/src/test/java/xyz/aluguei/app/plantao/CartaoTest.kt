package xyz.aluguei.app.plantao

import org.junit.Assert.assertEquals
import org.junit.Test

class CartaoTest {
    private val t = taxas(PERFIL_PADRAO)

    // R$ 26 por 18,5 km + 2,1 km de busca, 15 + 6 min.
    private val oferta = OfertaDetalhada(
        app = "indrive", valor = 2600, kmCorrida = 18.5, minutosCorrida = 15.0, kmBusca = 2.1, minutosBusca = 6.0,
        nome = "Maria", nota = 4.71,
    )
    private val a = avaliarCorrida(oferta.paraOferta(), t, CRITERIOS_PADRAO)
    private val d = Cartao.Dados(oferta, a, EstadoVolta.Pronta(17.6, 30.0), custoVolta = 1090)

    @Test
    fun `formatos dos campos`() {
        assertEquals(Formato.brl(a.porKm), Cartao.valor("porKm", d))
        assertEquals("R$ 1,26", Cartao.valor("porKm", d)) // 2600 / 20,6
        assertEquals("R$ 74", Cartao.valor("porHora", d)) // 2600 × 60 / 21 = 7429
        assertEquals("${jsRound(a.lucro * 100.0 / 2600)}%", Cartao.valor("lucroPct", d))
        assertEquals("R$ 26", Cartao.valor("valor", d))
        assertEquals("R$ 1,24", Cartao.valor("porMin", d)) // 2600 / 21 min
        assertEquals("★4,71", Cartao.valor("nota", d))
        assertEquals("21 min", Cartao.valor("tempoTotal", d))
        assertEquals("20,6 km", Cartao.valor("distanciaTotal", d))
        assertEquals("a 2,1 km", Cartao.valor("busca", d))
        assertEquals("volta 18 km · R$ 11", Cartao.valor("volta", d))
        assertEquals(Copiloto.reais(jsRound(a.lucroPorHora / 100.0) * 100) + "/h", Cartao.valor("lucroHora", d))
    }

    @Test
    fun `campos sem dado e volta calculando`() {
        val sem = Cartao.Dados(oferta.copy(nota = null, kmBusca = null), a, EstadoVolta.Calculando)
        assertEquals("—", Cartao.valor("nota", sem))
        assertEquals("—", Cartao.valor("busca", sem))
        assertEquals("calculando volta…", Cartao.valor("volta", sem))
        assertEquals(Pair("…", "calculando volta"), Cartao.grande("volta", sem))
        assertEquals("volta —", Cartao.valor("volta", sem.copy(volta = EstadoVolta.Indisponivel)))
        assertEquals("~20 min", Cartao.valor("tempoTotal", Cartao.Dados(oferta, avaliarCorrida(Oferta(2600, 8.0), t, CRITERIOS_PADRAO))))
    }

    @Test
    fun `grandes e linha pequena`() {
        assertEquals(Pair(listOf("porKm", "porHora", "lucro"), listOf("nota", "tempoTotal")), Cartao.dividir(listOf("porKm", "porHora", "lucro", "nota", "tempoTotal")))
        assertEquals(Pair("R$ 11", "volta 18 km"), Cartao.grande("volta", d))
        assertEquals(Pair("2,1 km", "até o passageiro"), Cartao.grande("busca", d))
        assertEquals("R$ 1,26/km", Cartao.pequeno("porKm", d))
        assertEquals("R$ 74/h", Cartao.pequeno("porHora", d))
        assertEquals("R$ 1,24/min", Cartao.pequeno("porMin", d))
    }

    @Test
    fun `contraproposta entra no valor dos campos`() {
        val o = oferta.copy(suaOferta = 3000)
        val dd = Cartao.Dados(o, avaliarCorrida(o.paraOferta().copy(valor = 3000), t, CRITERIOS_PADRAO))
        assertEquals("R$ 30", Cartao.valor("valor", dd))
    }

    @Test
    fun `fala do resultado`() {
        assertEquals("Verde. Dois reais e dez por quilômetro.", Cartao.fala(a.copy(sinal = Sinal.VERDE, porKm = 210)))
        assertEquals("Vermelho. Não compensa.", Cartao.fala(a.copy(sinal = Sinal.VERMELHO)))
        assertEquals("Amarelo. Um real e oitenta e seis por quilômetro.", Cartao.fala(a.copy(sinal = Sinal.AMARELO, porKm = 186)))
    }

    @Test
    fun `reais por extenso`() {
        assertEquals("Dois reais e dez", Cartao.extensoReais(210))
        assertEquals("Um real", Cartao.extensoReais(100))
        assertEquals("Cinquenta centavos", Cartao.extensoReais(50))
        assertEquals("Um centavo", Cartao.extensoReais(1))
        assertEquals("Três reais e cinco", Cartao.extensoReais(305))
        assertEquals("Cento e vinte e um reais", Cartao.extensoReais(12100))
        assertEquals("cem", Cartao.extenso(100))
        assertEquals("mil e quinhentos", Cartao.extenso(1500))
        assertEquals("dois mil trezentos e quarenta e cinco", Cartao.extenso(2345))
        assertEquals("catorze", Cartao.extenso(14))
    }
}
