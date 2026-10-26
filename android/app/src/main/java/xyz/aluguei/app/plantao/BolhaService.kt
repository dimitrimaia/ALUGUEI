package xyz.aluguei.app.plantao

import android.animation.ValueAnimator
import android.annotation.SuppressLint
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.graphics.Color
import android.graphics.PixelFormat
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.text.InputType
import android.text.method.DigitsKeyListener
import android.util.TypedValue
import android.view.ContextThemeWrapper
import android.view.Gravity
import android.view.KeyEvent
import android.view.MotionEvent
import android.view.View
import android.view.ViewGroup
import android.view.WindowManager
import android.view.inputmethod.EditorInfo
import android.view.inputmethod.InputMethodManager
import android.widget.EditText
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.TextView
import androidx.core.app.NotificationCompat
import androidx.core.app.ServiceCompat
import androidx.core.content.ContextCompat
import xyz.aluguei.app.MainActivity
import xyz.aluguei.app.R
import kotlin.math.hypot
import kotlin.math.min

/**
 * Serviço em primeiro plano do plantão: a única peça que trabalha durante a
 * jornada (a WebView pode estar fechada). Desenha por cima do app de corrida:
 *  - a bolha redonda arrastável (toque = digitação rápida; arrastar até o X = desliga);
 *  - o painel de digitação rápida (valor, km, minutos, km até o passageiro);
 *  - o cartão colorido com o semáforo da corrida, por alguns segundos.
 *
 * Nunca toca no app de corrida: "Aceitei" e "Recusei" só registram a decisão
 * do motorista na fila local.
 */
class BolhaService : Service() {

    companion object {
        const val ACAO_DESLIGAR = "xyz.aluguei.app.plantao.DESLIGAR"
        const val ACAO_SIMULAR = "xyz.aluguei.app.plantao.SIMULAR"
        const val EXTRA_VALOR = "valor"
        const val EXTRA_KM_CORRIDA = "kmCorrida"
        const val EXTRA_MINUTOS_CORRIDA = "minutosCorrida"
        const val EXTRA_KM_BUSCA = "kmBusca"
        const val EXTRA_MINUTOS_BUSCA = "minutosBusca"

        private const val CANAL = "plantao"
        private const val ID_NOTIFICACAO = 4021

        private const val FUNDO = 0xEB0B1630.toInt() // #0b1630 com 92% de opacidade
        private const val VERDE = 0xFF22C55E.toInt()
        private const val AMARELO = 0xFFF59E0B.toInt()
        private const val VERMELHO = 0xFFEF4444.toInt()
        private const val BRANCO = Color.WHITE
        private const val CINZA = 0xFFB4BED2.toInt()

        /** O serviço rodando agora (mesmo processo), para o leitor e o plugin entregarem ofertas. */
        @Volatile
        var instancia: BolhaService? = null
            private set

        fun iniciar(ctx: Context, intent: Intent? = null) {
            ContextCompat.startForegroundService(ctx, intent ?: Intent(ctx, BolhaService::class.java))
        }

        /** Desliga o plantão (pela tela, pela notificação ou arrastando a bolha até o X). */
        fun desligar(ctx: Context) {
            Armazenamento.definirLigado(ctx, false)
            ctx.stopService(Intent(ctx, BolhaService::class.java))
            PlantaoPlugin.emitirEstado(ctx)
        }
    }

    private lateinit var wm: WindowManager
    private lateinit var ui: Context
    private val principal = Handler(Looper.getMainLooper())

    private var bolha: View? = null
    private var bolhaParams: WindowManager.LayoutParams? = null
    private var alvoX: TextView? = null
    private var painel: View? = null
    private var cartao: View? = null
    private var cartaoCorridaId: String? = null
    private val fecharCartaoNoTempo = Runnable { fecharCartao() }

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
            ServiceCompat.startForeground(
                this,
                ID_NOTIFICACAO,
                notificacao(),
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE else 0,
            )
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
        mostrarBolha()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (semCondicoes) return START_NOT_STICKY
        when (intent?.action) {
            ACAO_DESLIGAR -> {
                desligar(this)
                return START_NOT_STICKY
            }
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
        // Reiniciado pelo sistema (intent nulo) com o plantão desligado: não volta.
        if (!Armazenamento.ligado(this)) {
            stopSelf()
            return START_NOT_STICKY
        }
        return START_STICKY
    }

    override fun onDestroy() {
        principal.removeCallbacksAndMessages(null)
        listOf(cartao, painel, alvoX, bolha).forEach { remover(it) }
        cartao = null; painel = null; alvoX = null; bolha = null
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
        (getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager).createNotificationChannel(canal)
    }

