package xyz.aluguei.app.plantao

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class CopilotoTest {
    private val t = taxas(PERFIL_PADRAO)
    private val c = CRITERIOS_PADRAO

    private fun inDrive58(atalhos: List<Long> = listOf(6400, 6900)) = OfertaDetalhada(
        app = "indrive", valor = 5800, kmCorrida = 36.4, minutosCorrida = 66.0, kmBusca = 1.0, minutosBusca = 4.0,
        atalhos = atalhos, nome = "Filipe", nota = 4.71,
        enderecos = listOf("Rua dos Otoni 927 (Santa Efigênia)", "Rua F, 70 (Vila Nova Esperança, Contagem - MG)"),
    )

    @Test
    fun `preço ideal é o menor valor inteiro que deixa verde`() {
        // 37,4 km: precisa de R$ 2,00/km → R$ 74,80 → R$ 75.
        assertEquals(7500L, Copiloto.precoIdeal(inDrive58().paraOferta(), t, c))
    }

    @Test
    fun `sugestão - lápis, atalho, nem o dobro e pode aceitar`() {
        val sinal = Copiloto.avaliar(inDrive58(), t, c, emptyList()).avaliacao.sinal
        val lapis = Copiloto.sugerir(inDrive58(), t, c, sinal)
        assertTrue(lapis is Copiloto.Sugestao.Lapis)
        assertEquals("Use o lápis: R$ 75", Copiloto.textoSugestao(lapis!!))

        val atalho = Copiloto.sugerir(inDrive58(listOf(6400, 7900, 8500)), t, c, sinal)
        assertEquals("Toque em R$ 79", Copiloto.textoSugestao(atalho!!))
        val a = (atalho as Copiloto.Sugestao.Atalho).avaliacao
        assertEquals("com R$ 79: ${Formato.brl(a.porKm)}/km · R$ ${jsRound(a.porHora / 100.0)}/h", Copiloto.textoComValor(7900, a))

        val longe = inDrive58().copy(kmBusca = 7.0)
        val s = Copiloto.sugerir(longe, t, c, Copiloto.avaliar(longe, t, c, emptyList()).avaliacao.sinal)
        assertEquals("Nem o dobro (R$ 116) fica verde", Copiloto.textoSugestao(s!!))

        val boa = inDrive58().copy(valor = 9000)
        assertEquals(Copiloto.Sugestao.PodeAceitar, Copiloto.sugerir(boa, t, c, Copiloto.avaliar(boa, t, c, emptyList()).avaliacao.sinal))
    }

    @Test
    fun `lugar que você evita deixa vermelho`() {
        val boa = inDrive58().copy(valor = 9000)
        val r = Copiloto.avaliar(boa, t, c, listOf("SANTA EFIGENIA"))
        assertEquals(Sinal.VERMELHO, r.avaliacao.sinal)
        assertEquals("Lugar que você evita: SANTA EFIGENIA", r.avaliacao.motivos.first())
        assertNull(Copiloto.avaliar(boa, t, c, listOf("Savassi")).lugarEvitado)
    }

    @Test
    fun `nota baixa e área de risco deixam amarelo`() {
        val boa = inDrive58().copy(valor = 9000)
        assertEquals(Sinal.VERDE, Copiloto.avaliar(boa, t, c, emptyList()).avaliacao.sinal)
        val nota = Copiloto.avaliar(boa, t, c.copy(notaMinima = 4.8), emptyList())
        assertEquals(Sinal.AMARELO, nota.avaliacao.sinal)
        assertTrue(nota.avaliacao.motivos.contains("Nota baixa"))
        val risco = Copiloto.avaliar(boa.copy(risco = true), t, c, emptyList())
        assertEquals(Sinal.AMARELO, risco.avaliacao.sinal)
    }

    @Test
    fun `sua oferta recalcula com o valor da contraproposta`() {
        val o = inDrive58().copy(suaOferta = 9000)
        assertEquals(Sinal.VERDE, Copiloto.avaliar(o, t, c, emptyList()).avaliacao.sinal)
    }

    @Test
    fun `lugar do endereço - bairro entre parênteses ou a rua`() {
        assertEquals("Santa Efigênia", Copiloto.lugarDoEndereco("Rua dos Otoni 927 (Santa Efigênia)"))
        assertEquals("Vila Nova Esperança", Copiloto.lugarDoEndereco("Rua F, 70 (Vila Nova Esperança, Contagem - MG)"))
        assertEquals("Rua dos Otoni", Copiloto.lugarDoEndereco("Rua dos Otoni 927"))
        assertEquals("Rua F", Copiloto.lugarDoEndereco("Rua F, 70"))
    }

    @Test
    fun `lista evitar normalizada como no TypeScript`() {
        assertEquals(listOf("Santa Efigênia", "Barreiro"), Copiloto.normalizarEvitar(listOf("  Santa   Efigênia ", "santa efigenia", "ab", "Barreiro")))
    }

    @Test
    fun `chave da oferta muda com a oferta`() {
        assertEquals(inDrive58().chave(), inDrive58(listOf(1)).chave())
        assertTrue(inDrive58().chave() != inDrive58().copy(valor = 6000).chave())
    }
}
