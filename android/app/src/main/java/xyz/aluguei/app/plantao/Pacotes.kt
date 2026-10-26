package xyz.aluguei.app.plantao

import android.content.Context
import xyz.aluguei.app.R

/**
 * Apps de corrida que o leitor acompanha.
 *
 * A lista fica num lugar só: a string `pacotes_corridas` em
 * res/values/plantao.xml. O res/xml/leitor_corridas.xml (filtro do Android)
 * e este código leem a mesma string. Para conferir o pacote de um app no
 * celular: Play Store > página do app > Compartilhar (o link traz
 * `id=<pacote>`), ou `adb shell pm list packages | grep -i uber`.
 * Veja docs/app-nativo.md.
 */
object Pacotes {
    fun lista(ctx: Context): Set<String> =
        ctx.getString(R.string.pacotes_corridas).split(',').map { it.trim() }.filter { it.isNotEmpty() }.toSet()

    /** Pacote → plataforma do app web (uber | 99 | indrive | outra). */
    fun plataforma(pacote: String): String {
        val p = pacote.lowercase()
        return when {
            "uber" in p -> "uber"
            "app99" in p || "taxis99" in p -> "99"
            "indriver" in p || "indrive" in p -> "indrive"
            else -> "outra"
        }
    }
}
