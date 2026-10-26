package xyz.aluguei.app.plantao

import org.json.JSONArray
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Mesmos casos de src/dominio/ganhos/regua.test.ts (régua v2, horário, listas e
 * contraproposta). Se mudar lá, mude aqui.
 */
class ReguaTest {
    // Mesmo perfil redondo de ganhos.test.ts: 60 c/km de variável e R$ 10/h de fixo.
    private val t = taxas(
        PerfilCusto(
            combustivel = "gasolina",
            consumo = 12.0,
            precoCombustivel = 600,
            desgaste = listOf(ItemDesgaste("Manutenção", 100000, 10000.0)),
            fixosMensais = listOf(ItemFixo("Aluguel", 260000)),
            diasPorMes = 26.0,
            horasPorDia = 10.0,
        ),
    )
    private val c = CRITERIOS_PADRAO

    // R$ 20, 6 km + 1 km de busca, 15 + 3 min: R$ 2,86/km, R$ 66,67/h, lucro R$ 12,80.
    private val base = Oferta(valor = 2000, kmCorrida = 6.0, minutosCorrida = 15.0, kmBusca = 1.0, minutosBusca = 3.0)

    // ------------------------------------------------------------------ régua de duas faixas

    @Test
    fun `abaixo do mínimo é vermelho, entre o mínimo e o bom é amarelo, acima do bom é verde`() {
        assertEquals(Sinal.VERMELHO, avaliarCorrida(base, t, c.copy(minimoPorKm = 300, bomPorKm = 400)).sinal)
        assertEquals(Sinal.AMARELO, avaliarCorrida(base, t, c.copy(minimoPorKm = 250, bomPorKm = 300)).sinal)
        assertEquals(Sinal.VERDE, avaliarCorrida(base, t, c.copy(minimoPorKm = 200, bomPorKm = 280)).sinal)
    }

    @Test
    fun `valor mínimo, lucro mínimo e margem`() {
        assertTrue(avaliarCorrida(base, t, c.copy(valorMinimo = 2500)).motivos.contains("Abaixo do seu valor mínimo"))
        assertEquals(Sinal.AMARELO, avaliarCorrida(base, t, c.copy(lucroMinimo = 1500)).sinal)
        assertTrue(avaliarCorrida(base, t, c.copy(lucroMinimoBps = 7000)).motivos.contains("Margem de lucro baixa")) // 64% < 70%
    }

    @Test
    fun `tempo de embarque, viagem longa, nota, passageiro novo e paradas`() {
        assertEquals(Sinal.AMARELO, avaliarCorrida(base, t, c.copy(buscaMaximaMin = 2.0)).sinal)
        assertEquals(Sinal.VERMELHO, avaliarCorrida(base, t, c.copy(buscaMaximaMin = 1.0)).sinal)
        assertTrue(avaliarCorrida(base, t, c.copy(viagemMaximaKm = 5.0)).motivos.contains("Viagem longa"))
        assertTrue(avaliarCorrida(base.copy(nota = 4.3), t, c.copy(notaMinima = 4.5)).motivos.contains("Nota baixa"))
        assertTrue(avaliarCorrida(base.copy(corridasPassageiro = 2), t, c.copy(alertaPassageiroNovo = true)).motivos.contains("Passageiro novo"))
        assertEquals(Sinal.AMARELO, avaliarCorrida(base.copy(paradas = 1), t, c.copy(alertaParadas = true)).sinal)
    }

    @Test
    fun `lugar evitado é vermelho e destino desejado é destaque`() {
        val a = avaliarCorrida(
            base.copy(destino = "Rua F, 70 (Vila Nova Esperança, Contagem - MG)"),
            t,
            c.copy(evitar = listOf("vila nova esperanca"), destinosDesejados = listOf("Contagem")),
        )
        assertEquals(Sinal.VERMELHO, a.sinal)
        assertTrue(a.motivos.contains("Lugar que você evita: vila nova esperanca"))
        assertEquals(listOf("Destino desejado: Contagem"), a.destaques)
    }

