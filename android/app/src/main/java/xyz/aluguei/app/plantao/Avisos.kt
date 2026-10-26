package xyz.aluguei.app.plantao

import android.content.Context
import android.media.AudioManager
import android.media.ToneGenerator
import android.os.Handler
import android.os.Looper
import android.speech.tts.TextToSpeech
import java.util.Locale

/**
 * Voz e bip do cartão. A voz (TextToSpeech em pt-BR) só é iniciada com
 * preferencias.voz ligada e é liberada ao desligar; o bip (ToneGenerator curto)
 * toca só na corrida verde. Qualquer falha do aparelho é ignorada: o cartão
 * aparece do mesmo jeito.
 */
class Avisos(contexto: Context) {
    private val ctx = contexto.applicationContext
    private val principal = Handler(Looper.getMainLooper())
    private var tts: TextToSpeech? = null
    private var pronta = false

    /** Liga ou desliga a voz conforme a preferência. */
    fun aplicar(voz: Boolean) {
        if (voz && tts == null) iniciar() else if (!voz) liberar()
    }

    private fun iniciar() {
        try {
            var motor: TextToSpeech? = null
            motor = TextToSpeech(ctx) { status ->
                principal.post {
                    val m = motor ?: return@post
                    if (tts !== m) return@post // desligada antes de ficar pronta
                    if (status != TextToSpeech.SUCCESS) {
                        liberar()
                        return@post
                    }
                    val r = try {
                        m.setLanguage(Locale.forLanguageTag("pt-BR"))
                    } catch (e: RuntimeException) {
                        TextToSpeech.LANG_NOT_SUPPORTED
                    }
                    pronta = r != TextToSpeech.LANG_MISSING_DATA && r != TextToSpeech.LANG_NOT_SUPPORTED
                }
            }
            tts = motor
        } catch (e: RuntimeException) {
            tts = null
            pronta = false
        }
    }

    /** Fala curto, cortando a fala anterior. */
    fun falar(texto: String) {
        if (!pronta) return
        try {
            tts?.speak(texto, TextToSpeech.QUEUE_FLUSH, null, "aluguei-oferta")
        } catch (e: RuntimeException) {
            // motor de voz caiu: o cartão segue
        }
    }

    /** Bip curto (só chamar na corrida verde). */
    fun bip() {
        try {
            val tom = ToneGenerator(AudioManager.STREAM_NOTIFICATION, 70)
            tom.startTone(ToneGenerator.TONE_PROP_BEEP, 150)
            principal.postDelayed({ runCatching { tom.release() } }, 400)
        } catch (e: RuntimeException) {
            // sem áudio disponível agora
        }
    }

    fun liberar() {
        val m = tts
        tts = null
        pronta = false
        try {
            m?.stop()
            m?.shutdown()
        } catch (e: RuntimeException) {
            // já estava desligado
        }
    }
}
