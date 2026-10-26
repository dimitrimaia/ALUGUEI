package xyz.aluguei.app.plantao

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

/**
 * Mesmos casos de src/dominio/ganhos/ganhos.test.ts ("leitura da oferta").
 * Se mudar lá, mude aqui.
 */
class LeitorOfertaTest {
    private fun ler(t: String) = LeitorOferta.lerOferta(t)

    @Test
    fun `Uber - dois pares tempo (distância)`() {
        assertEquals(
            OfertaLida(valor = 1840, kmBusca = 2.3, minutosBusca = 8.0, kmCorrida = 7.4, minutosCorrida = 15.0, completa = true),
            ler("UberX R$ 18,40 ★4,93 8 min (2,3 km) de distância Rua A Viagem de 15 min (7,4 km) Rua B"),
        )
    }

    @Test
    fun `99 - distância antes do tempo`() {
        val o = ler("Pop R$ 12,50 1,2 km · 4 min até o passageiro 6,8 km · 17 min de viagem")!!
        assertEquals(1250L, o.valor)
        assertEquals(1.2, o.kmBusca!!, 0.0)
        assertEquals(4.0, o.minutosBusca!!, 0.0)
        assertEquals(6.8, o.kmCorrida, 0.0)
        assertEquals(17.0, o.minutosCorrida!!, 0.0)
    }

    @Test
    fun `busca em metros e valor com milhar`() {
        val o = ler("R$ 1.020,00 a 800 m Viagem 48 min (52,1 km)")!!
        assertEquals(102000L, o.valor)
        assertEquals(0.8, o.kmBusca!!, 0.0)
        assertEquals(52.1, o.kmCorrida, 0.0)
        assertEquals(48.0, o.minutosCorrida!!, 0.0)
    }

    @Test
    fun `sem valor ou sem distância, não lê`() {
        assertNull(ler("Você está online"))
        assertNull(ler("R$ 20,00 ganhos hoje"))
    }

    @Test
    fun `espaço não separável e maiúsculas, como no JavaScript`() {
        // Os apps costumam usar U+00A0 entre "R$" e o número.
        val o = ler("R$ 18,40 8 MIN (2,3 KM) Viagem 15 min (7,4 km)")!!
        assertEquals(1840L, o.valor)
        assertEquals(2.3, o.kmBusca!!, 0.0)
        assertEquals(7.4, o.kmCorrida, 0.0)
    }
}
