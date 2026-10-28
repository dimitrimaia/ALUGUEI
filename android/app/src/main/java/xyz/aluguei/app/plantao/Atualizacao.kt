package xyz.aluguei.app.plantao

import android.app.DownloadManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.provider.Settings
import androidx.core.content.ContextCompat
import androidx.core.content.FileProvider
import java.io.File

/**
 * "Atualizar o Copiloto" sem a Play Store: baixa o APK novo (DownloadManager, com
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

    /** Baixa o APK de `url` e, ao terminar, abre o instalador. Só aceita https. */
    fun baixarEInstalar(ctx: Context, url: String): Boolean {
        if (!url.startsWith("https://")) return false
        val app = ctx.applicationContext
        val pasta = app.getExternalFilesDir(PASTA) ?: return false
        val destino = File(pasta, ARQUIVO).apply { delete() }
        val dm = app.getSystemService(Context.DOWNLOAD_SERVICE) as? DownloadManager ?: return false
        val id = dm.enqueue(
            DownloadManager.Request(Uri.parse(url))
                .setTitle("Atualização do Aluguei")
                .setDescription("Copiloto")
                .setMimeType("application/vnd.android.package-archive")
                .setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE)
                .setDestinationUri(Uri.fromFile(destino)),
        )
        val terminou = object : BroadcastReceiver() {
            override fun onReceive(c: Context?, i: Intent?) {
                if (i?.getLongExtra(DownloadManager.EXTRA_DOWNLOAD_ID, -1) != id) return
                runCatching { app.unregisterReceiver(this) }
                if (destino.exists() && destino.length() > 0) instalar(app, destino)
            }
        }
        ContextCompat.registerReceiver(app, terminou, IntentFilter(DownloadManager.ACTION_DOWNLOAD_COMPLETE), ContextCompat.RECEIVER_EXPORTED)
        return true
    }

    private fun instalar(ctx: Context, apk: File) {
        val uri = FileProvider.getUriForFile(ctx, "${ctx.packageName}.fileprovider", apk)
        ctx.startActivity(
            Intent(Intent.ACTION_VIEW)
                .setDataAndType(uri, "application/vnd.android.package-archive")
                .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_ACTIVITY_NEW_TASK),
        )
    }
}
