package xyz.aluguei.app.plantao

import org.json.JSONArray
import org.json.JSONObject
import kotlin.math.floor
import kotlin.math.max

/**
 * Preferências do Copiloto e leitura do JSON que o app web manda em configurar().
 *
 * Espelho de:
 *  - src/dominio/ganhos/copiloto.ts (PreferenciasCopiloto, PREFERENCIAS_PADRAO,
 *    normalizarPreferenciasCopiloto, saudacao, montarMensagem);
 *  - src/dominio/ganhos/custos.ts (normalizarCriterios).
 * Mudou lá, mude aqui (e em PreferenciasTest.kt / ReguaTest.kt).
 *
 * Puro (só org.json, que os testes JUnit recebem pela dependência org.json:json).
 */

/** Casa ou ponto preferido, para o custo da volta. */
data class Base(val nome: String, val lat: Double, val lon: Double)

/**
 * Régua salva (ex.: Dia, Noite, Aeroporto), trocada pelo menu da bolha.
 * [criterios] é o JSON (texto) dos critérios no formato de custos.ts, ou null se
 * não veio um objeto; é normalizado só na hora de aplicar (como a régua).
 */
data class PerfilRegua(val nome: String, val criterios: String?) {
    fun criteriosJson(): JSONObject? = criterios?.let { runCatching { JSONObject(it) }.getOrNull() }

    /** Critérios que este perfil aplica (normalizados como a régua: inválido volta ao padrão). */
    fun criteriosNormalizados(): Criterios = NormalizarCriterios.deJson(criteriosJson())
}

/** Câmera de segurança da corrida (grava só no celular). */
data class PreferenciasCamera(
    /** baixa (360p) | media (480p) | alta (720p) */
    val qualidade: String,
    /** frontal | traseira */
    val lente: String,
    /** 1 a 30 */
    val minutosPorArquivo: Int,
    /** 1 a 128 */
    val limiteGb: Int,
)

data class PreferenciasCopiloto(
    /** Campos do cartão, na ordem (máximo 6; os 3 primeiros são os grandes). */
    val campos: List<String>,
    /** p | m | g */
    val tamanhoFonte: String,
    /** Segundos na tela (Uber e 99; no inDrive fica enquanto a oferta estiver aberta). */
    val segundosCartao: Int,
    /** Opacidade da bolha (30 a 100). */
    val opacidadeBolha: Int,
    /** app | claro | escuro */
    val tema: String,
    val vibrar: Boolean,
    /** Fala o resultado ("Verde. Dois reais e dez por quilômetro."). */
    val voz: Boolean,
    /** Bip curto só na corrida boa. */
    val bip: Boolean,
    /** Pergunta "Você aceitou?" depois da oferta. */
    val perguntarAceite: Boolean,
    /** Mensagem pronta para o passageiro: {saudacao}, {nome}, {tempo}. */
    val mensagem: String,
    /** Null: usa a localização do momento. */
    val base: Base?,
    /** O leitor dorme quando o app de corrida está offline. */
    val economia: Boolean,
    /** completo (cartão único) | bordas (peças pequenas coladas na borda da tela). */
    val estiloCartao: String = "completo",
    /** Cartão sempre no centro da largura (só sobe e desce ao arrastar). */
    val fixarCentro: Boolean = false,
    /** padrao | maps | waze | perguntar: app que os botões Embarque e Destino abrem. */
    val appNavegacao: String = "padrao",
    /** Réguas salvas (até 6). */
    val perfis: List<PerfilRegua> = emptyList(),
    val camera: PreferenciasCamera = Preferencias.CAMERA_PADRAO,
    /** Guarda um print de cada oferta lida (Android 11+). */
    val printOfertas: Boolean = false,
) {
    /** Escala do texto do cartão: p 0,9 · m 1 · g 1,15. */
    val escalaFonte: Float get() = when (tamanhoFonte) {
        "p" -> 0.9f
        "g" -> 1.15f
        else -> 1f
    }

    fun paraJson(): JSONObject = JSONObject().apply {
        put("campos", JSONArray(campos))
        put("tamanhoFonte", tamanhoFonte)
        put("segundosCartao", segundosCartao)
        put("opacidadeBolha", opacidadeBolha)
        put("tema", tema)
        put("vibrar", vibrar)
        put("voz", voz)
        put("bip", bip)
        put("perguntarAceite", perguntarAceite)
        put("mensagem", mensagem)
        put("base", base?.let { JSONObject().put("nome", it.nome).put("lat", it.lat).put("lon", it.lon) } ?: JSONObject.NULL)
        put("economia", economia)
        put("estiloCartao", estiloCartao)
        put("fixarCentro", fixarCentro)
        put("appNavegacao", appNavegacao)
        put("perfis", JSONArray().apply {
            perfis.forEach { pr -> put(JSONObject().put("nome", pr.nome).put("criterios", pr.criteriosJson() ?: JSONObject.NULL)) }
        })
        put(
            "camera",
            JSONObject()
                .put("qualidade", camera.qualidade)
                .put("lente", camera.lente)
                .put("minutosPorArquivo", camera.minutosPorArquivo)
                .put("limiteGb", camera.limiteGb),
        )
        put("printOfertas", printOfertas)
    }
}

