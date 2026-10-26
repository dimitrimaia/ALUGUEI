package xyz.aluguei.app.plantao

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

/** Uber e 99 pelo leitor genérico, com a lista de textos dos nós. */
class LeitoresTest {
    private fun oferta(app: String, t: List<String>): OfertaDetalhada {
        val tela = Leitores.ler(app, t)
        assertTrue("esperava oferta, veio $tela", tela is TelaLida.ComOferta)
        return (tela as TelaLida.ComOferta).oferta
    }

    @Test
    fun `Uber - valor e dois pares`() {
        val o = oferta("uber", listOf("UberX", "R$ 18,40", "★4,93", "8 min (2,3 km) de distância", "Rua A", "Viagem de 15 min (7,4 km)", "Rua B"))
        assertEquals("uber", o.app)
        assertEquals(1840L, o.valor)
        assertEquals(2.3, o.kmBusca!!, 0.0)
        assertEquals(7.4, o.kmCorrida, 0.0)
        assertEquals(15.0, o.minutosCorrida!!, 0.0)
        assertEquals(4.93, o.nota!!, 0.0)
    }

    @Test
    fun `99 - ignora o R$ por km antes do valor`() {
        val o = oferta("99", listOf("Pop", "R$ 1,84/km", "R$ 12,50", "1,2 km · 4 min", "até o passageiro", "6,8 km · 17 min", "de viagem"))
        assertEquals(1250L, o.valor)
        assertEquals(1.2, o.kmBusca!!, 0.0)
        assertEquals(6.8, o.kmCorrida, 0.0)
        assertEquals(184L, o.porKmApp)
    }

    @Test
    fun `tela sem oferta`() {
        assertEquals(TelaLida.Nada, Leitores.ler("uber", listOf("Você está online")))
        assertEquals(TelaLida.Nada, Leitores.ler("99", emptyList()))
    }
}
