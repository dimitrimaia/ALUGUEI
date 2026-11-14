package xyz.aluguei.app.plantao

import android.animation.ValueAnimator
import android.annotation.SuppressLint
import android.app.KeyguardManager
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.ActivityNotFoundException
import android.content.BroadcastReceiver
import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.ServiceInfo
import android.content.res.Configuration
import android.graphics.Color
import android.graphics.PixelFormat
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.location.LocationManager
import android.os.PowerManager
import android.os.SystemClock
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.text.Editable
import android.text.InputType
import android.text.TextUtils
import android.text.TextWatcher
import android.text.method.DigitsKeyListener
import android.util.TypedValue
import android.view.ContextThemeWrapper
import android.view.Gravity
import android.view.HapticFeedbackConstants
import android.view.KeyEvent
import android.view.MotionEvent
import android.view.View
import android.view.ViewConfiguration
import android.view.ViewGroup
import android.view.WindowInsets
import android.view.WindowManager
import android.view.animation.DecelerateInterpolator
import android.view.inputmethod.EditorInfo
import android.view.inputmethod.InputMethodManager
import android.widget.EditText
import android.widget.FrameLayout
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import androidx.core.app.NotificationCompat
import androidx.core.app.ServiceCompat
import androidx.core.content.ContextCompat
import xyz.aluguei.app.MainActivity
import xyz.aluguei.app.R
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Calendar
import java.util.Locale
import java.util.TimeZone
import kotlin.math.abs
import kotlin.math.hypot
import kotlin.math.min

/**
 * Serviço em primeiro plano do Copiloto: a única peça que trabalha durante a
 * jornada (a WebView pode estar fechada). Desenha por cima do app de corrida:
 *  - a bolha com o símbolo do Aluguei (toque = digitar oferta; segurar = menu;
 *    arrastar até o X = desliga);
 *  - o cartão da oferta (sinal, campos escolhidos nas preferências, volta para a
 *    base, selos, contraproposta sugerida), com voz e bip opcionais;
 *  - o mini cartão "Você aceitou?" (Sim / Não / Fiz com outro valor) e o
 *    "Copiar mensagem" para o passageiro;
 *  - com a tela bloqueada (a janela sobreposta não aparece sobre o bloqueio),
 *    a oferta vai numa notificação heads-up do canal "Ofertas";
 *  - painéis: digitação rápida, régua rápida e resumo do dia.
 *
 * Nunca toca no app de corrida: "Aceitei" e "Recusei" só registram a decisão
 * do motorista na fila local. O aceite automático ([Aceite]) só lê a tela de
 * corrida em andamento. Nada roda em loop: tudo reage a eventos.
 */
class BolhaService : Service() {

    companion object {
        const val ACAO_DESLIGAR = "xyz.aluguei.app.plantao.DESLIGAR"
        const val ACAO_SIMULAR = "xyz.aluguei.app.plantao.SIMULAR"
        const val ACAO_PAUSAR = "xyz.aluguei.app.plantao.PAUSAR"
        const val EXTRA_VALOR = "valor"
        const val EXTRA_KM_CORRIDA = "kmCorrida"
        const val EXTRA_MINUTOS_CORRIDA = "minutosCorrida"
        const val EXTRA_KM_BUSCA = "kmBusca"
        const val EXTRA_MINUTOS_BUSCA = "minutosBusca"

        private const val CANAL = "plantao"
        private const val ID_NOTIFICACAO = 4021
        /** Canal das ofertas com a tela bloqueada (heads-up, visível no bloqueio). */
        private const val CANAL_OFERTAS = "ofertas"
        private const val ID_NOTIFICACAO_OFERTA = 4022

        private const val MARCA = 0xFF1F56E8.toInt()
        private const val VERDE = 0xFF16A34A.toInt()
        private const val AMARELO = 0xFFD97706.toInt()
        private const val VERMELHO = 0xFFDC2626.toInt()
        private const val LENDO = 0xFF22C55E.toInt()
        private const val PAUSADO = 0xFF9CA3AF.toInt()
        private const val BRANCO = Color.WHITE

        /** Cartão de oferta lida no inDrive fica até a oferta sair da tela (com este teto). */
        private const val CARTAO_INDRIVE_MS = 60_000L
        private const val JANELA_REPETICAO_MS = 20_000L
        /** Mini cartão ("Você aceitou?", "Copiar mensagem") fica este tempo. */
        private const val MINI_MS = 8_000L
        /** inDrive: tela sem oferta por este tempo = a oferta sumiu. */
        private const val SUMICO_MS = 1_500L
        /** Cronômetro esquecido aberto: fecha sozinho. */
        private const val DURACAO_MAXIMA_CORRIDA_MS = 2 * 60 * 60_000L
        /** Apps em que a tela de corrida em andamento / concluída marca a oferta sozinha. */
        private val APPS_ACEITE_AUTOMATICO = setOf("indrive", "uber", "99")
        private const val FUSO = "America/Sao_Paulo"
        /** Posição (y) salva das peças do estilo "bordas". */
        private const val CHAVE_BORDAS = "bordas"

        /** Agora no fuso de Brasília. */
        fun agoraBrasilia(): Calendar = Calendar.getInstance(TimeZone.getTimeZone(FUSO))

        /** O serviço rodando agora (mesmo processo), para o leitor e o plugin entregarem ofertas. */
        @Volatile
        var instancia: BolhaService? = null
            private set

        fun iniciar(ctx: Context, intent: Intent? = null) {
            ContextCompat.startForegroundService(ctx, intent ?: Intent(ctx, BolhaService::class.java))
        }

        /** Desliga o Copiloto (pela tela, pela notificação, pelo menu ou arrastando a bolha até o X). */
        fun desligar(ctx: Context) {
            Armazenamento.definirLigado(ctx, false)
            ctx.stopService(Intent(ctx, BolhaService::class.java))
            PlantaoPlugin.emitirEstado(ctx)
        }

        fun nomeDoApp(app: String?): String = when (app) {
            "indrive" -> "inDrive"
            "uber" -> "Uber"
            "99" -> "99"
            "37city" -> "37 City"
            null -> "Digitada"
            else -> "Outro app"
        }
    }

    private lateinit var wm: WindowManager
    private lateinit var ui: Context
    private val principal = Handler(Looper.getMainLooper())

    // bolha
    private var bolha: FrameLayout? = null
    private var bolhaParams: WindowManager.LayoutParams? = null
    private var pontoStatus: View? = null
    private var alvoX: TextView? = null
    private var rotuloDiag: TextView? = null
    private var rotuloParams: WindowManager.LayoutParams? = null

    // janelas avulsas
    private var menu: View? = null
    private var painel: View? = null
    private var flutuante: View? = null
    private var aoFecharFlutuante: (() -> Unit)? = null

    // cartão
    private var cartao: View? = null
    private var cartaoParams: WindowManager.LayoutParams? = null
    private var cartaoApp: String = "outra"
    private var cartaoOrigem: String = "digitada"
    private var cartaoCorrida: CorridaAvaliada? = null
    private var cartaoOferta: OfertaDetalhada? = null
    private var cartaoVolta: EstadoVolta = EstadoVolta.Nenhuma
    private var cartaoFaixa: String? = null
    /** O cartão na tela é o das bordas (estilo "bordas" ainda não expandido). */
    private var cartaoEmBordas = false
    /** Estilo "bordas": o motorista tocou e o cartão completo está aberto (volta às bordas na próxima oferta). */
    private var cartaoExpandido = false
    /** Para o leitor ler rápido enquanto há cartão na tela. */
    fun temCartaoAberto(): Boolean = cartao != null

    /**
     * Onde estão as janelas do próprio Aluguei na tela (bolha, cartão e caixinhas).
     * A leitura pela imagem da tela apaga essas áreas: senão o nosso cartão, por cima
     * da Uber, era lido como a oferta e escondia as ofertas seguintes.
     */
    fun areasProprias(): List<android.graphics.Rect> = (janelasCartao + listOfNotNull(bolha))
        .filter { it.isAttachedToWindow && it.isShown && it.width > 0 }
        .map { v ->
            val p = IntArray(2)
            v.getLocationOnScreen(p)
            android.graphics.Rect(p[0], p[1], p[0] + v.width, p[1] + v.height)
        }

    /** Toda janela de cartão posta na tela: nenhuma fica órfã (erro no meio do redesenho, animação). */
    private val janelasCartao = mutableSetOf<View>()

    private fun removerCartoesMenos(manter: View?) {
        janelasCartao.filter { it !== manter }.forEach { remover(it) }
        janelasCartao.retainAll { it === manter }
    }

    /**
     * Cronômetro da corrida aceita (só o tempo, sem GPS: não gasta bateria). A
     * pílula no topo mostra os minutos e os atalhos para o embarque e o destino.
     */
    private var corridaDesde: Long? = null
    private var corridaEmbarque: String? = null
    private var corridaDestino: String? = null
    private var pilulaCorrida: View? = null
    /** Valor, lucro e km da corrida aceita, para os detalhes da pílula. */
    private var corridaResumo: String? = null
    private var pilulaAberta = false
    private var textoCorrida: TextView? = null
    private val tiqueCorrida = object : Runnable {
        override fun run() {
            val desde = corridaDesde ?: return
            if (SystemClock.elapsedRealtime() - desde > DURACAO_MAXIMA_CORRIDA_MS) {
                fecharCronometro()
                return
            }
            atualizarCronometro()
            principal.postDelayed(this, 30_000)
        }
    }

    /** Cartão completo aberto no "▾ Detalhes" (cada oferta nova começa no resumo). */
    private var cartaoDetalhes = false
    /** O cartão foi fechado no ✕ ou arrastado para o lado (não pergunta "Você aceitou?"). */
    private var cartaoDispensado = false
    private val fecharCartaoNoTempo: Runnable = object : Runnable {
        override fun run() {
            // Não fecha no meio da digitação do lápis: espera ela acabar.
            if (campoValor != null) principal.postDelayed(this, 2_000) else ofertaSumiu()
        }
    }

    // mini cartão
    private var mini: View? = null
    /** Corrida da pergunta "Você aceitou?" aberta no mini cartão (o aceite automático fecha). */
    private var perguntaId: String? = null

    /** Última oferta registrada (id e quando), para a tela "corrida concluída" marcar como feita. */
    private var ultimaSemResposta: Pair<String, Long>? = null
    /** Campo "valor final" (lápis do cartão ou "Fiz com outro valor"). */
    private var campoValor: View? = null
    private val fecharMiniNoTempo = Runnable { fecharMini() }

    // voz, bip e volta
    private var avisos: Avisos? = null
    private var calculadoraVolta: CalculadoraVolta? = null
    /** Última vez (elapsedRealtime) que o leitor viu a oferta aberta (para saber quando ela sumiu). */
    private var ofertaVistaEm = 0L
    private var circuloBolha: View? = null
    private var sombraBolha: View? = null
    /** Escala do texto enquanto monta o cartão (preferencias.tamanhoFonte). */
    private var escalaTexto = 1f

    // estado da leitura
    /** Última oferta aberta lida (para a contraproposta do inDrive). */
    private var ofertaAberta: OfertaDetalhada? = null
    private var ofertaAbertaId: String? = null
    private var chaveAberta: String? = null
    /** Chave da oferta que o motorista recusou enquanto ela está aberta. */
    private var recusada: String? = null
    private var ultimaChave: String? = null
    private var ultimaEm = 0L

    /**
     * Última oferta do inDrive ainda sem resposta, para o aceite automático: se a
     * tela de corrida em andamento aparecer em até [Aceite.JANELA_MS] depois de
     * `vistaEm` (última vez que a oferta ou a contraproposta foi vista), a corrida
     * conta como aceita.
     */
    private data class AceitePendente(val id: String, val oferta: OfertaDetalhada, val vistaEm: Long)
    private var aceitePendente: AceitePendente? = null

    /** Corrida que está na notificação heads-up (tela bloqueada), ou null. */
    private var notificadaId: String? = null

    /** Desbloqueou: o cartão (que já estava por baixo do bloqueio) aparece; a notificação sai. */
    private val desbloqueio = object : BroadcastReceiver() {
        override fun onReceive(ctx: Context?, intent: Intent?) {
            if (intent?.action == Intent.ACTION_USER_PRESENT) principal.post { if (cartao != null) cancelarNotificacaoOferta() }
        }
    }
    private var desbloqueioRegistrado = false

    // notificação
    private var ultimaOferta: OfertaDetalhada? = null
    private var ultimaAvaliacao: Avaliacao? = null

