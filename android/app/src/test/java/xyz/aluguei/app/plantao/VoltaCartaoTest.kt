package xyz.aluguei.app.plantao

import org.junit.Assert.assertEquals
import org.junit.Assert.assertSame
import org.junit.Assert.assertTrue
import org.junit.Test

/** Chip "Contar volta para casa" do cartão: recálculo com e sem a volta, sem mexer na régua. */
class VoltaCartaoTest {
    private val t = taxas(PERFIL_PADRAO)
    private val oferta = Oferta(valor = 2600, kmCorrida = 10.0, minutosCorrida = 20.0, kmBusca = 1.0, minutosBusca = 3.0, kmVolta = 18.0)

    @Test
    fun `null segue a régua e o chip só troca o contarVolta`() {
        assertSame(CRITERIOS_PADRAO, comVoltaDoCartao(CRITERIOS_PADRAO, null))
        assertEquals(CRITERIOS_PADRAO.copy(contarVolta = true), comVoltaDoCartao(CRITERIOS_PADRAO, true))
        val comVolta = CRITERIOS_PADRAO.copy(contarVolta = true)
        assertEquals(CRITERIOS_PADRAO, comVoltaDoCartao(comVolta, false))
    }

    @Test
    fun `com a volta o lucro cai pelo custo da volta e o por km considera a volta`() {
        val sem = avaliarCorrida(oferta, t, comVoltaDoCartao(CRITERIOS_PADRAO, false))
        val com = avaliarCorrida(oferta, t, comVoltaDoCartao(CRITERIOS_PADRAO, true))
        assertEquals(0L, sem.custoVolta)
        assertTrue(com.custoVolta > 0)
        assertEquals(sem.lucro - com.custoVolta, com.lucro)
        assertEquals(sem.porKm, com.porKm) // R$/km e R$/h são da corrida (como em corrida.ts)
    }

    @Test
    fun `volta longa vira vermelho só com o chip ligado`() {
        val longe = oferta.copy(kmVolta = 200.0)
        val sem = avaliarCorrida(longe, t, comVoltaDoCartao(CRITERIOS_PADRAO, false))
        val com = avaliarCorrida(longe, t, comVoltaDoCartao(CRITERIOS_PADRAO, true))
        assertTrue(sem.lucro > 0)
        assertEquals(Sinal.VERMELHO, com.sinal)
        assertTrue("Não paga os custos com a volta" in com.motivos)
    }
}
