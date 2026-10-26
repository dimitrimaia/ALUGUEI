package xyz.aluguei.app.plantao

import android.content.Context
import android.content.SharedPreferences
import org.json.JSONArray
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone
import java.util.UUID
import kotlin.math.floor

/**
 * Armazenamento local do plantão (SharedPreferences, só neste aparelho):
 *  - perfil de custo e critérios (recebidos do app web por Plantao.configurar);
 *  - plantão ligado/desligado e posição da bolha;
 *  - fila de corridas avaliadas, para o app web enviar ao servidor depois.
 *
 * Não guarda texto da tela dos apps de corrida; só os números lidos.
 */
object Armazenamento {
    private const val ARQUIVO = "plantao"
    private const val PERFIL = "perfil"
    private const val CRITERIOS = "criterios"
    private const val SEGUNDOS_CARTAO = "segundosCartao"
    private const val LIGADO = "ligado"
    private const val BOLHA_X = "bolhaX"
    private const val BOLHA_Y = "bolhaY"
    private const val PEDIDO_ACESSIBILIDADE = "pedidoAcessibilidadeEm"
    private const val FILA = "fila"

    /** Limite da fila: se o app web passar muito tempo sem enviar, descarta as mais antigas. */
    private const val MAXIMO_FILA = 500
    const val SEGUNDOS_CARTAO_PADRAO = 12

    private fun prefs(ctx: Context): SharedPreferences = ctx.applicationContext.getSharedPreferences(ARQUIVO, Context.MODE_PRIVATE)

    // ---------- configuração ----------

    fun salvarConfiguracao(ctx: Context, perfil: JSONObject?, criterios: JSONObject?, segundosCartao: Int?) {
        val e = prefs(ctx).edit()
        if (perfil != null) e.putString(PERFIL, perfil.toString())
        if (criterios != null) e.putString(CRITERIOS, criterios.toString())
        if (segundosCartao != null) e.putInt(SEGUNDOS_CARTAO, segundosCartao.coerceIn(4, 120))
        e.apply()
    }

    fun perfil(ctx: Context): PerfilCusto = perfilDeJson(prefs(ctx).getString(PERFIL, null)?.let { runCatching { JSONObject(it) }.getOrNull() })

    fun criterios(ctx: Context): Criterios = criteriosDeJson(prefs(ctx).getString(CRITERIOS, null)?.let { runCatching { JSONObject(it) }.getOrNull() })

    fun segundosCartao(ctx: Context): Int = prefs(ctx).getInt(SEGUNDOS_CARTAO, SEGUNDOS_CARTAO_PADRAO)

    fun configurado(ctx: Context): Boolean = prefs(ctx).contains(PERFIL)

    // ---------- estado ----------

    fun ligado(ctx: Context): Boolean = prefs(ctx).getBoolean(LIGADO, false)

    fun definirLigado(ctx: Context, ligado: Boolean) = prefs(ctx).edit().putBoolean(LIGADO, ligado).apply()

    fun posicaoBolha(ctx: Context): Pair<Int, Int>? {
        val p = prefs(ctx)
        return if (p.contains(BOLHA_X)) Pair(p.getInt(BOLHA_X, 0), p.getInt(BOLHA_Y, 0)) else null
    }

    fun salvarPosicaoBolha(ctx: Context, x: Int, y: Int) = prefs(ctx).edit().putInt(BOLHA_X, x).putInt(BOLHA_Y, y).apply()

    fun marcarPedidoAcessibilidade(ctx: Context) = prefs(ctx).edit().putLong(PEDIDO_ACESSIBILIDADE, System.currentTimeMillis()).apply()

    /** Momento (ms) em que o app pediu para ligar o leitor; 0 se não há pedido em aberto. */
    fun pedidoAcessibilidadeEm(ctx: Context): Long = prefs(ctx).getLong(PEDIDO_ACESSIBILIDADE, 0)

    fun limparPedidoAcessibilidade(ctx: Context) = prefs(ctx).edit().remove(PEDIDO_ACESSIBILIDADE).apply()

    // ---------- fila de corridas ----------

    @Synchronized
    fun corridas(ctx: Context): List<CorridaAvaliada> {
        val bruto = prefs(ctx).getString(FILA, null) ?: return emptyList()
        val arr = runCatching { JSONArray(bruto) }.getOrNull() ?: return emptyList()
        return (0 until arr.length()).mapNotNull { i -> arr.optJSONObject(i)?.let { CorridaAvaliada.deJson(it) } }
    }

