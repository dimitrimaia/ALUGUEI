package xyz.aluguei.app.plantao

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class Leitor37CityTest {
    // Textos da oferta do print (29/10/2026), na ordem da tela.
    private val oferta = listOf(
        "1,25x", "RECUSAR", "Joaquim", "5,00", "(Motorista)", "R$ 13,81", "3,0 km (R$ 4,60/km)", "6 min (R$ 2,30/min)",
        "3 m (1 min)", "Rua Versador Enilton Simões, 121 - Mangabeiras, Divinópolis - MG, 35500-730, Brasil",
        "3,0 km (6 min)", "R. Cristal, 106 - Centro, Divinópolis - MG, 35500-044, Brasil", "ACEITAR (9)",
    )

    @Test
    fun `le a oferta do 37 City`() {
        val o = (Leitor37City.ler(oferta) as TelaLida.ComOferta).oferta
        assertEquals("37city", o.app)
        assertEquals(1381L, o.valor)
        assertEquals(3.0, o.kmCorrida, 0.001)
        assertEquals(6.0, o.minutosCorrida!!, 0.001)
        assertEquals(0.003, o.kmBusca!!, 0.0001)
        assertEquals(1.0, o.minutosBusca!!, 0.001)
        assertEquals(460L, o.porKmApp)
        assertEquals(5.0, o.nota!!, 0.001)
        assertTrue(o.embarque!!.startsWith("Rua Versador"))
        assertTrue(o.destino!!.startsWith("R. Cristal"))
    }

    @Test
    fun `sem aceitar nao e oferta`() {
        assertEquals(TelaLida.Nada, Leitor37City.ler(oferta.filterNot { it.startsWith("ACEITAR") }))
    }
}
