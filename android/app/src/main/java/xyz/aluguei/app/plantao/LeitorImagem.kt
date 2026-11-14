package xyz.aluguei.app.plantao

import android.graphics.Bitmap
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.latin.TextRecognizerOptions

/**
 * Lê o texto de uma imagem da tela, no próprio celular (ML Kit, sem internet).
 * Usado na Uber, que esconde o texto do cartão da oferta da acessibilidade.
 * A imagem fica só na memória: não é guardada nem enviada.
 */
object LeitorImagem {
    private val reconhecedor by lazy { TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS) }

    /** Linhas de texto na ordem da tela (de cima para baixo, da esquerda para a direita). */
    fun ler(imagem: Bitmap, aoTerminar: (List<String>) -> Unit) {
        try {
            reconhecedor.process(InputImage.fromBitmap(imagem, 0))
                .addOnSuccessListener { r ->
                    val linhas = r.textBlocks.flatMap { it.lines }
                        .sortedWith(compareBy({ (it.boundingBox?.top ?: 0) / 12 }, { it.boundingBox?.left ?: 0 }))
                        .map { it.text }
                    aoTerminar(Ocr.corrigir(linhas))
                }
                .addOnFailureListener { aoTerminar(emptyList()) }
        } catch (e: RuntimeException) {
            aoTerminar(emptyList())
        }
    }
}

/** Correções de leitura de imagem que não mudam o sentido (testadas em OcrTest). */
object Ocr {
    // "RS 17,02", "R5 17,02", "R$17,02" → "R$ 17,02"
    private val REAIS = Regex("(?<![A-Za-z])R\\s?[S5$§]\\s?(?=[0-9])")
    // "12 mín", "12 rnin" → "12 min"
    private val MIN = Regex("(?<=[0-9])\\s?(?:m[íi]n|rn[íi]n)(?![a-z])")

    fun corrigir(linhas: List<String>): List<String> = linhas.map { l ->
        l.replace(REAIS, "R\\$ ").replace(MIN, " min")
    }
}
