package xyz.aluguei.app.plantao

import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.provider.Settings
import androidx.core.content.FileProvider
import java.io.File

/**
 * "Atualizar o Copiloto" sem a Play Store: baixa o APK novo (baixa numa thread, com
 * a barra de progresso nas notificações) e abre o instalador do Android. Quem
 * confirma a instalação é sempre a pessoa. Só existe no APK direto: a versão da
 * Play Store não declara REQUEST_INSTALL_PACKAGES e lá quem atualiza é a loja.
 */
object Atualizacao {
    private const val PASTA = "atualizacao"
    private const val ARQUIVO = "copiloto.apk"

    fun versaoInstalada(ctx: Context): Long = try {
        val info = ctx.packageManager.getPackageInfo(ctx.packageName, 0)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) info.longVersionCode else @Suppress("DEPRECATION") info.versionCode.toLong()
    } catch (e: PackageManager.NameNotFoundException) {
        0
    }

    /** APK direto (tem a permissão de instalar pacotes declarada no manifesto). */
    fun disponivel(ctx: Context): Boolean = try {
        @Suppress("DEPRECATION")
        val info = ctx.packageManager.getPackageInfo(ctx.packageName, PackageManager.GET_PERMISSIONS)
        info.requestedPermissions?.contains("android.permission.REQUEST_INSTALL_PACKAGES") == true
    } catch (e: PackageManager.NameNotFoundException) {
        false
    }

    /** Android 8+: a pessoa precisa deixar o Aluguei instalar apps (uma vez). */
    fun podeInstalar(ctx: Context): Boolean =
        Build.VERSION.SDK_INT < Build.VERSION_CODES.O || ctx.packageManager.canRequestPackageInstalls()

    fun abrirPermissaoInstalar(ctx: Context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        ctx.startActivity(Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:${ctx.packageName}")).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
    }

    /**
     * Baixa o APK de `url` (só https) numa thread e devolve o arquivo em [aoTerminar]
     * (null se falhou). Quem chama abre o instalador a partir da tela aberta: o Android
     * novo não deixa abrir o instalador de um processo em segundo plano.
     */
    fun baixar(ctx: Context, url: String, aoTerminar: (File?) -> Unit) {
        if (!url.startsWith("https://")) return aoTerminar(null)
        val pasta = ctx.applicationContext.getExternalFilesDir(PASTA) ?: return aoTerminar(null)
        Thread {
            val destino = File(pasta, ARQUIVO)
            val ok = runCatching {
                destino.delete()
                val con = (java.net.URL(url).openConnection() as java.net.HttpURLConnection).apply { connectTimeout = 20_000; readTimeout = 60_000 }
                try {
                    if (con.responseCode != 200) error("HTTP ${con.responseCode}")
                    con.inputStream.use { i -> destino.outputStream().use { o -> i.copyTo(o) } }
                } finally {
                    con.disconnect()
                }
                destino.length() > 100_000
            }.getOrDefault(false)
            aoTerminar(if (ok) destino else null)
        }.start()
    }

    /** Abre o instalador do Android para o APK baixado (chamar com a tela do app aberta). */
    fun abrirInstalador(ctx: Context, apk: File) = instalar(ctx, apk)

    private fun instalar(ctx: Context, apk: File) {
        val uri = FileProvider.getUriForFile(ctx, "${ctx.packageName}.fileprovider", apk)
        ctx.startActivity(
            Intent(Intent.ACTION_VIEW)
                .setDataAndType(uri, "application/vnd.android.package-archive")
                .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_ACTIVITY_NEW_TASK),
        )
    }
}