object Preferencias {
    val CAMPOS_CARTAO = listOf("porKm", "porHora", "lucro", "lucroHora", "lucroPct", "valor", "porMin", "nota", "tempoTotal", "distanciaTotal", "busca", "volta")

    const val MENSAGEM_PADRAO = "{saudacao}, {nome}! Já estou a caminho e chego em aproximadamente {tempo}. Por gentileza, me aguarde no local de embarque."

    val CAMERA_PADRAO = PreferenciasCamera(qualidade = "media", lente = "frontal", minutosPorArquivo = 5, limiteGb = 8)

    const val MAXIMO_PERFIS = 6

    val PADRAO = PreferenciasCopiloto(
        campos = listOf("porKm", "porHora", "lucro", "nota", "distanciaTotal", "volta"),
        tamanhoFonte = "m",
        segundosCartao = 12,
        opacidadeBolha = 100,
        tema = "app",
        vibrar = true,
        voz = false,
        bip = true,
        perguntarAceite = true,
        mensagem = MENSAGEM_PADRAO,
        base = null,
        economia = true,
        estiloCartao = "completo",
        fixarCentro = false,
        appNavegacao = "padrao",
        perfis = emptyList(),
        camera = CAMERA_PADRAO,
        printOfertas = false,
    )

    /** Igual ao normalizarPreferenciasCopiloto do TS: campo inválido volta ao padrão daquele campo. */
    fun deJson(o: JSONObject?): PreferenciasCopiloto {
        if (o == null) return PADRAO
        val p = PADRAO
        val campos = (o.opt("campos") as? JSONArray)?.let { arr ->
            if (arr.length() < 1) return@let null
            val l = (0 until arr.length()).map { i -> (arr.opt(i) as? String)?.takeIf { it in CAMPOS_CARTAO } ?: return@let null }
            l.distinct().take(6)
        } ?: p.campos
        return PreferenciasCopiloto(
            campos = campos,
            tamanhoFonte = (o.opt("tamanhoFonte") as? String)?.takeIf { it in setOf("p", "m", "g") } ?: "m",
            segundosCartao = Json.numero(o, "segundosCartao", 4.0, 120.0, inteiro = true)?.toInt() ?: 12,
            opacidadeBolha = Json.numero(o, "opacidadeBolha", 30.0, 100.0, inteiro = true)?.toInt() ?: 100,
            tema = (o.opt("tema") as? String)?.takeIf { it in setOf("app", "claro", "escuro") } ?: "app",
            vibrar = Json.booleano(o, "vibrar") ?: true,
            voz = Json.booleano(o, "voz") ?: false,
            bip = Json.booleano(o, "bip") ?: true,
            perguntarAceite = Json.booleano(o, "perguntarAceite") ?: true,
            mensagem = (o.opt("mensagem") as? String)?.trim()?.takeIf { it.length in 3..300 } ?: MENSAGEM_PADRAO,
            base = baseDeJson(o.opt("base")),
            economia = Json.booleano(o, "economia") ?: true,
            estiloCartao = (o.opt("estiloCartao") as? String)?.takeIf { it in setOf("completo", "bordas") } ?: "completo",
            fixarCentro = Json.booleano(o, "fixarCentro") ?: false,
            appNavegacao = (o.opt("appNavegacao") as? String)?.takeIf { it in Navegacao.APPS } ?: "padrao",
            perfis = perfisDeJson(o.opt("perfis")),
            camera = cameraDeJson(o.opt("camera")),
            printOfertas = Json.booleano(o, "printOfertas") ?: false,
        )
    }

