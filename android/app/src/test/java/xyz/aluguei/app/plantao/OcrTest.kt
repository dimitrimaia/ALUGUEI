package xyz.aluguei.app.plantao

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

/** O texto que a leitura de imagem devolve da oferta da Uber (com os erros comuns). */
class OcrTest {
    @Test
    fun corrigeReais() {
        assertEquals(listOf("R$ 17,02", "R$ 17,02", "R$ 17,02", "12 min (4.7 km)"), Ocr.corrigir(listOf("RS 17,02", "R5 17,02", "R$17,02", "12 mín (4.7 km)")))
    }

    @Test
    fun ofertaDaUberLidaDaImagem() {
        // Linhas como o ML Kit devolve o print do motorista (Divinópolis, 22:56).
        val linhas = Ocr.corrigir(
            listOf(
                "22:56", "BR-494", "Divinópolis", "Parque de", "Exposições de", "Divinópolis - MG",
                "UberX", "RS 17,02", "* 5,00 (2)",
                "12 min (4.7 km)", "Rua Sergipe, Divinópolis,", "Divinópolis",
                "11 minutos (7.5 km)", "R. Jesus De Souza, 431, Jardim", "Real, Divinópolis",
                "Tenho interesse",
            ),
        )
        val t = LeitorUber.ler(linhas)
        assertTrue("leu: $t", t is TelaLida.ComOferta)
        val o = (t as TelaLida.ComOferta).oferta
        assertEquals(1702L, o.valor)
        assertEquals(7.5, o.kmCorrida, 0.01)
        assertEquals(4.7, o.kmBusca!!, 0.01)
        assertEquals(11.0, o.minutosCorrida!!, 0.01)
    }
}