    @Test
    fun `a volta para a base entra no lucro só quando a régua conta a volta`() {
        assertEquals(0L, avaliarCorrida(base.copy(kmVolta = 10.0, minutosVolta = 25.0), t, c).custoVolta)
        val a = avaliarCorrida(base.copy(kmVolta = 10.0, minutosVolta = 25.0), t, c.copy(contarVolta = true))
        assertEquals((600 + 417).toLong(), a.custoVolta) // 10 km × 60 c + 25 min de R$ 10/h
        assertEquals((2000 - 720 - 1017).toLong(), a.lucro)
    }

    @Test
    fun `prejuízo com a volta tem motivo próprio`() {
        val a = avaliarCorrida(base.copy(kmVolta = 30.0), t, c.copy(contarVolta = true))
        assertEquals(Sinal.VERMELHO, a.sinal)
        assertEquals("Não paga os custos com a volta", a.motivos.first())
    }

    @Test
    fun `régua simples com bom em zero continua com a tolerância de 15 por cento`() {
        // R$ 2,86/km: mínimo 300 → 95% (amarelo); mínimo 340 → 84% (vermelho).
        assertEquals(Sinal.AMARELO, avaliarCorrida(base, t, c.copy(minimoPorKm = 300)).sinal)
        assertEquals(Sinal.VERMELHO, avaliarCorrida(base, t, c.copy(minimoPorKm = 340)).sinal)
    }

    // ------------------------------------------------------------------ horário e listas

    private val madrugada = c.copy(porHorario = listOf(FaixaHorario("Madrugada", "22:00", "05:00", minimoPorKm = 300, minimoPorHora = 5000)))

    @Test
    fun `faixa que vira a meia-noite`() {
        assertEquals("Madrugada", criteriosNoHorario(madrugada, 23 * 60).faixa)
        assertEquals(300L, criteriosNoHorario(madrugada, 3 * 60).criterios.minimoPorKm)
        assertNull(criteriosNoHorario(madrugada, 12 * 60).faixa)
        assertEquals(200L, criteriosNoHorario(madrugada, 12 * 60).criterios.minimoPorKm)
        // Fim exclusivo: 05:00 já é fora da faixa.
        assertNull(criteriosNoHorario(madrugada, 5 * 60).faixa)
    }

    @Test
    fun `faixa no mesmo dia`() {
        val pico = c.copy(porHorario = listOf(FaixaHorario("Pico", "17:00", "19:30", minimoPorKm = 250, minimoPorHora = 4500, bomPorKm = 300)))
        val r = criteriosNoHorario(pico, 18 * 60)
        assertEquals("Pico", r.faixa)
        assertEquals(300L, r.criterios.bomPorKm)
        assertNull(criteriosNoHorario(pico, 19 * 60 + 30).faixa)
    }

    @Test
    fun `lista sem acento e sem maiúscula`() {
        assertEquals("morro do papagaio", bateLista("Morro do PAPAGAIO, BH", listOf("morro do papagaio")))
        assertNull(bateLista(null, listOf("x")))
        assertEquals("Santa Efigênia", bateLista("Rua dos Otoni 927 (santa efigenia)", listOf("Savassi", "Santa Efigênia")))
    }

    @Test
    fun `critérios antigos continuam valendo`() {
        val r = NormalizarCriterios.deJson(JSONObject().put("minimoPorKm", 250).put("minimoPorHora", 4500).put("buscaMaximaKm", 3))
        assertEquals(250L, r.minimoPorKm)
        assertEquals(4500L, r.minimoPorHora)
        assertEquals(3.0, r.buscaMaximaKm, 0.0)
        assertEquals(0L, r.bomPorKm)
        assertTrue(r.porHorario.isEmpty())
        assertFalse(r.contarVolta)
    }

