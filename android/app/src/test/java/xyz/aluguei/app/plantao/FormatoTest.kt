package xyz.aluguei.app.plantao

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class FormatoTest {
    @Test
    fun `reais em pt-BR`() {
        assertEquals("R$ 18,40", Formato.brl(1840))
        assertEquals("R$ 1.020,00", Formato.brl(102000))
        assertEquals("R$ 0,05", Formato.brl(5))
        assertEquals("-R$ 3,50", Formato.brl(-350))
    }

    @Test
    fun `km com uma casa`() {
        assertEquals("7,4", Formato.km(7.4))
        assertEquals("7", Formato.km(7.0))
        assertEquals("0,8", Formato.km(0.8))
    }

    @Test
    fun `lê o que o motorista digita`() {
        assertEquals(1840L, Formato.lerReais("18,40"))
        assertEquals(1840L, Formato.lerReais("18.40"))
        assertEquals(102000L, Formato.lerReais("1.020,00"))
        assertEquals(1800L, Formato.lerReais("18"))
        assertNull(Formato.lerReais(""))
        assertNull(Formato.lerReais("abc"))
        assertEquals(7.4, Formato.lerNumero("7,4")!!, 0.0)
        assertNull(Formato.lerNumero(""))
    }
}
