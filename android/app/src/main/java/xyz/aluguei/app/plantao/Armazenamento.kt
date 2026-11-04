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
 * Armazenamento local do Copiloto (SharedPreferences, só neste aparelho):
 *  - perfil de custo, critérios e preferências (recebidos do app web por Plantao.configurar);
 *  - ligado/pausado, tema, vibração, posição da bolha e do cartão;
 *  - base definida pela bolha e "não perguntar mais" (pendentes até o app web salvar na conta);
 *  - lugares a evitar adicionados pela bolha e régua alterada pela bolha (pendentes para o app web);
 *  - resumo do dia (contadores);
 *  - fila de corridas avaliadas, para o app web enviar ao servidor depois.
 *
 * Não guarda a tela inteira dos apps de corrida; só os números e os dados da
 * oferta que o cartão mostra (nome, nota, pagamento, destino).
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
    private const val FINALIZADAS = "finalizadas"
    private const val COMUNIDADE = "comunidade"
    private const val TEMA = "tema"
    private const val VIBRAR = "vibrar"
    private const val PAUSADO = "pausado"
    private const val DIAGNOSTICO = "diagnostico"
    private const val LUGARES = "lugaresAdicionados"
    private const val REGUA_PENDENTE = "reguaPendente"
    private const val CARTAO_Y = "cartaoY_"
    private const val RESUMO_DIA = "resumoDia"
    private const val RESUMO_OFERTAS = "resumoOfertas"
    private const val RESUMO_ACEITAS = "resumoAceitas"
    private const val RESUMO_GANHO = "resumoGanho"
    private const val RESUMO_LUCRO = "resumoLucro"
    private const val PREFERENCIAS = "preferencias"
    private const val BASE_PENDENTE = "basePendente"
    private const val PERGUNTAR_PENDENTE = "perguntarAceitePendente"
    private const val PERFIL_ATIVO = "perfilAtivo"
    private const val PERFIL_PENDENTE = "perfilPendente"
    private const val VIDEOS = "videosCamera"
    private const val VOLTA_CARTAO = "contarVoltaCartao"

    val TEMAS = setOf("claro", "escuro", "auto")

    /** Limite da fila: se o app web passar muito tempo sem enviar, descarta as mais antigas. */
    private const val MAXIMO_FILA = 500
    const val SEGUNDOS_CARTAO_PADRAO = 12

    private fun prefs(ctx: Context): SharedPreferences = ctx.applicationContext.getSharedPreferences(ARQUIVO, Context.MODE_PRIVATE)

    // ---------- configuração ----------

    fun salvarConfiguracao(
        ctx: Context,
        perfil: JSONObject?,
        criterios: JSONObject?,
        segundosCartao: Int?,
        tema: String? = null,
        vibrar: Boolean? = null,
        preferencias: JSONObject? = null,
    ) {
        val e = prefs(ctx).edit()
        if (perfil != null) e.putString(PERFIL, perfil.toString())
        // Perfil escolhido na bolha e ainda não salvo na conta: os critérios dele valem.
        if (criterios != null && !prefs(ctx).contains(PERFIL_PENDENTE)) {
            // Régua mudada na bolha e ainda não salva na conta: os dois mínimos dela valem.
            val pendente = reguaPendente(ctx)
            val c = JSONObject(criterios.toString())
            if (pendente != null) {
                c.put("minimoPorKm", pendente.first)
                c.put("minimoPorHora", pendente.second)
            }
            e.putString(CRITERIOS, c.toString())
        }
        if (tema != null && tema in TEMAS) e.putString(TEMA, tema)
        if (preferencias != null) {
            // As preferências mandam; os campos antigos (segundosCartao, vibrar) só valem sem elas.
            var p = Preferencias.deJson(preferencias)
            val base = basePendente(ctx)
            if (base != null) {
                if (p.base != null && mesmoLugar(p.base!!, base)) e.remove(BASE_PENDENTE) else p = p.copy(base = base)
            }
            if (prefs(ctx).getBoolean(PERGUNTAR_PENDENTE, false)) {
                if (!p.perguntarAceite) e.remove(PERGUNTAR_PENDENTE) else p = p.copy(perguntarAceite = false)
            }
            e.putString(PREFERENCIAS, p.paraJson().toString())
            e.putInt(SEGUNDOS_CARTAO, p.segundosCartao)
            e.putBoolean(VIBRAR, p.vibrar)
            cachePreferencias = p
        } else if (segundosCartao != null || vibrar != null) {
            val atual = preferencias(ctx)
            val p = atual.copy(segundosCartao = segundosCartao?.coerceIn(4, 120) ?: atual.segundosCartao, vibrar = vibrar ?: atual.vibrar)
            if (segundosCartao != null) e.putInt(SEGUNDOS_CARTAO, p.segundosCartao)
            if (vibrar != null) e.putBoolean(VIBRAR, p.vibrar)
            if (prefs(ctx).contains(PREFERENCIAS)) e.putString(PREFERENCIAS, p.paraJson().toString())
            cachePreferencias = null
        }
        e.apply()
    }

    private fun mesmoLugar(a: Base, b: Base) = kotlin.math.abs(a.lat - b.lat) < 1e-5 && kotlin.math.abs(a.lon - b.lon) < 1e-5

    // ---------- preferências do Copiloto ----------

    @Volatile
    private var cachePreferencias: PreferenciasCopiloto? = null

    /** Preferências (do app web, com o que a bolha mudou e ainda está pendente). Em cache na memória. */
    fun preferencias(ctx: Context): PreferenciasCopiloto {
        cachePreferencias?.let { return it }
        val p = prefs(ctx)
        val salvo = p.getString(PREFERENCIAS, null)?.let { runCatching { JSONObject(it) }.getOrNull() }
        val r = if (salvo != null) {
            Preferencias.deJson(salvo)
        } else {
            // Só os campos antigos (configurar sem preferencias).
            Preferencias.PADRAO.copy(segundosCartao = p.getInt(SEGUNDOS_CARTAO, SEGUNDOS_CARTAO_PADRAO), vibrar = p.getBoolean(VIBRAR, true))
        }
        cachePreferencias = r
        return r
    }

    private fun salvarPreferenciasLocal(ctx: Context, p: PreferenciasCopiloto, extra: (SharedPreferences.Editor) -> Unit = {}) {
        val e = prefs(ctx).edit().putString(PREFERENCIAS, p.paraJson().toString())
        extra(e)
        e.apply()
        cachePreferencias = p
    }

    /** "Definir base aqui" na bolha: vale na hora e fica pendente até o app web salvar (evento "base"). */
    fun definirBaseLocal(ctx: Context, lat: Double, lon: Double) {
        val base = Base("Base", lat, lon)
        salvarPreferenciasLocal(ctx, preferencias(ctx).copy(base = base)) {
            it.putString(BASE_PENDENTE, JSONObject().put("nome", base.nome).put("lat", lat).put("lon", lon).toString())
        }
    }

    fun basePendente(ctx: Context): Base? = prefs(ctx).getString(BASE_PENDENTE, null)?.let { runCatching { Preferencias.baseDeJson(JSONObject(it)) }.getOrNull() }

    /** "Não perguntar mais": vale na hora e fica pendente até o app web salvar (evento "preferencia"). */
    fun naoPerguntarAceite(ctx: Context) {
        salvarPreferenciasLocal(ctx, preferencias(ctx).copy(perguntarAceite = false)) { it.putBoolean(PERGUNTAR_PENDENTE, true) }
    }

    /** Tema do app web ("claro" | "escuro" | "auto"), usado quando preferencias.tema = "app". */
    fun tema(ctx: Context): String = prefs(ctx).getString(TEMA, "auto")?.takeIf { it in TEMAS } ?: "auto"

    /** Tema que a bolha usa: o das preferências ou, em "app", o tema que o app web mandou. */
    fun temaEfetivo(ctx: Context): String = preferencias(ctx).tema.takeIf { it == "claro" || it == "escuro" } ?: tema(ctx)

    /** Troca pelo menu da bolha (vale neste aparelho até o próximo configurar). */
    fun definirTema(ctx: Context, tema: String) {
        if (tema == "claro" || tema == "escuro") salvarPreferenciasLocal(ctx, preferencias(ctx).copy(tema = tema))
    }

    fun vibrar(ctx: Context): Boolean = preferencias(ctx).vibrar

    // ---------- régua rápida (mudada pela bolha) ----------

    /** Muda os mínimos localmente e deixa a régua pendente até o app web salvar na conta. */
    fun salvarRegua(ctx: Context, minimoPorKm: Long, minimoPorHora: Long) {
        val atual = prefs(ctx).getString(CRITERIOS, null)?.let { runCatching { JSONObject(it) }.getOrNull() } ?: JSONObject().apply {
            val c = CRITERIOS_PADRAO
            put("minimoPorKm", c.minimoPorKm)
            put("minimoPorHora", c.minimoPorHora)
            put("buscaMaximaKm", c.buscaMaximaKm)
        }
        atual.put("minimoPorKm", minimoPorKm)
        atual.put("minimoPorHora", minimoPorHora)
        val pendente = JSONObject().put("minimoPorKm", minimoPorKm).put("minimoPorHora", minimoPorHora)
        prefs(ctx).edit().putString(CRITERIOS, atual.toString()).putString(REGUA_PENDENTE, pendente.toString()).apply()
    }

    /** (minimoPorKm, minimoPorHora) em centavos, ou null. */
    fun reguaPendente(ctx: Context): Pair<Long, Long>? {
        val o = prefs(ctx).getString(REGUA_PENDENTE, null)?.let { runCatching { JSONObject(it) }.getOrNull() } ?: return null
        if (!o.has("minimoPorKm") || !o.has("minimoPorHora")) return null
        return Pair(o.optLong("minimoPorKm"), o.optLong("minimoPorHora"))
    }

    fun limparReguaPendente(ctx: Context) = prefs(ctx).edit().remove(REGUA_PENDENTE).apply()

    // ---------- chip "Contar volta para casa" do cartão ----------

    /** Escolha do chip no aparelho; null = ainda não tocou (segue o contarVolta da régua). */
    fun voltaCartao(ctx: Context): Boolean? = prefs(ctx).let { if (it.contains(VOLTA_CARTAO)) it.getBoolean(VOLTA_CARTAO, false) else null }

    fun definirVoltaCartao(ctx: Context, ligado: Boolean) = prefs(ctx).edit().putBoolean(VOLTA_CARTAO, ligado).apply()

    // ---------- perfis de régua (trocados pela bolha) ----------

    /** Nome do perfil escolhido por último na bolha (só local), ou null. */
    fun perfilAtivo(ctx: Context): String? = prefs(ctx).getString(PERFIL_ATIVO, null)

    /**
     * Aplica os critérios do perfil na hora (normalizados ao ler, como a régua),
     * guarda o nome ativo e deixa o perfil pendente até o app web salvar
     * (evento "perfil"). A régua rápida pendente sai: o perfil troca a régua inteira.
     */
    fun aplicarPerfil(ctx: Context, perfil: PerfilRegua) {
        val criterios = perfil.criteriosJson() ?: JSONObject()
        val pendente = JSONObject().put("nome", perfil.nome).put("criterios", perfil.criteriosJson() ?: JSONObject.NULL)
        prefs(ctx).edit()
            .putString(CRITERIOS, criterios.toString())
            .putString(PERFIL_ATIVO, perfil.nome)
            .putString(PERFIL_PENDENTE, pendente.toString())
            .remove(REGUA_PENDENTE)
            .apply()
    }

    /** { nome, criterios } escolhido na bolha e ainda não salvo na conta, ou null. */
    fun perfilPendente(ctx: Context): JSONObject? = prefs(ctx).getString(PERFIL_PENDENTE, null)?.let { runCatching { JSONObject(it) }.getOrNull() }

    fun limparPerfilPendente(ctx: Context) = prefs(ctx).edit().remove(PERFIL_PENDENTE).apply()

    // ---------- vídeos da câmera de segurança (só os que ela mesma gravou) ----------

    fun videos(ctx: Context): List<Gravacoes.Arquivo> {
        val arr = prefs(ctx).getString(VIDEOS, null)?.let { runCatching { JSONArray(it) }.getOrNull() } ?: return emptyList()
        return (0 until arr.length()).mapNotNull { i ->
            val o = arr.optJSONObject(i) ?: return@mapNotNull null
            val id = o.optString("id").takeIf { it.isNotEmpty() } ?: return@mapNotNull null
            Gravacoes.Arquivo(id, o.optLong("bytes"), o.optLong("criadoEm"))
        }
    }

    fun salvarVideos(ctx: Context, lista: List<Gravacoes.Arquivo>) {
        val arr = JSONArray()
        lista.forEach { arr.put(JSONObject().put("id", it.id).put("bytes", it.bytes).put("criadoEm", it.criadoEm)) }
        prefs(ctx).edit().putString(VIDEOS, arr.toString()).commit()
    }

    // ---------- lugares a evitar ----------

    fun lugaresAdicionados(ctx: Context): List<String> {
        val arr = prefs(ctx).getString(LUGARES, null)?.let { runCatching { JSONArray(it) }.getOrNull() } ?: return emptyList()
        return (0 until arr.length()).mapNotNull { arr.optString(it).takeIf { s -> s.isNotBlank() } }
    }

    fun adicionarLugar(ctx: Context, lugar: String) {
        val lista = Copiloto.normalizarEvitar(lugaresAdicionados(ctx) + lugar)
        prefs(ctx).edit().putString(LUGARES, JSONArray(lista).toString()).apply()
    }

    fun limparLugaresAdicionados(ctx: Context) = prefs(ctx).edit().remove(LUGARES).apply()

    /** Lista do app web (criterios.evitar) mais as adicionadas na bolha. */
    fun lugaresEvitar(ctx: Context): List<String> = Copiloto.normalizarEvitar(criterios(ctx).evitar + lugaresAdicionados(ctx))

    // ---------- resumo do dia ----------

    data class Resumo(val ofertas: Int, val aceitas: Int, val ganho: Long, val lucro: Long)

    private fun hoje(): String {
        val f = SimpleDateFormat("yyyy-MM-dd", Locale.US)
        f.timeZone = TimeZone.getTimeZone("America/Sao_Paulo")
        return f.format(Date())
    }

    @Synchronized
    private fun resumoDoDia(p: SharedPreferences): SharedPreferences.Editor? {
        val dia = hoje()
        if (p.getString(RESUMO_DIA, null) == dia) return null
        return p.edit().putString(RESUMO_DIA, dia).putInt(RESUMO_OFERTAS, 0).putInt(RESUMO_ACEITAS, 0).putLong(RESUMO_GANHO, 0).putLong(RESUMO_LUCRO, 0)
    }

    @Synchronized
    fun registrarOfertaNoResumo(ctx: Context) {
        val p = prefs(ctx)
        resumoDoDia(p)?.commit()
        p.edit().putInt(RESUMO_OFERTAS, p.getInt(RESUMO_OFERTAS, 0) + 1).apply()
    }

    @Synchronized
    fun registrarAceiteNoResumo(ctx: Context, valor: Long, lucro: Long) {
        val p = prefs(ctx)
        resumoDoDia(p)?.commit()
        p.edit()
            .putInt(RESUMO_ACEITAS, p.getInt(RESUMO_ACEITAS, 0) + 1)
            .putLong(RESUMO_GANHO, p.getLong(RESUMO_GANHO, 0) + valor)
            .putLong(RESUMO_LUCRO, p.getLong(RESUMO_LUCRO, 0) + lucro)
            .apply()
    }

    fun resumoHoje(ctx: Context): Resumo {
        val p = prefs(ctx)
        if (p.getString(RESUMO_DIA, null) != hoje()) return Resumo(0, 0, 0, 0)
        return Resumo(p.getInt(RESUMO_OFERTAS, 0), p.getInt(RESUMO_ACEITAS, 0), p.getLong(RESUMO_GANHO, 0), p.getLong(RESUMO_LUCRO, 0))
    }

    fun perfil(ctx: Context): PerfilCusto = perfilDeJson(prefs(ctx).getString(PERFIL, null)?.let { runCatching { JSONObject(it) }.getOrNull() })

    fun criterios(ctx: Context): Criterios = criteriosDeJson(prefs(ctx).getString(CRITERIOS, null)?.let { runCatching { JSONObject(it) }.getOrNull() })

    fun segundosCartao(ctx: Context): Int = preferencias(ctx).segundosCartao

    fun configurado(ctx: Context): Boolean = prefs(ctx).contains(PERFIL)

    // ---------- estado ----------

    fun ligado(ctx: Context): Boolean = prefs(ctx).getBoolean(LIGADO, false)

    fun definirLigado(ctx: Context, ligado: Boolean) = prefs(ctx).edit().putBoolean(LIGADO, ligado).apply()

    /** Pausado: a bolha fica, mas o leitor não lê nada. */
    fun pausado(ctx: Context): Boolean = prefs(ctx).getBoolean(PAUSADO, false)

    fun definirPausado(ctx: Context, pausado: Boolean) = prefs(ctx).edit().putBoolean(PAUSADO, pausado).apply()

    fun diagnostico(ctx: Context): Boolean = prefs(ctx).getBoolean(DIAGNOSTICO, false)

    fun definirDiagnostico(ctx: Context, ligado: Boolean) = prefs(ctx).edit().putBoolean(DIAGNOSTICO, ligado).apply()

    /** Posição vertical do cartão para cada app (o motorista arrasta e fica lembrado). */
    fun cartaoY(ctx: Context, app: String): Int? = prefs(ctx).let { p -> if (p.contains(CARTAO_Y + app)) p.getInt(CARTAO_Y + app, 0) else null }

    fun salvarCartaoY(ctx: Context, app: String, y: Int) = prefs(ctx).edit().putInt(CARTAO_Y + app, y).apply()

    fun posicaoBolha(ctx: Context): Pair<Int, Int>? {
        val p = prefs(ctx)
        return if (p.contains(BOLHA_X)) Pair(p.getInt(BOLHA_X, 0), p.getInt(BOLHA_Y, 0)) else null
    }

    fun salvarPosicaoBolha(ctx: Context, x: Int, y: Int) = prefs(ctx).edit().putInt(BOLHA_X, x).putInt(BOLHA_Y, y).apply()

    fun marcarPedidoAcessibilidade(ctx: Context) = prefs(ctx).edit().putLong(PEDIDO_ACESSIBILIDADE, System.currentTimeMillis()).apply()

    /** Momento (ms) em que o app pediu para ligar o leitor; 0 se não há pedido em aberto. */
    fun pedidoAcessibilidadeEm(ctx: Context): Long = prefs(ctx).getLong(PEDIDO_ACESSIBILIDADE, 0)

    fun limparPedidoAcessibilidade(ctx: Context) = prefs(ctx).edit().remove(PEDIDO_ACESSIBILIDADE).apply()

    // ---------- último erro (aparece em Ajuda e diagnóstico) ----------

    private const val ULTIMO_ERRO = "ultimo_erro"

    fun registrarErro(ctx: Context, texto: String) =
        prefs(ctx).edit().putString(ULTIMO_ERRO, "${isoDe(System.currentTimeMillis())} $texto").apply()

    fun ultimoErro(ctx: Context): String? = prefs(ctx).getString(ULTIMO_ERRO, null)

    // ---------- lugares que outros motoristas evitam ----------

    fun salvarComunidade(ctx: Context, arr: JSONArray) =
        prefs(ctx).edit().putString(COMUNIDADE, Comunidade.paraJson(Comunidade.deJson(arr)).toString()).apply()

    fun comunidade(ctx: Context): List<Comunidade.Lugar> =
        Comunidade.deJson(prefs(ctx).getString(COMUNIDADE, null)?.let { runCatching { JSONArray(it) }.getOrNull() })

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
    fun atualizarSuaOferta(ctx: Context, id: String, suaOferta: Long) {
        var mudou = false
        // Contraproposta nova: ela passa a ser o valor (o final corrigido antes deixa de valer).
        val nova = corridas(ctx).map { if (it.id == id) it.copy(suaOferta = suaOferta, valorFinal = null).also { mudou = true } else it }
        if (mudou) gravar(ctx, nova)
    }

    /** Lápis do cartão: valor com que o motorista aceitou / vai aceitar (centavos). */
    @Synchronized
    fun atualizarValorFinal(ctx: Context, id: String, valorFinal: Long) {
        var mudou = false
        val nova = corridas(ctx).map { if (it.id == id) it.copy(valorFinal = valorFinal).also { mudou = true } else it }
        if (mudou) gravar(ctx, nova)
    }

    /** A volta chegou depois do cartão: atualiza a corrida (a régua pode ter mudado o sinal e o lucro). */
    @Synchronized
    fun atualizarVolta(ctx: Context, id: String, kmVolta: Double, custoVolta: Long, a: Avaliacao) {
        var mudou = false
        val nova = corridas(ctx).map {
            if (it.id == id) {
                mudou = true
                it.copy(kmVolta = kmVolta, custoVolta = custoVolta, sinal = a.sinal.codigo, porKm = a.porKm, porHora = a.porHora, lucro = a.lucro)
            } else {
                it
            }
        }
        if (mudou) gravar(ctx, nova)
    }

    @Synchronized
    fun atualizarDecisao(ctx: Context, id: String, decisao: String, origem: String, valorFinal: Long? = null): CorridaAvaliada? {
        var achada: CorridaAvaliada? = null
        val nova = corridas(ctx).map {
            if (it.id == id) it.copy(decisao = decisao, decisaoOrigem = origem, valorFinal = valorFinal ?: it.valorFinal).also { c -> achada = c } else it
        }
        if (achada != null) gravar(ctx, nova)
        return achada
    }

    /** Corridas acompanhadas até o fim (km e tempo medidos), esperando o envio. JSON pronto para o app web. */
    @Synchronized
    fun finalizadas(ctx: Context): JSONArray = runCatching { JSONArray(prefs(ctx).getString(FINALIZADAS, "[]")) }.getOrDefault(JSONArray())

    @Synchronized
    fun adicionarFinalizada(ctx: Context, t: Trajeto, fimMs: Long, status: String) {
        val arr = finalizadas(ctx)
        arr.put(
            JSONObject()
                .put("id", t.corridaId)
                // Sem GPS na corrida: não grava km (o servidor mostra só o tempo).
                .put("metros", if (t.leituras < Trajeto.MINIMO_LEITURAS) 0 else jsRound(t.metros))
                .put("minutos", jsRound(t.minutos(fimMs)))
                .put("inicio", isoDe(t.inicioMs))
                .put("fim", isoDe(fimMs))
                .put("status", status),
        )
        val ultimas = JSONArray()
        for (i in maxOf(0, arr.length() - MAXIMO_FILA) until arr.length()) ultimas.put(arr.get(i))
        prefs(ctx).edit().putString(FINALIZADAS, ultimas.toString()).apply()
    }

    @Synchronized
    fun confirmarFinalizadas(ctx: Context, ids: Set<String>) {
        val arr = finalizadas(ctx)
        val sobra = JSONArray()
        for (i in 0 until arr.length()) arr.optJSONObject(i)?.takeIf { it.optString("id") !in ids }?.let { sobra.put(it) }
        prefs(ctx).edit().putString(FINALIZADAS, sobra.toString()).apply()
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

    /** Igual ao normalizarCriterios do TS (ver NormalizarCriterios em Preferencias.kt). */
    fun criteriosDeJson(o: JSONObject?): Criterios = NormalizarCriterios.deJson(o)

    /** Agora em ISO 8601 UTC ("2026-10-26T23:10:05.123Z"); dá para comparar como texto. */
    fun agoraIso(): String = isoDe(System.currentTimeMillis())

    fun isoDe(epochMs: Long): String {
        val f = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US)
        f.timeZone = TimeZone.getTimeZone("UTC")
        return f.format(Date(epochMs))
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
    val nome: String? = null,
    val nota: Double? = null,
    /** PIX | Dinheiro | Cartão */
    val pagamento: String? = null,
    /** Endereço de destino como o app mostrou. */
    val destino: String? = null,
    /** O app avisou que a região é perigosa. */
    val risco: Boolean = false,
    /** inDrive: tarifa que o motorista ofereceu (centavos). */
    val suaOferta: Long? = null,
    /** Volta do destino até a base (km), quando calculada. */
    val kmVolta: Double? = null,
    /** Custo da volta (centavos), quando calculada. */
    val custoVolta: Long? = null,
    /** Paradas no meio do caminho. */
    val paradas: Int = 0,
    /** Nome da faixa de horário da régua (ex.: "Madrugada"), ou null. */
    val faixa: String? = null,
    /** Valor com que o motorista aceitou (centavos): o corrigido, a sua oferta ou o da oferta. null = sem valor final. */
    val valorFinal: Long? = null,
    /** Como a decisão foi tomada: toque | pergunta | automatica (null = sem decisão). */
    val decisaoOrigem: String? = null,
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
        put("nome", nome ?: JSONObject.NULL)
        put("nota", nota ?: JSONObject.NULL)
        put("pagamento", pagamento ?: JSONObject.NULL)
        put("destino", destino ?: JSONObject.NULL)
        put("risco", risco)
        put("suaOferta", suaOferta ?: JSONObject.NULL)
        put("kmVolta", kmVolta ?: JSONObject.NULL)
        put("custoVolta", custoVolta ?: JSONObject.NULL)
        put("paradas", paradas)
        put("faixa", faixa ?: JSONObject.NULL)
        put("valorFinal", valorFinal ?: JSONObject.NULL)
        put("decisaoOrigem", decisaoOrigem ?: JSONObject.NULL)
    }

    companion object {
        const val ACEITEI = "aceitei"
        const val RECUSEI = "recusei"
        const val SEM_RESPOSTA = "sem_resposta"

        private fun JSONObject.duploOuNulo(chave: String): Double? = if (isNull(chave)) null else optDouble(chave, Double.NaN).takeUnless { it.isNaN() }

        fun nova(o: OfertaDetalhada, a: Avaliacao, origem: String, app: String?, faixa: String? = null, custoVolta: Long? = null) = CorridaAvaliada(
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
            nome = o.nome?.take(60),
            nota = o.nota,
            pagamento = o.pagamento,
            destino = o.destino?.take(160),
            risco = o.risco,
            suaOferta = o.suaOferta,
            kmVolta = o.kmVolta,
            custoVolta = custoVolta,
            paradas = o.paradas,
            faixa = faixa,
            valorFinal = o.valorFinal,
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
                nome = if (o.isNull("nome")) null else o.optString("nome").takeIf { it.isNotEmpty() },
                nota = if (o.isNull("nota")) null else o.duploOuNulo("nota"),
                pagamento = if (o.isNull("pagamento")) null else o.optString("pagamento").takeIf { it.isNotEmpty() },
                destino = if (o.isNull("destino")) null else o.optString("destino").takeIf { it.isNotEmpty() },
                risco = o.optBoolean("risco", false),
                suaOferta = if (o.isNull("suaOferta") || !o.has("suaOferta")) null else o.optLong("suaOferta"),
                kmVolta = if (o.isNull("kmVolta") || !o.has("kmVolta")) null else o.duploOuNulo("kmVolta"),
                custoVolta = if (o.isNull("custoVolta") || !o.has("custoVolta")) null else o.optLong("custoVolta"),
                paradas = o.optInt("paradas", 0),
                faixa = if (o.isNull("faixa") || !o.has("faixa")) null else o.optString("faixa").takeIf { it.isNotEmpty() },
                valorFinal = if (o.isNull("valorFinal") || !o.has("valorFinal")) null else o.optLong("valorFinal"),
                decisaoOrigem = if (o.isNull("decisaoOrigem") || !o.has("decisaoOrigem")) null else o.optString("decisaoOrigem").takeIf { it.isNotEmpty() },
            )
        }.getOrNull()
    }
}
