package xyz.aluguei.app

import android.animation.Animator
import android.animation.AnimatorListenerAdapter
import android.animation.ValueAnimator
import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.DashPathEffect
import android.graphics.LinearGradient
import android.graphics.Paint
import android.graphics.Path
import android.graphics.PathMeasure
import android.graphics.Shader
import android.graphics.Typeface
import android.view.View
import android.view.animation.AccelerateInterpolator
import android.view.animation.DecelerateInterpolator
import android.view.animation.LinearInterpolator
import android.view.animation.OvershootInterpolator
import kotlin.math.min

/**
 * Abertura do app, desenhada à mão (começa a se mexer no primeiro quadro):
 *  1. o "A" de estrada se desenha e cresce com um pulinho;
 *  2. a faixa do meio da estrada anda sem parar enquanto o site carrega;
 *  3. o nome ALUGUEI sobe e aparece;
 *  4. [sair]: a logo dá um zoom para a frente e a tela esmaece, revelando o app.
 * Mesmo desenho do símbolo do site (viewBox 24: "M3.5 21 10.6 3.5h2.8L20.5 21").
 */
class AberturaView(ctx: Context) : View(ctx) {
    private val densidade = resources.displayMetrics.density
    private val fundo = Paint()
    private val traco = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = Color.WHITE
        style = Paint.Style.STROKE
        strokeCap = Paint.Cap.ROUND
        strokeJoin = Paint.Join.ROUND
    }
    private val faixa = Paint(traco)
    private val nome = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = Color.WHITE
        textAlign = Paint.Align.CENTER
        typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
        letterSpacing = 0.14f
    }

    /** 0→1: o "A" se desenhando. */
    private var desenho = 0f
    /** Escala do símbolo (pulinho na entrada, zoom na saída). */
    private var escala = 0.7f
    /** 0→1: o nome subindo. */
    private var nomeVisivel = 0f
    /** Fase da faixa da estrada (anda sem parar). */
    private var fase = 0f
    private val animadores = mutableListOf<ValueAnimator>()

    private fun animar(de: Float, ate: Float, ms: Long, atraso: Long = 0, interp: android.animation.TimeInterpolator = DecelerateInterpolator(), repetir: Boolean = false, aoMudar: (Float) -> Unit): ValueAnimator =
        ValueAnimator.ofFloat(de, ate).apply {
            duration = ms
            startDelay = atraso
            interpolator = interp
            if (repetir) repeatCount = ValueAnimator.INFINITE
            addUpdateListener { aoMudar(it.animatedValue as Float); invalidate() }
            animadores.add(this)
            start()
        }

    init {
        animar(0f, 1f, 650) { desenho = it }
        animar(0.7f, 1f, 700, interp = OvershootInterpolator(2.2f)) { escala = it }
        animar(0f, 1f, 500, atraso = 300) { nomeVisivel = it }
        animar(0f, 1f, 700, interp = LinearInterpolator(), repetir = true) { fase = it }
    }

    override fun onSizeChanged(w: Int, h: Int, oldw: Int, oldh: Int) {
        fundo.shader = LinearGradient(0f, 0f, w.toFloat(), h.toFloat(), Color.parseColor("#3B74FF"), Color.parseColor("#1641B8"), Shader.TileMode.CLAMP)
    }

    override fun onDraw(c: Canvas) {
        c.drawRect(0f, 0f, width.toFloat(), height.toFloat(), fundo)
        val lado = min(width, height) * 0.34f
        val u = lado / 24f // uma unidade do viewBox
        val cx = width / 2f
        val cy = height / 2f - lado * 0.18f
        c.save()
        c.translate(cx, cy)
        c.scale(escala, escala)
        c.translate(-12 * u, -12 * u)
        // As duas pernas do "A", desenhadas aos poucos.
        val a = Path().apply {
            moveTo(3.5f * u, 21 * u)
            lineTo(10.6f * u, 3.5f * u)
            lineTo(13.4f * u, 3.5f * u)
            lineTo(20.5f * u, 21 * u)
        }
        val medida = PathMeasure(a, false)
        val parte = Path()
        medida.getSegment(0f, medida.length * desenho, parte, true)
        traco.strokeWidth = 2.6f * u
        c.drawPath(parte, traco)
        // A faixa do meio: tracejado que desce como estrada passando.
        if (desenho > 0.5f) {
            faixa.strokeWidth = 2.1f * u
            faixa.alpha = ((desenho - 0.5f) * 2 * 255).toInt().coerceIn(0, 255)
            val risco = 1.9f * u
            val vao = 2.9f * u
            faixa.pathEffect = DashPathEffect(floatArrayOf(risco, vao), -(risco + vao) * fase)
            c.drawLine(12 * u, 9.6f * u, 12 * u, 21 * u, faixa)
        }
        c.restore()
        // O nome sobe e aparece.
        nome.textSize = 30f * densidade
        nome.alpha = (nomeVisivel * 255).toInt()
        c.drawText("ALUGUEI", cx, cy + lado * 0.75f + (1 - nomeVisivel) * 24f * densidade, nome)
    }

    /** O site carregou: zoom na logo, esmaece e some. */
    fun sair(aoTerminar: () -> Unit) {
        animar(escala, 2.4f, 420, interp = AccelerateInterpolator()) { escala = it }
        animate().alpha(0f).setStartDelay(120).setDuration(320).setListener(object : AnimatorListenerAdapter() {
            override fun onAnimationEnd(animation: Animator) {
                animadores.forEach { it.cancel() }
                aoTerminar()
            }
        }).start()
    }
}
