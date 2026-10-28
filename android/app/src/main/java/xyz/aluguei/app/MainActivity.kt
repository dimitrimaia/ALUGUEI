package xyz.aluguei.app

import android.graphics.Color
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.View
import android.view.animation.AccelerateInterpolator
import android.webkit.WebView
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import com.getcapacitor.BridgeActivity
import com.getcapacitor.WebViewListener
import xyz.aluguei.app.plantao.PlantaoPlugin

class MainActivity : BridgeActivity() {
    /** A primeira página do site já desenhou (ou o tempo máximo passou). */
    @Volatile private var carregou = false

    override fun onCreate(savedInstanceState: Bundle?) {
        // A abertura segura na tela até o site carregar: sem o WebView branco no meio.
        val abertura = installSplashScreen()
        abertura.setKeepOnScreenCondition { !carregou }
        // Saída: o símbolo cresce e some, e a abertura esmaece.
        abertura.setOnExitAnimationListener { tela ->
            val icone: View? = runCatching { tela.iconView }.getOrNull()
            icone?.animate()?.scaleX(1.25f)?.scaleY(1.25f)?.setDuration(260)?.start()
            tela.view.animate().alpha(0f).setDuration(320).setInterpolator(AccelerateInterpolator()).withEndAction { tela.remove() }.start()
        }
        // Plugins próprios precisam ser registrados antes do super.onCreate.
        registerPlugin(PlantaoPlugin::class.java)
        super.onCreate(savedInstanceState)
        // Fundo do WebView na cor do site enquanto ele pinta (não branco puro).
        bridge?.webView?.setBackgroundColor(Color.parseColor("#F3F6FB"))
        bridge?.addWebViewListener(object : WebViewListener() {
            override fun onPageLoaded(webView: WebView?) {
                carregou = true
            }
        })
        // Sem internet ou servidor lento: não prende a pessoa na abertura (a página de
        // "Abrindo o Aluguei…" do app assume).
        Handler(Looper.getMainLooper()).postDelayed({ carregou = true }, 8_000)
    }
}