    @Test
    fun `critérios ganham nota mínima e lista de lugares a evitar, sem repetir (ganhos test ts)`() {
        val r = NormalizarCriterios.deJson(JSONObject().put("minimoPorKm", 250))
        assertEquals(0.0, r.notaMinima, 0.0)
        assertTrue(r.evitar.isEmpty())
        val e = NormalizarCriterios.deJson(JSONObject().put("evitar", JSONArray(listOf(" Morro  do Papagaio ", "Morro do Papagaio", "ab"))))
        assertEquals(listOf("Morro do Papagaio"), e.evitar)
        assertEquals(CRITERIOS_PADRAO, NormalizarCriterios.deJson(null))
    }

    @Test
    fun `critérios v2 completos e inválidos voltam ao padrão do campo`() {
        val j = JSONObject()
            .put("minimoPorKm", "210") // texto vira número, como o z.coerce
            .put("minimoPorHora", -5) // inválido → padrão
            .put("bomPorKm", 280)
            .put("buscaMaximaMin", 8)
            .put("valorMinimo", 1500)
            .put("lucroMinimoBps", 3000)
            .put("notaMinima", 4.6)
            .put("alertaPassageiroNovo", true)
            .put("alertaParadas", "sim") // não é boolean → false
            .put("destinosDesejados", JSONArray(listOf("Contagem", "Aeroporto de Confins")))
            .put("contarVolta", true)
            .put(
                "porHorario",
                JSONArray().put(JSONObject().put("nome", " Madrugada ").put("de", "22:00").put("ate", "05:00").put("minimoPorKm", 300).put("minimoPorHora", 5000)),
            )
        val r = NormalizarCriterios.deJson(j)
        assertEquals(210L, r.minimoPorKm)
        assertEquals(4000L, r.minimoPorHora)
        assertEquals(280L, r.bomPorKm)
        assertEquals(8.0, r.buscaMaximaMin, 0.0)
        assertEquals(1500L, r.valorMinimo)
        assertEquals(3000L, r.lucroMinimoBps)
        assertEquals(4.6, r.notaMinima, 0.0)
        assertTrue(r.alertaPassageiroNovo)
        assertFalse(r.alertaParadas)
        assertEquals(listOf("Contagem", "Aeroporto de Confins"), r.destinosDesejados)
        assertTrue(r.contarVolta)
        assertEquals(listOf(FaixaHorario("Madrugada", "22:00", "05:00", 300, 5000, 0, 0)), r.porHorario)
        // Uma faixa inválida (hora "24:00") derruba a lista inteira, como o .catch([]) do TS.
        val ruim = JSONObject().put("porHorario", JSONArray().put(JSONObject().put("nome", "X").put("de", "24:00").put("ate", "05:00").put("minimoPorKm", 1).put("minimoPorHora", 1)))
        assertTrue(NormalizarCriterios.deJson(ruim).porHorario.isEmpty())
    }

    // ------------------------------------------------------------------ contraproposta

    @Test
    fun `menor valor em reais que fica verde, até o dobro`() {
        assertEquals(2100L, precoIdeal(base, t, c.copy(minimoPorKm = 300))) // R$ 21 / 7 km = R$ 3,00/km
        assertNull(precoIdeal(base, t, c.copy(minimoPorKm = 700))) // nem R$ 40 dá R$ 7/km
        assertEquals(2000L, precoIdeal(base, t, c)) // já é verde
    }

    @Test
    fun `contraproposta conta a volta quando a régua conta a volta`() {
        val comVolta = base.copy(kmVolta = 10.0, minutosVolta = 25.0)
        // Sem contar a volta já é verde; contando, o lucro cai para R$ 2,63 e pede mais.
        assertEquals(2000L, precoIdeal(comVolta, t, c))
        val ideal = precoIdeal(comVolta, t, c.copy(contarVolta = true, lucroMinimo = 800))!!
        assertTrue(ideal > 2000L)
        assertEquals(Sinal.VERDE, avaliarCorrida(comVolta.copy(valor = ideal), t, c.copy(contarVolta = true, lucroMinimo = 800)).sinal)
        assertTrue(avaliarCorrida(comVolta.copy(valor = ideal - 100), t, c.copy(contarVolta = true, lucroMinimo = 800)).sinal != Sinal.VERDE)
    }
}