    /** z.array({ nome 1..30 (sem espaços nas pontas), criterios: unknown }).max(6): qualquer item inválido zera a lista. */
    fun perfisDeJson(v: Any?): List<PerfilRegua> {
        val arr = v as? JSONArray ?: return emptyList()
        if (arr.length() > MAXIMO_PERFIS) return emptyList()
        return (0 until arr.length()).map { i ->
            val p = arr.opt(i) as? JSONObject ?: return emptyList()
            val nome = (p.opt("nome") as? String)?.trim()?.takeIf { it.length in 1..30 } ?: return emptyList()
            PerfilRegua(nome, (p.opt("criterios") as? JSONObject)?.toString())
        }
    }

    /** Cada campo inválido volta ao padrão dele; se não for objeto, a câmera inteira volta ao padrão. */
    fun cameraDeJson(v: Any?): PreferenciasCamera {
        val c = v as? JSONObject ?: return CAMERA_PADRAO
        return PreferenciasCamera(
            qualidade = (c.opt("qualidade") as? String)?.takeIf { it in setOf("baixa", "media", "alta") } ?: "media",
            lente = (c.opt("lente") as? String)?.takeIf { it in setOf("frontal", "traseira") } ?: "frontal",
            minutosPorArquivo = Json.numero(c, "minutosPorArquivo", 1.0, 30.0, inteiro = true)?.toInt() ?: 5,
            limiteGb = Json.numero(c, "limiteGb", 1.0, 128.0, inteiro = true)?.toInt() ?: 8,
        )
    }

    /** { nome, lat, lon } (números de verdade, sem coerção, como o z.number do TS) ou null. */
    fun baseDeJson(v: Any?): Base? {
        val b = v as? JSONObject ?: return null
        val nome = (b.opt("nome") as? String)?.trim()?.takeIf { it.length in 1..120 } ?: return null
        val lat = (b.opt("lat") as? Number)?.toDouble()?.takeIf { it.isFinite() && it in -90.0..90.0 } ?: return null
        val lon = (b.opt("lon") as? Number)?.toDouble()?.takeIf { it.isFinite() && it in -180.0..180.0 } ?: return null
        return Base(nome, lat, lon)
    }

    // ------------------------------------------------------------------ mensagem pronta

    /** "Bom dia/Boa tarde/Boa noite" pela hora de Brasília. */
    fun saudacao(hora: Int): String = if (hora in 5..11) "Bom dia" else if (hora in 12..17) "Boa tarde" else "Boa noite"

    private val TUDO_BEM = Regex(",\\s*tudo bem!")

    /** Preenche a mensagem pronta (mesma regra de montarMensagem do TS). */
    fun montarMensagem(modelo: String, hora: Int, nome: String? = null, minutos: Double? = null): String {
        val tempo = if (minutos != null) "${max(1L, jsRound(minutos))} min" else "poucos minutos"
        return modelo
            .replace("{saudacao}", saudacao(hora))
            .replace("{nome}", nome?.trim()?.takeIf { it.isNotEmpty() } ?: "tudo bem")
            .replace("{tempo}", tempo)
            .replaceFirst(TUDO_BEM, ", tudo bem?")
    }
}

/** Leitura de campos do JSON com a mesma coerção do z.coerce / z.boolean do TS. */
object Json {
    /**
     * Number(x) do JavaScript: número fica, texto vira número ("9.5" → 9,5; "" → 0),
     * true/false → 1/0, null → 0; o resto é NaN.
     */
    fun coagir(v: Any?): Double = when (v) {
        null -> Double.NaN // campo ausente: undefined → NaN
        JSONObject.NULL -> 0.0
        is Number -> v.toDouble()
        is Boolean -> if (v) 1.0 else 0.0
        is String -> v.trim().let { s -> if (s.isEmpty()) 0.0 else s.toDoubleOrNull() ?: Double.NaN }
        else -> Double.NaN
    }

    /** z.coerce.number().min().max() (e .int()); null se inválido (o chamador põe o padrão). */
    fun numero(o: JSONObject, chave: String, min: Double, max: Double, inteiro: Boolean = false): Double? {
        val v = coagir(if (o.has(chave)) o.opt(chave) else null)
        if (v.isNaN() || v.isInfinite() || v < min || v > max) return null
        if (inteiro && v != floor(v)) return null
        return v
    }

