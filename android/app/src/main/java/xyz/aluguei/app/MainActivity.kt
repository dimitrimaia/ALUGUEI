package xyz.aluguei.app

import android.graphics.Color
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import android.view.ViewGroup
import android.webkit.WebView
import android.widget.FrameLayout
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import com.getcapacitor.BridgeActivity
import com.getcapacitor.WebViewListener
import xyz.aluguei.app.plantao.PlantaoPlugin

class MainActivity : BridgeActivity() {
    private var abertura: AberturaView? = null
    private var abertaEm = 0L
    private val principal = Handler(Looper.getMainLooper())

    override fun onCreate(savedInstanceState: Bundle?) {
        // A abertura do sistema (fundo azul) só cobre o instante até a nossa animação entrar.
        installSplashScreen().setOnExitAnimationListener { it.remove() }
        // Plugins próprios precisam ser registrados antes do super.onCreate.
        registerPlugin(PlantaoPlugin::class.java)
        super.onCreate(savedInstanceState)
        // Fundo do WebView na cor do site enquanto ele pinta (não branco puro).
        bridge?.webView?.setBackgroundColor(Color.parseColor("#F3F6FB"))
        // Abertura animada por cima do app, até o site carregar.
        if (savedInstanceState == null) {
            val v = AberturaView(this)
            (window.decorView as ViewGroup).addView(v, FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT))
            abertura = v
            abertaEm = SystemClock.elapsedRealtime()
        }
        bridge?.addWebViewListener(object : WebViewListener() {
            override fun onPageLoaded(webView: WebView?) {
                fecharAbertura()
            }
        })
        // Sem internet ou servidor lento: não prende a pessoa na abertura.
        principal.postDelayed({ fecharAbertura() }, 8_000)
    }

    /** Fecha a abertura, mas só depois de a animação de entrada aparecer inteira (1,2 s). */
    private fun fecharAbertura() {
        val v = abertura ?: return
        val falta = 1_200 - (SystemClock.elapsedRealtime() - abertaEm)
        if (falta > 0) {
            principal.postDelayed({ fecharAbertura() }, falta)
            return
        }
        abertura = null
        v.sair { (v.parent as? ViewGroup)?.removeView(v) }
    }
}
