package xyz.aluguei.app.plantao

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class AceiteTest {

    // Telas de exemplo do inDrive com a corrida em andamento (textos dos nós, na ordem da tela).
    private val aCaminho = listOf("A caminho do passageiro", "Rua dos Otoni, 927", "4 min", "Maria", "★4,71", "Ligar", "Chat", "Cheguei")
    private val chegou = listOf("O passageiro foi notificado", "Aguardando 01:12", "Maria", "Iniciar viagem")
    private val emViagem = listOf("Rua Padre Eustáquio, 1500", "Finalizar viagem", "R$ 22", "PIX")
    private val vaAte = listOf("Vá até o passageiro", "Local de embarque", "Av. Amazonas, 100")

    @Test
    fun `telas de corrida em andamento disparam com o texto da lista`() {
        assertEquals("cheguei", Aceite.gatilho(aCaminho)) // ordem da lista
        assertEquals("iniciar viagem", Aceite.gatilho(chegou))
        assertEquals("o passageiro foi notificado", Aceite.gatilho(listOf("O passageiro foi notificado", "Aguardando 01:12")))
        assertEquals("finalizar viagem", Aceite.gatilho(emViagem))
        assertEquals("va ate o passageiro", Aceite.gatilho(vaAte))
        assertEquals("passageiro esta esperando", Aceite.gatilho(listOf("O PASSAGEIRO ESTÁ ESPERANDO")))
        assertEquals("comecar viagem", Aceite.gatilho(listOf("Começar viagem")))
        assertEquals("embarque", Aceite.gatilho(listOf("Embarque", "Rua A, 10")))
    }

    @Test
    fun `fim de oferta nunca conta como aceite`() {
        assertNull(Aceite.gatilho(listOf("Solicitação já aceita", "Cheguei")))
        assertNull(Aceite.gatilho(listOf("Sua solicitação expirou")))
        assertNull(Aceite.gatilho(listOf("Procurando pedidos…", "Embarque")))
        assertNull(Aceite.gatilho(listOf("Pedido cancelado pelo passageiro", "Iniciar viagem")))
    }

    @Test
    fun `oferta aberta ou contraproposta nao contam`() {
        assertNull(Aceite.gatilho(listOf("R$ 22", "Embarque", "Aceitar por R$ 22")))
        assertNull(Aceite.gatilho(listOf("Oferecendo sua tarifa", "R$ 25", "Embarque")))
        assertNull(Aceite.gatilho(listOf("Pedidos", "R$1,6/km", "Online")))
        assertNull(Aceite.gatilho(emptyList()))
    }

    @Test
    fun `so palavras inteiras`() {
        assertNull(Aceite.gatilho(listOf("Embarques e desembarques", "Rua Chegueira, 10")))
    }

    @Test
    fun `leitor do inDrive devolve a corrida em andamento`() {
        assertEquals(TelaLida.EmAndamento("iniciar viagem"), LeitorInDrive.ler(listOf("Maria", "Iniciar viagem")))
        assertEquals(TelaLida.Fim, LeitorInDrive.ler(listOf("Solicitação já aceita", "Cheguei")))
        assertEquals(TelaLida.Fim, LeitorInDrive.ler(listOf("Procurando pedidos", "Embarque")))
        assertTrue(LeitorInDrive.ler(listOf("Aceitar por R$ 22", "~2,1 km", "R$1,6/km", "Embarque")) is TelaLida.ComOferta)
        assertEquals(TelaLida.Contraproposta(2500), LeitorInDrive.ler(listOf("Oferecendo sua tarifa", "R$ 25", "Embarque")))
    }

    @Test
    fun `janela de 3 minutos`() {
        assertTrue(Aceite.dentroDaJanela(1_000, 1_000))
        assertTrue(Aceite.dentroDaJanela(1_000, 1_000 + Aceite.JANELA_MS))
        assertFalse(Aceite.dentroDaJanela(1_000, 1_001 + Aceite.JANELA_MS))
        assertFalse(Aceite.dentroDaJanela(null, 5_000))
        assertFalse(Aceite.dentroDaJanela(5_000, 4_000))
    }

    @Test
    fun `valor final - corrigido, senao a sua oferta, senao o da oferta`() {
        val o = OfertaDetalhada(app = "indrive", valor = 1800, kmCorrida = 7.4)
        assertEquals(1800, Aceite.valorFinal(o))
        assertEquals(2200, Aceite.valorFinal(o.copy(suaOferta = 2200)))
        assertEquals(2500, Aceite.valorFinal(o.copy(suaOferta = 2200, valorFinal = 2500)))
        // A chave da oferta não muda com o valor final (a oferta continua a mesma).
        assertEquals(o.copy(suaOferta = 2200).chave(), o.copy(suaOferta = 2200, valorFinal = 2500).chave())
    }

    @Test
    fun `avaliacao usa o valor final`() {
        val t = taxas(PERFIL_PADRAO)
        val o = OfertaDetalhada(app = "indrive", valor = 1800, kmCorrida = 7.4, kmBusca = 1.0)
        val comFinal = Copiloto.avaliar(o.copy(suaOferta = 2000, valorFinal = 2600), t, CRITERIOS_PADRAO).avaliacao
        val direto = avaliarCorrida(o.paraOferta().copy(valor = 2600), t, CRITERIOS_PADRAO)
        assertEquals(direto.porKm, comFinal.porKm)
        assertEquals(direto.lucro, comFinal.lucro)
    }

    @Test
    fun `campo do valor final`() {
        assertEquals(2200L, Aceite.lerValorFinal("22"))
        assertEquals(2250L, Aceite.lerValorFinal("22,50"))
        assertEquals(2250L, Aceite.lerValorFinal("R$ 22,50"))
        assertNull(Aceite.lerValorFinal(""))
        assertNull(Aceite.lerValorFinal("0,50"))
        assertNull(Aceite.lerValorFinal("20000"))
        assertNull(Aceite.lerValorFinal("abc"))
    }
}
