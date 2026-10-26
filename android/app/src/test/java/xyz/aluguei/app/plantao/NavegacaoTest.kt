package xyz.aluguei.app.plantao

import org.junit.Assert.assertEquals
import org.junit.Test

/** Qual app os botões Embarque e Destino abrem (preferencias.appNavegacao). */
class NavegacaoTest {
    private val endereco = "Av. Paulista, 1000 - São Paulo"
    private val todos: (String) -> Boolean = { true }
    private val nenhum: (String) -> Boolean = { false }

    @Test
    fun `padrão abre geo com o endereço codificado`() {
        val a = Navegacao.escolher("padrao", endereco, todos)
        assertEquals(Navegacao.Alvo("geo:0,0?q=Av.%20Paulista%2C%201000%20-%20S%C3%A3o%20Paulo", null, false), a)
    }

    @Test
    fun `maps e waze no pacote certo`() {
        val m = Navegacao.escolher("maps", "Rua A 10", todos)
        assertEquals(Navegacao.Alvo("google.navigation:q=Rua%20A%2010", Navegacao.PACOTE_MAPS, false), m)
        val w = Navegacao.escolher("waze", "Rua A 10", todos)
        assertEquals(Navegacao.Alvo("https://waze.com/ul?q=Rua%20A%2010&navigate=yes", Navegacao.PACOTE_WAZE, false), w)
    }

    @Test
    fun `sem o app instalado cai no padrão`() {
        assertEquals(Navegacao.padrao("Rua A 10"), Navegacao.escolher("maps", "Rua A 10", nenhum))
        assertEquals(Navegacao.padrao("Rua A 10"), Navegacao.escolher("waze", "Rua A 10", { it == Navegacao.PACOTE_MAPS }))
    }

    @Test
    fun `perguntar usa o chooser e valor desconhecido vira padrão`() {
        assertEquals(Navegacao.padrao("Rua A 10").copy(perguntar = true), Navegacao.escolher("perguntar", "Rua A 10", nenhum))
        assertEquals(Navegacao.padrao("Rua A 10"), Navegacao.escolher("xyz", "Rua A 10", todos))
    }
}
