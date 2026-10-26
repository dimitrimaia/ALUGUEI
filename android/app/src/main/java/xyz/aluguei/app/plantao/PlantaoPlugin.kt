package xyz.aluguei.app.plantao

import android.Manifest
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.PermissionState
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.getcapacitor.annotation.Permission
import com.getcapacitor.annotation.PermissionCallback
import org.json.JSONObject

/**
 * Plugin "Plantao": a ponte entre a tela web do Aluguei e as peças nativas
 * (BolhaService, LeitorCorridasService, Armazenamento). A interface para o
 * JavaScript está descrita em docs/app-nativo.md.
 */
@CapacitorPlugin(
    name = "Plantao",
    permissions = [Permission(alias = "notificacoes", strings = [Manifest.permission.POST_NOTIFICATIONS])],
)
class PlantaoPlugin : Plugin() {

    companion object {
        /** Plugin da WebView aberta agora (null se o app está fechado). */
        @Volatile
        private var ativo: PlantaoPlugin? = null

        private const val INTERVALO_MS = 400L
        private const val LIMITE_MS = 120_000L

        fun emitirOferta(c: CorridaAvaliada, a: Avaliacao) {
            val p = ativo ?: return
            val dados = JSObject.fromJSONObject(c.paraJson()).apply {
                put("kmTotal", a.kmTotal)
                put("minutosTotal", a.minutosTotal)
                put("tempoEstimado", a.tempoEstimado)
                put("custo", a.custo)
                put("lucroPorHora", a.lucroPorHora)
                put("motivos", JSArray(a.motivos))
            }
            p.emitir("oferta", dados)
        }

        fun emitirDecisao(id: String, decisao: String) {
            ativo?.emitir("decisao", JSObject().put("id", id).put("decisao", decisao))
        }

        fun emitirPermissao(tipo: String, concedida: Boolean) {
            // retainUntilConsumed: se a tela ainda não estiver ouvindo, o evento espera por ela.
            ativo?.emitir("permissao", JSObject().put("tipo", tipo).put("concedida", concedida), true)
        }

        fun emitirEstado(ctx: Context) {
            val p = ativo ?: return
            p.emitir("estado", p.estadoAtual(ctx))
        }
    }

    private val principal = Handler(Looper.getMainLooper())

    /** Um verificador por tipo de permissão (Handler a cada 400 ms, por até 2 min). */
    private val verificadores = mutableMapOf<String, Runnable>()

    /** notifyListeners é protegido no Capacitor; o companion usa este atalho. */
    internal fun emitir(evento: String, dados: JSObject, reterAteOuvir: Boolean = false) = notifyListeners(evento, dados, reterAteOuvir)

    override fun load() {
        ativo = this
    }

    override fun handleOnDestroy() {
        verificadores.values.forEach { principal.removeCallbacks(it) }
        verificadores.clear()
        if (ativo === this) ativo = null
        super.handleOnDestroy()
    }

    private val ctx: Context get() = context.applicationContext

    fun estadoAtual(c: Context): JSObject = JSObject().apply {
        put("android", true)
        put("sobreposicao", Permissoes.sobreposicao(c))
        put("acessibilidade", Permissoes.acessibilidade(c))
        put("notificacoes", Permissoes.notificacoes(c))
        put("semOtimizacaoBateria", Permissoes.semOtimizacaoBateria(c))
        put("ligado", Armazenamento.ligado(c) && BolhaService.instancia != null)
        put("configurado", Armazenamento.configurado(c))
        put("corridasPendentes", Armazenamento.corridas(c).size)
    }

    // ------------------------------------------------------------------ estado e configuração

    @PluginMethod
    fun estado(call: PluginCall) {
        call.resolve(estadoAtual(ctx))
    }

    @PluginMethod
    fun configurar(call: PluginCall) {
        val perfil: JSONObject? = call.getObject("perfil")
        val criterios: JSONObject? = call.getObject("criterios")
        val segundos = call.getInt("segundosCartao")
        Armazenamento.salvarConfiguracao(ctx, perfil, criterios, segundos)
        call.resolve(estadoAtual(ctx))
    }

