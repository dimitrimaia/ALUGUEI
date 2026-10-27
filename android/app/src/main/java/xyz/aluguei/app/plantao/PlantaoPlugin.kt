package xyz.aluguei.app.plantao

import android.Manifest
import android.app.AlertDialog
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
 * Plugin "Plantao" (o Copiloto): a ponte entre a tela web do Aluguei e as peças nativas
 * (BolhaService, LeitorCorridasService, Armazenamento). A interface para o
 * JavaScript está descrita em docs/app-nativo.md.
 */
@CapacitorPlugin(
    name = "Plantao",
    permissions = [
        Permission(alias = "notificacoes", strings = [Manifest.permission.POST_NOTIFICATIONS]),
        Permission(alias = "localizacao", strings = [Manifest.permission.ACCESS_COARSE_LOCATION, Manifest.permission.ACCESS_FINE_LOCATION]),
        Permission(alias = "camera", strings = [Manifest.permission.CAMERA]),
        Permission(alias = "microfone", strings = [Manifest.permission.RECORD_AUDIO]),
    ],
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
                put("destaques", JSArray(a.destaques))
            }
            p.emitir("oferta", dados)
        }

        fun emitirDecisao(id: String, decisao: String, origem: String? = null, valorFinal: Long? = null) {
            val d = JSObject().put("id", id).put("decisao", decisao)
            origem?.let { d.put("decisaoOrigem", it) }
            valorFinal?.let { d.put("valorFinal", it) }
            ativo?.emitir("decisao", d)
        }

        fun emitirPermissao(tipo: String, concedida: Boolean) {
            // retainUntilConsumed: se a tela ainda não estiver ouvindo, o evento espera por ela.
            ativo?.emitir("permissao", JSObject().put("tipo", tipo).put("concedida", concedida), true)
        }

        /** O motorista mudou a régua rápida na bolha (centavos). Também fica em reguaPendente(). */
        fun emitirRegua(minimoPorKm: Long, minimoPorHora: Long) {
            ativo?.emitir("regua", JSObject().put("minimoPorKm", minimoPorKm).put("minimoPorHora", minimoPorHora), true)
        }

        /** "Definir base aqui" no menu da bolha (o app web salva com um nome). Também fica guardada até a tela ouvir. */
        fun emitirBase(lat: Double, lon: Double) {
            ativo?.emitir("base", JSObject().put("lat", lat).put("lon", lon), true)
        }

        /** Preferência mudada na bolha ("Não perguntar mais"). */
        fun emitirPreferencia(perguntarAceite: Boolean) {
            ativo?.emitir("preferencia", JSObject().put("perguntarAceite", perguntarAceite), true)
        }

        /** Perfil de régua escolhido na bolha. Também fica em perfilPendente() até o app web salvar. */
        fun emitirPerfil(nome: String, criterios: JSONObject?) {
            ativo?.emitir("perfil", JSObject().put("nome", nome).put("criterios", criterios ?: JSONObject.NULL), true)
        }

        /** { gravando, desde (ISO ou null), arquivos, usadoMb } da câmera de segurança. */
        fun estadoCamera(c: Context): JSObject {
            val videos = Armazenamento.videos(c)
            val desde = CameraService.desde
            return JSObject().apply {
                put("gravando", CameraService.gravando)
                put("desde", desde?.let { Armazenamento.isoDe(it) } ?: JSONObject.NULL)
                put("arquivos", videos.size)
                put("usadoMb", Gravacoes.megas(videos.sumOf { it.bytes }))
            }
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
        put("pausado", Armazenamento.pausado(c))
        put("tema", Armazenamento.tema(c))
        put("vibrar", Armazenamento.vibrar(c))
        put("localizacao", Localizacao.permitida(c))
        put("dormindo", LeitorCorridasService.dormindo && Armazenamento.ligado(c) && BolhaService.instancia != null)
        put("camera", CameraService.permitidaCamera(c))
        put("microfone", CameraService.permitidoMicrofone(c))
        put("gravando", CameraService.gravando)
        // Print das ofertas precisa do Android 11+ (takeScreenshot).
        put("printDisponivel", LeitorCorridasService.printDisponivel)
        put("perfilAtivo", Armazenamento.perfilAtivo(c) ?: JSONObject.NULL)
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
        val tema = call.getString("tema")?.takeIf { it in Armazenamento.TEMAS }
        val vibrar = call.getBoolean("vibrar")
        // Formato de PreferenciasCopiloto (copiloto.ts); se vier, manda em segundosCartao e vibrar.
        val preferencias: JSONObject? = call.getObject("preferencias")
        Armazenamento.salvarConfiguracao(ctx, perfil, criterios, segundos, tema, vibrar, preferencias)
        BolhaService.instancia?.aplicarPreferencias()
        call.resolve(estadoAtual(ctx))
    }

    /** Lugares a evitar que o motorista adicionou pelo cartão ("Evitar este lugar"). */
    @PluginMethod
    fun lugaresAdicionados(call: PluginCall) {
        call.resolve(JSObject().put("lugares", JSArray(Armazenamento.lugaresAdicionados(ctx))))
    }

    @PluginMethod
    fun limparLugaresAdicionados(call: PluginCall) {
        Armazenamento.limparLugaresAdicionados(ctx)
        call.resolve(JSObject().put("lugares", JSArray()))
    }

    /** Régua mudada na bolha e ainda não salva na conta (centavos), ou null. */
    @PluginMethod
    fun reguaPendente(call: PluginCall) {
        val r = Armazenamento.reguaPendente(ctx)
        val regua: Any = if (r == null) JSONObject.NULL else JSObject().put("minimoPorKm", r.first).put("minimoPorHora", r.second)
        call.resolve(JSObject().put("regua", regua))
    }

    @PluginMethod
    fun limparReguaPendente(call: PluginCall) {
        Armazenamento.limparReguaPendente(ctx)
        call.resolve(JSObject().put("regua", JSONObject.NULL))
    }

    /** Perfil de régua escolhido na bolha e ainda não salvo na conta ({ nome, criterios }), ou null. */
    @PluginMethod
    fun perfilPendente(call: PluginCall) {
        val p: Any = Armazenamento.perfilPendente(ctx) ?: JSONObject.NULL
        call.resolve(JSObject().put("perfil", p))
    }

    @PluginMethod
    fun limparPerfilPendente(call: PluginCall) {
        Armazenamento.limparPerfilPendente(ctx)
        call.resolve(JSObject().put("perfil", JSONObject.NULL))
    }

    // ------------------------------------------------------------------ câmera de segurança

    /**
     * Câmera (obrigatória) e microfone (opcional: sem ele grava sem áudio). Primeiro a
     * caixa do sistema; negada de vez, abre as configurações do app e volta sozinho.
     */
    @PluginMethod
    fun pedirCamera(call: PluginCall) {
        if (CameraService.permitidaCamera(ctx) && CameraService.permitidoMicrofone(ctx)) {
            call.resolve(JSObject().put("tipo", Permissoes.CAMERA).put("concedida", true).put("aberto", false))
            return
        }
        requestPermissionForAliases(arrayOf("camera", "microfone"), call, "aposPedirCamera")
    }

    @PermissionCallback
    fun aposPedirCamera(call: PluginCall) {
        if (CameraService.permitidaCamera(ctx)) {
            emitirPermissao(Permissoes.CAMERA, true)
            call.resolve(JSObject().put("tipo", Permissoes.CAMERA).put("concedida", true).put("aberto", false).put("microfone", CameraService.permitidoMicrofone(ctx)))
            return
        }
        val deVez = activity?.let { a -> !a.shouldShowRequestPermissionRationale(Manifest.permission.CAMERA) } ?: false
        if (deVez) pedir(call, Permissoes.CAMERA) else call.resolve(JSObject().put("tipo", Permissoes.CAMERA).put("concedida", false).put("aberto", false))
    }

    /**
     * Começa a gravar. Só com o Aluguei visível (o Android 14 não deixa câmera em
     * primeiro plano começar do segundo plano); rejeita SEM_CAMERA / NAO_VISIVEL / NAO_INICIOU.
     */
    @PluginMethod
    fun cameraIniciar(call: PluginCall) {
        if (!CameraService.permitidaCamera(ctx)) {
            call.reject("Falta a permissão da câmera (use pedirCamera).", "SEM_CAMERA")
            return
        }
        val a = activity
        if (a == null || a.isFinishing) {
            call.reject("Abra o Aluguei para ligar a câmera.", "NAO_VISIVEL")
            return
        }
        try {
            CameraService.iniciar(ctx)
        } catch (e: RuntimeException) {
            call.reject("O Android não deixou ligar a câmera agora.", "NAO_INICIOU", e)
            return
        }
        // O serviço marca "gravando" ao entrar em primeiro plano; responde logo depois.
        principal.postDelayed({ call.resolve(estadoCamera(ctx)) }, 300)
    }

    @PluginMethod
    fun cameraParar(call: PluginCall) {
        CameraService.parar(ctx)
        principal.postDelayed({ call.resolve(estadoCamera(ctx).put("gravando", false)) }, 300)
    }

    @PluginMethod
    fun cameraEstado(call: PluginCall) {
        call.resolve(estadoCamera(ctx))
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

    /**
     * Localização (para a volta até a base e "Definir base aqui"): primeiro uma
     * explicação, depois a caixa do sistema; se o motorista já negou de vez,
     * abre as configurações do app e volta sozinho quando ele permitir.
     */
    @PluginMethod
    fun pedirLocalizacao(call: PluginCall) {
        if (Localizacao.permitida(ctx)) {
            call.resolve(JSObject().put("tipo", Permissoes.LOCALIZACAO).put("concedida", true).put("aberto", false))
            return
        }
        val atividade = activity
        if (atividade == null) {
            requestPermissionForAlias("localizacao", call, "aposPedirLocalizacao")
            return
        }
        atividade.runOnUiThread {
            try {
                var respondeu = false
                AlertDialog.Builder(atividade)
                    .setTitle("Usar a sua localização?")
                    .setMessage(
                        "O Copiloto usa a localização do celular só no momento da oferta, para calcular a volta do destino até a sua base " +
                            "e para “Definir base aqui”. O Aluguei não guarda o seu trajeto.",
                    )
                    .setPositiveButton("Continuar") { _, _ ->
                        respondeu = true
                        requestPermissionForAlias("localizacao", call, "aposPedirLocalizacao")
                    }
                    .setNegativeButton("Agora não") { _, _ ->
                        respondeu = true
                        call.resolve(JSObject().put("tipo", Permissoes.LOCALIZACAO).put("concedida", false).put("aberto", false))
                    }
                    .setOnDismissListener {
                        if (!respondeu) call.resolve(JSObject().put("tipo", Permissoes.LOCALIZACAO).put("concedida", false).put("aberto", false))
                    }
                    .show()
            } catch (e: RuntimeException) {
                requestPermissionForAlias("localizacao", call, "aposPedirLocalizacao")
            }
        }
    }

    @PermissionCallback
    fun aposPedirLocalizacao(call: PluginCall) {
        if (Localizacao.permitida(ctx)) {
            emitirPermissao(Permissoes.LOCALIZACAO, true)
            BolhaService.instancia?.localizacaoConcedida()
            call.resolve(JSObject().put("tipo", Permissoes.LOCALIZACAO).put("concedida", true).put("aberto", false))
            return
        }
        // Negada de vez ("não perguntar de novo"): só pelas configurações do app.
        val deVez = activity?.let { a ->
            !a.shouldShowRequestPermissionRationale(Manifest.permission.ACCESS_COARSE_LOCATION) &&
                !a.shouldShowRequestPermissionRationale(Manifest.permission.ACCESS_FINE_LOCATION)
        } ?: false
        if (deVez) {
            pedir(call, Permissoes.LOCALIZACAO)
        } else {
            call.resolve(JSObject().put("tipo", Permissoes.LOCALIZACAO).put("concedida", false).put("aberto", false))
        }
    }

    /** Posição atual para o app web salvar como base (com nome). Rejeita "SEM_LOCALIZACAO". */
    @PluginMethod
    fun definirBaseAqui(call: PluginCall) {
        if (!Localizacao.permitida(ctx)) {
            call.reject("Falta a permissão de localização (use pedirLocalizacao).", "SEM_LOCALIZACAO")
            return
        }
        Localizacao.atual(ctx) { p ->
            if (p == null) {
                call.reject("Não deu para pegar a localização agora.", "SEM_LOCALIZACAO")
            } else {
                Armazenamento.definirBaseLocal(ctx, p.lat, p.lon)
                call.resolve(JSObject().put("lat", p.lat).put("lon", p.lon))
            }
        }
    }

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
                    if (tipo == Permissoes.LOCALIZACAO) BolhaService.instancia?.localizacaoConcedida()
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
        // Ligar de novo começa lendo (pausa só vale enquanto a bolha está na tela).
        if (BolhaService.instancia == null) Armazenamento.definirPausado(ctx, false)
        Armazenamento.definirLigado(ctx, true)
        try {
            BolhaService.iniciar(ctx)
        } catch (e: RuntimeException) {
            Armazenamento.definirLigado(ctx, false)
            call.reject("O Android não deixou ligar o Copiloto agora. Abra o Aluguei e tente de novo.", "NAO_INICIOU", e)
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
        val agora = BolhaService.agoraBrasilia()
        val regua = criteriosNoHorario(Armazenamento.criterios(ctx), agora.get(java.util.Calendar.HOUR_OF_DAY) * 60 + agora.get(java.util.Calendar.MINUTE))
        val avaliacao = avaliarCorrida(oferta, taxas(Armazenamento.perfil(ctx)), regua.criterios)
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
                call.reject("O Android não deixou ligar o Copiloto agora.", "NAO_INICIOU", e)
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
        put("custoVolta", a.custoVolta)
        put("destaques", JSArray(a.destaques))
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
