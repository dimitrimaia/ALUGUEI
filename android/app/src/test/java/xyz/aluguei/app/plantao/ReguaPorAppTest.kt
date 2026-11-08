package xyz.aluguei.app.plantao

import org.junit.Assert.assertEquals
import org.junit.Assert.assertSame
import org.junit.Test

/** Régua por aplicativo: mesmo comportamento do criteriosDoApp de custos.ts. */
class ReguaPorAppTest {
    private val geral = CRITERIOS_PADRAO.copy(minimoPorKm = 200, minimoPorHora = 4000, valorMinimo = 800, porApp = mapOf("99" to ReguaApp(minimoPorKm = 150, valorMinimo = 0)))

    @Test
    fun reguaDoAppValePorCimaDaGeral() {
        val c = geral.paraApp("99")
        assertEquals(150L, c.minimoPorKm)
        assertEquals(4000L, c.minimoPorHora)
        assertEquals(0L, c.valorMinimo)
    }

    @Test
    fun semReguaDoAppValeAGeral() {
        assertSame(geral, geral.paraApp("uber"))
        assertSame(geral, geral.paraApp(null))
    }
}
