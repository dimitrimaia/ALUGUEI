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

    @Test
    fun `preferências novas - estilo, centro, navegação, câmera e print`() {
        val p = Preferencias.PADRAO
        assertEquals("completo", p.estiloCartao)
        assertFalse(p.fixarCentro)
        assertEquals("padrao", p.appNavegacao)
        assertEquals(emptyList<PerfilRegua>(), p.perfis)
        assertEquals(PreferenciasCamera("media", "frontal", 5, 8), p.camera)
        assertFalse(p.printOfertas)
        assertEquals(listOf("porKm", "porHora", "lucro", "nota", "distanciaTotal", "volta"), p.campos)

        val q = Preferencias.deJson(
            JSONObject()
                .put("estiloCartao", "bordas")
                .put("fixarCentro", true)
                .put("appNavegacao", "waze")
                .put("camera", JSONObject().put("qualidade", "alta").put("lente", "traseira").put("minutosPorArquivo", "10").put("limiteGb", 64))
                .put("printOfertas", true),
        )
        assertEquals("bordas", q.estiloCartao)
        assertEquals(true, q.fixarCentro)
        assertEquals("waze", q.appNavegacao)
        assertEquals(PreferenciasCamera("alta", "traseira", 10, 64), q.camera)
        assertEquals(true, q.printOfertas)
        assertEquals(q, Preferencias.deJson(q.paraJson()))

        val r = Preferencias.deJson(
            JSONObject()
                .put("estiloCartao", "lateral")
                .put("fixarCentro", "sim")
                .put("appNavegacao", "uber")
                .put("camera", JSONObject().put("qualidade", "4k").put("lente", "traseira").put("minutosPorArquivo", 31).put("limiteGb", 0.5))
                .put("printOfertas", 1),
        )
        assertEquals("completo", r.estiloCartao)
        assertFalse(r.fixarCentro)
        assertEquals("padrao", r.appNavegacao)
        assertEquals(PreferenciasCamera("media", "traseira", 5, 8), r.camera) // cada campo volta ao padrão dele
        assertFalse(r.printOfertas)
        assertEquals(Preferencias.CAMERA_PADRAO, Preferencias.deJson(JSONObject().put("camera", JSONArray())).camera)
    }

    @Test
    fun `perfis - até 6, nome de 1 a 30 letras, qualquer item inválido zera`() {
        fun perfil(nome: Any?, criterios: Any? = JSONObject().put("minimoPorKm", 250)) = JSONObject().put("nome", nome).put("criterios", criterios)
        val ok = Preferencias.deJson(JSONObject().put("perfis", JSONArray().put(perfil(" Noite ")).put(perfil("Aeroporto", "x"))))
        assertEquals(listOf("Noite", "Aeroporto"), ok.perfis.map { it.nome })
        assertEquals(null, ok.perfis[1].criterios) // critério que não é objeto: aplica o padrão
        assertEquals(ok, Preferencias.deJson(ok.paraJson()))
        assertEquals(emptyList<PerfilRegua>(), Preferencias.deJson(JSONObject().put("perfis", JSONArray().put(perfil("Dia")).put(perfil("")))).perfis)
        assertEquals(emptyList<PerfilRegua>(), Preferencias.deJson(JSONObject().put("perfis", JSONArray().put(perfil("x".repeat(31))))).perfis)
        val sete = JSONArray().apply { repeat(7) { put(perfil("P$it")) } }
        assertEquals(emptyList<PerfilRegua>(), Preferencias.deJson(JSONObject().put("perfis", sete)).perfis)
        assertEquals(emptyList<PerfilRegua>(), Preferencias.deJson(JSONObject().put("perfis", "Dia")).perfis)
    }

    @Test
    fun `perfil aplicado vira os critérios normalizados como a régua`() {
        val criterios = JSONObject().put("minimoPorKm", 250).put("minimoPorHora", "5000").put("buscaMaximaKm", 500).put("contarVolta", true)
        val p = Preferencias.deJson(JSONObject().put("perfis", JSONArray().put(JSONObject().put("nome", "Noite").put("criterios", criterios)))).perfis.single()
        val c = p.criteriosNormalizados()
        assertEquals(NormalizarCriterios.deJson(criterios), c)
        assertEquals(250L, c.minimoPorKm)
        assertEquals(5000L, c.minimoPorHora)
        assertEquals(CRITERIOS_PADRAO.buscaMaximaKm, c.buscaMaximaKm, 0.0) // inválido volta ao padrão
        assertEquals(true, c.contarVolta)
        assertEquals(CRITERIOS_PADRAO, PerfilRegua("Vazio", null).criteriosNormalizados())
    }
}