    /** O Android recusou o primeiro plano ou falta a sobreposição: o serviço só espera para parar. */
    private var semCondicoes = false

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        instancia = this
        wm = getSystemService(Context.WINDOW_SERVICE) as WindowManager
        ui = ContextThemeWrapper(this, android.R.style.Theme_DeviceDefault)
        criarCanal()
        try {
            entrarEmPrimeiroPlano()
        } catch (e: RuntimeException) {
            // O Android recusou o serviço em primeiro plano (ex.: reinício em segundo plano). Fica desligado.
            semCondicoes = true
            Armazenamento.definirLigado(this, false)
            stopSelf()
            return
        }
        if (!Permissoes.sobreposicao(this)) {
            semCondicoes = true
            Armazenamento.definirLigado(this, false)
            stopSelf()
            return
        }
        try {
            mostrarBolha()
            if (Armazenamento.diagnostico(this)) mostrarRotuloDiag()
        } catch (e: RuntimeException) {
            semCondicoes = true
            Armazenamento.definirLigado(this, false)
            stopSelf()
            return
        }
        avisos = Avisos(this).also { it.aplicar(Armazenamento.preferencias(this).voz) }
        calculadoraVolta = CalculadoraVolta()
        try {
            val filtro = IntentFilter(Intent.ACTION_USER_PRESENT)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) registerReceiver(desbloqueio, filtro, Context.RECEIVER_NOT_EXPORTED) else registerReceiver(desbloqueio, filtro)
            desbloqueioRegistrado = true
        } catch (e: RuntimeException) {
            // sem aviso de desbloqueio: a notificação sai sozinha quando a oferta acabar
        }
    }

    private fun tiposPrimeiroPlano(comLocalizacao: Boolean): Int {
        var tipos = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE else 0
        if (comLocalizacao && Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) tipos = tipos or ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION
        return tipos
    }

    /**
     * Primeiro plano "specialUse" e, com a permissão de localização, também
     * "location" (o Android só entrega a posição a serviço em primeiro plano desse
     * tipo). Se o Android recusar o tipo localização (ex.: reinício em segundo
     * plano), fica só com o specialUse e a volta usa a base salva.
     */
    private fun entrarEmPrimeiroPlano() {
        if (Localizacao.permitida(this)) {
            try {
                ServiceCompat.startForeground(this, ID_NOTIFICACAO, notificacao(), tiposPrimeiroPlano(true))
                return
            } catch (e: RuntimeException) {
                // segue sem o tipo localização
            }
        }
        ServiceCompat.startForeground(this, ID_NOTIFICACAO, notificacao(), tiposPrimeiroPlano(false))
    }

    /** A permissão de localização acabou de ser dada (com o Aluguei na frente): ganha o tipo localização. */
    fun localizacaoConcedida() {
        if (Looper.myLooper() != Looper.getMainLooper()) {
            principal.post { localizacaoConcedida() }
            return
        }
        try {
            ServiceCompat.startForeground(this, ID_NOTIFICACAO, notificacao(), tiposPrimeiroPlano(true))
        } catch (e: RuntimeException) {
            // fica como estava
        }
    }

    /** O app web mandou preferências novas (configurar). */
    fun aplicarPreferencias() {
        if (Looper.myLooper() != Looper.getMainLooper()) {
            principal.post { aplicarPreferencias() }
            return
        }
        val p = Armazenamento.preferencias(this)
        circuloBolha?.alpha = p.opacidadeBolha / 100f
        sombraBolha?.alpha = p.opacidadeBolha / 100f
        avisos?.aplicar(p.voz)
        redesenharCartao()
    }

    /** O leitor dormiu (inDrive offline) ou acordou. */
    fun dormindoMudou(dormindo: Boolean) {
        if (Looper.myLooper() != Looper.getMainLooper()) {
            principal.post { dormindoMudou(dormindo) }
            return
        }
        if (Armazenamento.pausado(this)) return
        rotuloDiag?.text = if (dormindo) "inDrive: dormindo (offline)" else "inDrive: acordou · esperando oferta"
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (semCondicoes) return START_NOT_STICKY
        when (intent?.action) {
            ACAO_DESLIGAR -> {
                desligar(this)
                return START_NOT_STICKY
            }
            ACAO_PAUSAR -> alternarPausa()
            ACAO_SIMULAR -> {
                val oferta = Oferta(
                    valor = intent.getLongExtra(EXTRA_VALOR, 0),
                    kmCorrida = intent.getDoubleExtra(EXTRA_KM_CORRIDA, 0.0),
                    minutosCorrida = intent.extraOuNulo(EXTRA_MINUTOS_CORRIDA),
                    kmBusca = intent.extraOuNulo(EXTRA_KM_BUSCA),
                    minutosBusca = intent.extraOuNulo(EXTRA_MINUTOS_BUSCA),
                )
                if (oferta.valor > 0 && oferta.kmCorrida > 0) receberOferta(oferta, "digitada", null)
            }
        }
        // Reiniciado pelo sistema (intent nulo) com o Copiloto desligado: não volta.
        if (!Armazenamento.ligado(this)) {
            stopSelf()
            return START_NOT_STICKY
        }
        return START_STICKY
    }

    override fun onDestroy() {
        principal.removeCallbacksAndMessages(null)
        removerCartoesMenos(null)
        remover(pilulaCorrida)
        pilulaCorrida = null
        if (desbloqueioRegistrado) {
            try {
                unregisterReceiver(desbloqueio)
            } catch (e: RuntimeException) {
                // já saiu
            }
            desbloqueioRegistrado = false
        }
        cancelarNotificacaoOferta()
        listOf(cartao, mini, campoValor, painel, flutuante, menu, rotuloDiag, alvoX, bolha).forEach { remover(it) }
        cartao = null; mini = null; campoValor = null; painel = null; flutuante = null; menu = null; rotuloDiag = null; alvoX = null; bolha = null
        avisos?.liberar()
        avisos = null
        calculadoraVolta?.encerrar()
        calculadoraVolta = null
        instancia = null
        super.onDestroy()
    }

    private fun Intent.extraOuNulo(chave: String): Double? = if (hasExtra(chave)) getDoubleExtra(chave, 0.0) else null

    // ------------------------------------------------------------------ notificação

    private fun criarCanal() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val canal = NotificationChannel(CANAL, getString(R.string.plantao_canal), NotificationManager.IMPORTANCE_LOW).apply {
            description = getString(R.string.plantao_canal_descricao)
            setShowBadge(false)
        }
        // Ofertas com a tela bloqueada: heads-up visível no bloqueio. Sem som nem vibração do
        // canal (a voz, o bip e a vibração do Copiloto seguem as preferências).
        val ofertas = NotificationChannel(CANAL_OFERTAS, "Ofertas", NotificationManager.IMPORTANCE_HIGH).apply {
            description = "Resultado da oferta quando ela chega com o celular bloqueado."
            lockscreenVisibility = Notification.VISIBILITY_PUBLIC
            setSound(null, null)
            enableVibration(false)
            setShowBadge(false)
        }
        val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        nm.createNotificationChannel(canal)
        nm.createNotificationChannel(ofertas)
    }

    /** Tela bloqueada, desligada ou ligando: a janela sobreposta não aparece. */
    private fun telaBloqueada(): Boolean {
        val bloqueada = try {
            (getSystemService(Context.KEYGUARD_SERVICE) as? KeyguardManager)?.isKeyguardLocked ?: false
        } catch (e: RuntimeException) {
            false
        }
        val ligada = try {
            (getSystemService(Context.POWER_SERVICE) as? PowerManager)?.isInteractive ?: true
        } catch (e: RuntimeException) {
            true
        }
        return bloqueada || !ligada
    }

    /**
     * Oferta lida com a tela bloqueada: notificação heads-up de alta prioridade,
     * visível no bloqueio ("🟢 Vale a pena · R$ 26 · R$ 1,50/km" /
     * "17,3 km · lucro R$ 12 · sugestão: toque em R$ 29"). Oferta nova: pula de
     * novo; a mesma oferta (contraproposta, volta): só atualiza.
     */
    private fun notificarOferta(o: OfertaDetalhada, r: Copiloto.Resultado, corridaId: String) {
        val sugestao = if (o.app == "indrive" && o.suaOferta == null && o.valorFinal == null && r.lugarEvitado == null) {
            Copiloto.sugerir(o, taxas(Armazenamento.perfil(this)), reguaAgora().criterios.paraApp(o.app), r.avaliacao.sinal)
        } else {
            null
        }
        val titulo = Cartao.tituloNotificacao(o, r.avaliacao)
        val texto = Cartao.textoNotificacao(o, r.avaliacao, sugestao) + (alertaComunidade(o)?.let { "\n" + it.texto() } ?: "")
        val abrirApp = packageManager.getLaunchIntentForPackage(Pacotes.lista(this).firstOrNull { Pacotes.plataforma(it) == o.app } ?: "")
        val b = NotificationCompat.Builder(this, CANAL_OFERTAS)
            .setSmallIcon(R.drawable.ic_copiloto_simbolo)
            .setContentTitle(titulo)
            .setContentText(texto)
            .setStyle(NotificationCompat.BigTextStyle().bigText(listOfNotNull(texto, o.destino?.let { "→ $it" }).joinToString("\n")))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setOnlyAlertOnce(true)
            .setAutoCancel(true)
            .setTimeoutAfter(CARTAO_INDRIVE_MS)
        if (abrirApp != null) {
            b.setContentIntent(PendingIntent.getActivity(this, 20, abrirApp.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK), imutavel or PendingIntent.FLAG_UPDATE_CURRENT))
        }
        try {
            val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            // Oferta nova: tira a anterior para o heads-up aparecer de novo.
            if (notificadaId != null && notificadaId != corridaId) nm.cancel(ID_NOTIFICACAO_OFERTA)
            nm.notify(ID_NOTIFICACAO_OFERTA, b.build())
            notificadaId = corridaId
        } catch (e: RuntimeException) {
            // sem permissão de notificação: a oferta fica só no cartão (que aparece ao desbloquear)
        }
    }

    private fun cancelarNotificacaoOferta() {
        if (notificadaId == null) return
        notificadaId = null
        try {
            (getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager).cancel(ID_NOTIFICACAO_OFERTA)
        } catch (e: RuntimeException) {
            // ok
        }
    }

    private val imutavel: Int get() = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0

    private fun intentNavegar(codigo: Int, endereco: String): PendingIntent =
        PendingIntent.getActivity(this, codigo, intentNavegacao(endereco), imutavel or PendingIntent.FLAG_UPDATE_CURRENT)

    @Suppress("DEPRECATION")
    private fun pacoteInstalado(pacote: String): Boolean = try {
        packageManager.getPackageInfo(pacote, 0)
        true
    } catch (e: Exception) {
        false
    }

    private fun intentDe(alvo: Navegacao.Alvo): Intent {
        val i = Intent(Intent.ACTION_VIEW, Uri.parse(alvo.uri))
        alvo.pacote?.let { i.setPackage(it) }
        val final = if (alvo.perguntar) Intent.createChooser(i, "Abrir com") else i
        return final.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    }

    /** Intent de Embarque/Destino pelo app escolhido (appNavegacao); sem o app instalado, o padrão (geo:). */
    private fun intentNavegacao(endereco: String): Intent =
        intentDe(Navegacao.escolher(Armazenamento.preferencias(this).appNavegacao, endereco) { pacoteInstalado(it) })

    /** Botões Embarque/Destino do cartão: abre o app de navegação (é o motorista que toca). */
    private fun abrirNavegacao(endereco: String) {
        try {
            startActivity(intentNavegacao(endereco))
        } catch (e: RuntimeException) {
            try {
                startActivity(intentDe(Navegacao.padrao(endereco)))
            } catch (e2: RuntimeException) {
                aviso("Nenhum app de mapas para abrir o endereço.")
            }
        }
    }

    private fun emojiDoSinal(s: Sinal) = when (s) {
        Sinal.VERDE -> "🟢"
        Sinal.AMARELO -> "🟡"
        Sinal.VERMELHO -> "🔴"
    }

    private fun notificacao(): Notification {
        val abrir = PendingIntent.getActivity(
            this, 0,
            Intent(this, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_REORDER_TO_FRONT),
            imutavel or PendingIntent.FLAG_UPDATE_CURRENT,
        )
        val desligar = PendingIntent.getService(
            this, 1,
            Intent(this, BolhaService::class.java).setAction(ACAO_DESLIGAR),
            imutavel or PendingIntent.FLAG_UPDATE_CURRENT,
        )
        val pausar = PendingIntent.getService(
            this, 2,
            Intent(this, BolhaService::class.java).setAction(ACAO_PAUSAR),
            imutavel or PendingIntent.FLAG_UPDATE_CURRENT,
        )
        val pausado = Armazenamento.pausado(this)
        val o = ultimaOferta
        val a = ultimaAvaliacao
        val titulo = if (pausado) "Copiloto pausado" else getString(R.string.plantao_notificacao_titulo)
        val texto: String
        var detalhe: String? = null
        if (o != null && a != null) {
            val partes = listOfNotNull(o.nome, nomeDoApp(if (o.app == "outra") null else o.app), Copiloto.reais(o.valorUsado), "${emojiDoSinal(a.sinal)} ${Formato.brl(a.porKm)}/km")
            texto = partes.joinToString(" · ")
            detalhe = o.destino?.let { "$texto\n→ $it" }
        } else {
            texto = if (Permissoes.acessibilidade(this)) getString(R.string.plantao_notificacao_lendo) else getString(R.string.plantao_notificacao_digitar)
        }
        val b = NotificationCompat.Builder(this, CANAL)
            .setSmallIcon(R.drawable.ic_copiloto_simbolo)
            .setContentTitle(titulo)
            .setContentText(texto)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE)
            .setContentIntent(abrir)
        if (detalhe != null) b.setStyle(NotificationCompat.BigTextStyle().bigText(detalhe))
        b.addAction(0, if (pausado) "Retomar" else "Pausar", pausar)
        // O Android mostra até 3 ações: com endereços, Embarque e Destino (Abrir = tocar na notificação).
        val embarque = o?.embarque
        val destino = o?.destino
        if (embarque != null || destino != null) {
            embarque?.let { b.addAction(0, "Embarque", intentNavegar(10, it)) }
            destino?.let { b.addAction(0, "Destino", intentNavegar(11, it)) }
        } else {
            b.addAction(0, "Abrir", abrir)
            b.addAction(0, getString(R.string.plantao_desligar), desligar)
        }
        return b.build()
    }

    private fun atualizarNotificacao() {
        try {
            (getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager).notify(ID_NOTIFICACAO, notificacao())
        } catch (e: RuntimeException) {
            // sem permissão de notificação: o Copiloto segue funcionando
        }
    }

    // ------------------------------------------------------------------ utilidades de tela

    private fun dp(v: Number): Int = TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, v.toFloat(), resources.displayMetrics).toInt()

    private fun tela(): Pair<Int, Int> {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            val b = wm.currentWindowMetrics.bounds
            return Pair(b.width(), b.height())
        }
        val m = resources.displayMetrics
        return Pair(m.widthPixels, m.heightPixels)
    }

    private fun alturaBarraStatus(): Int {
        val id = resources.getIdentifier("status_bar_height", "dimen", "android")
        return if (id > 0) resources.getDimensionPixelSize(id) else dp(24)
    }

    @Suppress("DEPRECATION")
    private val tipoJanela: Int
        get() = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY else WindowManager.LayoutParams.TYPE_PHONE

    private fun parametros(largura: Int, altura: Int, flags: Int) = WindowManager.LayoutParams(
        largura, altura, tipoJanela,
        // Aceleração de hardware: janela de serviço não ganha sozinha (sem ela, sombras e cantos saem errados).
        flags or WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN or WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED,
        PixelFormat.TRANSLUCENT,
    )

    private fun adicionar(v: View, p: WindowManager.LayoutParams): Boolean = try {
        wm.addView(v, p)
        true
    } catch (e: RuntimeException) {
        false
    }

    private fun remover(v: View?) {
        if (v == null) return
        try {
            wm.removeViewImmediate(v)
        } catch (e: RuntimeException) {
            // já tinha saído da tela
        }
    }

    private fun atualizar(v: View, p: WindowManager.LayoutParams) {
        try {
            wm.updateViewLayout(v, p)
        } catch (e: RuntimeException) {
            // a view saiu da tela no meio do movimento
        }
    }

    /** Cores do tema escolhido (claro, escuro ou seguindo o sistema). */
    private data class Paleta(val escuro: Boolean, val fundo: Int, val texto: Int, val secundario: Int, val borda: Int, val superficie: Int, val destaque: Int)

    private fun temaEscuro(): Boolean = when (Armazenamento.temaEfetivo(this)) {
        "claro" -> false
        "escuro" -> true
        else -> (resources.configuration.uiMode and Configuration.UI_MODE_NIGHT_MASK) == Configuration.UI_MODE_NIGHT_YES
    }

    private fun paleta(): Paleta = if (temaEscuro()) {
        Paleta(true, 0xF2111827.toInt(), BRANCO, 0xFFB4BED2.toInt(), 0x26FFFFFF, 0x1AFFFFFF, 0xFF8FB0FF.toInt())
    } else {
        Paleta(false, BRANCO, 0xFF0B1630.toInt(), 0xFF5B6478.toInt(), 0x1F0B1630, 0x0F0B1630, MARCA)
    }

    private fun comAlfa(cor: Int, alfa: Int): Int = (cor and 0x00FFFFFF) or (alfa shl 24)

    private fun fundoArredondado(cor: Int, raioDp: Number, borda: Int? = null): GradientDrawable = GradientDrawable().apply {
        shape = GradientDrawable.RECTANGLE
        cornerRadius = dp(raioDp).toFloat()
        setColor(cor)
        if (borda != null) setStroke(dp(1), borda)
    }

    /** Folga em volta das peças com sombra (pequena: é área da janela que não deixa o toque passar). */
    private val folgaLado get() = dp(6)
    private val folgaTopo get() = dp(3)
    private val folgaBaixo get() = dp(10)

    /**
     * Moldura transparente com a sombra suave desenhada em volta de [corpo]
     * (cantos de [raioDp]); a janela é a moldura, então a sombra não é cortada.
     */
    private fun moldura(
        corpo: View,
        raioDp: Number,
        base: FrameLayout = FrameLayout(ui),
        esquerda: Int = folgaLado,
        direita: Int = folgaLado,
    ): FrameLayout = base.apply {
        clipChildren = false
        clipToPadding = false
        setPadding(esquerda, folgaTopo, direita, folgaBaixo)
        background = Sombra(dp(raioDp).toFloat(), esquerda, folgaTopo, direita, folgaBaixo, dp(7).toFloat(), dp(2).toFloat())
        addView(corpo, FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT))
    }

    private fun circulo(cor: Int, borda: Int? = null, larguraBorda: Int = 2): GradientDrawable = GradientDrawable().apply {
        shape = GradientDrawable.OVAL
        setColor(cor)
        if (borda != null) setStroke(dp(larguraBorda), borda)
    }

    private fun texto(t: String, sp: Float, cor: Int, negrito: Boolean = false): TextView = TextView(ui).apply {
        text = t
        setTextColor(cor)
        setTextSize(TypedValue.COMPLEX_UNIT_SP, sp * escalaTexto)
        typeface = if (negrito) Typeface.DEFAULT_BOLD else Typeface.DEFAULT
        includeFontPadding = false
    }

    private fun corDoSinal(s: Sinal) = when (s) {
        Sinal.VERDE -> VERDE
        Sinal.AMARELO -> AMARELO
        Sinal.VERMELHO -> VERMELHO
    }

    private fun seloDoSinal(s: Sinal) = when (s) {
        Sinal.VERDE -> "Vale a pena"
        Sinal.AMARELO -> "Avalie"
        Sinal.VERMELHO -> "Não compensa"
    }

    private fun linha(vararg blocos: View, espaco: Int = 10): LinearLayout = LinearLayout(ui).apply {
        orientation = LinearLayout.HORIZONTAL
        gravity = Gravity.CENTER_VERTICAL
        blocos.forEachIndexed { i, b ->
            addView(b, LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f).apply { if (i > 0) marginStart = dp(espaco) })
        }
    }

    private fun botao(t: String, cor: Int, cheio: Boolean, corTexto: Int = BRANCO, acao: () -> Unit): TextView =
        texto(t, 14f, if (cheio) corTexto else cor, true).apply {
            gravity = Gravity.CENTER
            setPadding(dp(12), dp(9), dp(12), dp(9))
            background = if (cheio) fundoArredondado(cor, 12) else fundoArredondado(Color.TRANSPARENT, 12, comAlfa(cor, 0x66))
            isClickable = true
            setOnClickListener { acao() }
        }

    private fun margem(topo: Int) = LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT).apply { topMargin = dp(topo) }

    /** Ícone redondo do app da oferta (desenho simples, não é o logo). */
    private fun iconeDoApp(app: String?): TextView {
        val (fundo, cor, rotulo, sp) = when (app) {
            "indrive" -> Quad(0xFFC1F11D.toInt(), 0xFF0B1630.toInt(), "iD", 11f)
            "uber" -> Quad(0xFF000000.toInt(), BRANCO, "Uber", 7.5f)
            "99" -> Quad(0xFFFFD400.toInt(), 0xFF0B1630.toInt(), "99", 11f)
            "37city" -> Quad(0xFFE53935.toInt(), BRANCO, "37", 10f)
            else -> Quad(MARCA, BRANCO, "✎", 12f)
        }
        return texto(rotulo, sp, cor, true).apply {
            gravity = Gravity.CENTER
            background = circulo(fundo, comAlfa(BRANCO, 0x40), 1)
        }
    }

    private data class Quad(val a: Int, val b: Int, val c: String, val d: Float)

    // ------------------------------------------------------------------ bolha

    private val tamanhoBolha get() = dp(44)
    /** Janela da bolha: o círculo mais a folga da sombra (redonda, sem cortar). */
    private val janelaBolha get() = dp(58)

    @SuppressLint("ClickableViewAccessibility")
    private fun mostrarBolha() {
        val circuloView = FrameLayout(ui).apply {
            background = circulo(MARCA, BRANCO, 2)
            alpha = Armazenamento.preferencias(this@BolhaService).opacidadeBolha / 100f
            addView(
                ImageView(ui).apply {
                    setImageResource(R.drawable.ic_copiloto_simbolo)
                    scaleType = ImageView.ScaleType.FIT_CENTER
                },
                FrameLayout.LayoutParams(dp(23), dp(23), Gravity.CENTER),
            )
        }
        val ponto = View(ui).apply {
            background = circulo(if (Armazenamento.pausado(this@BolhaService)) PAUSADO else LENDO, BRANCO, 2)
        }
        // Sombra redonda desenhada à mão (a elevação saía quadrada/cortada na janela da bolha).
        val margemSombra = (janelaBolha - tamanhoBolha) / 2
        val sombra = View(ui).apply {
            background = Sombra(tamanhoBolha / 2f, margemSombra, margemSombra, margemSombra, margemSombra, (margemSombra - dp(3)).toFloat(), dp(2).toFloat(), forca = 110)
            alpha = Armazenamento.preferencias(this@BolhaService).opacidadeBolha / 100f
        }
        val v = FrameLayout(ui).apply {
            contentDescription = getString(R.string.plantao_bolha_descricao)
            clipChildren = false
            addView(sombra, FrameLayout.LayoutParams(janelaBolha, janelaBolha, Gravity.CENTER))
            addView(circuloView, FrameLayout.LayoutParams(tamanhoBolha, tamanhoBolha, Gravity.CENTER))
            addView(ponto, FrameLayout.LayoutParams(dp(11), dp(11), Gravity.TOP or Gravity.END).apply { topMargin = dp(6); marginEnd = dp(6) })
        }
        val (largura, altura) = tela()
        val salva = Armazenamento.posicaoBolha(this)
        val p = parametros(janelaBolha, janelaBolha, WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE).apply {
            gravity = Gravity.TOP or Gravity.START
            x = (salva?.first ?: (largura - janelaBolha)).coerceIn(0, largura - janelaBolha)
            y = (salva?.second ?: (altura / 3)).coerceIn(0, altura - janelaBolha)
        }

        var inicioX = 0
        var inicioY = 0
        var toqueX = 0f
        var toqueY = 0f
        var arrastando = false
        var segurou = false
        val limiar = ViewConfiguration.get(ui).scaledTouchSlop.coerceAtLeast(dp(8))
        val segurar = Runnable {
            segurou = true
            v.performHapticFeedback(HapticFeedbackConstants.LONG_PRESS)
            abrirMenu()
        }

        v.setOnTouchListener { view, e ->
            when (e.actionMasked) {
                MotionEvent.ACTION_DOWN -> {
                    inicioX = p.x; inicioY = p.y; toqueX = e.rawX; toqueY = e.rawY; arrastando = false; segurou = false
                    principal.postDelayed(segurar, ViewConfiguration.getLongPressTimeout().toLong())
                    circuloView.animate().scaleX(0.92f).scaleY(0.92f).alpha(1f).setDuration(90).start()
                    true
                }
                MotionEvent.ACTION_MOVE -> {
                    val dx = e.rawX - toqueX
                    val dy = e.rawY - toqueY
                    if (!arrastando && !segurou && hypot(dx, dy) > limiar) {
                        arrastando = true
                        principal.removeCallbacks(segurar)
                        mostrarAlvoX()
                    }
                    if (arrastando) {
                        p.x = inicioX + dx.toInt()
                        p.y = inicioY + dy.toInt()
                        atualizar(view, p)
                        destacarAlvoX(sobreAlvoX(p))
                        posicionarRotuloDiag()
                    }
                    true
                }
                MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> {
                    principal.removeCallbacks(segurar)
                    circuloView.animate().scaleX(1f).scaleY(1f).alpha(Armazenamento.preferencias(this@BolhaService).opacidadeBolha / 100f).setDuration(120).start()
                    if (arrastando) {
                        val noX = sobreAlvoX(p)
                        esconderAlvoX()
                        if (noX) desligar(this) else encostarNaBorda(view, p)
                    } else if (!segurou && e.actionMasked == MotionEvent.ACTION_UP) {
                        view.performClick()
                        if (menu != null) fecharMenu() else abrirMenu(rapido = true)
                    }
                    arrastando = false
                    true
                }
                else -> false
            }
        }
        if (!adicionar(v, p)) throw IllegalStateException("sem janela")
        bolha = v
        bolhaParams = p
        pontoStatus = ponto
        circuloBolha = circuloView
        sombraBolha = sombra
    }

    private fun atualizarPonto() {
        pontoStatus?.background = circulo(if (Armazenamento.pausado(this)) PAUSADO else LENDO, BRANCO, 2)
    }

    /** Ao soltar, a bolha encosta na borda mais próxima e a posição fica salva. */
    private fun encostarNaBorda(v: View, p: WindowManager.LayoutParams) {
        val (largura, altura) = tela()
        val tamanho = janelaBolha
        val destino = if (p.x + tamanho / 2 < largura / 2) 0 else largura - tamanho
        p.y = p.y.coerceIn(0, altura - tamanho)
        ValueAnimator.ofInt(p.x, destino).apply {
            duration = 180
            interpolator = DecelerateInterpolator()
            addUpdateListener {
                if (bolha == null) return@addUpdateListener
                p.x = it.animatedValue as Int
                atualizar(v, p)
            }
            start()
        }
        Armazenamento.salvarPosicaoBolha(this, destino, p.y)
        principal.postDelayed({ posicionarRotuloDiag() }, 200)
    }

    private fun mostrarAlvoX() {
        if (alvoX != null) return
        val tamanho = dp(64)
        val v = texto("✕", 26f, BRANCO, true).apply {
            gravity = Gravity.CENTER
            background = circulo(0xE60B1630.toInt(), VERMELHO)
            contentDescription = getString(R.string.plantao_desligar)
        }
        val p = parametros(
            tamanho, tamanho,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or WindowManager.LayoutParams.FLAG_NOT_TOUCHABLE,
        ).apply {
            gravity = Gravity.BOTTOM or Gravity.CENTER_HORIZONTAL
            y = dp(48)
        }
        if (adicionar(v, p)) alvoX = v
    }

    private fun destacarAlvoX(sobre: Boolean) {
        val v = alvoX ?: return
        val escala = if (sobre) 1.25f else 1f
        v.scaleX = escala
        v.scaleY = escala
        (v.background as? GradientDrawable)?.setColor(if (sobre) VERMELHO else 0xE60B1630.toInt())
    }

    private fun esconderAlvoX() {
        remover(alvoX)
        alvoX = null
    }

    /** O centro da bolha está em cima do X do rodapé? */
    private fun sobreAlvoX(p: WindowManager.LayoutParams): Boolean {
        val (largura, altura) = tela()
        val metade = janelaBolha / 2
        val cx = p.x + metade
        val cy = p.y + metade
        val xx = largura / 2
        val xy = altura - dp(48) - dp(32)
        return hypot((cx - xx).toFloat(), (cy - xy).toFloat()) < dp(64)
    }

    // ------------------------------------------------------------------ diagnóstico

    private fun mostrarRotuloDiag() {
        if (rotuloDiag != null) return
        val inicial = when {
            Armazenamento.pausado(this) -> "pausado"
            Armazenamento.preferencias(this).printOfertas && !LeitorCorridasService.printDisponivel -> "print das ofertas: precisa do Android 11+ (desligado)"
            else -> "esperando uma tela…"
        }
        val v = texto(inicial, 11f, BRANCO, true).apply {
            background = fundoArredondado(0xE60B1630.toInt(), 8)
            setPadding(dp(8), dp(4), dp(8), dp(4))
            maxLines = 2
            maxWidth = dp(220)
        }
        val p = parametros(
            WindowManager.LayoutParams.WRAP_CONTENT, WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or WindowManager.LayoutParams.FLAG_NOT_TOUCHABLE,
        )
        rotuloParams = p
        posicionarRotuloDiag(p)
        if (adicionar(v, p)) rotuloDiag = v
    }

    private fun posicionarRotuloDiag(p: WindowManager.LayoutParams? = rotuloParams) {
        val bp = bolhaParams ?: return
        val r = p ?: return
        val (largura, _) = tela()
        if (bp.x + janelaBolha / 2 < largura / 2) {
            r.gravity = Gravity.TOP or Gravity.START
            r.x = bp.x + dp(4)
        } else {
            r.gravity = Gravity.TOP or Gravity.END
            r.x = (largura - bp.x - janelaBolha + dp(4)).coerceAtLeast(0)
        }
        r.y = bp.y + janelaBolha
        rotuloDiag?.let { atualizar(it, r) }
    }

    private fun esconderRotuloDiag() {
        remover(rotuloDiag)
        rotuloDiag = null
    }

    private fun diagnostico(app: String, tela: TelaLida) {
        val v = rotuloDiag ?: return
        val hora = SimpleDateFormat("HH:mm:ss", Locale.US).format(Date())
        v.text = "${nomeDoApp(app)}: ${tela.rotulo()} · $hora"
    }

    // ------------------------------------------------------------------ menu em leque

    private data class ItemMenu(val icone: String, val rotulo: String, val acao: () -> Unit)

    @SuppressLint("ClickableViewAccessibility")
    /**
     * Menu da bolha. Toque: o rápido, com 3 itens (calculadora, pausar,
     * configurações). Segurar a bolha ou tocar em "Configurações": o leque completo.
     */
    private fun abrirMenu(rapido: Boolean = false) {
        if (menu != null) return
        fecharFlutuante()
        val pal = paleta()
        val pausado = Armazenamento.pausado(this)
        val escuro = temaEscuro()
        val diag = Armazenamento.diagnostico(this)
        val perfis = Armazenamento.preferencias(this).perfis
        val itens = if (rapido) listOf(
            ItemMenu("＝", "Calculadora") { abrirPainel() },
            ItemMenu(if (pausado) "▶" else "❚❚", if (pausado) "Retomar" else "Pausar") { alternarPausa() },
            ItemMenu("⚙", "Configurações") { abrirMenu() },
        ) else listOfNotNull(
            ItemMenu(if (pausado) "▶" else "❚❚", if (pausado) "Retomar" else "Pausar") { alternarPausa() },
            ItemMenu("✎", "Digitar oferta") { abrirPainel() },
            ItemMenu("◐", if (escuro) "Tema claro" else "Tema escuro") {
                Armazenamento.definirTema(this, if (escuro) "claro" else "escuro")
                redesenharCartao()
            },
            ItemMenu("±", "Régua rápida") { abrirRegua() },
            if (perfis.isNotEmpty()) ItemMenu("☰", "Perfil: ${Armazenamento.perfilAtivo(this) ?: "escolher"}") { abrirPerfis() } else null,
            if (CameraService.gravando) ItemMenu("●", "Câmera: parar") { CameraService.parar(this) } else null,
            ItemMenu("Σ", "Resumo do dia") { abrirResumo() },
            ItemMenu("⌂", "Definir base aqui") { definirBaseAqui() },
            ItemMenu("ⓘ", if (diag) "Diagnóstico: ligado" else "Diagnóstico") {
                Armazenamento.definirDiagnostico(this, !diag)
                if (!diag) mostrarRotuloDiag() else esconderRotuloDiag()
            },
            ItemMenu("↗", "Abrir o Aluguei") { Permissoes.trazerAppParaFrente(this) },
            ItemMenu("✕", "Desligar") { desligar(this) },
        )

        val raiz = FrameLayout(ui).apply {
            setBackgroundColor(0x59000000)
            alpha = 0f
            isClickable = true
            setOnTouchListener { _, e ->
                if (e.actionMasked == MotionEvent.ACTION_UP) fecharMenu()
                true
            }
        }
        val p = parametros(
            WindowManager.LayoutParams.MATCH_PARENT, WindowManager.LayoutParams.MATCH_PARENT,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
        )
        if (!adicionar(raiz, p)) return
        menu = raiz
        raiz.animate().alpha(1f).setDuration(200).start()

        // Posição dos itens só depois do layout (para saber onde a bolha está na tela).
        raiz.post {
            if (menu !== raiz) return@post
            val b = bolha ?: return@post
            val posBolha = IntArray(2).also { b.getLocationOnScreen(it) }
            val posRaiz = IntArray(2).also { raiz.getLocationOnScreen(it) }
            val cx = posBolha[0] - posRaiz[0] + b.width / 2
            val cy = posBolha[1] - posRaiz[1] + b.height / 2
            val alturaItem = dp(42)
            val passo = dp(48)
            val total = passo * (itens.size - 1) + alturaItem
            val topo = (cy - total / 2).coerceIn(dp(16), (raiz.height - total - dp(16)).coerceAtLeast(dp(16)))
            val aEsquerda = cx < raiz.width / 2
            val meio = (itens.size - 1) / 2f
            itens.forEachIndexed { i, item ->
                val rel = (i - meio) / meio // -1..1
                val afastamento = dp(44) + (dp(46) * (1 - rel * rel)).toInt()
                val chip = LinearLayout(ui).apply {
                    orientation = LinearLayout.HORIZONTAL
                    gravity = Gravity.CENTER_VERTICAL
                    background = fundoArredondado(if (pal.escuro) 0xF51F2937.toInt() else BRANCO, 21, pal.borda)
                    elevation = dp(4).toFloat()
                    setPadding(dp(6), 0, dp(14), 0)
                    addView(
                        texto(item.icone, 13f, BRANCO, true).apply {
                            gravity = Gravity.CENTER
                            background = circulo(if (item.rotulo == "Desligar" || item.rotulo == "Câmera: parar") VERMELHO else MARCA)
                        },
                        LinearLayout.LayoutParams(dp(30), dp(30)),
                    )
                    addView(texto(item.rotulo, 14f, pal.texto, true), LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT).apply { marginStart = dp(8) })
                    isClickable = true
                    setOnClickListener {
                        fecharMenu()
                        item.acao()
                    }
                    alpha = 0f
                    scaleX = 0.6f
                    scaleY = 0.6f
                }
                val lp = FrameLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, alturaItem).apply {
                    topMargin = topo + passo * i
                    if (aEsquerda) {
                        gravity = Gravity.TOP or Gravity.START
                        leftMargin = (cx + afastamento - dp(30)).coerceAtLeast(dp(8))
                    } else {
                        gravity = Gravity.TOP or Gravity.END
                        rightMargin = (raiz.width - cx + afastamento - dp(30)).coerceAtLeast(dp(8))
                    }
                }
                raiz.addView(chip, lp)
                chip.post {
                    chip.pivotX = if (aEsquerda) 0f else chip.width.toFloat()
                    chip.pivotY = chip.height / 2f
                    chip.animate().alpha(1f).scaleX(1f).scaleY(1f).setStartDelay(i * 15L).setDuration(200).setInterpolator(DecelerateInterpolator()).start()
                }
            }
        }
    }

    private fun fecharMenu() {
        val v = menu ?: return
        menu = null
        v.animate().alpha(0f).setDuration(150).withEndAction { remover(v) }.start()
    }

    private fun alternarPausa() {
        val pausar = !Armazenamento.pausado(this)
        Armazenamento.definirPausado(this, pausar)
        atualizarPonto()
        if (pausar) {
            fecharCartao()
            fecharMini()
            fecharCronometro()
            limparLeitura()
            rotuloDiag?.text = "pausado"
        } else {
            rotuloDiag?.text = "esperando uma tela…"
        }
        atualizarNotificacao()
        PlantaoPlugin.emitirEstado(this)
    }

    private fun limparLeitura() {
        ofertaAberta = null
        ofertaAbertaId = null
        chaveAberta = null
        recusada = null
    }

    // ------------------------------------------------------------------ painéis flutuantes (régua, resumo)

    @SuppressLint("ClickableViewAccessibility")
    private fun mostrarFlutuante(conteudo: View, aoFechar: (() -> Unit)? = null) {
        fecharFlutuante()
        val pal = paleta()
        val corpo = FrameLayout(ui).apply {
            background = fundoArredondado(pal.fundo, 20, pal.borda)
            setPadding(dp(16), dp(14), dp(16), dp(14))
            addView(conteudo)
        }
        val raiz = moldura(corpo, 20).apply {
            setOnTouchListener { _, e ->
                if (e.actionMasked == MotionEvent.ACTION_OUTSIDE) {
                    fecharFlutuante(); true
                } else {
                    false
                }
            }
            alpha = 0f
            translationY = -dp(16).toFloat()
        }
        val (largura, _) = tela()
        val p = parametros(
            min(largura - dp(24), dp(380)) + 2 * folgaLado,
            WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or WindowManager.LayoutParams.FLAG_WATCH_OUTSIDE_TOUCH,
        ).apply {
            gravity = Gravity.TOP or Gravity.CENTER_HORIZONTAL
            y = alturaBarraStatus() + dp(56)
        }
        if (!adicionar(raiz, p)) return
        flutuante = raiz
        aoFecharFlutuante = aoFechar
        raiz.animate().alpha(1f).translationY(0f).setDuration(220).setInterpolator(DecelerateInterpolator()).start()
    }

    private fun fecharFlutuante() {
        val v = flutuante ?: return
        flutuante = null
        val f = aoFecharFlutuante
        aoFecharFlutuante = null
        f?.invoke()
        v.animate().alpha(0f).translationY(-dp(12).toFloat()).setDuration(180).withEndAction { remover(v) }.start()
    }

    private fun cabecalho(titulo: String, pal: Paleta, fechar: () -> Unit): LinearLayout = LinearLayout(ui).apply {
        orientation = LinearLayout.HORIZONTAL
        gravity = Gravity.CENTER_VERTICAL
        addView(texto(titulo, 17f, pal.texto, true), LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f))
        addView(
            texto("✕", 18f, pal.secundario, true).apply {
                gravity = Gravity.CENTER
                contentDescription = getString(R.string.plantao_fechar)
                isClickable = true
                setOnClickListener { fechar() }
            },
            LinearLayout.LayoutParams(dp(36), dp(36)),
        )
    }

    private fun abrirRegua() {
        val pal = paleta()
        val c = Armazenamento.criterios(this)
        var porKm = c.minimoPorKm
        var porHora = c.minimoPorHora
        var mudou = false

        fun ajuste(rotulo: String, valor: () -> String, menos: () -> Unit, mais: () -> Unit): LinearLayout {
            val numero = texto(valor(), 22f, pal.texto, true)
            fun redondo(t: String, acao: () -> Unit) = texto(t, 22f, BRANCO, true).apply {
                gravity = Gravity.CENTER
                background = circulo(MARCA)
                isClickable = true
                setOnClickListener {
                    acao()
                    mudou = true
                    numero.text = valor()
                    Armazenamento.salvarRegua(this@BolhaService, porKm, porHora)
                }
            }
            return LinearLayout(ui).apply {
                orientation = LinearLayout.HORIZONTAL
                gravity = Gravity.CENTER_VERTICAL
                addView(
                    LinearLayout(ui).apply {
                        orientation = LinearLayout.VERTICAL
                        addView(texto(rotulo, 12f, pal.secundario))
                        addView(numero, margem(4))
                    },
                    LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f),
                )
                addView(redondo("−", menos), LinearLayout.LayoutParams(dp(44), dp(44)))
                addView(redondo("+", mais), LinearLayout.LayoutParams(dp(44), dp(44)).apply { marginStart = dp(10) })
            }
        }

        val conteudo = LinearLayout(ui).apply {
            orientation = LinearLayout.VERTICAL
            addView(cabecalho("Régua rápida", pal) { fecharFlutuante() })
            addView(texto("O que é uma corrida boa para você agora.", 12f, pal.secundario), margem(2))
            addView(ajuste("Mínimo por km", { Formato.brl(porKm) }, { porKm = (porKm - 10).coerceAtLeast(0) }, { porKm = (porKm + 10).coerceAtMost(100_000) }), margem(14))
            addView(ajuste("Mínimo por hora", { Copiloto.reais(porHora) }, { porHora = (porHora - 500).coerceAtLeast(0) }, { porHora = (porHora + 500).coerceAtMost(10_000_000) }), margem(12))
            addView(botao("Pronto", MARCA, true) { fecharFlutuante() }, margem(16))
        }
        mostrarFlutuante(conteudo) {
            if (mudou) {
                PlantaoPlugin.emitirRegua(porKm, porHora)
                redesenharCartao()
            }
        }
    }

    private fun abrirResumo() {
        val pal = paleta()
        val r = Armazenamento.resumoHoje(this)
        fun item(rotulo: String, valor: String) = LinearLayout(ui).apply {
            orientation = LinearLayout.HORIZONTAL
            addView(texto(rotulo, 14f, pal.secundario), LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f))
            addView(texto(valor, 16f, pal.texto, true))
        }
        val conteudo = LinearLayout(ui).apply {
            orientation = LinearLayout.VERTICAL
            addView(cabecalho("Resumo de hoje", pal) { fecharFlutuante() })
            addView(item("Ofertas avaliadas", r.ofertas.toString()), margem(12))
            addView(item("Aceitas", r.aceitas.toString()), margem(10))
            addView(item("Ganho (aceitas)", Formato.brl(r.ganho)), margem(10))
            addView(item("Lucro estimado", Formato.brl(r.lucro)), margem(10))
            addView(texto("Conta só o que você marcou como \"Aceitei\" no cartão.", 11f, pal.secundario), margem(12))
        }
        mostrarFlutuante(conteudo)
    }

    /** Lista dos perfis de régua: escolher aplica os critérios na hora e avisa o app web (evento "perfil"). */
    private fun abrirPerfis() {
        val pal = paleta()
        val perfis = Armazenamento.preferencias(this).perfis
        val ativo = Armazenamento.perfilAtivo(this)
        val conteudo = LinearLayout(ui).apply {
            orientation = LinearLayout.VERTICAL
            addView(cabecalho("Perfil da régua", pal) { fecharFlutuante() })
            addView(texto("Troca a régua inteira agora; o Aluguei salva na sua conta quando abrir.", 12f, pal.secundario), margem(2))
            perfis.forEach { perfil ->
                val escolhido = perfil.nome == ativo
                val c = perfil.criteriosNormalizados()
                addView(
                    LinearLayout(ui).apply {
                        orientation = LinearLayout.HORIZONTAL
                        gravity = Gravity.CENTER_VERTICAL
                        background = if (escolhido) fundoArredondado(comAlfa(MARCA, 0x26), 12, MARCA) else fundoArredondado(pal.superficie, 12, pal.borda)
                        setPadding(dp(12), dp(10), dp(12), dp(10))
                        addView(texto(perfil.nome, 15f, pal.texto, true), LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f))
                        addView(texto("${Formato.brl(c.minimoPorKm)}/km · ${Copiloto.reais(c.minimoPorHora)}/h", 12f, pal.secundario))
                        isClickable = true
                        contentDescription = "Usar o perfil ${perfil.nome}"
                        setOnClickListener {
                            Armazenamento.aplicarPerfil(this@BolhaService, perfil)
                            PlantaoPlugin.emitirPerfil(perfil.nome, perfil.criteriosJson())
                            fecharFlutuante()
                            redesenharCartao()
                            aviso("Perfil ${perfil.nome} em uso")
                        }
                    },
                    margem(8),
                )
            }
        }
        mostrarFlutuante(conteudo)
    }

    /** Menu "Definir base aqui": pega a posição atual, guarda e avisa o app web (evento "base"). */
    private fun definirBaseAqui() {
        if (!Localizacao.permitida(this)) {
            val pal = paleta()
            val conteudo = LinearLayout(ui).apply {
                orientation = LinearLayout.VERTICAL
                addView(cabecalho("Definir base aqui", pal) { fecharFlutuante() })
                addView(texto("Falta a permissão de localização. No Aluguei, abra Plantão → Copiloto e permita a localização.", 13f, pal.secundario), margem(6))
                addView(
                    botao("Abrir o Aluguei", MARCA, true) {
                        fecharFlutuante()
                        Permissoes.trazerAppParaFrente(this@BolhaService)
                    },
                    margem(14),
                )
            }
            mostrarFlutuante(conteudo)
            return
        }
        aviso("Pegando a sua localização…")
        Localizacao.atual(this) { ponto ->
            if (ponto == null) {
                aviso("Não deu para pegar a localização agora. Tente de novo.")
            } else {
                Armazenamento.definirBaseLocal(this, ponto.lat, ponto.lon)
                PlantaoPlugin.emitirBase(ponto.lat, ponto.lon)
                aviso("Base definida aqui. Dê um nome a ela no Aluguei.")
            }
        }
    }

    private fun aviso(t: String) {
        try {
            Toast.makeText(this, t, Toast.LENGTH_SHORT).show()
        } catch (e: RuntimeException) {
            // sem toast neste aparelho
        }
    }

    // ------------------------------------------------------------------ painel de digitação rápida

    private fun campo(rotulo: String, dica: String, pal: Paleta, ultimo: Boolean): Pair<LinearLayout, EditText> {
        val edit = EditText(ui).apply {
            setTextColor(pal.texto)
            setHintTextColor(comAlfa(pal.secundario, 0x99))
            hint = dica
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 22f)
            typeface = Typeface.DEFAULT_BOLD
            isSingleLine = true
            inputType = InputType.TYPE_CLASS_NUMBER or InputType.TYPE_NUMBER_FLAG_DECIMAL
            keyListener = DigitsKeyListener.getInstance("0123456789,.")
            imeOptions = (if (ultimo) EditorInfo.IME_ACTION_DONE else EditorInfo.IME_ACTION_NEXT) or EditorInfo.IME_FLAG_NO_EXTRACT_UI
            background = fundoArredondado(pal.superficie, 12, pal.borda)
            setPadding(dp(12), dp(10), dp(12), dp(10))
        }
        val bloco = LinearLayout(ui).apply {
            orientation = LinearLayout.VERTICAL
            addView(texto(rotulo, 12f, pal.secundario))
            addView(edit, margem(4))
        }
        return Pair(bloco, edit)
    }

    private fun tecladoVisivel(raiz: View): Boolean {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            return raiz.rootWindowInsets?.isVisible(WindowInsets.Type.ime()) ?: false
        }
        return raiz.findFocus() is EditText
    }

    @SuppressLint("ClickableViewAccessibility")
    private fun abrirPainel() {
        if (painel != null) return
        fecharMenu()
        fecharFlutuante()
        fecharCartao(animado = false)
        val pal = paleta()
        val (cValor, eValor) = campo("Valor (R$)", "18,40", pal, false)
        val (cKm, eKm) = campo("Km da corrida", "7,4", pal, false)
        val (cMin, eMin) = campo("Min da corrida", "opcional", pal, false)
        val (cBusca, eBusca) = campo("Km até o passageiro", "opcional", pal, true)

        val selo = texto("", 12f, BRANCO, true).apply {
            setPadding(dp(10), dp(4), dp(10), dp(4))
            visibility = View.GONE
        }
        val numeros = texto("Digite o valor e os km", 15f, pal.secundario, true)
        val detalhe = texto("", 12f, pal.secundario).apply { visibility = View.GONE }
        val resultado = LinearLayout(ui).apply {
            orientation = LinearLayout.VERTICAL
            background = fundoArredondado(pal.superficie, 14)
            setPadding(dp(12), dp(10), dp(12), dp(10))
            addView(selo, LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT))
            addView(numeros, margem(6))
            addView(detalhe, margem(4))
        }

        fun ofertaDigitada(): OfertaDetalhada? {
            val valor = Formato.lerReais(eValor.text.toString()) ?: return null
            val km = Formato.lerNumero(eKm.text.toString())?.takeIf { it > 0 } ?: return null
            return OfertaDetalhada(
                app = "outra",
                valor = valor,
                kmCorrida = km,
                minutosCorrida = Formato.lerNumero(eMin.text.toString())?.takeIf { it > 0 },
                kmBusca = Formato.lerNumero(eBusca.text.toString()),
            )
        }

        fun recalcular() {
            val o = ofertaDigitada()
            if (o == null) {
                selo.visibility = View.GONE
                detalhe.visibility = View.GONE
                numeros.text = "Digite o valor e os km"
                numeros.setTextColor(pal.secundario)
                return
            }
            val a = Copiloto.avaliar(o, taxas(Armazenamento.perfil(this)), reguaAgora().criterios.paraApp(o.app)).avaliacao
            val cor = corDoSinal(a.sinal)
            selo.text = seloDoSinal(a.sinal)
            selo.background = fundoArredondado(cor, 99)
            selo.visibility = View.VISIBLE
            numeros.text = "${Formato.brl(a.porKm)}/km · ${Copiloto.reais(jsRound(a.porHora / 100.0) * 100)}/h · lucro ${Formato.brl(a.lucro)}"
            numeros.setTextColor(pal.texto)
            val tempo = if (a.tempoEstimado) "~${a.minutosTotal} min" else "${a.minutosTotal} min"
            detalhe.text = (listOf("${Formato.km(a.kmTotal)} km no total", tempo) + listOfNotNull(a.motivos.firstOrNull())).joinToString(" · ")
            detalhe.visibility = View.VISIBLE
        }

        val vigia = object : TextWatcher {
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) = Unit
            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) = Unit
            override fun afterTextChanged(s: Editable?) = recalcular()
        }
        listOf(eValor, eKm, eMin, eBusca).forEach { it.addTextChangedListener(vigia) }

        fun somar(edit: EditText, soma: Double, reais: Boolean) {
            val atual = if (reais) (Formato.lerReais(edit.text.toString()) ?: 0L) / 100.0 else Formato.lerNumero(edit.text.toString()) ?: 0.0
            val novo = atual + soma
            val texto = if (reais) {
                val c = jsRound(novo * 100)
                if (c % 100 == 0L) (c / 100).toString() else Formato.brl(c).removePrefix("R$ ").replace(".", "")
            } else {
                Formato.km(novo)
            }
            edit.setText(texto)
            edit.setSelection(edit.text.length)
        }

        fun registrar(decisao: String) {
            val o = ofertaDigitada() ?: return
            fecharPainel()
            val corrida = registrarOferta(o, "digitada", mostrar = false)
            decidir(corrida, decisao, o, mostrarMensagem = false)
        }

        // Raiz que fecha o painel com o botão Voltar e com toque fora (se o teclado não estiver aberto).
        val raiz = object : LinearLayout(ui) {
            override fun dispatchKeyEvent(event: KeyEvent): Boolean {
                if (event.keyCode == KeyEvent.KEYCODE_BACK && event.action == KeyEvent.ACTION_UP) {
                    fecharPainel()
                    return true
                }
                return super.dispatchKeyEvent(event)
            }
        }
        raiz.apply {
            orientation = LinearLayout.VERTICAL
            background = fundoArredondado(pal.fundo, 20, pal.borda)
            setPadding(dp(16), dp(12), dp(16), dp(16))
            isFocusableInTouchMode = true
            descendantFocusability = ViewGroup.FOCUS_BEFORE_DESCENDANTS
            addView(cabecalho("Digitar oferta", pal) { fecharPainel() })
            addView(linha(cValor, cKm), margem(8))
            addView(linha(cMin, cBusca), margem(10))
            addView(
                linha(
                    botao("+R$ 5", MARCA, false) { somar(eValor, 5.0, true) },
                    botao("+1 km", MARCA, false) { somar(eKm, 1.0, false) },
                ),
                margem(10),
            )
            addView(resultado, margem(12))
            addView(
                linha(
                    botao(getString(R.string.plantao_recusei), pal.secundario, false) { registrar(CorridaAvaliada.RECUSEI) },
                    botao(getString(R.string.plantao_aceitei), MARCA, true) { registrar(CorridaAvaliada.ACEITEI) },
                ),
                margem(12),
            )
        }
        // A janela é a moldura (com a sombra); o toque fora chega nela.
        val janela = moldura(raiz, 20).apply {
            setOnTouchListener { v, e ->
                if (e.actionMasked == MotionEvent.ACTION_OUTSIDE) {
                    if (!tecladoVisivel(v)) fecharPainel()
                    true
                } else {
                    false
                }
            }
            alpha = 0f
            translationY = -dp(16).toFloat()
        }
        eBusca.setOnEditorActionListener { v, acao, _ ->
            if (acao == EditorInfo.IME_ACTION_DONE) {
                (getSystemService(Context.INPUT_METHOD_SERVICE) as InputMethodManager).hideSoftInputFromWindow(v.windowToken, 0)
                true
            } else {
                false
            }
        }

        val (largura, _) = tela()
        val p = parametros(
            min(largura - dp(16), dp(400)) + 2 * folgaLado,
            WindowManager.LayoutParams.WRAP_CONTENT,
            // Focável (para o teclado, só quando tocar num campo); toques fora vão para o app de baixo.
            WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL or WindowManager.LayoutParams.FLAG_WATCH_OUTSIDE_TOUCH,
        ).apply {
            gravity = Gravity.TOP or Gravity.CENTER_HORIZONTAL
            y = alturaBarraStatus() + dp(8)
            softInputMode = WindowManager.LayoutParams.SOFT_INPUT_STATE_ALWAYS_HIDDEN or WindowManager.LayoutParams.SOFT_INPUT_ADJUST_PAN
        }
        if (!adicionar(janela, p)) return
        painel = janela
        raiz.requestFocus() // o foco fica no painel, não no campo: o teclado não abre sozinho
        janela.animate().alpha(1f).translationY(0f).setDuration(220).setInterpolator(DecelerateInterpolator()).start()
    }

    private fun fecharPainel() {
        val v = painel ?: return
        painel = null
        try {
            (getSystemService(Context.INPUT_METHOD_SERVICE) as InputMethodManager).hideSoftInputFromWindow(v.windowToken, 0)
        } catch (e: RuntimeException) {
            // janela já fechando
        }
        v.animate().alpha(0f).translationY(-dp(12).toFloat()).setDuration(180).withEndAction { remover(v) }.start()
    }

    // ------------------------------------------------------------------ telas lidas

    /** O leitor entendeu uma tela do app de corrida. Chamar na thread principal. */
    fun receberTela(app: String, tela: TelaLida) {
        if (Looper.myLooper() != Looper.getMainLooper()) {
            principal.post { receberTela(app, tela) }
            return
        }
        if (Armazenamento.pausado(this)) return
        diagnostico(app, tela)
        // Digitando no lápis: a caixinha tira o foco do app de corrida e a leitura parece
        // "oferta sumiu". Enquanto ela está aberta, só ofertas e contrapropostas contam.
        if (campoValor != null && tela !is TelaLida.ComOferta && tela !is TelaLida.Contraproposta) return
        when (tela) {
            is TelaLida.ComOferta -> {
                ofertaVistaEm = SystemClock.elapsedRealtime()
                tratarOferta(tela.oferta)
            }
            is TelaLida.Contraproposta -> {
                ofertaVistaEm = SystemClock.elapsedRealtime()
                tratarContraproposta(app, tela.valor)
            }
            is TelaLida.EmAndamento -> {
                if (!aceitarAutomatico(app, tela.gatilho) && app == "indrive" && cartao != null && cartaoOrigem == "leitura" && cartaoApp == app) {
                    principal.removeCallbacks(conferirSumico)
                    principal.postDelayed(conferirSumico, SUMICO_MS)
                }
            }
            is TelaLida.Concluida -> if (app in APPS_ACEITE_AUTOMATICO) {
                fecharCronometro()
                concluirAutomatico(app, tela.gatilho)
            }
            TelaLida.Lista, TelaLida.Fim -> {
                // Expirou / já aceita por outro / procurando: a oferta não ficou com o motorista.
                aceitePendente = null
                limparLeitura()
                if (cartao != null && cartaoOrigem == "leitura" && cartaoApp == app) ofertaSumiu()
            }
            TelaLida.Nada -> {
                // inDrive: a oferta saiu da tela (ex.: o motorista aceitou e foi para a corrida).
                if (app == "indrive" && cartao != null && cartaoOrigem == "leitura" && cartaoApp == app) {
                    principal.removeCallbacks(conferirSumico)
                    principal.postDelayed(conferirSumico, SUMICO_MS)
                }
            }
        }
    }

    private val conferirSumico = Runnable {
        if (campoValor == null && cartao != null && cartaoOrigem == "leitura" && cartaoApp == "indrive" &&
            SystemClock.elapsedRealtime() - ofertaVistaEm >= SUMICO_MS
        ) {
            limparLeitura()
            ofertaSumiu()
        }
    }

    /**
     * Tela de corrida em andamento no inDrive: se veio até [Aceite.JANELA_MS] depois
     * da última oferta (ou contraproposta) sem resposta, marca a corrida como aceita
     * (origem "automatica", valor final = a sua oferta, senão o da oferta) e não
     * pergunta "Você aceitou?". Devolve true se marcou.
     */
    private fun aceitarAutomatico(app: String, gatilho: String): Boolean {
        val p = aceitePendente ?: return false
        if (p.oferta.app != app) return false
        aceitePendente = null
        if (!Aceite.dentroDaJanela(p.vistaEm, SystemClock.elapsedRealtime())) return false
        val corrida = Armazenamento.corridas(this).firstOrNull { it.id == p.id } ?: return false
        if (corrida.decisao != CorridaAvaliada.SEM_RESPOSTA) return false
        val o = cartaoOferta?.takeIf { cartaoCorrida?.id == p.id } ?: p.oferta
        if (perguntaId == p.id) fecharMini()
        if (campoValor != null) fecharCampoValor()
        limparLeitura()
        decidir(corrida, CorridaAvaliada.ACEITEI, o, origem = Aceite.ORIGEM_AUTOMATICA)
        rotuloDiag?.text = "${nomeDoApp(app)}: aceita automaticamente · \"$gatilho\" · ${Copiloto.reais(Aceite.valorFinal(o))}"
        return true
    }

    /**
     * Tela de fim de corrida ("corrida concluída", avaliar o passageiro): a última
     * oferta que ficou sem resposta foi feita. Marca como aceita sozinho, sem perguntar.
     */
    private fun concluirAutomatico(app: String, gatilho: String) {
        val (id, em) = ultimaSemResposta ?: return
        if (SystemClock.elapsedRealtime() - em > DURACAO_MAXIMA_CORRIDA_MS) return
        val corrida = Armazenamento.corridas(this).firstOrNull { it.id == id } ?: return
        if (corrida.app != app || corrida.decisao != CorridaAvaliada.SEM_RESPOSTA) return
        ultimaSemResposta = null
        if (perguntaId == id) fecharMini()
        val valor = corrida.suaOferta ?: corrida.valor
        Armazenamento.atualizarDecisao(this, id, CorridaAvaliada.ACEITEI, Aceite.ORIGEM_AUTOMATICA, valor)
        Armazenamento.registrarAceiteNoResumo(this, valor, corrida.lucro)
        PlantaoPlugin.emitirDecisao(id, CorridaAvaliada.ACEITEI, Aceite.ORIGEM_AUTOMATICA, valor)
        rotuloDiag?.text = "inDrive: corrida concluída · \"$gatilho\" · marcada como feita"
    }

    /** Guarda (ou renova) a oferta do inDrive para o aceite automático. */
    private fun lembrarParaAceite(id: String?, o: OfertaDetalhada) {
        if (id == null || o.app !in APPS_ACEITE_AUTOMATICO) return
        aceitePendente = AceitePendente(id, o, SystemClock.elapsedRealtime())
    }

    private fun tratarOferta(o: OfertaDetalhada) {
        val chave = o.chave()
        if (chave == recusada) return
        recusada = null
        if (o.app == "indrive") {
            // Mesma oferta ainda aberta (o inDrive redesenha a tela o tempo todo): só guarda os detalhes novos.
            if (chave == chaveAberta) {
                ofertaAberta = o.comVoltaDe(ofertaAberta).copy(suaOferta = ofertaAberta?.suaOferta, valorFinal = ofertaAberta?.valorFinal)
                ofertaAberta?.let { lembrarParaAceite(ofertaAbertaId, cartaoOferta?.takeIf { cartaoCorrida?.id == ofertaAbertaId } ?: it) }
                return
            }
        } else {
            val agora = SystemClock.elapsedRealtime()
            if (chave == ultimaChave && agora - ultimaEm < JANELA_REPETICAO_MS) return
            ultimaEm = agora
        }
        ultimaChave = chave
        chaveAberta = chave
        val comVolta = prepararVolta(o).first // volta do cache, se já calculada para este destino
        ofertaAberta = comVolta
        val corrida = registrarOferta(comVolta, "leitura", mostrar = true)
        ofertaAbertaId = corrida.id
        lembrarParaAceite(corrida.id, comVolta)
        // Print da oferta (se ligado): uma vez por oferta, com o cartão já na tela; não trava (fundo).
        if (Armazenamento.preferencias(this).printOfertas) {
            principal.postDelayed({ LeitorCorridasService.instancia?.printOferta(comVolta.suaOferta ?: comVolta.valor, comVolta.app) }, 350)
        }
    }

    private fun tratarContraproposta(app: String, valor: Long) {
        val base = ofertaAberta ?: return
        if (base.app != app) return
        if (base.suaOferta == valor) {
            // A mesma contraproposta ainda na tela: só renova o prazo do aceite automático.
            lembrarParaAceite(ofertaAbertaId, cartaoOferta?.takeIf { cartaoCorrida?.id == ofertaAbertaId } ?: base)
            return
        }
        // A contraproposta passa a ser o valor do cartão e o valor final (o lápis pode corrigir depois).
        val o = base.copy(suaOferta = valor, valorFinal = null)
        ofertaAberta = o
        val id = ofertaAbertaId
        lembrarParaAceite(id, o)
        if (id != null) Armazenamento.atualizarSuaOferta(this, id, valor)
        val regua = reguaAgora()
        val r = avaliar(o, regua.criterios)
        val corrida = (cartaoCorrida?.takeIf { it.id == id } ?: Armazenamento.corridas(this).firstOrNull { it.id == id })?.copy(suaOferta = valor, valorFinal = null)
            ?: CorridaAvaliada.nova(o, r.avaliacao, "leitura", app, regua.faixa)
        val volta = if (cartaoCorrida?.id == id) cartaoVolta else estadoVoltaDe(o)
        mostrarCartao(o, r, corrida, "leitura", volta = volta, faixa = regua.faixa)
        ultimaOferta = o
        ultimaAvaliacao = r.avaliacao
        atualizarNotificacao()
    }

    /** Critérios salvos com o chip "Contar volta para casa" do cartão aplicado (só no aparelho). */
    private fun criteriosDoCartao(): Criterios = comVoltaDoCartao(Armazenamento.criterios(this), Armazenamento.voltaCartao(this))

    /** Chip do cartão: liga/desliga a volta no cálculo e recalcula na hora (busca a volta se faltar). */
    private fun alternarVoltaCartao() {
        val novo = !criteriosDoCartao().contarVolta
        Armazenamento.definirVoltaCartao(this, novo)
        val o = cartaoOferta ?: return
        val c = cartaoCorrida ?: return
        val (comVolta, estado) = prepararVolta(o)
        cartaoVolta = estado
        mostrarCartao(comVolta, avaliar(comVolta), c, cartaoOrigem, animar = false, volta = estado, faixa = cartaoFaixa)
        if (estado == EstadoVolta.Calculando) pedirVolta(comVolta, c.id)
    }

    /** Aviso da comunidade para esta oferta (embarque ou destino que 3+ motoristas evitam). */
    private fun alertaComunidade(o: OfertaDetalhada): Comunidade.Alerta? =
        Comunidade.alerta(o, Armazenamento.comunidade(this), Comunidade.ehNoite(agoraBrasilia().get(Calendar.HOUR_OF_DAY)))

    /** Régua que vale agora (faixa de horário pelo relógio de Brasília). */
    private fun reguaAgora(): ReguaNoHorario {
        val agora = agoraBrasilia()
        return criteriosNoHorario(criteriosDoCartao(), agora.get(Calendar.HOUR_OF_DAY) * 60 + agora.get(Calendar.MINUTE))
    }

    private fun avaliar(o: OfertaDetalhada, c: Criterios = reguaAgora().criterios): Copiloto.Resultado =
        Copiloto.avaliar(o, taxas(Armazenamento.perfil(this)), c.paraApp(o.app), Armazenamento.lugaresAdicionados(this))

    /**
     * Uma oferta chegou (do plugin "simular" ou digitada): avalia, guarda na fila,
     * mostra o cartão e avisa a WebView (se estiver aberta).
     */
    fun receberOferta(oferta: Oferta, origem: String, app: String?) {
        if (Looper.myLooper() != Looper.getMainLooper()) {
            principal.post { receberOferta(oferta, origem, app) }
            return
        }
        registrarOferta(OfertaDetalhada.de(oferta, app ?: "outra"), origem, mostrar = true)
    }

    private fun registrarOferta(oLida: OfertaDetalhada, origem: String, mostrar: Boolean): CorridaAvaliada {
        // Volta já calculada para este destino (cache): entra na hora; senão, calcula em segundo plano.
        val (o, volta) = prepararVolta(oLida)
        val regua = reguaAgora()
        val r = avaliar(o, regua.criterios)
        val app = if (origem == "digitada" && o.app == "outra") null else o.app
        val corrida = CorridaAvaliada.nova(o, r.avaliacao, origem, app, regua.faixa, custoDaVolta(o))
        Armazenamento.adicionar(this, corrida)
        ultimaSemResposta = corrida.id to SystemClock.elapsedRealtime()
        Armazenamento.registrarOfertaNoResumo(this)
        if (mostrar) {
            mostrarCartao(o, r, corrida, origem, volta = volta, faixa = regua.faixa)
            vibrar(r.avaliacao.sinal)
            val prefs = Armazenamento.preferencias(this)
            if (prefs.voz) avisos?.falar(Cartao.fala(r.avaliacao) + (alertaComunidade(o)?.let { " " + it.fala() } ?: ""))
            if (prefs.bip && r.avaliacao.sinal == Sinal.VERDE) avisos?.bip()
        }
        if (volta == EstadoVolta.Calculando) pedirVolta(o, corrida.id)
        ultimaOferta = o
        ultimaAvaliacao = r.avaliacao
        atualizarNotificacao()
        PlantaoPlugin.emitirOferta(corrida, r.avaliacao)
        return corrida
    }

    private fun vibrar(s: Sinal) {
        if (!Armazenamento.vibrar(this)) return
        val padrao = when (s) {
            Sinal.VERDE -> longArrayOf(0, 45)
            Sinal.VERMELHO -> longArrayOf(0, 45, 110, 45)
            Sinal.AMARELO -> return
        }
        try {
            val v: Vibrator? = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                (getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as? VibratorManager)?.defaultVibrator
            } else {
                @Suppress("DEPRECATION")
                getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
            }
            if (v == null || !v.hasVibrator()) return
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                v.vibrate(VibrationEffect.createWaveform(padrao, -1))
            } else {
                @Suppress("DEPRECATION")
                v.vibrate(padrao, -1)
            }
        } catch (e: RuntimeException) {
            // sem vibração neste aparelho
        }
    }

    // ------------------------------------------------------------------ volta para a base

    /** A volta entra no cartão quando a régua conta a volta ou o motorista escolheu o campo "volta". */
    private fun voltaAplicavel(o: OfertaDetalhada): Boolean =
        o.destino != null && (criteriosDoCartao().contarVolta || "volta" in Armazenamento.preferencias(this).campos)

    /** Base das preferências (ou definida pela bolha); sem base, "onde estou agora". */
    private fun pontoBase(): Ponto? = Armazenamento.preferencias(this).base?.let { Ponto(it.lat, it.lon) } ?: Localizacao.ultima(this)

    /** Situação da volta desta oferta, sem pedir nada à rede (só o cache). */
    private fun estadoVoltaDe(o: OfertaDetalhada): EstadoVolta {
        val destino = o.destino
        if (destino == null || !voltaAplicavel(o)) return EstadoVolta.Nenhuma
        val base = pontoBase() ?: return EstadoVolta.Nenhuma
        val c = calculadoraVolta?.doCache(destino, base) ?: return EstadoVolta.Calculando
        val rota = c.rota ?: return EstadoVolta.Indisponivel
        return EstadoVolta.Pronta(rota.km, rota.minutos, Volta.levaParaCasa(rota.destino, base, Localizacao.ultima(this)))
    }

    private fun prepararVolta(o: OfertaDetalhada): Pair<OfertaDetalhada, EstadoVolta> {
        val e = estadoVoltaDe(o)
        return if (e is EstadoVolta.Pronta) Pair(o.copy(kmVolta = e.km, minutosVolta = e.minutos), e) else Pair(o, e)
    }

    /** Custo de rodar a volta (mesmo quando a régua não desconta), para mostrar e para a fila. */
    private fun custoDaVolta(o: OfertaDetalhada): Long? = o.kmVolta?.let { km ->
        custoDe(taxas(Armazenamento.perfil(this)), km, o.minutosVolta ?: ((km / KM_POR_HORA_CIDADE) * 60))
    }

    /** Pede a volta em segundo plano (Photon + OSRM, 4 s no máximo); o cartão atualiza quando chegar. */
    private fun pedirVolta(o: OfertaDetalhada, id: String) {
        val destino = o.destino ?: return
        val base = pontoBase() ?: return
        val calc = calculadoraVolta ?: return
        // O destino fica a no máximo (busca + viagem) em linha reta de onde o motorista está.
        val aqui = Localizacao.ultima(this)
        val limite = if (aqui != null) (o.kmBusca ?: 5.0) + o.kmCorrida + 10 else CalculadoraVolta.LIMITE_PADRAO_KM
        calc.calcular(destino, base, aqui, limite) { rota -> principal.post { voltaChegou(id, destino, base, rota) } }
    }

    private fun voltaChegou(id: String, destino: String, base: Ponto, rota: CalculadoraVolta.Rota?) {
        if (instancia !== this) return
        val estado = if (rota == null) {
            EstadoVolta.Indisponivel
        } else {
            EstadoVolta.Pronta(rota.km, rota.minutos, Volta.levaParaCasa(rota.destino, base, Localizacao.ultima(this)))
        }
        fun comVolta(o: OfertaDetalhada) = if (rota != null && o.destino == destino) o.copy(kmVolta = rota.km, minutosVolta = rota.minutos) else o
        ofertaAberta?.let { if (it.destino == destino) ofertaAberta = comVolta(it) }
        val daFila = when {
            cartaoCorrida?.id == id -> cartaoOferta
            ofertaAbertaId == id -> ofertaAberta
            else -> null
        }
        if (rota != null && daFila != null) {
            val o = comVolta(daFila)
            Armazenamento.atualizarVolta(this, id, rota.km, custoDaVolta(o) ?: 0, avaliar(o).avaliacao)
        }
        val c = cartaoCorrida
        val o = cartaoOferta
        if (cartao != null && c != null && o != null && c.id == id) {
            val nova = comVolta(o)
            val r = avaliar(nova)
            mostrarCartao(nova, r, c, cartaoOrigem, animar = false, volta = estado, faixa = cartaoFaixa)
            ultimaOferta = nova
            ultimaAvaliacao = r.avaliacao
        }
    }

    // ------------------------------------------------------------------ cartão

    /** Redesenha o cartão aberto (tema, régua ou preferências mudaram). */
    private fun redesenharCartao() {
        val o = cartaoOferta ?: return
        val c = cartaoCorrida ?: return
        if (cartao == null) return
        mostrarCartao(o, avaliar(o), c, cartaoOrigem, animar = false, volta = cartaoVolta, faixa = cartaoFaixa)
    }

    /** Cartão que dá para arrastar na vertical (muda a posição) e para o lado (fecha). */
    @SuppressLint("ViewConstructor")
    private inner class CartaoLayout(ctx: Context, private val app: String, private val soVertical: Boolean) : FrameLayout(ctx) {
        private val folga = ViewConfiguration.get(ctx).scaledTouchSlop
        private var x0 = 0f
        private var y0 = 0f
        private var yJanela0 = 0
        private var modo = 0 // 0 nada, 1 vertical, 2 horizontal

        override fun onInterceptTouchEvent(e: MotionEvent): Boolean {
            when (e.actionMasked) {
                MotionEvent.ACTION_DOWN -> inicio(e)
                MotionEvent.ACTION_MOVE -> if (decidirModo(e)) return true
            }
            return false
        }

        private fun inicio(e: MotionEvent) {
            x0 = e.rawX
            y0 = e.rawY
            yJanela0 = cartaoParams?.y ?: 0
            modo = 0
        }

        private fun decidirModo(e: MotionEvent): Boolean {
            if (modo != 0) return true
            val dx = e.rawX - x0
            val dy = e.rawY - y0
            if (abs(dx) < folga && abs(dy) < folga) return false
            // fixarCentro: o cartão só sobe e desce (não sai de lado nem sai do centro).
            modo = if (!soVertical && abs(dx) > abs(dy)) 2 else 1
            return true
        }

        @SuppressLint("ClickableViewAccessibility")
        override fun onTouchEvent(e: MotionEvent): Boolean {
            when (e.actionMasked) {
                MotionEvent.ACTION_DOWN -> inicio(e)
                MotionEvent.ACTION_MOVE -> {
                    if (!decidirModo(e)) return true
                    val dx = e.rawX - x0
                    val dy = e.rawY - y0
                    if (modo == 1) {
                        val p = cartaoParams ?: return true
                        val (_, altura) = tela()
                        p.y = (yJanela0 + dy.toInt()).coerceIn(0, (altura - height).coerceAtLeast(0))
                        atualizar(this, p)
                    } else if (modo == 2) {
                        translationX = dx
                        alpha = (1f - abs(dx) / width.coerceAtLeast(1)).coerceIn(0.2f, 1f)
                    }
                }
                MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> {
                    if (modo == 1) {
                        cartaoParams?.let { Armazenamento.salvarCartaoY(this@BolhaService, app, it.y) }
                    } else if (modo == 2) {
                        val dx = e.rawX - x0
                        if (abs(dx) > width * 0.3f) {
                            fecharCartaoDeLado(dx > 0)
                        } else {
                            animate().translationX(0f).alpha(1f).setDuration(150).start()
                        }
                    }
                    modo = 0
                }
            }
            return true
        }
    }

    /** Linha em destaque com o detalhe pequeno embaixo (km e tempo totais do cartão). */
    // ------------------------------------------------------------------ cronômetro da corrida

    private fun iniciarCronometro(embarque: String?, destino: String?) {
        fecharCronometro()
        corridaDesde = SystemClock.elapsedRealtime()
        corridaEmbarque = embarque
        corridaDestino = destino
        mostrarPilulaCorrida()
        principal.postDelayed(tiqueCorrida, 30_000)
    }

    private fun fecharCronometro() {
        principal.removeCallbacks(tiqueCorrida)
        corridaDesde = null
        remover(pilulaCorrida)
        pilulaCorrida = null
        textoCorrida = null
    }

    private fun atualizarCronometro() {
        val desde = corridaDesde ?: return
        val min = (SystemClock.elapsedRealtime() - desde) / 60_000
        textoCorrida?.text = "● " + if (min >= 60) "${min / 60}h${(min % 60).toString().padStart(2, '0')}" else "$min min"
    }

    /**
     * Pílula da corrida em andamento: "● 12 min", embarque, destino e ✕. Arraste
     * para mudar de lugar; puxe a barrinha (ou toque nela) para ver valor, lucro,
     * km e o destino.
     */
    @SuppressLint("ClickableViewAccessibility")
    private fun mostrarPilulaCorrida() {
        val pal = paleta()
        val txt = texto("", 12f, pal.texto, true).apply { maxLines = 1 }
        val detalhes = LinearLayout(ui).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(4), dp(4), dp(4), dp(2))
            corridaResumo?.let { addView(texto(it, 12.5f, pal.texto, true).apply { maxLines = 1 }) }
            corridaEmbarque?.let { addView(texto("Embarque: $it", 11.5f, pal.secundario).apply { maxLines = 1; ellipsize = TextUtils.TruncateAt.END }, margem(3)) }
            corridaDestino?.let { addView(texto("Destino: $it", 11.5f, pal.secundario).apply { maxLines = 1; ellipsize = TextUtils.TruncateAt.END }, margem(2)) }
            visibility = if (pilulaAberta) View.VISIBLE else View.GONE
        }
        val linha = LinearLayout(ui).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            addView(txt)
            listOfNotNull(
                corridaEmbarque?.let { Triple(R.drawable.ic_traco_pin, it, "Ir ao embarque") },
                corridaDestino?.let { Triple(R.drawable.ic_traco_bandeira, it, "Ir ao destino") },
            ).forEach { (res, endereco, descricao) ->
                addView(
                    FrameLayout(ui).apply {
                        background = circulo(comAlfa(pal.destaque, 0x1F))
                        contentDescription = descricao
                        isClickable = true
                        setOnClickListener { abrirNavegacao(endereco) }
                        addView(iconeTraco(res, pal.destaque, 16), FrameLayout.LayoutParams(dp(16), dp(16), Gravity.CENTER))
                    },
                    LinearLayout.LayoutParams(dp(30), dp(30)).apply { marginStart = dp(8) },
                )
            }
            addView(
                texto("✕", 13f, pal.secundario, true).apply {
                    gravity = Gravity.CENTER
                    contentDescription = "Fechar o cronômetro"
                    isClickable = true
                    setOnClickListener { fecharCronometro() }
                },
                LinearLayout.LayoutParams(dp(30), dp(26)).apply { marginStart = dp(4) },
            )
        }
        val barra = View(ui).apply { background = fundoArredondado(comAlfa(pal.secundario, 0x88), 99) }
        val alca = FrameLayout(ui).apply {
            contentDescription = "Puxe para ver os detalhes da corrida"
            addView(barra, FrameLayout.LayoutParams(dp(28), dp(3), Gravity.CENTER))
        }
        val v = LinearLayout(ui).apply {
            orientation = LinearLayout.VERTICAL
            background = fundoArredondado(pal.fundo, 18, pal.borda)
            elevation = dp(3).toFloat()
            setPadding(dp(12), dp(4), dp(4), 0)
            addView(linha)
            addView(detalhes, LinearLayout.LayoutParams(dp(250), ViewGroup.LayoutParams.WRAP_CONTENT))
            addView(alca, LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(14)))
        }
        val p = parametros(WindowManager.LayoutParams.WRAP_CONTENT, WindowManager.LayoutParams.WRAP_CONTENT, WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE).apply {
            gravity = Gravity.TOP or Gravity.CENTER_HORIZONTAL
            y = alturaBarraStatus() + dp(2)
        }
        fun abrir(sim: Boolean) {
            pilulaAberta = sim
            detalhes.visibility = if (sim) View.VISIBLE else View.GONE
        }
        // Barrinha: puxar para baixo abre, para cima fecha; tocar alterna.
        var ya = 0f
        var puxou = false
        alca.setOnTouchListener { a, e ->
            when (e.actionMasked) {
                MotionEvent.ACTION_DOWN -> { ya = e.rawY; puxou = false; true }
                MotionEvent.ACTION_MOVE -> {
                    val dy = e.rawY - ya
                    if (!puxou && dy > dp(12)) { puxou = true; abrir(true) }
                    if (!puxou && dy < -dp(12)) { puxou = true; abrir(false) }
                    true
                }
                MotionEvent.ACTION_UP -> { if (!puxou) { a.performClick(); abrir(!pilulaAberta) }; true }
                else -> false
            }
        }
        // O cronômetro (texto) arrasta a pílula pela tela.
        var x0 = 0f
        var y0 = 0f
        var px = 0
        var py = 0
        txt.setOnTouchListener { _, e ->
            when (e.actionMasked) {
                MotionEvent.ACTION_DOWN -> { x0 = e.rawX; y0 = e.rawY; px = p.x; py = p.y; true }
                MotionEvent.ACTION_MOVE -> {
                    p.x = px + (e.rawX - x0).toInt()
                    p.y = (py + (e.rawY - y0).toInt()).coerceAtLeast(0)
                    try { wm.updateViewLayout(v, p) } catch (x: RuntimeException) {}
                    true
                }
                MotionEvent.ACTION_UP -> {
                    // Toque sem arrastar: abre ou fecha os detalhes.
                    if (kotlin.math.abs(e.rawX - x0) < dp(6) && kotlin.math.abs(e.rawY - y0) < dp(6)) abrir(!pilulaAberta)
                    true
                }
                else -> false
            }
        }
        txt.setPadding(0, dp(6), dp(4), dp(6))
        if (!adicionar(v, p)) return
        pilulaCorrida = v
        textoCorrida = txt
        atualizarCronometro()
    }

    // ------------------------------------------------------------------ cartão: peças

    /** Bloco do "Detalhes" do cartão na tela (para abrir e fechar animado) e o botão dele. */
    private var blocoDetalhes: View? = null
    private var pilulaDetalhes: LinearLayout? = null

    private fun rotularDetalhes() {
        val p = pilulaDetalhes ?: return
        (p.getChildAt(0) as? ImageView)?.setImageResource(if (cartaoDetalhes) R.drawable.ic_traco_recolher else R.drawable.ic_traco_expandir)
        (p.getChildAt(1) as? TextView)?.text = if (cartaoDetalhes) "Resumo" else "Detalhes"
    }

    /**
     * Abre ou fecha o "Detalhes" sem trocar o cartão: o bloco cresce (ou encolhe)
     * para baixo com fade; a janela acompanha a altura. No fim, redesenha uma vez.
     */
    private fun alternarDetalhes(abrir: Boolean) {
        val b = blocoDetalhes ?: return
        if (abrir == cartaoDetalhes) return
        cartaoDetalhes = abrir
        rotularDetalhes()
        if (abrir) {
            b.measure(View.MeasureSpec.makeMeasureSpec((b.parent as View).width - (b.parent as View).paddingLeft - (b.parent as View).paddingRight, View.MeasureSpec.EXACTLY), View.MeasureSpec.makeMeasureSpec(0, View.MeasureSpec.UNSPECIFIED))
            animarAltura(b, 0, b.measuredHeight, 0f, 1f) { b.layoutParams = b.layoutParams.apply { height = ViewGroup.LayoutParams.WRAP_CONTENT }; b.requestLayout() }
        } else {
            animarAltura(b, b.height, 0, 1f, 0f) {}
        }
    }

    private fun animarAltura(v: View, de: Int, ate: Int, alfaDe: Float, alfaAte: Float, fim: () -> Unit) {
        v.alpha = alfaDe
        ValueAnimator.ofFloat(0f, 1f).apply {
            duration = 220
            interpolator = DecelerateInterpolator()
            addUpdateListener {
                val f = it.animatedValue as Float
                v.layoutParams = v.layoutParams.apply { height = (de + (ate - de) * f).toInt() }
                v.alpha = alfaDe + (alfaAte - alfaDe) * f
                v.requestLayout()
            }
            addListener(object : android.animation.AnimatorListenerAdapter() {
                override fun onAnimationEnd(animation: android.animation.Animator) = fim()
            })
            start()
        }
    }

    /** Ícone de traço (res/drawable/ic_traco_*) na cor pedida. */
    private fun iconeTraco(res: Int, cor: Int, tamanhoDp: Int = 14): ImageView = ImageView(ui).apply {
        setImageResource(res)
        setColorFilter(cor)
        layoutParams = LinearLayout.LayoutParams(dp(tamanhoDp), dp(tamanhoDp))
    }

    /** Pílula com ícone de traço e texto (Detalhes/Resumo, lápis, navegação). */
    private fun pilulaIcone(t: String, res: Int?, cor: Int, cheia: Boolean, descricao: String, acao: () -> Unit): LinearLayout = LinearLayout(ui).apply {
        orientation = LinearLayout.HORIZONTAL
        gravity = Gravity.CENTER
        background = if (cheia) fundoArredondado(cor, 99) else fundoArredondado(comAlfa(cor, 0x14), 99, comAlfa(cor, 0x55))
        setPadding(dp(10), dp(5), dp(10), dp(5))
        val corTexto = if (cheia) BRANCO else cor
        res?.let { addView(iconeTraco(it, corTexto, 14)) }
        addView(texto(t, 12f, corTexto, true).apply { maxLines = 1; ellipsize = TextUtils.TruncateAt.END; if (res != null) setPadding(dp(5), 0, 0, 0) })
        contentDescription = descricao
        isClickable = true
        setOnClickListener { acao() }
    }

    /**
     * Cartão da oferta, igual nos dois modos (só cresce no "Detalhes"):
     *  - cabeçalho: app, valor, sinal, Detalhes/Resumo (sempre no mesmo lugar) e ✕;
     *  - 4 colunas do mesmo tamanho: os 3 campos escolhidos e o total (km e tempo);
     *  - uma linha de dica (lápis, risco ou motivo) e Recusei/Aceitei.
     * O "Detalhes" acrescenta o passageiro, a divisão do total, o destino, o lápis
     * com o lucro, o chip da volta e o valor final.
     */
    private fun conteudoDoCartao(
        o: OfertaDetalhada,
        r: Copiloto.Resultado,
        corrida: CorridaAvaliada,
        origem: String,
        dados: Cartao.Dados,
        volta: EstadoVolta,
        pal: Paleta,
        cor: Int,
        chaveApp: String,
        prefs: PreferenciasCopiloto,
    ): LinearLayout = LinearLayout(ui).apply {
        val a = r.avaliacao
        orientation = LinearLayout.VERTICAL
        setPadding(dp(12), dp(9), dp(8), dp(10))
        val comVolta = criteriosDoCartao().contarVolta && volta is EstadoVolta.Pronta

        // Cabeçalho.
        addView(LinearLayout(ui).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            addView(iconeDoApp(if (chaveApp == "digitada") null else o.app), LinearLayout.LayoutParams(dp(24), dp(24)))
            addView(texto(Copiloto.reais(Aceite.valorFinal(o)), 20f, pal.texto, true).apply { maxLines = 1 }, LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT).apply { marginStart = dp(8) })
            addView(selo(seloDoSinal(a.sinal), cor), LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT).apply { marginStart = dp(8) })
            addView(View(ui), LinearLayout.LayoutParams(0, 1, 1f))
            addView(
                texto("✕", 15f, pal.secundario, true).apply {
                    gravity = Gravity.CENTER
                    contentDescription = getString(R.string.plantao_fechar)
                    isClickable = true
                    setOnClickListener { marcarDispensada(); fecharCartao() }
                },
                LinearLayout.LayoutParams(dp(30), dp(28)),
            )
        })

        // Métricas: colunas de peso igual (simétricas); a última é o total com ícones.
        val (grandes, _) = Cartao.dividir(prefs.campos)
        fun coluna(numero: String, rotulo: String, corNumero: Int) = LinearLayout(ui).apply {
            orientation = LinearLayout.VERTICAL
            addView(texto(numero, 17f, corNumero, true).apply { maxLines = 1 })
            addView(texto(rotulo, 10.5f, pal.secundario).apply { maxLines = 1 })
        }
        val colunas = grandes.map { campo ->
            val (n, rot) = Cartao.grande(campo, dados)
            val rotulo = if (campo == "lucro" && comVolta) "Lucro c/ volta" else rot.replaceFirstChar { it.uppercase() }
            coluna(n, rotulo, if (campo.startsWith("lucro") && a.lucro <= 0) VERMELHO else pal.texto)
        }.toMutableList<View>()
        if ("distanciaTotal" !in grandes && "tempoTotal" !in grandes) {
            fun item(res: Int, t: String) = LinearLayout(ui).apply {
                orientation = LinearLayout.HORIZONTAL
                gravity = Gravity.CENTER_VERTICAL
                addView(iconeTraco(res, pal.destaque, 14))
                addView(texto(t, 13f, pal.texto, true).apply { maxLines = 1; setPadding(dp(5), 0, 0, 0) })
            }
            colunas.add(LinearLayout(ui).apply {
                orientation = LinearLayout.VERTICAL
                addView(item(R.drawable.ic_traco_carro, Cartao.kmTotal(o, a).principal.removeSuffix(" no total")))
                addView(item(R.drawable.ic_traco_relogio, Cartao.minutosTotal(o, a).principal.removeSuffix(" no total")), margem(2))
            })
        }
        addView(LinearLayout(ui).apply {
            orientation = LinearLayout.HORIZONTAL
            colunas.forEach { addView(it, LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f)) }
        }, margem(8))

        // Volta para casa: na parte de cima, sempre à vista (é o que mais muda a conta).
        if (o.destino != null) addView(linhaVolta(o, volta, dados, pal), margem(8))

        // Alerta (risco, comunidade ou motivo) e a dica de preço: iguais nos dois modos.
        val comunidade = alertaComunidade(o)
        val alerta: Pair<String, Int>? = when {
            r.risco -> "⚠ Área de risco" to AMARELO
            comunidade != null -> comunidade.texto() to AMARELO
            a.sinal != Sinal.VERDE -> Copiloto.motivoPrincipal(a)?.let { it to cor }
            else -> null
        }
        alerta?.let { (t, c) -> addView(texto(t, 12f, c, true).apply { maxLines = 1; ellipsize = TextUtils.TruncateAt.END }, margem(6)) }
        val sugestao = if (o.app == "indrive" && origem == "leitura" && o.suaOferta == null && r.lugarEvitado == null) {
            Copiloto.sugerir(o, taxas(Armazenamento.perfil(this@BolhaService)), reguaAgora().criterios.paraApp(o.app), a.sinal)
        } else {
            null
        }
        val comValor = when (sugestao) {
            is Copiloto.Sugestao.Atalho -> sugestao.valor to sugestao.avaliacao
            is Copiloto.Sugestao.Lapis -> sugestao.valor to sugestao.avaliacao
            else -> null
        }
        comValor?.let { (_, av) ->
            addView(texto("${Copiloto.textoSugestao(sugestao!!)} → ${Copiloto.textoLucro(av, comVolta)}", 12.5f, pal.destaque, true).apply { maxLines = 1; ellipsize = TextUtils.TruncateAt.END }, margem(4))
        }

        // Bloco do "Detalhes": tudo o que é extra fica aqui, para abrir e fechar animado.
        val bloco = LinearLayout(ui).apply {
            orientation = LinearLayout.VERTICAL
            val passageiro = listOfNotNull(o.nome, o.nota?.let { Cartao.nota(it) + (o.corridasPassageiro?.let { n -> " ($n)" } ?: "") }, o.pagamento).joinToString(" · ")
            if (passageiro.isNotEmpty()) addView(texto(passageiro, 12.5f, pal.texto, true).apply { maxLines = 1; ellipsize = TextUtils.TruncateAt.END }, margem(8))
            Cartao.totais(o, a).detalhe?.let { addView(texto(it, 11.5f, pal.secundario).apply { maxLines = 1; ellipsize = TextUtils.TruncateAt.END }, margem(2)) }
            o.destino?.let { addView(texto("Destino: $it", 12f, pal.texto).apply { maxLines = 1; ellipsize = TextUtils.TruncateAt.END }, margem(2)) }
            comValor?.let { (v, av) -> addView(texto(Copiloto.textoComValor(v, av).replaceFirstChar { it.uppercase() }, 11.5f, pal.secundario).apply { maxLines = 1 }, margem(2)) }
            if (o.valorFinal != null) {
                val de = o.suaOferta?.let { " (sua oferta ${Copiloto.reais(it)})" } ?: " (oferta ${Copiloto.reais(o.valor)})"
                addView(texto("Valor final: ${Copiloto.reais(o.valorFinal)}$de", 12.5f, pal.destaque, true), margem(4))
            } else if (o.suaOferta != null) {
                addView(texto("Sua oferta: ${Copiloto.reais(o.suaOferta)}", 12.5f, pal.destaque, true), margem(4))
            }
            val positivos = a.destaques.map { "Destino desejado: $it" } + listOfNotNull(if (volta is EstadoVolta.Pronta && volta.levaParaCasa) "Te leva para casa" else null)
            if (positivos.isNotEmpty()) addView(texto(positivos.joinToString(" · "), 12f, VERDE, true).apply { maxLines = 1 }, margem(4))
            if (r.risco) addView(faixaRisco(o, pal), margem(6))
            // Lápis do valor (simular ou corrigir).
            addView(LinearLayout(ui).apply {
                orientation = LinearLayout.HORIZONTAL
                gravity = Gravity.CENTER_VERTICAL
                addView(pilulaIcone(Copiloto.reais(Aceite.valorFinal(o)), R.drawable.ic_traco_lapis, pal.destaque, false, "Simular ou corrigir o valor") { editarValorFinal() })
            }, margem(8))
        }
        blocoDetalhes = bloco
        addView(bloco, LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, if (cartaoDetalhes) ViewGroup.LayoutParams.WRAP_CONTENT else 0))

        addView(
            linha(
                botao(getString(R.string.plantao_recusei), pal.secundario, false) { decidir(corrida, CorridaAvaliada.RECUSEI, o) }.apply {
                    setTextSize(TypedValue.COMPLEX_UNIT_SP, 14f * escalaTexto); setPadding(dp(6), dp(7), dp(6), dp(7))
                },
                botao(getString(R.string.plantao_aceitei), cor, true) { decidir(corrida, CorridaAvaliada.ACEITEI, o) }.apply {
                    setTextSize(TypedValue.COMPLEX_UNIT_SP, 14f * escalaTexto); setPadding(dp(6), dp(7), dp(6), dp(7))
                },
                espaco = 8,
            ),
            margem(8),
        )
        addView(alcaDetalhes(pal), LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(22)))
    }

    /**
     * Alça do cartão (como a barrinha do iPhone): puxe para baixo (ou toque) para ver
     * os detalhes; puxe para cima para voltar ao resumo.
     */
    @SuppressLint("ClickableViewAccessibility")
    private fun alcaDetalhes(pal: Paleta): View = FrameLayout(ui).apply {
        contentDescription = "Puxe para ver os detalhes da corrida"
        val barra = View(ui).apply { background = fundoArredondado(comAlfa(pal.secundario, 0x88), 99) }
        addView(barra, FrameLayout.LayoutParams(dp(38), dp(4), Gravity.CENTER))
        var y0 = 0f
        var alturaInicial = 0
        var alturaCheia = 0
        var arrastou = false
        setOnTouchListener { v, e ->
            val bloco = blocoDetalhes
            when (e.actionMasked) {
                MotionEvent.ACTION_DOWN -> {
                    y0 = e.rawY
                    arrastou = false
                    alturaInicial = bloco?.height ?: 0
                    alturaCheia = bloco?.let { b ->
                        b.measure(View.MeasureSpec.makeMeasureSpec((b.parent as View).width, View.MeasureSpec.EXACTLY), View.MeasureSpec.UNSPECIFIED)
                        b.measuredHeight
                    } ?: 0
                    barra.animate().scaleX(1.3f).setDuration(120).start()
                    true
                }
                MotionEvent.ACTION_MOVE -> {
                    val dy = (e.rawY - y0).toInt()
                    if (!arrastou && kotlin.math.abs(dy) > dp(6)) arrastou = true
                    if (arrastou && bloco != null && alturaCheia > 0) {
                        // O bloco acompanha o dedo: desce abrindo, sobe fechando.
                        val h = (alturaInicial + dy).coerceIn(0, alturaCheia)
                        bloco.layoutParams = bloco.layoutParams.apply { height = h }
                        bloco.alpha = h.toFloat() / alturaCheia
                        bloco.requestLayout()
                    }
                    true
                }
                MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> {
                    barra.animate().scaleX(1f).setDuration(120).start()
                    if (!arrastou) {
                        if (e.actionMasked == MotionEvent.ACTION_UP) { v.performClick(); alternarDetalhes(!cartaoDetalhes) }
                    } else if (bloco != null && alturaCheia > 0) {
                        // Solta: termina de abrir (passou da metade) ou volta a fechar.
                        val abrir = bloco.height > alturaCheia / 2
                        val ate = if (abrir) alturaCheia else 0
                        animarAltura(bloco, bloco.height, ate, bloco.alpha, if (abrir) 1f else 0f) {
                            bloco.layoutParams = bloco.layoutParams.apply { height = if (abrir) ViewGroup.LayoutParams.WRAP_CONTENT else 0 }
                            cartaoDetalhes = abrir
                        }
                    }
                    true
                }
                else -> false
            }
        }
    }

    /**
     * Linha da volta para casa: ícone da casa, km e custo da volta, e um interruptor
     * "Contar" que liga ou desliga a volta no lucro deste cartão.
     */
    private fun linhaVolta(o: OfertaDetalhada, volta: EstadoVolta, dados: Cartao.Dados, pal: Paleta): View = LinearLayout(ui).apply {
        orientation = LinearLayout.HORIZONTAL
        gravity = Gravity.CENTER_VERTICAL
        val ligada = criteriosDoCartao().contarVolta
        background = fundoArredondado(if (ligada) comAlfa(pal.destaque, 0x1F) else comAlfa(pal.secundario, 0x14), 12)
        setPadding(dp(10), dp(7), dp(8), dp(7))
        addView(iconeTraco(R.drawable.ic_traco_casa, if (ligada) pal.destaque else pal.secundario, 16))
        val (titulo, sub) = when {
            volta is EstadoVolta.Pronta && volta.levaParaCasa -> "Te leva para casa" to "Sem volta"
            volta is EstadoVolta.Pronta -> "Volta ${jsRound(volta.km)} km" to (dados.custoVolta?.let { "custa ${Copiloto.reais(jsRound(it / 100.0) * 100)}" } ?: "")
            volta == EstadoVolta.Calculando -> "Volta para casa" to "calculando…"
            !ligada -> "Volta para casa" to "fora da conta"
            else -> "Volta para casa" to "indisponível"
        }
        addView(LinearLayout(ui).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            addView(texto(titulo, 12.5f, pal.texto, true).apply { maxLines = 1 })
            if (sub.isNotEmpty()) addView(texto(" · $sub", 12f, pal.secundario).apply { maxLines = 1; ellipsize = TextUtils.TruncateAt.END })
        }, LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f).apply { marginStart = dp(7) })
        // Interruptor "Contar": trilho e bolinha, como um switch.
        addView(LinearLayout(ui).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            addView(texto("Contar", 11.5f, if (ligada) pal.destaque else pal.secundario, true), LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT).apply { marginEnd = dp(6) })
            addView(FrameLayout(ui).apply {
                background = fundoArredondado(if (ligada) pal.destaque else comAlfa(pal.secundario, 0x55), 99)
                addView(View(ui).apply { background = fundoArredondado(BRANCO, 99) }, FrameLayout.LayoutParams(dp(14), dp(14), Gravity.CENTER_VERTICAL or if (ligada) Gravity.END else Gravity.START).apply { setMargins(dp(2), 0, dp(2), 0) })
            }, LinearLayout.LayoutParams(dp(32), dp(18)))
        })
        contentDescription = if (ligada) "Parar de contar a volta para casa" else "Contar a volta para casa no lucro"
        isClickable = true
        setOnClickListener { alternarVoltaCartao() }
    }

    /**
     * Lápis do cartão: corrige o valor com que o motorista aceitou / vai aceitar
     * (valorFinal na fila) e recalcula o cartão com ele.
     */
    private fun editarValorFinal() {
        val o = cartaoOferta ?: return
        val c = cartaoCorrida ?: return
        abrirValorFinal("Simular ou corrigir o valor", Aceite.valorFinal(o)) { v ->
            Armazenamento.atualizarValorFinal(this, c.id, v)
            val nova = o.copy(valorFinal = v)
            if (ofertaAbertaId == c.id) ofertaAberta = ofertaAberta?.copy(valorFinal = v)
            aceitePendente?.takeIf { it.id == c.id }?.let { aceitePendente = it.copy(oferta = nova) }
            if (cartaoCorrida?.id == c.id && cartao != null) {
                val r = avaliar(nova)
                mostrarCartao(nova, r, c.copy(valorFinal = v), cartaoOrigem, animar = false, volta = cartaoVolta, faixa = cartaoFaixa)
                ultimaOferta = nova
                ultimaAvaliacao = r.avaliacao
                atualizarNotificacao()
            }
        }
    }

    /**
     * Campo numérico do valor final ("Fiz com outro valor" e lápis). O teclado só
     * abre ao tocar no campo; tocar fora (com o teclado fechado) ou Voltar fecha.
     */
    @SuppressLint("ClickableViewAccessibility")
    private fun abrirValorFinal(titulo: String, inicial: Long?, aoConfirmar: (Long) -> Unit) {
        fecharCampoValor()
        val pal = paleta()
        val (bloco, edit) = campo("Valor final (R$)", "ex.: 22", pal, true)
        inicial?.let { edit.setText(Copiloto.reais(it).removePrefix("R$ ")) }
        edit.setSelectAllOnFocus(true)
        val erro = texto("", 12f, VERMELHO).apply { visibility = View.GONE }
        fun confirmar() {
            val v = Aceite.lerValorFinal(edit.text.toString())
            if (v == null) {
                erro.text = "Digite o valor, ex.: 22 ou 22,50"
                erro.visibility = View.VISIBLE
                return
            }
            fecharCampoValor()
            aoConfirmar(v)
        }
        val raiz = object : LinearLayout(ui) {
            override fun dispatchKeyEvent(event: KeyEvent): Boolean {
                if (event.keyCode == KeyEvent.KEYCODE_BACK && event.action == KeyEvent.ACTION_UP) {
                    fecharCampoValor()
                    return true
                }
                return super.dispatchKeyEvent(event)
            }
        }
        raiz.apply {
            orientation = LinearLayout.VERTICAL
            background = fundoArredondado(pal.fundo, 18, pal.borda)
            setPadding(dp(14), dp(10), dp(14), dp(14))
            isFocusableInTouchMode = true
            descendantFocusability = ViewGroup.FOCUS_BEFORE_DESCENDANTS
            addView(cabecalho(titulo, pal) { fecharCampoValor() })
            addView(bloco, margem(8))
            addView(erro, margem(4))
            addView(
                linha(
                    botao("Cancelar", pal.secundario, false) { fecharCampoValor() },
                    botao("Salvar", MARCA, true) { confirmar() },
                    espaco = 8,
                ),
                margem(10),
            )
        }
        edit.setOnEditorActionListener { _, acao, _ ->
            if (acao == EditorInfo.IME_ACTION_DONE) {
                confirmar()
                true
            } else {
                false
            }
        }
        val janela = moldura(raiz, 18).apply {
            setOnTouchListener { v, e ->
                if (e.actionMasked == MotionEvent.ACTION_OUTSIDE) {
                    if (!tecladoVisivel(v)) fecharCampoValor()
                    true
                } else {
                    false
                }
            }
        }
        val (largura, _) = tela()
        val p = parametros(
            min(largura - dp(16), dp(380)) + 2 * folgaLado,
            WindowManager.LayoutParams.WRAP_CONTENT,
            // Focável (o teclado só quando tocar no campo); toques fora vão para o app de baixo.
            WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL or WindowManager.LayoutParams.FLAG_WATCH_OUTSIDE_TOUCH,
        ).apply {
            gravity = Gravity.TOP or Gravity.CENTER_HORIZONTAL
            y = alturaBarraStatus() + dp(8)
            softInputMode = WindowManager.LayoutParams.SOFT_INPUT_STATE_ALWAYS_HIDDEN or WindowManager.LayoutParams.SOFT_INPUT_ADJUST_PAN
        }
        if (!adicionar(janela, p)) return
        campoValor = janela
        raiz.requestFocus() // o foco fica no quadro, não no campo: o teclado não abre sozinho
    }

    private fun fecharCampoValor() {
        val v = campoValor ?: return
        campoValor = null
        try {
            (getSystemService(Context.INPUT_METHOD_SERVICE) as InputMethodManager).hideSoftInputFromWindow(v.windowToken, 0)
        } catch (e: RuntimeException) {
            // janela já fechando
        }
        remover(v)
    }

    private fun selo(t: String, cor: Int): TextView = texto(t, 11f, BRANCO, true).apply {
        background = fundoArredondado(cor, 99)
        setPadding(dp(9), dp(4), dp(9), dp(4))
        maxLines = 1
        ellipsize = TextUtils.TruncateAt.END
    }

    private fun mostrarCartao(
        o: OfertaDetalhada,
        r: Copiloto.Resultado,
        corrida: CorridaAvaliada,
        origem: String,
        animar: Boolean = true,
        volta: EstadoVolta = cartaoVolta,
        faixa: String? = cartaoFaixa,
    ) {
        val prefs = Armazenamento.preferencias(this)
        escalaTexto = prefs.escalaFonte
        try {
            montarCartao(o, r, corrida, origem, animar, volta, faixa, prefs)
        } catch (e: RuntimeException) {
            // Erro ao montar: não deixa cartão pela metade nem órfão na tela; o diagnóstico mostra o motivo.
            Armazenamento.registrarErro(this, "cartão: ${e.javaClass.simpleName}: ${e.message}".take(300))
            rotuloDiag?.text = "erro no cartão: ${e.javaClass.simpleName}"
            cartao = null
            removerCartoesMenos(null)
            return
        } finally {
            escalaTexto = 1f
        }
        // Tela bloqueada: o cartão fica por baixo do bloqueio (aparece ao desbloquear) e o
        // resultado vai na notificação heads-up. Redesenho da mesma oferta: só atualiza.
        if (origem == "leitura" && (telaBloqueada() || notificadaId == corrida.id)) notificarOferta(o, r, corrida.id)
        // A Uber redesenha a janela da oferta dela e pode cobrir o nosso cartão (que
        // então só aparecia na notificação): recoloca o cartão por cima, duas vezes.
        if (animar && origem == "leitura" && o.app != "indrive") {
            principal.removeCallbacks(trazerCartaoParaFrente)
            principal.postDelayed(trazerCartaoParaFrente, 700)
            principal.postDelayed(trazerCartaoParaFrente, 1_800)
        }
    }

    private val trazerCartaoParaFrente = Runnable {
        val v = cartao ?: return@Runnable
        val p = cartaoParams ?: return@Runnable
        if (!v.isAttachedToWindow) return@Runnable
        try {
            wm.removeViewImmediate(v)
            wm.addView(v, p)
        } catch (e: RuntimeException) {
            // a janela saiu no meio do caminho: fica como estava
        }
    }

    private fun montarCartao(
        o: OfertaDetalhada,
        r: Copiloto.Resultado,
        corrida: CorridaAvaliada,
        origem: String,
        animar: Boolean,
        volta: EstadoVolta,
        faixa: String?,
        prefs: PreferenciasCopiloto,
    ) {
        // Redesenho (volta chegou, tema, régua): o tempo na tela continua contando.
        if (animar) principal.removeCallbacks(fecharCartaoNoTempo)
        if (animar) cartaoExpandido = false
        if (animar) cartaoDetalhes = false
        val bordas = prefs.estiloCartao == "bordas" && !cartaoExpandido
        val antigo = cartao
        // A posição só é reaproveitada no redesenho do mesmo estilo (bordas e cartão guardam a sua).
        val yAntigo = cartaoParams?.y?.takeIf { cartaoEmBordas == bordas }
        cartao = null
        if (animar) fecharMini()
        val pal = paleta()
        val a = r.avaliacao
        val cor = corDoSinal(a.sinal)
        val chaveApp = if (origem == "digitada" && o.app == "outra") "digitada" else o.app
        if (bordas) {
            montarBordas(o, r, corrida, origem, animar, volta, faixa, prefs, antigo, yAntigo)
            return
        }
        val dados = Cartao.Dados(o, a, volta, custoDaVolta(o))
        val conteudo = conteudoDoCartao(o, r, corrida, origem, dados, volta, pal, cor, chaveApp, prefs)

        val corpo = FrameLayout(ui).apply {
            background = fundoArredondado(pal.fundo, 20, pal.borda)
            clipToOutline = true // a faixa colorida acompanha o canto arredondado
            addView(
                LinearLayout(ui).apply {
                    orientation = LinearLayout.HORIZONTAL
                    addView(View(ui).apply { setBackgroundColor(cor) }, LinearLayout.LayoutParams(dp(5), ViewGroup.LayoutParams.MATCH_PARENT))
                    addView(conteudo, LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f))
                },
                FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT),
            )
        }
        // A janela é a moldura com a sombra arredondada (antes a sombra saía cortada/quadrada).
        val raiz = moldura(corpo, 20, CartaoLayout(ui, chaveApp, prefs.fixarCentro))

        val (largura, altura) = tela()
        val yPadrao = alturaBarraStatus() + dp(6)
        val p = parametros(
            min(largura - dp(16), dp(420)) + 2 * folgaLado,
            WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL,
        ).apply {
            // Sempre no centro da largura (fixarCentro só tira o arrastar para o lado).
            gravity = Gravity.TOP or Gravity.CENTER_HORIZONTAL
            x = 0
            // Cada oferta nova abre no topo; arrastar só vale para a oferta da vez.
            y = ((if (!animar) yAntigo else null) ?: yPadrao).coerceIn(0, (altura - dp(160)).coerceAtLeast(0))
        }
        if (!instalarCartao(raiz, p, antigo, o, corrida, origem, volta, faixa, animar, prefs, emBordas = false)) return
    }

    /**
     * Põe a janela do cartão (completo ou bordas) na tela e guarda o estado. A
     * janela nova entra antes de a antiga sair (sem piscar no redesenho). False se
     * o Android não deixou desenhar.
     */
    private fun instalarCartao(
        raiz: View,
        p: WindowManager.LayoutParams,
        antigo: View?,
        o: OfertaDetalhada,
        corrida: CorridaAvaliada,
        origem: String,
        volta: EstadoVolta,
        faixa: String?,
        animar: Boolean,
        prefs: PreferenciasCopiloto,
        emBordas: Boolean,
    ): Boolean {
        val entrou = adicionar(raiz, p)
        antigo?.let { remover(it) }
        removerCartoesMenos(if (entrou) raiz else null)
        if (entrou) janelasCartao.add(raiz)
        if (!entrou) {
            principal.removeCallbacks(fecharCartaoNoTempo)
            cartaoCorrida = null
            cartaoOferta = null
            return false
        }
        cartao = raiz
        cartaoParams = p
        cartaoEmBordas = emBordas
        cartaoApp = o.app
        cartaoOrigem = origem
        cartaoCorrida = corrida
        cartaoOferta = o
        cartaoVolta = volta
        cartaoFaixa = faixa
        if (animar) cartaoDispensado = false
        if (animar) {
            raiz.alpha = 0f
            if (emBordas) raiz.translationX = (if ((p.gravity and Gravity.END) == Gravity.END) 1 else -1) * dp(40).toFloat() else raiz.translationY = -dp(24).toFloat()
            raiz.animate().alpha(1f).translationX(0f).translationY(0f).setDuration(220).setInterpolator(DecelerateInterpolator()).start()
            val tempoNaTela = if (o.app == "indrive" && origem == "leitura") CARTAO_INDRIVE_MS else prefs.segundosCartao * 1000L
            principal.postDelayed(fecharCartaoNoTempo, tempoNaTela)
        }
        return true
    }

    /** Peças das bordas: arrastar sobe e desce; tocar abre o cartão completo. */
    @SuppressLint("ViewConstructor")
    private inner class BordasLayout(ctx: Context) : FrameLayout(ctx) {
        private val folga = ViewConfiguration.get(ctx).scaledTouchSlop
        private var y0 = 0f
        private var yJanela0 = 0
        private var arrastando = false

        override fun onInterceptTouchEvent(e: MotionEvent): Boolean = true

        @SuppressLint("ClickableViewAccessibility")
        override fun onTouchEvent(e: MotionEvent): Boolean {
            when (e.actionMasked) {
                MotionEvent.ACTION_DOWN -> {
                    y0 = e.rawY
                    yJanela0 = cartaoParams?.y ?: 0
                    arrastando = false
                }
                MotionEvent.ACTION_MOVE -> {
                    val dy = e.rawY - y0
                    if (!arrastando && abs(dy) > folga) arrastando = true
                    if (arrastando) {
                        val p = cartaoParams ?: return true
                        val (_, altura) = tela()
                        p.y = (yJanela0 + dy.toInt()).coerceIn(0, (altura - height).coerceAtLeast(0))
                        atualizar(this, p)
                    }
                }
                MotionEvent.ACTION_UP -> {
                    if (arrastando) {
                        cartaoParams?.let { Armazenamento.salvarCartaoY(this@BolhaService, CHAVE_BORDAS, it.y) }
                    } else {
                        performClick()
                        expandirCartao()
                    }
                    arrastando = false
                }
                MotionEvent.ACTION_CANCEL -> arrastando = false
            }
            return true
        }

        override fun performClick(): Boolean {
            super.performClick()
            return true
        }
    }

    /** Estilo "bordas": vira o cartão completo (o tempo na tela continua contando). */
    private fun expandirCartao() {
        if (cartao == null || !cartaoEmBordas) return
        cartaoExpandido = true
        redesenharCartao()
    }

    /** Pílula colada na borda: cantos arredondados só do lado de dentro da tela. */
    private fun pilula(t: String, fundo: Int, corTexto: Int, naDireita: Boolean, borda: Int? = null): TextView =
        texto(t, 15f, corTexto, true).apply {
            maxLines = 1
            gravity = Gravity.CENTER_VERTICAL
            setPadding(if (naDireita) dp(12) else dp(10), dp(7), if (naDireita) dp(10) else dp(12), dp(7))
            val r = dp(18).toFloat()
            background = GradientDrawable().apply {
                shape = GradientDrawable.RECTANGLE
                cornerRadii = if (naDireita) floatArrayOf(r, r, 0f, 0f, 0f, 0f, r, r) else floatArrayOf(0f, 0f, r, r, r, r, 0f, 0f)
                setColor(fundo)
                if (borda != null) setStroke(dp(1), borda)
            }
        }

    /**
     * Estilo "bordas": duas peças pequenas coladas na borda da tela (do lado oposto
     * ao da bolha): o sinal com o R$/km e o lucro. Mais discreto que o cartão.
     */
    private fun montarBordas(
        o: OfertaDetalhada,
        r: Copiloto.Resultado,
        corrida: CorridaAvaliada,
        origem: String,
        animar: Boolean,
        volta: EstadoVolta,
        faixa: String?,
        prefs: PreferenciasCopiloto,
        antigo: View?,
        yAntigo: Int?,
    ) {
        val pal = paleta()
        val a = r.avaliacao
        val cor = corDoSinal(a.sinal)
        val (largura, altura) = tela()
        // Do lado oposto ao da bolha, para não ficar por baixo dela.
        val bolhaNaDireita = (bolhaParams?.x ?: largura) + janelaBolha / 2 >= largura / 2
        val naDireita = !bolhaNaDireita
        val valor = o.valorFinal?.let { "Final: ${Copiloto.reais(it)} · " } ?: o.suaOferta?.let { "Sua: ${Copiloto.reais(it)} · " } ?: ""
        val pecas = LinearLayout(ui).apply {
            orientation = LinearLayout.VERTICAL
            gravity = if (naDireita) Gravity.END else Gravity.START
            addView(
                pilula("● $valor${Formato.brl(a.porKm)}/km", cor, BRANCO, naDireita).apply {
                    contentDescription = "${seloDoSinal(a.sinal)}: ${Formato.brl(a.porKm)} por km. Toque para ver o cartão."
                },
                LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT),
            )
            addView(
                pilula("Lucro ${Formato.brl(a.lucro)}", pal.fundo, if (a.lucro <= 0) VERMELHO else pal.texto, naDireita, pal.borda),
                LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT).apply { topMargin = dp(6) },
            )
        }
        val raiz = moldura(
            pecas, 18, BordasLayout(ui),
            esquerda = if (naDireita) folgaLado else 0,
            direita = if (naDireita) 0 else folgaLado,
        )
        val p = parametros(
            WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL,
        ).apply {
            gravity = Gravity.TOP or (if (naDireita) Gravity.END else Gravity.START)
            x = 0
            y = ((if (!animar) yAntigo else null) ?: Armazenamento.cartaoY(this@BolhaService, CHAVE_BORDAS) ?: (altura / 4))
                .coerceIn(0, (altura - dp(100)).coerceAtLeast(0))
        }
        instalarCartao(raiz, p, antigo, o, corrida, origem, volta, faixa, animar, prefs, emBordas = true)
    }

    private fun faixaRisco(o: OfertaDetalhada, pal: Paleta): LinearLayout {
        val lugar = Copiloto.enderecoDoRisco(o)?.let { Copiloto.lugarDoEndereco(it) }
        return LinearLayout(ui).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            background = fundoArredondado(comAlfa(AMARELO, 0x26), 10)
            setPadding(dp(10), dp(6), dp(6), dp(6))
            addView(texto("⚠ Área de risco", 13f, if (pal.escuro) 0xFFFBBF24.toInt() else AMARELO, true), LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f))
            if (lugar != null) {
                val jaEvita = Armazenamento.lugaresEvitar(this@BolhaService).any { Textos.semAcento(it) == Textos.semAcento(lugar) }
                addView(
                    texto(if (jaEvita) "Você já evita" else "Evitar este lugar", 12f, BRANCO, true).apply {
                        background = fundoArredondado(if (jaEvita) PAUSADO else AMARELO, 99)
                        setPadding(dp(10), dp(5), dp(10), dp(5))
                        contentDescription = "Evitar $lugar"
                        if (!jaEvita) {
                            isClickable = true
                            setOnClickListener {
                                Armazenamento.adicionarLugar(this@BolhaService, lugar)
                                text = "Evitando: ${lugar.take(18)}"
                                isClickable = false
                                background = fundoArredondado(PAUSADO, 99)
                            }
                        }
                    },
                )
            }
        }
    }

    private fun caixaSugestao(s: Copiloto.Sugestao, pal: Paleta): LinearLayout {
        val cor = when (s) {
            Copiloto.Sugestao.PodeAceitar -> VERDE
            is Copiloto.Sugestao.NemODobro -> VERMELHO
            else -> pal.destaque
        }
        return LinearLayout(ui).apply {
            orientation = LinearLayout.VERTICAL
            background = fundoArredondado(comAlfa(cor, 0x1F), 12)
            setPadding(dp(10), dp(7), dp(10), dp(7))
            val avaliada = when (s) {
                is Copiloto.Sugestao.Atalho -> s.avaliacao
                is Copiloto.Sugestao.Lapis -> s.avaliacao
                else -> null
            }
            // Título e, à direita, o lucro total com esse valor (já sem a volta, se ela conta).
            addView(LinearLayout(ui).apply {
                orientation = LinearLayout.HORIZONTAL
                gravity = Gravity.CENTER_VERTICAL
                addView(texto(Copiloto.textoSugestao(s), 15f, cor, true), LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f))
                avaliada?.let { addView(texto(Copiloto.textoLucro(it, criteriosDoCartao().contarVolta && cartaoVolta is EstadoVolta.Pronta), 13f, if (it.lucro > 0) VERDE else VERMELHO, true)) }
            })
            val mini = when (s) {
                is Copiloto.Sugestao.Atalho -> Copiloto.textoComValor(s.valor, s.avaliacao)
                is Copiloto.Sugestao.Lapis -> Copiloto.textoComValor(s.valor, s.avaliacao)
                else -> null
            }
            mini?.let { addView(texto(it, 11f, pal.secundario), margem(3)) }
        }
    }

    /**
     * "Aceitei"/"Recusei" (origem "toque"), a resposta do "Você aceitou?"
     * ("pergunta") ou o aceite automático ("automatica"): só registra. Aceita, grava
     * o valor final (o corrigido, a sua oferta ou o da oferta). Nunca toca no app de corrida.
     */
    private fun decidir(
        corrida: CorridaAvaliada,
        decisao: String,
        o: OfertaDetalhada,
        mostrarMensagem: Boolean = true,
        origem: String = Aceite.ORIGEM_TOQUE,
    ) {
        val antes = Armazenamento.corridas(this).firstOrNull { it.id == corrida.id }?.decisao
        val valorFinal = if (decisao == CorridaAvaliada.ACEITEI) Aceite.valorFinal(o) else o.valorFinal
        Armazenamento.atualizarDecisao(this, corrida.id, decisao, origem, valorFinal)
        if (aceitePendente?.id == corrida.id) aceitePendente = null
        if (perguntaId == corrida.id) perguntaId = null
        if (decisao == CorridaAvaliada.ACEITEI && antes != CorridaAvaliada.ACEITEI) {
            val r = avaliar(o)
            Armazenamento.registrarAceiteNoResumo(this, Aceite.valorFinal(o), r.avaliacao.lucro)
        }
        if (decisao == CorridaAvaliada.RECUSEI && corrida.origem == "leitura") {
            // Não deixa a mesma oferta reaparecer enquanto ela estiver aberta.
            recusada = (ofertaAberta?.takeIf { it.app == o.app } ?: o).chaveOriginal()
        }
        PlantaoPlugin.emitirDecisao(corrida.id, decisao, origem, valorFinal)
        if (decisao == CorridaAvaliada.ACEITEI && antes != CorridaAvaliada.ACEITEI) {
            val av = avaliar(o).avaliacao
            corridaResumo = "${Copiloto.reais(Aceite.valorFinal(o))} · lucro ${Copiloto.reais(av.lucro)} · ${String.format(Locale.US, "%.1f", o.kmCorrida).replace('.', ',')} km"
            iniciarCronometro(o.embarque, o.destino)
        }
        if (cartaoCorrida?.id == corrida.id) fecharCartao()
        if (decisao == CorridaAvaliada.ACEITEI && mostrarMensagem) mostrarCopiarMensagem(o)
    }

    /**
     * A oferta saiu da tela (lista, fim, outra tela do inDrive) ou o tempo do
     * cartão acabou: fecha o cartão e, se o motorista não respondeu, pergunta
     * "Você aceitou a corrida de R$ X?" por 8 s.
     */
    private fun ofertaSumiu() {
        principal.removeCallbacks(conferirSumico)
        val c = cartaoCorrida
        val o = cartaoOferta
        val origem = cartaoOrigem
        val dispensado = cartaoDispensado
        fecharCartao()
        if (c == null || o == null || origem != "leitura" || dispensado) return
        if (!Armazenamento.preferencias(this).perguntarAceite) return
        val decisao = Armazenamento.corridas(this).firstOrNull { it.id == c.id }?.decisao ?: return
        if (decisao != CorridaAvaliada.SEM_RESPOSTA) return
        perguntarAceite(c, o)
    }

    private fun perguntarAceite(c: CorridaAvaliada, o: OfertaDetalhada) {
        val pal = paleta()
        val valor = Copiloto.reais(Aceite.valorFinal(o))
        mostrarMini(
            "Você aceitou a corrida de $valor?",
            listOf(
                Triple("Sim", true) { decidir(c, CorridaAvaliada.ACEITEI, o, origem = Aceite.ORIGEM_PERGUNTA) },
                Triple("Não", false) { decidir(c, CorridaAvaliada.RECUSEI, o, origem = Aceite.ORIGEM_PERGUNTA) },
            ),
            extra = Pair("Fiz com outro valor") {
                abrirValorFinal("Com que valor você fez a corrida?", Aceite.valorFinal(o)) { v ->
                    decidir(c, CorridaAvaliada.ACEITEI, o.copy(valorFinal = v), origem = Aceite.ORIGEM_PERGUNTA)
                }
            },
            rodape = Pair("Não perguntar mais") {
                Armazenamento.naoPerguntarAceite(this)
                PlantaoPlugin.emitirPreferencia(perguntarAceite = false)
            },
            pal = pal,
            app = o.app,
        )
        if (mini != null) perguntaId = c.id
    }

    /** Depois de "Aceitei" (ou do "Sim"): botão que copia a mensagem pronta para o passageiro. */
    private fun mostrarCopiarMensagem(o: OfertaDetalhada) {
        val nome = o.nome?.let { " para ${it.take(20)}" } ?: ""
        mostrarMini(
            "Corrida aceita: ${Copiloto.reais(Aceite.valorFinal(o))}",
            listOf(Triple("Copiar mensagem$nome", true) { copiarMensagem(o) }),
            pal = paleta(),
            app = o.app,
        )
    }

    private fun copiarMensagem(o: OfertaDetalhada) {
        val hora = agoraBrasilia().get(Calendar.HOUR_OF_DAY)
        val texto = Preferencias.montarMensagem(Armazenamento.preferencias(this).mensagem, hora, o.nome, o.minutosBusca)
        try {
            val cm = getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
            cm.setPrimaryClip(ClipData.newPlainText("Mensagem para o passageiro", texto))
            aviso("Mensagem copiada: cole no chat do app")
        } catch (e: RuntimeException) {
            aviso("Não deu para copiar a mensagem.")
        }
    }

    /** Mini cartão no lugar do cartão (8 s): título, botões e um link pequeno opcional. */
    private fun mostrarMini(
        titulo: String,
        botoes: List<Triple<String, Boolean, () -> Unit>>,
        extra: Pair<String, () -> Unit>? = null,
        rodape: Pair<String, () -> Unit>? = null,
        pal: Paleta,
        app: String,
    ) {
        fecharMini()
        val prefs = Armazenamento.preferencias(this)
        escalaTexto = prefs.escalaFonte
        val corpo: LinearLayout
        try {
            corpo = LinearLayout(ui).apply {
                orientation = LinearLayout.VERTICAL
                background = fundoArredondado(pal.fundo, 18, pal.borda)
                setPadding(dp(14), dp(10), dp(10), dp(10))
                addView(
                    LinearLayout(ui).apply {
                        orientation = LinearLayout.HORIZONTAL
                        gravity = Gravity.CENTER_VERTICAL
                        addView(texto(titulo, 14f, pal.texto, true), LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f))
                        addView(
                            texto("✕", 15f, pal.secundario, true).apply {
                                gravity = Gravity.CENTER
                                contentDescription = getString(R.string.plantao_fechar)
                                isClickable = true
                                setOnClickListener { fecharMini() }
                            },
                            LinearLayout.LayoutParams(dp(30), dp(26)),
                        )
                    },
                )
                addView(
                    linha(
                        *botoes.map { (rotulo, cheio, acao) ->
                            botao(rotulo, if (cheio) MARCA else pal.secundario, cheio) {
                                fecharMini()
                                acao()
                            }
                        }.toTypedArray(),
                        espaco = 8,
                    ),
                    margem(8),
                )
                if (extra != null) {
                    addView(
                        botao(extra.first, pal.destaque, false) {
                            fecharMini()
                            extra.second()
                        },
                        margem(8),
                    )
                }
                if (rodape != null) {
                    addView(
                        texto(rodape.first, 12f, pal.secundario).apply {
                            gravity = Gravity.CENTER
                            setPadding(0, dp(8), 0, dp(2))
                            isClickable = true
                            setOnClickListener {
                                fecharMini()
                                rodape.second()
                            }
                        },
                        margem(2),
                    )
                }
            }
        } finally {
            escalaTexto = 1f
        }
        val raiz = moldura(corpo, 18)
        val (largura, altura) = tela()
        val p = parametros(
            min(largura - dp(16), dp(420)) + 2 * folgaLado,
            WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL,
        ).apply {
            gravity = Gravity.TOP or Gravity.CENTER_HORIZONTAL
            y = (alturaBarraStatus() + dp(6)).coerceIn(0, (altura - dp(120)).coerceAtLeast(0))
        }
        if (!adicionar(raiz, p)) return
        mini = raiz
        raiz.alpha = 0f
        raiz.animate().alpha(1f).setDuration(180).start()
        principal.postDelayed(fecharMiniNoTempo, MINI_MS)
    }

    private fun fecharMini() {
        principal.removeCallbacks(fecharMiniNoTempo)
        perguntaId = null
        val v = mini ?: return
        mini = null
        if (v.isAttachedToWindow) {
            v.animate().alpha(0f).setDuration(150).withEndAction { remover(v) }.start()
        } else {
            remover(v)
        }
    }

    private fun fecharCartao(animado: Boolean = true) {
        principal.removeCallbacks(fecharCartaoNoTempo)
        principal.removeCallbacks(conferirSumico)
        cancelarNotificacaoOferta()
        val v = cartao ?: return
        cartao = null
        cartaoCorrida = null
        cartaoOferta = null
        cartaoOrigem = "digitada"
        cartaoVolta = EstadoVolta.Nenhuma
        cartaoFaixa = null
        removerCartoesMenos(v)
        if (animado && v.isAttachedToWindow) {
            v.animate().alpha(0f).translationY(-dp(16).toFloat()).setDuration(180).withEndAction { remover(v); janelasCartao.remove(v) }.start()
        } else {
            remover(v)
            janelasCartao.remove(v)
        }
    }

    /** Fechar o cartão de uma oferta lida (✕ ou arrastar para o lado): ela não volta enquanto estiver aberta. */
    private fun marcarDispensada() {
        cartaoDispensado = true
        val o = cartaoOferta ?: return
        if (cartaoOrigem == "leitura") recusada = (ofertaAberta?.takeIf { it.app == o.app } ?: o).chaveOriginal()
    }

    private fun fecharCartaoDeLado(direita: Boolean) {
        marcarDispensada()
        cancelarNotificacaoOferta()
        principal.removeCallbacks(fecharCartaoNoTempo)
        val v = cartao ?: return
        cartao = null
        cartaoCorrida = null
        cartaoOferta = null
        cartaoOrigem = "digitada"
        cartaoVolta = EstadoVolta.Nenhuma
        cartaoFaixa = null
        val alvo = (if (direita) 1 else -1) * v.width.toFloat()
        v.animate().translationX(alvo).alpha(0f).setDuration(180).withEndAction { remover(v) }.start()
    }
}
