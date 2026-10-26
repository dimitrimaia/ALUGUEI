package xyz.aluguei.app.plantao

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Mesmos casos de src/dominio/ganhos/ganhos.test.ts ("taxas" e "semáforo da corrida").
 * Se mudar lá, mude aqui.
 */
class CalculoTest {
    // Perfil redondo para conferir à mão: gasolina R$ 6,00 a 12 km/l = 50 c/km;
    // desgaste R$ 1.000 a cada 10.000 km = 10 c/km; aluguel R$ 2.600/mês em 26 dias × 10 h = R$ 10/h.
    private val perfil = PerfilCusto(
        combustivel = "gasolina",
        consumo = 12.0,
        precoCombustivel = 600,
        desgaste = listOf(ItemDesgaste("Manutenção", 100000, 10000.0)),
        fixosMensais = listOf(ItemFixo("Aluguel", 260000)),
        diasPorMes = 26.0,
        horasPorDia = 10.0,
    )
    private val t = taxas(perfil)

    @Test
    fun `custo por km e por hora`() {
        assertEquals(50.0, t.combustivelPorKm, 0.0)
        assertEquals(10.0, t.desgastePorKm, 0.0)
        assertEquals(60.0, t.variavelPorKm, 0.0)
        assertEquals(1000.0, t.fixoPorHora, 0.0)
    }

    @Test
    fun `corrida boa é verde, com custo e lucro certos`() {
        // R$ 20 por 6 km de viagem + 1 km de busca, 15 + 3 min.
        val a = avaliarCorrida(Oferta(valor = 2000, kmCorrida = 6.0, minutosCorrida = 15.0, kmBusca = 1.0, minutosBusca = 3.0), t, CRITERIOS_PADRAO)
        assertEquals(7.0, a.kmTotal, 0.0)
        assertEquals(18L, a.minutosTotal)
        assertEquals(286L, a.porKm)
        assertEquals(6667L, a.porHora)
        assertEquals((7 * 60 + 300).toLong(), a.custo) // 420 de km + 18 min de R$ 10/h
        assertEquals((2000 - 720).toLong(), a.lucro)
        assertEquals(Sinal.VERDE, a.sinal)
    }

    @Test
    fun `um pouco abaixo do mínimo é amarelo e bem abaixo é vermelho`() {
        val amarelo = avaliarCorrida(Oferta(valor = 1300, kmCorrida = 6.0, minutosCorrida = 12.0, kmBusca = 1.0, minutosBusca = 2.0), t, CRITERIOS_PADRAO)
        assertEquals(186L, amarelo.porKm)
        assertEquals(Sinal.AMARELO, amarelo.sinal)
        val vermelho = avaliarCorrida(Oferta(valor = 900, kmCorrida = 6.0, minutosCorrida = 12.0, kmBusca = 1.0, minutosBusca = 2.0), t, CRITERIOS_PADRAO)
        assertEquals(Sinal.VERMELHO, vermelho.sinal)
    }

    @Test
    fun `busca longe pesa, e prejuízo é sempre vermelho`() {
        val longe = avaliarCorrida(Oferta(valor = 4000, kmCorrida = 10.0, minutosCorrida = 20.0, kmBusca = 5.0, minutosBusca = 6.0), t, CRITERIOS_PADRAO)
        assertTrue(longe.motivos.contains("Passageiro longe"))
        val prejuizo = avaliarCorrida(Oferta(valor = 500, kmCorrida = 10.0, minutosCorrida = 20.0), t, CRITERIOS_PADRAO.copy(minimoPorKm = 0, minimoPorHora = 0))
        assertEquals(Sinal.VERMELHO, prejuizo.sinal)
    }

    @Test
    fun `sem tempo, estima pela velocidade média e avisa`() {
        val a = avaliarCorrida(Oferta(valor = 2000, kmCorrida = 8.0), t, CRITERIOS_PADRAO)
        assertTrue(a.tempoEstimado)
        assertEquals(20L, a.minutosTotal)
    }

    @Test
    fun `busca acima de 1,5 vez o máximo é vermelho mesmo com valor bom`() {
        // 4 km de máximo: 7 km de busca passa de 6 km (1,5×).
        val a = avaliarCorrida(Oferta(valor = 10000, kmCorrida = 10.0, minutosCorrida = 20.0, kmBusca = 7.0, minutosBusca = 10.0), t, CRITERIOS_PADRAO)
        assertEquals(Sinal.VERMELHO, a.sinal)
        // 5 km: acima do máximo, mas abaixo de 1,5× → amarelo.
        val b = avaliarCorrida(Oferta(valor = 10000, kmCorrida = 10.0, minutosCorrida = 20.0, kmBusca = 5.0, minutosBusca = 8.0), t, CRITERIOS_PADRAO)
        assertEquals(Sinal.AMARELO, b.sinal)
    }

    @Test
    fun `arredondamento meio para cima, como o do TypeScript`() {
        assertEquals(3L, arredondar(2.5))
        assertEquals(-3L, arredondar(-2.5))
        assertEquals(0L, arredondar(0.0))
    }
}
