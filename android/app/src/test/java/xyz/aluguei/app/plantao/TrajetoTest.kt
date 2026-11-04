package xyz.aluguei.app.plantao

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class TrajetoTest {
    private val inicio = Trajeto("c1", 3500, 0)
    // ~0,001° de latitude ≈ 111 m.
    private fun p(i: Int) = Ponto(-19.92 + i * 0.001, -43.94)

    @Test
    fun `soma os trechos e ignora GPS impreciso, tremida e salto`() {
        var t = inicio.somar(p(0), 10f, 0)
        t = t.somar(p(1), 10f, 10_000) // 111 m em 10 s
        t = t.somar(p(2), 120f, 20_000) // impreciso: ignora
        t = t.somar(Ponto(p(1).lat + 0.00005, p(1).lon), 10f, 25_000) // 5 m: tremida
        t = t.somar(p(2), 10f, 30_000)
        assertEquals(222.0, t.metros, 2.0)
        assertEquals(5, t.leituras)
        val salto = t.somar(p(200), 10f, 31_000) // 22 km em 1 s
        assertEquals(t.metros, salto.metros, 0.0)
    }

    @Test
    fun `resumo e R$ por km real`() {
        val t = inicio.copy(metros = 43_400.0, leituras = 300)
        assertEquals("1h03 · 43,4 km", t.resumo(63 * 60_000L))
        assertEquals("12 min · 43,4 km", t.resumo(12 * 60_000L))
        assertEquals("2 min", inicio.resumo(2 * 60_000L))
        assertEquals("2 min · ~18,3 km (oferta)", inicio.copy(kmOferta = 18.3).resumo(2 * 60_000L))
        assertNull(inicio.copy(metros = 43_400.0, leituras = 1).porKmReal())
        assertEquals("0 min · 0 km", inicio.resumo(30_000L))
        assertEquals(81L, t.porKmReal())
        assertNull(inicio.copy(metros = 300.0).porKmReal())
    }

    @Test
    fun `tela de fim da corrida`() {
        assertEquals("avalie o passageiro", Aceite.gatilhoConcluida(listOf("Avalie o passageiro", "Embarque")))
        assertEquals(TelaLida.Concluida("viagem concluida"), LeitorInDrive.ler(listOf("Viagem concluída", "R$ 35")))
        assertNull(Aceite.gatilhoConcluida(listOf("Aceitar por R$ 35", "Avalie a viagem")))
    }
}