    /** z.boolean(): só true/false de verdade. */
    fun booleano(o: JSONObject, chave: String): Boolean? = o.opt(chave) as? Boolean
}

/** Leitura dos critérios (normalizarCriterios de custos.ts). */
object NormalizarCriterios {
    private const val REAIS_MAX = 100_000_000.0
    private val HORA = Regex("^([01][0-9]|2[0-3]):[0-5][0-9]$")
    private val ESPACOS = Regex("\\s+")

    /** listaPalavras do TS: array de textos (senão []), espaços juntos, até 60 letras, 3+ letras, sem repetir, até 100. */
    fun lista(v: Any?): List<String> {
        val arr = v as? JSONArray ?: return emptyList()
        val textos = (0 until arr.length()).map { i -> arr.opt(i) as? String ?: return emptyList() }
        return lista(textos)
    }

    fun lista(textos: List<String>): List<String> =
        textos.map { it.trim().replace(ESPACOS, " ").take(60) }.filter { it.length >= 3 }.distinct().take(100)

    private fun reais(o: JSONObject, chave: String): Long? = Json.numero(o, chave, 0.0, REAIS_MAX, inteiro = true)?.toLong()

    private fun faixas(v: Any?): List<FaixaHorario> {
        val arr = v as? JSONArray ?: return emptyList()
        if (arr.length() > 6) return emptyList()
        return (0 until arr.length()).map { i ->
            val f = arr.opt(i) as? JSONObject ?: return emptyList()
            val nome = (f.opt("nome") as? String)?.trim()?.takeIf { it.length in 1..30 } ?: return emptyList()
            val de = (f.opt("de") as? String)?.takeIf { HORA.matches(it) } ?: return emptyList()
            val ate = (f.opt("ate") as? String)?.takeIf { HORA.matches(it) } ?: return emptyList()
            FaixaHorario(
                nome = nome,
                de = de,
                ate = ate,
                minimoPorKm = reais(f, "minimoPorKm") ?: return emptyList(),
                minimoPorHora = reais(f, "minimoPorHora") ?: return emptyList(),
                bomPorKm = reais(f, "bomPorKm") ?: 0,
                bomPorHora = reais(f, "bomPorHora") ?: 0,
            )
        }
    }

    /** Igual ao normalizarCriterios do TS: o que estiver inválido volta ao padrão daquele campo. */
    fun deJson(o: JSONObject?): Criterios {
        if (o == null) return CRITERIOS_PADRAO
        val c = CRITERIOS_PADRAO
        return Criterios(
            minimoPorKm = reais(o, "minimoPorKm") ?: c.minimoPorKm,
            minimoPorHora = reais(o, "minimoPorHora") ?: c.minimoPorHora,
            bomPorKm = reais(o, "bomPorKm") ?: 0,
            bomPorHora = reais(o, "bomPorHora") ?: 0,
            buscaMaximaKm = Json.numero(o, "buscaMaximaKm", 0.0, 100.0) ?: c.buscaMaximaKm,
            buscaMaximaMin = Json.numero(o, "buscaMaximaMin", 0.0, 120.0, inteiro = true) ?: 0.0,
            viagemMaximaKm = Json.numero(o, "viagemMaximaKm", 0.0, 2000.0) ?: 0.0,
            viagemMaximaMin = Json.numero(o, "viagemMaximaMin", 0.0, 1440.0, inteiro = true) ?: 0.0,
            valorMinimo = reais(o, "valorMinimo") ?: 0,
            lucroMinimo = reais(o, "lucroMinimo") ?: 0,
            lucroMinimoBps = Json.numero(o, "lucroMinimoBps", 0.0, 9000.0, inteiro = true)?.toLong() ?: 0,
            notaMinima = Json.numero(o, "notaMinima", 0.0, 5.0) ?: 0.0,
            alertaPassageiroNovo = Json.booleano(o, "alertaPassageiroNovo") ?: false,
            alertaParadas = Json.booleano(o, "alertaParadas") ?: false,
            evitar = lista(o.opt("evitar")),
            destinosDesejados = lista(o.opt("destinosDesejados")),
            porHorario = faixas(o.opt("porHorario")),
            contarVolta = Json.booleano(o, "contarVolta") ?: false,
        )
    }
}