    @Synchronized
    private fun gravar(ctx: Context, lista: List<CorridaAvaliada>) {
        val arr = JSONArray()
        lista.takeLast(MAXIMO_FILA).forEach { arr.put(it.paraJson()) }
        prefs(ctx).edit().putString(FILA, arr.toString()).apply()
    }

    @Synchronized
    fun adicionar(ctx: Context, c: CorridaAvaliada) = gravar(ctx, corridas(ctx) + c)

    @Synchronized
    fun atualizarDecisao(ctx: Context, id: String, decisao: String): CorridaAvaliada? {
        var achada: CorridaAvaliada? = null
        val nova = corridas(ctx).map { if (it.id == id) it.copy(decisao = decisao).also { c -> achada = c } else it }
        if (achada != null) gravar(ctx, nova)
        return achada
    }

    /**
     * Tira da fila as corridas já enviadas ao servidor: as de `ids` e as com
     * momento <= `ate` (ISO em UTC, comparável como texto). Devolve quantas sobraram.
     */
    @Synchronized
    fun confirmarEnvio(ctx: Context, ate: String?, ids: Set<String>): Int {
        val sobra = corridas(ctx).filterNot { it.id in ids || (ate != null && it.momento <= ate) }
        gravar(ctx, sobra)
        return sobra.size
    }

    // ---------- leitura do JSON do app web (mesmo formato de PerfilCusto e Criterios do TS) ----------

    private val COMBUSTIVEIS = setOf("gasolina", "etanol", "gnv", "diesel", "eletrico")

    /** Número (aceita texto, como o z.coerce do TS) dentro da faixa; senão null. */
    private fun num(o: JSONObject, chave: String, min: Double, max: Double, inteiro: Boolean = false): Double? {
        if (!o.has(chave) || o.isNull(chave)) return null
        val v = o.optDouble(chave, Double.NaN)
        if (v.isNaN() || v < min || v > max) return null
        if (inteiro && v != floor(v)) return null
        return v
    }

    /** Igual ao normalizarPerfil do TS: campo inválido volta ao padrão daquele campo. */
    fun perfilDeJson(o: JSONObject?): PerfilCusto {
        if (o == null) return PERFIL_PADRAO
        val p = PERFIL_PADRAO
        val combustivel = o.optString("combustivel").takeIf { it in COMBUSTIVEIS } ?: p.combustivel
        val desgaste = o.optJSONArray("desgaste")?.let { arr ->
            if (arr.length() > 20) return@let null
            val itens = (0 until arr.length()).map { i ->
                val item = arr.optJSONObject(i) ?: return@let null
                val nome = item.optString("nome").trim().takeIf { n -> n.isNotEmpty() && n.length <= 60 } ?: return@let null
                val valor = num(item, "valor", 0.0, 100_000_000.0, true) ?: return@let null
                val cadaKm = num(item, "cadaKm", 100.0, 1_000_000.0, true) ?: return@let null
                ItemDesgaste(nome, valor.toLong(), cadaKm)
            }
            itens
        } ?: p.desgaste
        val fixos = o.optJSONArray("fixosMensais")?.let { arr ->
            if (arr.length() > 20) return@let null
            (0 until arr.length()).map { i ->
                val item = arr.optJSONObject(i) ?: return@let null
                val nome = item.optString("nome").trim().takeIf { n -> n.isNotEmpty() && n.length <= 60 } ?: return@let null
                val valor = num(item, "valor", 0.0, 100_000_000.0, true) ?: return@let null
                ItemFixo(nome, valor.toLong(), item.optBoolean("doContrato", false))
            }
        } ?: emptyList()
        return PerfilCusto(
            combustivel = combustivel,
            consumo = num(o, "consumo", 0.5, 100.0) ?: p.consumo,
            precoCombustivel = num(o, "precoCombustivel", 0.0, 100_000_000.0, true)?.toLong() ?: p.precoCombustivel,
            desgaste = desgaste,
            fixosMensais = fixos,
            diasPorMes = num(o, "diasPorMes", 1.0, 31.0, true) ?: p.diasPorMes,
            horasPorDia = num(o, "horasPorDia", 1.0, 24.0) ?: p.horasPorDia,
        )
    }

