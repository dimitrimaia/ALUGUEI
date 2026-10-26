package xyz.aluguei.app.plantao

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/** Telas do inDrive vistas em vídeo, como listas de textos na ordem da tela. */
class LeitorInDriveTest {

    private val mapa58 = listOf("Pedido de viagem", "4 min", "1,0 km", "66 min", "36,4 km")
    private val oferta58 = listOf(
        "Filipe", "4.71", "(38)", "2 min.", "R$1,6/km", "~1,0 km", "R$ 58", "Preço justo",
        "Rua dos Otoni 927 (Santa Efigênia)", "Rua F, 70 (Vila Nova Esperança, Contagem - MG)",
        "PIX", "Aceitar por R$ 58", "Ofereça sua tarifa", "R$ 64", "R$ 69", "Fechar",
    )

    private fun oferta(t: List<String>): OfertaDetalhada {
        val tela = LeitorInDrive.ler(t)
        assertTrue("esperava oferta, veio $tela", tela is TelaLida.ComOferta)
        return (tela as TelaLida.ComOferta).oferta
    }

    @Test
    fun `oferta aberta sem o mapa - valor do botão e viagem pelo R$ por km`() {
        val o = oferta(listOf("Pedido de viagem") + oferta58)
        assertEquals(5800L, o.valor)
        assertEquals(160L, o.porKmApp)
        assertEquals(1.0, o.kmBusca!!, 0.0)
        assertEquals(35.25, o.kmCorrida, 0.001) // 58 ÷ 1,6 − 1,0
        assertTrue(o.kmCorridaEstimado)
        assertNull(o.minutosCorrida)
        assertNull(o.minutosBusca)
    }

    @Test
    fun `oferta aberta com o mapa - usa os pares min e km`() {
        val o = oferta(mapa58 + oferta58)
        assertEquals(5800L, o.valor)
        assertEquals(1.0, o.kmBusca!!, 0.0)
        assertEquals(4.0, o.minutosBusca!!, 0.0)
        assertEquals(36.4, o.kmCorrida, 0.0)
        assertEquals(66.0, o.minutosCorrida!!, 0.0)
        assertFalse(o.kmCorridaEstimado)
    }

    @Test
    fun `passageiro, pagamento, endereços e atalhos`() {
        val o = oferta(mapa58 + oferta58)
        assertEquals("Filipe", o.nome)
        assertEquals(4.71, o.nota!!, 0.0)
        assertEquals(38, o.corridasPassageiro)
        assertEquals("PIX", o.pagamento)
        assertEquals(listOf("Rua dos Otoni 927 (Santa Efigênia)", "Rua F, 70 (Vila Nova Esperança, Contagem - MG)"), o.enderecos)
        assertEquals("Rua dos Otoni 927 (Santa Efigênia)", o.embarque)
        assertEquals("Rua F, 70 (Vila Nova Esperança, Contagem - MG)", o.destino)
        assertEquals(listOf(6400L, 6900L), o.atalhos)
        assertFalse(o.risco)
    }

    @Test
    fun `nota com vírgula, parada no meio e dinheiro`() {
        val o = oferta(
            listOf(
                "Pedido de viagem", "Maria Clara", "4,95", "(120)", "R$1,5/km", "~2,1 km", "R$ 26", "Preço justo",
                "Av. Afonso Pena 1500 (Centro)", "Rua Pernambuco 10 (Savassi)", "Rua Rio Grande do Norte 5 (Funcionários)",
                "Dinheiro", "Aceitar por R$ 26", "Ofereça sua tarifa", "R$ 29", "R$ 31",
            ),
        )
        assertEquals("Maria Clara", o.nome)
        assertEquals(4.95, o.nota!!, 0.0)
        assertEquals(120, o.corridasPassageiro)
        assertEquals("Dinheiro", o.pagamento)
        assertEquals(3, o.enderecos.size)
        assertEquals("Rua Rio Grande do Norte 5 (Funcionários)", o.destino)
    }

    @Test
    fun `R$ 26 a R$ 1,5 por km com o mapa 10 min 2,1 km e 27 min 15,0 km`() {
        val o = oferta(
            listOf(
                "Pedido de viagem", "10 min", "2,1 km", "27 min", "15,0 km", "Ana", "4.88", "(7)", "1 min.",
                "R$1,5/km", "~2,1 km", "R$ 26", "Preço justo", "Rua A 1 (Centro)", "Rua B 2 (Barreiro)",
                "PIX", "Aceitar por R$ 26", "Ofereça sua tarifa", "R$ 29", "R$ 31", "R$ 34",
            ),
        )
        assertEquals(2600L, o.valor)
        assertEquals(150L, o.porKmApp)
        assertEquals(2.1, o.kmBusca!!, 0.0)
        assertEquals(10.0, o.minutosBusca!!, 0.0)
        assertEquals(15.0, o.kmCorrida, 0.0)
        assertEquals(27.0, o.minutosCorrida!!, 0.0)
        assertEquals(listOf(2900L, 3100L, 3400L), o.atalhos)
    }

