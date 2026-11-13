package xyz.aluguei.app.plantao

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

/** Oferta da Uber em janela flutuante (por cima de outro app), como no print do motorista em Divinópolis. */
class UberSobrepostaTest {
    private val textos = listOf(
        "UberX", "R$ 9,94", "4,94 (33)",
        "4 min (0.8 km)", "Avenida Dolores Rabelo de Aguiar, Divinópolis, Divinópolis",
        "1 parada",
        "10 minutos (2.8 km)", "av. sete de setembro, 611, Centro, Divinópolis",
        "Aceitar", "Uber",
    )

    @Test
    fun leAOferta() {
        val t = LeitorUber.ler(textos)
        assertTrue("leu: $t", t is TelaLida.ComOferta)
        val o = (t as TelaLida.ComOferta).oferta
        assertEquals(994L, o.valor)
        assertEquals(2.8, o.kmCorrida, 0.01)
        assertEquals(0.8, o.kmBusca!!, 0.01)
        assertEquals(10.0, o.minutosCorrida!!, 0.01)
        assertEquals(4.0, o.minutosBusca!!, 0.01)
    }
}