    /** Igual ao normalizarCriterios do TS. */
    fun criteriosDeJson(o: JSONObject?): Criterios {
        if (o == null) return CRITERIOS_PADRAO
        val c = CRITERIOS_PADRAO
        return Criterios(
            minimoPorKm = num(o, "minimoPorKm", 0.0, 100_000_000.0, true)?.toLong() ?: c.minimoPorKm,
            minimoPorHora = num(o, "minimoPorHora", 0.0, 100_000_000.0, true)?.toLong() ?: c.minimoPorHora,
            buscaMaximaKm = num(o, "buscaMaximaKm", 0.0, 100.0) ?: c.buscaMaximaKm,
        )
    }

    /** Agora em ISO 8601 UTC ("2026-10-26T23:10:05.123Z"); dá para comparar como texto. */
    fun agoraIso(): String {
        val f = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US)
        f.timeZone = TimeZone.getTimeZone("UTC")
        return f.format(Date())
    }
}

/** Uma corrida que passou pelo semáforo, esperando o app web enviar ao servidor. */
data class CorridaAvaliada(
    val id: String,
    /** Centavos. */
    val valor: Long,
    val kmCorrida: Double,
    val minutosCorrida: Double?,
    val kmBusca: Double?,
    val minutosBusca: Double?,
    /** verde | amarelo | vermelho */
    val sinal: String,
    /** aceitei | recusei | sem_resposta */
    val decisao: String,
    /** leitura | digitada */
    val origem: String,
    /** uber | 99 | indrive | null (digitada) */
    val app: String?,
    /** ISO 8601 UTC. */
    val momento: String,
    /** Centavos, para a tela mostrar sem recalcular (o servidor recalcula). */
    val porKm: Long,
    val porHora: Long,
    val lucro: Long,
) {
    fun paraJson(): JSONObject = JSONObject().apply {
        put("id", id)
        put("valor", valor)
        put("kmCorrida", kmCorrida)
        put("minutosCorrida", minutosCorrida ?: JSONObject.NULL)
        put("kmBusca", kmBusca ?: JSONObject.NULL)
        put("minutosBusca", minutosBusca ?: JSONObject.NULL)
        put("sinal", sinal)
        put("decisao", decisao)
        put("origem", origem)
        put("app", app ?: JSONObject.NULL)
        put("momento", momento)
        put("porKm", porKm)
        put("porHora", porHora)
        put("lucro", lucro)
    }

    companion object {
        const val ACEITEI = "aceitei"
        const val RECUSEI = "recusei"
        const val SEM_RESPOSTA = "sem_resposta"

        private fun JSONObject.duploOuNulo(chave: String): Double? = if (isNull(chave)) null else optDouble(chave, Double.NaN).takeUnless { it.isNaN() }

        fun nova(o: Oferta, a: Avaliacao, origem: String, app: String?) = CorridaAvaliada(
            id = UUID.randomUUID().toString(),
            valor = o.valor,
            kmCorrida = o.kmCorrida,
            minutosCorrida = o.minutosCorrida,
            kmBusca = o.kmBusca,
            minutosBusca = o.minutosBusca,
            sinal = a.sinal.codigo,
            decisao = SEM_RESPOSTA,
            origem = origem,
            app = app,
            momento = Armazenamento.agoraIso(),
            porKm = a.porKm,
            porHora = a.porHora,
            lucro = a.lucro,
        )

        fun deJson(o: JSONObject): CorridaAvaliada? = runCatching {
            CorridaAvaliada(
                id = o.getString("id"),
                valor = o.getLong("valor"),
                kmCorrida = o.getDouble("kmCorrida"),
                minutosCorrida = o.duploOuNulo("minutosCorrida"),
                kmBusca = o.duploOuNulo("kmBusca"),
                minutosBusca = o.duploOuNulo("minutosBusca"),
                sinal = o.getString("sinal"),
                decisao = o.optString("decisao", SEM_RESPOSTA),
                origem = o.optString("origem", "digitada"),
                app = if (o.isNull("app")) null else o.optString("app"),
                momento = o.getString("momento"),
                porKm = o.optLong("porKm"),
                porHora = o.optLong("porHora"),
                lucro = o.optLong("lucro"),
            )
        }.getOrNull()
    }
}
