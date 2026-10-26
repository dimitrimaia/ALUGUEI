package xyz.aluguei.app.plantao

import android.graphics.Canvas
import android.graphics.ColorFilter
import android.graphics.Paint
import android.graphics.PixelFormat
import android.graphics.RectF
import android.graphics.drawable.Drawable

/**
 * Sombra suave desenhada à mão, que acompanha o raio da peça (círculo na bolha,
 * cantos arredondados no cartão). Não depende da elevação: em janelas por cima de
 * outros apps (criadas por um serviço) a elevação pode sair sem sombra ou com
 * sombra quadrada, cortada na borda da janela.
 *
 * Vai no fundo de uma moldura transparente com padding = [esquerda], [topo],
 * [direita], [baixo]: a peça ocupa o retângulo de dentro e a sombra se espalha
 * por [espalhar] px em volta, descida [deslocY] px, em camadas cada vez mais
 * claras (parece um desfoque, funciona com ou sem aceleração de hardware).
 */
class Sombra(
    private val raio: Float,
    private val esquerda: Int,
    private val topo: Int,
    private val direita: Int,
    private val baixo: Int,
    private val espalhar: Float,
    private val deslocY: Float,
    /** Opacidade somada no centro (0..255). */
    private val forca: Int = 70,
) : Drawable() {

    private val pincel = Paint(Paint.ANTI_ALIAS_FLAG).apply { style = Paint.Style.FILL }
    private val retangulo = RectF()
    private var alfaGeral = 255

    override fun draw(canvas: Canvas) {
        val b = bounds
        val l = b.left + esquerda.toFloat()
        val t = b.top + topo.toFloat() + deslocY
        val r = b.right - direita.toFloat()
        val bt = b.bottom - baixo.toFloat() + deslocY
        if (r <= l || bt <= t) return
        val passos = CAMADAS
        // Cada camada é um pouco maior e mais clara; somadas, fazem um degradê suave.
        for (i in passos downTo 1) {
            val f = i / passos.toFloat()
            val e = espalhar * f
            val alfa = ((forca / passos.toFloat()) * (1.15f - f) * alfaGeral / 255f).toInt().coerceIn(0, 255)
            if (alfa == 0) continue
            pincel.color = alfa shl 24
            retangulo.set(l - e, t - e * 0.6f, r + e, bt + e)
            canvas.drawRoundRect(retangulo, raio + e, raio + e, pincel)
        }
    }

    override fun setAlpha(alpha: Int) {
        alfaGeral = alpha.coerceIn(0, 255)
        invalidateSelf()
    }

    override fun setColorFilter(colorFilter: ColorFilter?) {
        pincel.colorFilter = colorFilter
    }

    @Deprecated("Deprecated in Java")
    override fun getOpacity(): Int = PixelFormat.TRANSLUCENT

    private companion object {
        const val CAMADAS = 8
    }
}
