package xyz.aluguei.app.plantao

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class ComunidadeTest {
    private val lista = listOf(Comunidade.Lugar("Vila Nova Esperança", dia = 1, noite = 14), Comunidade.Lugar("Centro", dia = 5, noite = 5))
    private val oferta = OfertaDetalhada(app = "indrive", valor = 3500, kmCorrida = 10.0, enderecos = listOf("Rua A, 10 (Centro, BH)", "Rua F, 70 (Vila Nova Esperanca, Contagem - MG)"))

    @Test
    fun `embarque primeiro e respeita dia e noite`() {
        assertEquals(Comunidade.Alerta(true, "Centro", 5, false), Comunidade.alerta(oferta, lista, noite = false))
        val semCentro = oferta.copy(enderecos = listOf("Rua B, 1 (Savassi, BH)", "Rua F, 70 (Vila Nova Esperanca, Contagem - MG)"))
        assertEquals("⚠ Destino: 14 motoristas evitam Vila Nova Esperança à noite", Comunidade.alerta(semCentro, lista, noite = true)!!.texto())
        assertNull(Comunidade.alerta(semCentro, lista, noite = false))
    }

    @Test
    fun `noite das 19h às 5h`() {
        assertEquals(listOf(true, false, false, true), listOf(4, 5, 18, 19).map { Comunidade.ehNoite(it) })
    }
}