    private fun notificacao(): Notification {
        val imutavel = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0
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
        val texto = if (Permissoes.acessibilidade(this)) getString(R.string.plantao_notificacao_lendo) else getString(R.string.plantao_notificacao_digitar)
        return NotificationCompat.Builder(this, CANAL)
            .setSmallIcon(R.drawable.ic_plantao)
            .setContentTitle(getString(R.string.plantao_notificacao_titulo))
            .setContentText(texto)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE)
            .setContentIntent(abrir)
            .addAction(0, getString(R.string.plantao_desligar), desligar)
            .build()
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

    @Suppress("DEPRECATION")
    private val tipoJanela: Int
        get() = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY else WindowManager.LayoutParams.TYPE_PHONE

    private fun parametros(largura: Int, altura: Int, flags: Int) = WindowManager.LayoutParams(
        largura, altura, tipoJanela,
        flags or WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
        PixelFormat.TRANSLUCENT,
    )

    private fun remover(v: View?) {
        if (v == null) return
        try {
            wm.removeView(v)
        } catch (e: IllegalArgumentException) {
            // já tinha saído da tela
        }
    }

    private fun fundoArredondado(cor: Int, raioDp: Number, borda: Int? = null): GradientDrawable = GradientDrawable().apply {
        shape = GradientDrawable.RECTANGLE
        cornerRadius = dp(raioDp).toFloat()
        setColor(cor)
        if (borda != null) setStroke(dp(1), borda)
    }

    private fun texto(t: String, sp: Float, cor: Int = BRANCO, negrito: Boolean = false): TextView = TextView(ui).apply {
        text = t
        setTextColor(cor)
        setTextSize(TypedValue.COMPLEX_UNIT_SP, sp)
        typeface = if (negrito) Typeface.DEFAULT_BOLD else Typeface.DEFAULT
        includeFontPadding = false
    }

    private fun corDoSinal(s: Sinal) = when (s) {
        Sinal.VERDE -> VERDE
        Sinal.AMARELO -> AMARELO
        Sinal.VERMELHO -> VERMELHO
    }

    // ------------------------------------------------------------------ bolha

    @SuppressLint("ClickableViewAccessibility")
    private fun mostrarBolha() {
        val tamanho = dp(56)
        val v = FrameLayout(ui).apply {
            background = GradientDrawable().apply {
                shape = GradientDrawable.OVAL
                setColor(FUNDO)
                setStroke(dp(2), VERDE)
            }
            contentDescription = getString(R.string.plantao_bolha_descricao)
            addView(
                texto("R$", 18f, BRANCO, true).apply { gravity = Gravity.CENTER },
                FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT),
            )
        }
        val (largura, altura) = tela()
        val salva = Armazenamento.posicaoBolha(this)
        val p = parametros(tamanho, tamanho, WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE).apply {
            gravity = Gravity.TOP or Gravity.START
            x = (salva?.first ?: (largura - tamanho)).coerceIn(0, largura - tamanho)
            y = (salva?.second ?: (altura / 3)).coerceIn(0, altura - tamanho)
        }

        var inicioX = 0
        var inicioY = 0
        var toqueX = 0f
        var toqueY = 0f
        var arrastando = false
        val limiar = dp(8)

