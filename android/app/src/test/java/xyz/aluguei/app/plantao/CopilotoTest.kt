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
        assertEquals(7500L, precoIdeal(inDrive58().paraOferta(), t, c))
    }

    @Test
    fun `sugestão - lápis, atalho, nem o dobro e pode aceitar`() {
        val sinal = Copiloto.avaliar(inDrive58(), t, c, emptyList()).avaliacao.sinal
        val lapis = Copiloto.sugerir(inDrive58(), t, c, sinal)
        assertTrue(lapis is Copiloto.Sugestao.Lapis)
        assertEquals("Use o Lápis: R$ 75", Copiloto.textoSugestao(lapis!!))

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

    @Test
    fun `régua v2 no cartão - paradas, passageiro novo e destino desejado`() {
        val boa = inDrive58().copy(valor = 9000, corridasPassageiro = 3)
        val tres = boa.copy(enderecos = listOf("Rua A 1 (Centro)", "Rua B 2 (Savassi)", "Rua F, 70 (Vila Nova Esperança, Contagem - MG)"))
        assertEquals(1, tres.paradas)
        assertEquals(0, boa.paradas)
        val r = Copiloto.avaliar(tres, t, c.copy(alertaParadas = true, alertaPassageiroNovo = true, destinosDesejados = listOf("contagem")))
        assertEquals(Sinal.AMARELO, r.avaliacao.sinal)
        assertEquals(listOf("Passageiro novo", "Corrida com parada"), r.avaliacao.motivos)
        assertEquals(listOf("Destino desejado: contagem"), r.avaliacao.destaques)
    }

    @Test
    fun `lugar evitado só no embarque ou no destino, com os lugares da bolha`() {
        val tres = inDrive58().copy(valor = 9000, enderecos = listOf("Rua A 1 (Centro)", "Rua B 2 (Savassi)", "Rua C 3 (Barreiro)"))
        assertNull(Copiloto.avaliar(tres, t, c, listOf("Savassi")).lugarEvitado) // parada não conta
        val r = Copiloto.avaliar(tres, t, c.copy(evitar = listOf("Centro")), listOf("Barreiro"))
        assertEquals("Centro", r.lugarEvitado)
        assertEquals("Lugar que você evita: Centro", Copiloto.motivoPrincipal(r.avaliacao))
    }

    @Test
    fun `contraproposta usa a volta quando a régua conta a volta`() {
        val o = inDrive58().copy(kmVolta = 20.0, minutosVolta = 40.0)
        val semVolta = Copiloto.sugerir(o, t, c, Copiloto.avaliar(o, t, c).avaliacao.sinal) as Copiloto.Sugestao.Lapis
        val regua = c.copy(contarVolta = true, lucroMinimo = 4000)
        val comVolta = Copiloto.sugerir(o, t, regua, Copiloto.avaliar(o, t, regua).avaliacao.sinal) as Copiloto.Sugestao.Lapis
        assertTrue(comVolta.valor > semVolta.valor)
        assertEquals(Sinal.VERDE, comVolta.avaliacao.sinal)
        assertTrue(comVolta.avaliacao.custoVolta > 0)
    }

    @Test
    fun `nota e passageiro novo não viram contraproposta`() {
        // O preço não resolve nota baixa: o cartão não sugere valor (null), só mostra o motivo.
        val boa = inDrive58().copy(valor = 9000)
        val regua = c.copy(notaMinima = 4.8)
        val sinal = Copiloto.avaliar(boa, t, regua).avaliacao.sinal
        assertEquals(Sinal.AMARELO, sinal)
        assertNull(Copiloto.sugerir(boa, t, regua, sinal))
    }
}
