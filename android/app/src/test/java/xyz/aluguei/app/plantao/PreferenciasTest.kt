package xyz.aluguei.app.plantao

import org.json.JSONArray
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Test

/** Mesmos casos de "preferências do Copiloto" em src/dominio/ganhos/regua.test.ts. */
class PreferenciasTest {

    @Test
    fun `padrão, campos sem repetir e limites`() {
        assertEquals(Preferencias.PADRAO, Preferencias.deJson(null))
        assertEquals(Preferencias.PADRAO, Preferencias.deJson(JSONObject()))
        val p = Preferencias.deJson(JSONObject().put("campos", JSONArray(listOf("lucro", "lucro", "porKm", "x"))).put("segundosCartao", 999))
        assertEquals(Preferencias.PADRAO.campos, p.campos) // campo inválido: volta ao padrão
        assertEquals(12, p.segundosCartao)
        assertEquals(listOf("lucro", "porKm"), Preferencias.deJson(JSONObject().put("campos", JSONArray(listOf("lucro", "lucro", "porKm")))).campos)
    }

    @Test
    fun `no máximo 6 campos e lista vazia volta ao padrão`() {
        val todos = JSONArray(Preferencias.CAMPOS_CARTAO)
        assertEquals(Preferencias.CAMPOS_CARTAO.take(6), Preferencias.deJson(JSONObject().put("campos", todos)).campos)
        assertEquals(Preferencias.PADRAO.campos, Preferencias.deJson(JSONObject().put("campos", JSONArray())).campos)
    }

    @Test
    fun `cada campo inválido volta ao padrão daquele campo`() {
        val p = Preferencias.deJson(
            JSONObject()
                .put("tamanhoFonte", "g")
                .put("segundosCartao", "20")
                .put("opacidadeBolha", 10)
                .put("tema", "roxo")
                .put("vibrar", false)
                .put("voz", true)
                .put("bip", "sim")
                .put("perguntarAceite", false)
                .put("mensagem", "  Oi, {nome}!  ")
                .put("base", JSONObject().put("nome", " Casa ").put("lat", -19.92).put("lon", -43.94))
                .put("economia", false),
        )
        assertEquals("g", p.tamanhoFonte)
        assertEquals(1.15f, p.escalaFonte, 0f)
        assertEquals(20, p.segundosCartao)
        assertEquals(100, p.opacidadeBolha)
        assertEquals("app", p.tema)
        assertFalse(p.vibrar)
        assertEquals(true, p.voz)
        assertEquals(true, p.bip)
        assertFalse(p.perguntarAceite)
        assertEquals("Oi, {nome}!", p.mensagem)
        assertEquals(Base("Casa", -19.92, -43.94), p.base)
        assertFalse(p.economia)
    }

    @Test
    fun `base inválida vira null e o JSON volta igual`() {
        assertNull(Preferencias.deJson(JSONObject().put("base", JSONObject().put("nome", "Casa").put("lat", 91).put("lon", 0))).base)
        assertNull(Preferencias.deJson(JSONObject().put("base", JSONObject().put("nome", "Casa").put("lat", "-19").put("lon", 0))).base)
        val p = Preferencias.PADRAO.copy(base = Base("Casa", -19.9, -43.9), campos = listOf("volta", "lucro"), tema = "escuro")
        assertEquals(p, Preferencias.deJson(p.paraJson()))
    }

    @Test
    fun `mensagem pronta para o passageiro`() {
        assertEquals("Boa tarde, Filipe! Chego em 4 min.", Preferencias.montarMensagem("{saudacao}, {nome}! Chego em {tempo}.", hora = 15, nome = "Filipe", minutos = 4.0))
        assertEquals("Boa noite, tudo bem? Chego em poucos minutos.", Preferencias.montarMensagem("{saudacao}, {nome}! Chego em {tempo}.", hora = 2))
    }

    @Test
    fun `mensagem padrão com saudação pela hora de Brasília`() {
        assertEquals("Bom dia", Preferencias.saudacao(5))
        assertEquals("Bom dia", Preferencias.saudacao(11))
        assertEquals("Boa tarde", Preferencias.saudacao(12))
        assertEquals("Boa noite", Preferencias.saudacao(18))
        assertEquals("Boa noite", Preferencias.saudacao(4))
        assertEquals(
            "Bom dia, Maria Clara! Já estou a caminho e chego em aproximadamente 1 min. Por gentileza, me aguarde no local de embarque.",
            Preferencias.montarMensagem(Preferencias.MENSAGEM_PADRAO, hora = 9, nome = " Maria Clara ", minutos = 0.4),
        )
    }
}