    @Test
    fun `R$ 12 a R$ 2,9 por km com o mapa 8 min 1,9 km e 10 min 2,2 km`() {
        val o = oferta(
            listOf(
                "8 min", "1,9 km", "10 min", "2,2 km", "João", "5.00", "(3)", "R$2,9/km", "~1,9 km", "R$ 12",
                "Preço justo", "Rua C 3", "Rua D 4", "PIX", "Aceitar por R$ 12", "Ofereça sua tarifa",
                "R$ 19", "R$ 21", "R$ 23", "R$ 24", "Fechar",
            ),
        )
        assertEquals(1200L, o.valor)
        assertEquals(1.9, o.kmBusca!!, 0.0)
        assertEquals(8.0, o.minutosBusca!!, 0.0)
        assertEquals(2.2, o.kmCorrida, 0.0)
        assertEquals(10.0, o.minutosCorrida!!, 0.0)
        assertEquals(listOf(1900L, 2100L, 2300L, 2400L), o.atalhos)
        assertEquals("João", o.nome)
    }

    @Test
    fun `textos juntos num nó só também funcionam`() {
        val o = oferta(listOf("Filipe 4,71 (38)", "2 min. R$1,6/km ~1,0 km R$ 58", "Preço justo", "Rua X 1", "Rua Y 2", "PIX", "Aceitar por R$ 58"))
        assertEquals(5800L, o.valor)
        assertEquals(1.0, o.kmBusca!!, 0.0)
        assertEquals(35.25, o.kmCorrida, 0.001)
        assertEquals("Filipe", o.nome)
        assertEquals(4.71, o.nota!!, 0.0)
    }

    @Test
    fun `lista de pedidos não gera oferta`() {
        val t = LeitorInDrive.ler(
            listOf("Pedidos", "Filipe", "4.71", "R$1,6/km", "~1,0 km", "R$ 58", "Rua A", "Ana", "4.9", "R$1,9/km", "~2,3 km", "R$ 22", "Rua B"),
        )
        assertEquals(TelaLida.Lista, t)
    }

    @Test
    fun `contraproposta enviada - sua oferta de R$ 22`() {
        assertEquals(TelaLida.Contraproposta(2200), LeitorInDrive.ler(listOf("Oferecendo sua tarifa", "R$ 22.", "Aguarde a resposta")))
        assertEquals(TelaLida.Contraproposta(2200), LeitorInDrive.ler(listOf("R$1,6/km", "~1,0 km", "Oferecendo sua tarifa R$ 22. Aguarde a resposta")))
    }

    @Test
    fun `fim da oferta - expirou, já aceita, procurando`() {
        assertEquals(TelaLida.Fim, LeitorInDrive.ler(listOf("Sua solicitação expirou", "OK")))
        assertEquals(TelaLida.Fim, LeitorInDrive.ler(listOf("Solicitação já aceita", "Aceitar por R$ 58")))
        assertEquals(TelaLida.Fim, LeitorInDrive.ler(listOf("Procurando…")))
        assertEquals(TelaLida.Fim, LeitorInDrive.ler(listOf("Aguarde que os pedidos aparecerão aqui")))
        assertEquals(TelaLida.Nada, LeitorInDrive.ler(listOf("Perfil", "Configurações")))
        assertEquals(TelaLida.Nada, LeitorInDrive.ler(emptyList()))
    }

    @Test
    fun `aviso de área perigosa`() {
        val o = oferta(listOf("Pedido de viagem") + oferta58.take(10) + listOf("Cuidado: região perigosa") + oferta58.drop(10))
        assertTrue(o.risco)
        assertEquals(2, o.enderecos.size) // o aviso não vira endereço
        assertEquals("Vila Nova Esperança", Copiloto.lugarDoEndereco(Copiloto.enderecoDoRisco(o)!!))
    }

    @Test
    fun `atalhos de 2 a 5 valores`() {
        val o = oferta(listOf("R$2,0/km", "~1,0 km", "R$ 10", "Rua A 1", "Rua B 2", "Aceitar por R$ 10", "Ofereça sua tarifa", "R$ 12", "R$ 13"))
        assertEquals(listOf(1200L, 1300L), o.atalhos)
        assertNull(o.nome)
        assertNull(o.pagamento)
        assertEquals(4.0, o.kmCorrida, 0.001)
    }
}