    // ------------------------------------------------------------------ permissões (com volta automática)

    @PluginMethod
    fun pedirSobreposicao(call: PluginCall) = pedir(call, Permissoes.SOBREPOSICAO)

    @PluginMethod
    fun pedirAcessibilidade(call: PluginCall) {
        if (!Permissoes.acessibilidade(ctx)) Armazenamento.marcarPedidoAcessibilidade(ctx)
        pedir(call, Permissoes.ACESSIBILIDADE)
    }

    @PluginMethod
    fun pedirSemOtimizacaoBateria(call: PluginCall) = pedir(call, Permissoes.BATERIA)

    @PluginMethod
    fun pedirNotificacoes(call: PluginCall) {
        if (Permissoes.notificacoes(ctx)) {
            call.resolve(JSObject().put("tipo", Permissoes.NOTIFICACOES).put("concedida", true).put("aberto", false))
            return
        }
        // Android 13+: primeiro a caixa de diálogo do sistema; se negar, abre as configurações.
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU && getPermissionState("notificacoes") != PermissionState.GRANTED) {
            requestPermissionForAlias("notificacoes", call, "aposPedirNotificacoes")
            return
        }
        pedir(call, Permissoes.NOTIFICACOES)
    }

    @PermissionCallback
    fun aposPedirNotificacoes(call: PluginCall) {
        if (Permissoes.notificacoes(ctx)) {
            emitirPermissao(Permissoes.NOTIFICACOES, true)
            call.resolve(JSObject().put("tipo", Permissoes.NOTIFICACOES).put("concedida", true).put("aberto", false))
        } else {
            pedir(call, Permissoes.NOTIFICACOES)
        }
    }

    /**
     * Abre a tela de configurações da permissão e resolve na hora com
     * { tipo, concedida, aberto }. Depois, um verificador confere a cada 400 ms
     * (por até 2 min); quando a permissão é dada, traz o Aluguei para a frente e
     * emite o evento "permissao" { tipo, concedida: true }.
     */
    private fun pedir(call: PluginCall, tipo: String) {
        if (Permissoes.concedida(ctx, tipo)) {
            call.resolve(JSObject().put("tipo", tipo).put("concedida", true).put("aberto", false))
            return
        }
        val aberto = Permissoes.abrirConfiguracoes(ctx, tipo)
        if (aberto) vigiar(tipo)
        call.resolve(JSObject().put("tipo", tipo).put("concedida", false).put("aberto", aberto))
    }

    private fun vigiar(tipo: String) {
        verificadores.remove(tipo)?.let { principal.removeCallbacks(it) }
        val inicio = SystemClock.elapsedRealtime()
        val verificador = object : Runnable {
            override fun run() {
                if (Permissoes.concedida(ctx, tipo)) {
                    verificadores.remove(tipo)
                    if (tipo == Permissoes.ACESSIBILIDADE) Armazenamento.limparPedidoAcessibilidade(ctx)
                    Permissoes.trazerAppParaFrente(ctx)
                    emitirPermissao(tipo, true)
                } else if (SystemClock.elapsedRealtime() - inicio < LIMITE_MS) {
                    principal.postDelayed(this, INTERVALO_MS)
                } else {
                    verificadores.remove(tipo)
                }
            }
        }
        verificadores[tipo] = verificador
        principal.postDelayed(verificador, INTERVALO_MS)
    }

    // ------------------------------------------------------------------ ligar e desligar

    @PluginMethod
    fun ligar(call: PluginCall) {
        if (!Permissoes.sobreposicao(ctx)) {
            call.reject("Falta a permissão de aparecer por cima de outros apps.", "SEM_SOBREPOSICAO")
            return
        }
        Armazenamento.definirLigado(ctx, true)
        try {
            BolhaService.iniciar(ctx)
        } catch (e: RuntimeException) {
            Armazenamento.definirLigado(ctx, false)
            call.reject("O Android não deixou ligar o plantão agora. Abra o Aluguei e tente de novo.", "NAO_INICIOU", e)
            return
        }
        call.resolve(estadoAtual(ctx).put("ligado", true))
    }

    @PluginMethod
    fun desligar(call: PluginCall) {
        BolhaService.desligar(ctx)
        call.resolve(estadoAtual(ctx).put("ligado", false))
    }

    /** Mostra o cartão com uma oferta de teste (liga o plantão se precisar). */
    @PluginMethod
    fun simular(call: PluginCall) {
        val valor = call.getDouble("valor")?.let { jsRound(it) }
        val km = call.getDouble("kmCorrida")
        if (valor == null || valor <= 0 || km == null || km <= 0) {
            call.reject("Informe valor (centavos) e kmCorrida.", "DADOS_INVALIDOS")
            return
        }
        if (!Permissoes.sobreposicao(ctx)) {
            call.reject("Falta a permissão de aparecer por cima de outros apps.", "SEM_SOBREPOSICAO")
            return
        }
        val oferta = Oferta(
            valor = valor,
            kmCorrida = km,
            minutosCorrida = call.getDouble("minutosCorrida"),
            kmBusca = call.getDouble("kmBusca"),
            minutosBusca = call.getDouble("minutosBusca"),
        )
        val avaliacao = avaliarCorrida(oferta, taxas(Armazenamento.perfil(ctx)), Armazenamento.criterios(ctx))
        val rodando = BolhaService.instancia
        if (rodando != null) {
            rodando.receberOferta(oferta, "digitada", null)
        } else {
            Armazenamento.definirLigado(ctx, true)
            val intent = Intent(ctx, BolhaService::class.java).setAction(BolhaService.ACAO_SIMULAR)
                .putExtra(BolhaService.EXTRA_VALOR, oferta.valor)
                .putExtra(BolhaService.EXTRA_KM_CORRIDA, oferta.kmCorrida)
            oferta.minutosCorrida?.let { intent.putExtra(BolhaService.EXTRA_MINUTOS_CORRIDA, it) }
            oferta.kmBusca?.let { intent.putExtra(BolhaService.EXTRA_KM_BUSCA, it) }
            oferta.minutosBusca?.let { intent.putExtra(BolhaService.EXTRA_MINUTOS_BUSCA, it) }
            try {
                BolhaService.iniciar(ctx, intent)
            } catch (e: RuntimeException) {
                Armazenamento.definirLigado(ctx, false)
                call.reject("O Android não deixou ligar o plantão agora.", "NAO_INICIOU", e)
                return
            }
        }
        call.resolve(avaliacaoJson(avaliacao))
    }

    private fun avaliacaoJson(a: Avaliacao) = JSObject().apply {
        put("sinal", a.sinal.codigo)
        put("kmTotal", a.kmTotal)
        put("minutosTotal", a.minutosTotal)
        put("tempoEstimado", a.tempoEstimado)
        put("porKm", a.porKm)
        put("porHora", a.porHora)
        put("custo", a.custo)
        put("lucro", a.lucro)
        put("lucroPorHora", a.lucroPorHora)
        put("motivos", JSArray(a.motivos))
    }

    // ------------------------------------------------------------------ fila de corridas

    @PluginMethod
    fun corridasPendentes(call: PluginCall) {
        val arr = JSArray()
        Armazenamento.corridas(ctx).forEach { arr.put(it.paraJson()) }
        call.resolve(JSObject().put("corridas", arr))
    }

    /** Limpa as corridas já enviadas: as com momento <= `ate` e/ou as de `ids`. */
    @PluginMethod
    fun confirmarEnvio(call: PluginCall) {
        val ate = call.getString("ate")
        val ids = call.getArray("ids")?.let { arr -> (0 until arr.length()).mapNotNull { arr.optString(it).takeIf { s -> s.isNotEmpty() } }.toSet() } ?: emptySet()
        if (ate == null && ids.isEmpty()) {
            call.reject("Informe `ate` (momento ISO da última corrida enviada) ou `ids`.", "DADOS_INVALIDOS")
            return
        }
        val restantes = Armazenamento.confirmarEnvio(ctx, ate, ids)
        call.resolve(JSObject().put("corridasPendentes", restantes))
    }
}