        v.setOnTouchListener { view, e ->
            when (e.actionMasked) {
                MotionEvent.ACTION_DOWN -> {
                    inicioX = p.x; inicioY = p.y; toqueX = e.rawX; toqueY = e.rawY; arrastando = false
                    true
                }
                MotionEvent.ACTION_MOVE -> {
                    val dx = e.rawX - toqueX
                    val dy = e.rawY - toqueY
                    if (!arrastando && hypot(dx, dy) > limiar) {
                        arrastando = true
                        mostrarAlvoX()
                    }
                    if (arrastando) {
                        p.x = inicioX + dx.toInt()
                        p.y = inicioY + dy.toInt()
                        atualizar(view, p)
                        destacarAlvoX(sobreAlvoX(p))
                    }
                    true
                }
                MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> {
                    if (!arrastando) {
                        if (e.actionMasked == MotionEvent.ACTION_UP) {
                            view.performClick()
                            abrirPainel()
                        }
                    } else {
                        val noX = sobreAlvoX(p)
                        esconderAlvoX()
                        if (noX) desligar(this) else encostarNaBorda(view, p)
                    }
                    arrastando = false
                    true
                }
                else -> false
            }
        }
        wm.addView(v, p)
        bolha = v
        bolhaParams = p
    }

    private fun atualizar(v: View, p: WindowManager.LayoutParams) {
        try {
            wm.updateViewLayout(v, p)
        } catch (e: IllegalArgumentException) {
            // a view saiu da tela no meio do movimento
        }
    }

    /** Ao soltar, a bolha encosta na borda mais próxima e a posição fica salva. */
    private fun encostarNaBorda(v: View, p: WindowManager.LayoutParams) {
        val (largura, altura) = tela()
        val tamanho = v.width.takeIf { it > 0 } ?: dp(56)
        val destino = if (p.x + tamanho / 2 < largura / 2) 0 else largura - tamanho
        p.y = p.y.coerceIn(0, altura - tamanho)
        ValueAnimator.ofInt(p.x, destino).apply {
            duration = 180
            addUpdateListener {
                p.x = it.animatedValue as Int
                atualizar(v, p)
            }
            start()
        }
        Armazenamento.salvarPosicaoBolha(this, destino, p.y)
    }

    private fun mostrarAlvoX() {
        if (alvoX != null) return
        val tamanho = dp(64)
        val v = texto("✕", 26f, BRANCO, true).apply {
            gravity = Gravity.CENTER
            background = GradientDrawable().apply {
                shape = GradientDrawable.OVAL
                setColor(FUNDO)
                setStroke(dp(2), VERMELHO)
            }
            contentDescription = getString(R.string.plantao_desligar)
        }
        val p = parametros(
            tamanho, tamanho,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or WindowManager.LayoutParams.FLAG_NOT_TOUCHABLE,
        ).apply {
            gravity = Gravity.BOTTOM or Gravity.CENTER_HORIZONTAL
            y = dp(48)
        }
        wm.addView(v, p)
        alvoX = v
    }

    private fun destacarAlvoX(sobre: Boolean) {
        val v = alvoX ?: return
        val escala = if (sobre) 1.25f else 1f
        v.scaleX = escala
        v.scaleY = escala
        (v.background as? GradientDrawable)?.setColor(if (sobre) VERMELHO else FUNDO)
    }

    private fun esconderAlvoX() {
        remover(alvoX)
        alvoX = null
    }

    /** O centro da bolha está em cima do X do rodapé? */
    private fun sobreAlvoX(p: WindowManager.LayoutParams): Boolean {
        val (largura, altura) = tela()
        val metade = dp(28)
        val cx = p.x + metade
        val cy = p.y + metade
        val xx = largura / 2
        val xy = altura - dp(48) - dp(32)
        return hypot((cx - xx).toFloat(), (cy - xy).toFloat()) < dp(64)
    }

    // ------------------------------------------------------------------ painel de digitação rápida

    private fun campo(rotulo: String, dica: String, ultimo: Boolean): Pair<LinearLayout, EditText> {
        val edit = EditText(ui).apply {
            setTextColor(BRANCO)
            setHintTextColor(CINZA)
            hint = dica
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 18f)
            isSingleLine = true
            inputType = InputType.TYPE_CLASS_NUMBER or InputType.TYPE_NUMBER_FLAG_DECIMAL
            keyListener = DigitsKeyListener.getInstance("0123456789,.")
            imeOptions = if (ultimo) EditorInfo.IME_ACTION_DONE else EditorInfo.IME_ACTION_NEXT
            background = fundoArredondado(0x1FFFFFFF, 10, 0x40FFFFFF)
            setPadding(dp(10), dp(8), dp(10), dp(8))
        }
        val bloco = LinearLayout(ui).apply {
            orientation = LinearLayout.VERTICAL
            addView(texto(rotulo, 12f, CINZA))
            addView(edit, LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT).apply { topMargin = dp(4) })
        }
        return Pair(bloco, edit)
    }

    private fun linha(vararg blocos: View): LinearLayout = LinearLayout(ui).apply {
        orientation = LinearLayout.HORIZONTAL
        blocos.forEachIndexed { i, b ->
            addView(b, LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f).apply { if (i > 0) marginStart = dp(10) })
        }
    }

    private fun botao(t: String, cor: Int, cheio: Boolean, acao: () -> Unit): TextView = texto(t, 15f, if (cheio) Color.parseColor("#0b1630") else BRANCO, true).apply {
        gravity = Gravity.CENTER
        setPadding(dp(14), dp(10), dp(14), dp(10))
        background = if (cheio) fundoArredondado(cor, 10) else fundoArredondado(Color.TRANSPARENT, 10, cor)
        isClickable = true
        setOnClickListener { acao() }
    }

    private fun abrirPainel() {
        if (painel != null) return
        fecharCartao()
        val (cValor, eValor) = campo(getString(R.string.plantao_campo_valor), "18,40", false)
        val (cKm, eKm) = campo(getString(R.string.plantao_campo_km), "7,4", false)
        val (cMin, eMin) = campo(getString(R.string.plantao_campo_minutos), getString(R.string.plantao_opcional), false)
        val (cBusca, eBusca) = campo(getString(R.string.plantao_campo_busca), getString(R.string.plantao_opcional), true)
        val erro = texto("", 13f, VERMELHO).apply { visibility = View.GONE }

        val calcular = {
            val valor = Formato.lerReais(eValor.text.toString())
            val km = Formato.lerNumero(eKm.text.toString())
            if (valor == null || km == null || km <= 0) {
                erro.text = getString(R.string.plantao_erro_digitacao)
                erro.visibility = View.VISIBLE
            } else {
                val oferta = Oferta(
                    valor = valor,
                    kmCorrida = km,
                    minutosCorrida = Formato.lerNumero(eMin.text.toString())?.takeIf { it > 0 },
                    kmBusca = Formato.lerNumero(eBusca.text.toString()),
                    minutosBusca = null,
                )
                fecharPainel()
                receberOferta(oferta, "digitada", null)
            }
        }
        eBusca.setOnEditorActionListener { _, acao, _ ->
            if (acao == EditorInfo.IME_ACTION_DONE) {
                calcular(); true
            } else {
                false
            }
        }

        // Raiz que fecha o painel com o botão Voltar (a janela é focável enquanto aberta).
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
            background = fundoArredondado(FUNDO, 18)
            setPadding(dp(16), dp(14), dp(16), dp(16))
            addView(
                linha(
                    texto(getString(R.string.plantao_painel_titulo), 17f, BRANCO, true),
                    texto("✕", 20f, CINZA, true).apply {
                        gravity = Gravity.END
                        contentDescription = getString(R.string.plantao_fechar)
                        isClickable = true
                        setOnClickListener { fecharPainel() }
                    },
                ),
            )
            val espaco = { LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT).apply { topMargin = dp(10) } }
            addView(linha(cValor, cKm), espaco())
            addView(linha(cMin, cBusca), espaco())
            addView(erro, espaco())
            addView(botao(getString(R.string.plantao_ver_resultado), VERDE, true) { calcular() }, espaco())
        }

        val (largura, _) = tela()
        val p = parametros(
            min(largura - dp(24), dp(420)),
            WindowManager.LayoutParams.WRAP_CONTENT,
            // Focável (para o teclado), mas deixa os toques fora do painel irem para o app de baixo.
            WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL,
        ).apply {
            gravity = Gravity.TOP or Gravity.CENTER_HORIZONTAL
            y = dp(24)
            softInputMode = WindowManager.LayoutParams.SOFT_INPUT_STATE_ALWAYS_VISIBLE or WindowManager.LayoutParams.SOFT_INPUT_ADJUST_PAN
        }
        wm.addView(raiz, p)
        painel = raiz
        eValor.requestFocus()
        principal.postDelayed({
            (getSystemService(Context.INPUT_METHOD_SERVICE) as InputMethodManager).showSoftInput(eValor, InputMethodManager.SHOW_IMPLICIT)
        }, 150)
    }

    private fun fecharPainel() {
        val v = painel ?: return
        (getSystemService(Context.INPUT_METHOD_SERVICE) as InputMethodManager).hideSoftInputFromWindow(v.windowToken, 0)
        remover(v)
        painel = null
    }

    // ------------------------------------------------------------------ oferta e cartão

    /**
     * Uma oferta chegou (do leitor de tela ou digitada): avalia, guarda na fila
     * local, mostra o cartão e avisa a WebView (se estiver aberta).
     * Chamar na thread principal.
     */
    fun receberOferta(oferta: Oferta, origem: String, app: String?) {
        if (Looper.myLooper() != Looper.getMainLooper()) {
            principal.post { receberOferta(oferta, origem, app) }
            return
        }
        val avaliacao = avaliarCorrida(oferta, taxas(Armazenamento.perfil(this)), Armazenamento.criterios(this))
        val corrida = CorridaAvaliada.nova(oferta, avaliacao, origem, app)
        Armazenamento.adicionar(this, corrida)
        mostrarCartao(oferta, avaliacao, corrida)
        PlantaoPlugin.emitirOferta(corrida, avaliacao)
    }

    @SuppressLint("ClickableViewAccessibility")
    private fun mostrarCartao(o: Oferta, a: Avaliacao, corrida: CorridaAvaliada) {
        fecharCartao()
        val cor = corDoSinal(a.sinal)
        val titulo = when (a.sinal) {
            Sinal.VERDE -> getString(R.string.plantao_sinal_verde)
            Sinal.AMARELO -> getString(R.string.plantao_sinal_amarelo)
            Sinal.VERMELHO -> getString(R.string.plantao_sinal_vermelho)
        }
        val busca = o.kmBusca?.let { getString(R.string.plantao_a_km_do_passageiro, Formato.km(it)) } ?: getString(R.string.plantao_busca_desconhecida)
        val tempo = if (a.tempoEstimado) " · ~${a.minutosTotal} min" else " · ${a.minutosTotal} min"

        val cabecalho = linha(
            texto(titulo, 15f, Color.parseColor("#0b1630"), true),
            texto(Formato.brl(o.valor), 17f, Color.parseColor("#0b1630"), true).apply { gravity = Gravity.END },
        ).apply {
            background = fundoArredondado(cor, 12)
            setPadding(dp(12), dp(8), dp(12), dp(8))
        }
        fun metrica(valor: String, rotulo: String) = LinearLayout(ui).apply {
            orientation = LinearLayout.VERTICAL
            addView(texto(valor, 22f, BRANCO, true))
            addView(texto(rotulo, 12f, CINZA).apply { setPadding(0, dp(2), 0, 0) })
        }
        val lucroCor = if (a.lucro > 0) BRANCO else VERMELHO
        val raiz = LinearLayout(ui).apply {
            orientation = LinearLayout.VERTICAL
            background = fundoArredondado(FUNDO, 16, cor)
            setPadding(dp(10), dp(10), dp(10), dp(12))
            val m = { topo: Int -> LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT).apply { topMargin = dp(topo) } }
            addView(cabecalho)
            addView(
                linha(
                    metrica(Formato.brl(a.porKm), getString(R.string.plantao_por_km)),
                    metrica(Formato.brl(a.porHora), getString(R.string.plantao_por_hora)),
                ).apply { setPadding(dp(4), 0, dp(4), 0) },
                m(10),
            )
            addView(
                texto(getString(R.string.plantao_lucro_estimado, Formato.brl(a.lucro)), 15f, lucroCor, true).apply { setPadding(dp(4), 0, dp(4), 0) },
                m(10),
            )
            addView(
                texto(getString(R.string.plantao_km_total, Formato.km(a.kmTotal)) + " · " + busca + tempo, 13f, CINZA).apply { setPadding(dp(4), 0, dp(4), 0) },
                m(6),
            )
            a.motivos.firstOrNull()?.let {
                addView(texto(it, 13f, cor).apply { setPadding(dp(4), 0, dp(4), 0) }, m(4))
            }
            addView(
                linha(
                    botao(getString(R.string.plantao_recusei), CINZA, false) { decidir(corrida.id, CorridaAvaliada.RECUSEI) },
                    botao(getString(R.string.plantao_aceitei), cor, true) { decidir(corrida.id, CorridaAvaliada.ACEITEI) },
                ),
                m(12),
            )
            // Toque fora do cartão: fecha (a corrida fica como "sem resposta").
            setOnTouchListener { _, e ->
                if (e.actionMasked == MotionEvent.ACTION_OUTSIDE) {
                    fecharCartao(); true
                } else {
                    false
                }
            }
        }

        val (largura, _) = tela()
        val p = parametros(
            min(largura - dp(24), dp(420)),
            WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or WindowManager.LayoutParams.FLAG_WATCH_OUTSIDE_TOUCH,
        ).apply {
            gravity = Gravity.TOP or Gravity.CENTER_HORIZONTAL
            y = dp(32)
        }
        wm.addView(raiz, p)
        cartao = raiz
        cartaoCorridaId = corrida.id
        principal.postDelayed(fecharCartaoNoTempo, Armazenamento.segundosCartao(this) * 1000L)
    }

    /** "Aceitei"/"Recusei": só registra. Nunca toca no app de corrida. */
    private fun decidir(id: String, decisao: String) {
        Armazenamento.atualizarDecisao(this, id, decisao)
        PlantaoPlugin.emitirDecisao(id, decisao)
        fecharCartao()
    }

    private fun fecharCartao() {
        principal.removeCallbacks(fecharCartaoNoTempo)
        remover(cartao)
        cartao = null
        cartaoCorridaId = null
    }
}
