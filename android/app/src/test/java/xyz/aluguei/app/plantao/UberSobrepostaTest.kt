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

/** Tela inteira da Uber: o ganho do dia ("R$ 0,00" ou "R$ 152,30") vem antes do cartão da oferta. */
class UberGanhoDoDiaTest {
    private fun oferta(ganho: String) = listOf(
        ganho, "Você está online", "Divinópolis", "Aeroporto Divinópolis",
        "UberX", "R$ 21,04", "4,88 (85)",
        "5 min (1.6 km)", "Rua Frei Leao Rodrigues, Antônio Fonseca, Divinópolis",
        "19 minutos (8.5 km)", "R. Itinga, 1230, Industrial, Divinópolis", "Aceitar",
    )

    @Test
    fun ganhoZeradoNoTopo() {
        val t = LeitorUber.ler(oferta("R$ 0,00"))
        assertTrue("leu: $t", t is TelaLida.ComOferta)
        assertEquals(2104L, (t as TelaLida.ComOferta).oferta.valor)
        assertEquals(8.5, t.oferta.kmCorrida, 0.01)
    }

    @Test
    fun ganhoDoDiaNaoViraValorDaCorrida() {
        val t = LeitorUber.ler(oferta("R$ 152,30"))
        assertEquals(2104L, (t as TelaLida.ComOferta).oferta.valor)
        assertEquals(1.6, t.oferta.kmBusca!!, 0.01)
    }

    @Test
    fun radarDeViagens() {
        val t = LeitorUber.ler(listOf("Radar de viagens", "Mais solicitações de viagem", "Já foi consultado", "UberX", "R$ 21,04", "4,88 (85)", "5 min (1.6 km)", "Rua A", "19 minutos (8.5 km)", "Rua B", "Tenho interesse"))
        assertEquals(2104L, (t as TelaLida.ComOferta).oferta.valor)
    }
}
