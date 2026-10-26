package xyz.aluguei.app.plantao

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/** Prints das ofertas e vídeos da câmera de segurança: nomes, tamanho, segmentos e limpeza. */
class GravacoesTest {
    // 2026-10-26 17:03:22 UTC = 14:03:22 em Brasília
    private val momento = 1_793_034_202_000L

    @Test
    fun `nomes com data e hora de Brasília e valor`() {
        assertEquals("2026-10-26_14-03-22", Gravacoes.carimbo(momento))
        assertEquals("oferta_2026-10-26_14-03-22_R18-40_indrive.jpg", Gravacoes.nomePrint(momento, 1840, "indrive"))
        assertEquals("oferta_2026-10-26_14-03-22_R7-05.jpg", Gravacoes.nomePrint(momento, 705, "outra app"))
        assertEquals("oferta_2026-10-26_14-03-22.jpg", Gravacoes.nomePrint(momento, null, null))
        assertEquals("corrida_2026-10-26_14-03-22.mp4", Gravacoes.nomeVideo(momento))
    }

    @Test
    fun `um print a cada 3 segundos`() {
        assertTrue(Gravacoes.podePrint(1_000, null))
        assertFalse(Gravacoes.podePrint(3_999, 1_000))
        assertTrue(Gravacoes.podePrint(4_000, 1_000))
    }

    @Test
    fun `qualidade e tamanho do vídeo`() {
        assertEquals(360, Gravacoes.qualidade("baixa").altura)
        assertEquals(480, Gravacoes.qualidade("media").altura)
        assertEquals(720, Gravacoes.qualidade("alta").altura)
        assertEquals(480, Gravacoes.qualidade("??").altura)
        val disponiveis = listOf(1920 to 1080, 1280 to 720, 960 to 720, 720 to 480, 640 to 480, 640 to 360, 320 to 240)
        assertEquals(1280 to 720, Gravacoes.escolherTamanho(disponiveis, 720))
        assertEquals(720 to 480, Gravacoes.escolherTamanho(disponiveis, 480))
        assertEquals(640 to 360, Gravacoes.escolherTamanho(disponiveis, 360))
        assertEquals(320 to 240, Gravacoes.escolherTamanho(listOf(320 to 240), 720))
        assertEquals(null, Gravacoes.escolherTamanho(emptyList(), 720))
    }

    @Test
    fun `segmentos de 1 a 30 minutos`() {
        assertEquals(5 * 60_000L, Gravacoes.segmentoMs(5))
        assertEquals(60_000L, Gravacoes.segmentoMs(0))
        assertEquals(30 * 60_000L, Gravacoes.segmentoMs(99))
        assertEquals(8L * 1024 * 1024 * 1024, Gravacoes.limiteBytes(8))
    }

    @Test
    fun `passou do limite apaga os mais antigos, nunca o que está gravando`() {
        val a = listOf(
            Gravacoes.Arquivo("c", 400, 3),
            Gravacoes.Arquivo("a", 400, 1),
            Gravacoes.Arquivo("b", 400, 2),
        )
        assertEquals(emptyList<String>(), Gravacoes.paraApagar(a, 1200))
        assertEquals(listOf("a"), Gravacoes.paraApagar(a, 1000))
        assertEquals(listOf("a", "b"), Gravacoes.paraApagar(a, 500))
        assertEquals(listOf("b", "c"), Gravacoes.paraApagar(a, 500, emUso = "a"))
        assertEquals(listOf("a", "b", "c"), Gravacoes.paraApagar(a, 0))
    }
}
