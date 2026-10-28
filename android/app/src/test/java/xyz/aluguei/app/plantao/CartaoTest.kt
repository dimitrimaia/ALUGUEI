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
        assertEquals("volta 18 km · custa R$ 11", Cartao.valor("volta", d))
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

    @Test
    fun `km e tempo totais com o detalhe`() {
        // 2,1 km até o passageiro + 15,2 de viagem; 6 + 22 min.
        val o = OfertaDetalhada(app = "indrive", valor = 2600, kmCorrida = 15.2, minutosCorrida = 22.0, kmBusca = 2.1, minutosBusca = 6.0)
        val av = avaliarCorrida(o.paraOferta(), t, CRITERIOS_PADRAO)
        assertEquals(Cartao.Total("17,3 km no total", "2,1 até o passageiro + 15,2 de viagem"), Cartao.kmTotal(o, av))
        assertEquals(Cartao.Total("28 min no total", "6 até o passageiro + 22 de viagem"), Cartao.minutosTotal(o, av))
        // Sem a busca: só o total.
        val sem = o.copy(kmBusca = null, minutosBusca = null)
        val avSem = avaliarCorrida(sem.paraOferta(), t, CRITERIOS_PADRAO)
        assertEquals(Cartao.Total("15,2 km no total", null), Cartao.kmTotal(sem, avSem))
        assertEquals(Cartao.Total("22 min no total", null), Cartao.minutosTotal(sem, avSem))
        // Tempo estimado (sem minutos na tela): "~"; km estimado pelo R$/km: "≈".
        val est = o.copy(minutosCorrida = null, minutosBusca = null, kmCorridaEstimado = true)
        val avEst = avaliarCorrida(est.paraOferta(), t, CRITERIOS_PADRAO)
        assertEquals(Cartao.Total("≈17,3 km no total", "2,1 até o passageiro + ≈15,2 de viagem"), Cartao.kmTotal(est, avEst))
        assertEquals(Cartao.Total("~43 min no total", "~5 até o passageiro + ~38 de viagem"), Cartao.minutosTotal(est, avEst))
    }

    @Test
    fun `notificacao da oferta com a tela bloqueada`() {
        val o = OfertaDetalhada(app = "indrive", valor = 2600, kmCorrida = 15.2, minutosCorrida = 22.0, kmBusca = 2.1, minutosBusca = 6.0)
        val av = avaliarCorrida(o.paraOferta(), t, CRITERIOS_PADRAO).copy(sinal = Sinal.VERDE, porKm = 150, lucro = 1210)
        assertEquals("🟢 Vale a pena · R$ 26 · R$ 1,50/km", Cartao.tituloNotificacao(o, av))
        assertEquals("17,3 km · lucro R$ 12", Cartao.textoNotificacao(o, av))
        assertEquals("17,3 km · lucro R$ 12 · sugestão: toque em R$ 29", Cartao.textoNotificacao(o, av, Copiloto.Sugestao.Atalho(2900, av)))
        assertEquals("17,3 km · lucro R$ 12", Cartao.textoNotificacao(o, av, Copiloto.Sugestao.PodeAceitar))
        // Com a contraproposta / valor final, o título mostra o valor usado.
        assertEquals("🔴 Não compensa · R$ 22 · R$ 1,50/km", Cartao.tituloNotificacao(o.copy(suaOferta = 2200), av.copy(sinal = Sinal.VERMELHO)))
        assertEquals("🟡 Avalie · R$ 25 · R$ 1,50/km", Cartao.tituloNotificacao(o.copy(suaOferta = 2200, valorFinal = 2500), av.copy(sinal = Sinal.AMARELO)))
    }
}
