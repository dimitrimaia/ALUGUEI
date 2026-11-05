package xyz.aluguei.app.plantao

import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.media.MediaMetadataRetriever
import android.media.ThumbnailUtils
import android.net.Uri
import android.os.Build
import android.provider.MediaStore
import android.util.Base64
import android.util.Size
import androidx.core.content.FileProvider
import java.io.ByteArrayOutputStream
import java.io.File

/**
 * Gravações da câmera de segurança, para a tela "Gravações" do app: listar com
 * miniatura e duração, assistir, compartilhar e apagar. Só mexe nos vídeos que a
 * própria câmera gravou (a lista do Armazenamento), nunca no resto da galeria.
 */
object GerenciadorGravacoes {

    data class Item(val id: String, val bytes: Long, val criadoEm: Long, val duracaoSeg: Long?, val miniatura: String?, val emGravacao: Boolean)

    private fun existe(ctx: Context, id: String): Boolean = try {
        if (id.startsWith("content://")) ctx.contentResolver.openFileDescriptor(Uri.parse(id), "r")?.use { true } ?: false
        else File(id).exists()
    } catch (e: Exception) {
        false
    }

    /** O segmento mais novo está sendo gravado enquanto a câmera estiver ligada. */
    private fun idEmGravacao(lista: List<Gravacoes.Arquivo>): String? =
        if (CameraService.gravando) lista.maxByOrNull { it.criadoEm }?.id else null

    /** Mais novas primeiro. Tira da lista o que a pessoa já apagou pela galeria. */
    fun listar(ctx: Context): List<Item> {
        val todos = Armazenamento.videos(ctx)
        val emGravacao = idEmGravacao(todos)
        val vivos = todos.filter { it.id == emGravacao || existe(ctx, it.id) }
        if (vivos.size != todos.size) Armazenamento.salvarVideos(ctx, vivos)
        return vivos.sortedByDescending { it.criadoEm }.map { a ->
            val gravando = a.id == emGravacao
            Item(a.id, a.bytes, a.criadoEm, if (gravando) null else duracao(ctx, a.id), if (gravando) null else miniatura(ctx, a.id), gravando)
        }
    }

    private fun duracao(ctx: Context, id: String): Long? {
        val r = MediaMetadataRetriever()
        return try {
            if (id.startsWith("content://")) r.setDataSource(ctx, Uri.parse(id)) else r.setDataSource(id)
            r.extractMetadata(MediaMetadataRetriever.METADATA_KEY_DURATION)?.toLongOrNull()?.div(1000)
        } catch (e: Exception) {
            null
        } finally {
            runCatching { r.release() }
        }
    }

    /** JPEG pequeno em base64 (data URL), para a lista. */
    private fun miniatura(ctx: Context, id: String): String? = try {
        val tamanho = Size(320, 180)
        val bmp: Bitmap? = when {
            Build.VERSION.SDK_INT >= 29 && id.startsWith("content://") -> ctx.contentResolver.loadThumbnail(Uri.parse(id), tamanho, null)
            Build.VERSION.SDK_INT >= 29 -> ThumbnailUtils.createVideoThumbnail(File(id), tamanho, null)
            else -> @Suppress("DEPRECATION") ThumbnailUtils.createVideoThumbnail(id, MediaStore.Images.Thumbnails.MINI_KIND)
        }
        bmp?.let {
            val saida = ByteArrayOutputStream()
            it.compress(Bitmap.CompressFormat.JPEG, 70, saida)
            "data:image/jpeg;base64," + Base64.encodeToString(saida.toByteArray(), Base64.NO_WRAP)
        }
    } catch (e: Exception) {
        null
    }

    private fun uriDe(ctx: Context, id: String): Uri =
        if (id.startsWith("content://")) Uri.parse(id) else FileProvider.getUriForFile(ctx, ctx.packageName + ".fileprovider", File(id))

    private fun conhecido(ctx: Context, id: String) = Armazenamento.videos(ctx).any { it.id == id }

    fun abrir(ctx: Context, id: String): Boolean {
        if (!conhecido(ctx, id)) return false
        val i = Intent(Intent.ACTION_VIEW).setDataAndType(uriDe(ctx, id), "video/mp4")
            .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_ACTIVITY_NEW_TASK)
        return runCatching { ctx.startActivity(i) }.isSuccess
    }

    fun compartilhar(ctx: Context, id: String): Boolean {
        if (!conhecido(ctx, id)) return false
        val envio = Intent(Intent.ACTION_SEND).setType("video/mp4").putExtra(Intent.EXTRA_STREAM, uriDe(ctx, id))
            .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        val i = Intent.createChooser(envio, "Compartilhar gravação").addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_GRANT_READ_URI_PERMISSION)
        return runCatching { ctx.startActivity(i) }.isSuccess
    }

    /** Não apaga o segmento que está sendo gravado agora. */
    fun apagar(ctx: Context, id: String): Boolean {
        val lista = Armazenamento.videos(ctx)
        if (lista.none { it.id == id } || id == idEmGravacao(lista)) return false
        val ok = try {
            if (id.startsWith("content://")) ctx.contentResolver.delete(Uri.parse(id), null, null) >= 0 else File(id).delete() || !File(id).exists()
        } catch (e: Exception) {
            false
        }
        if (ok) Armazenamento.salvarVideos(ctx, lista.filter { it.id != id })
        return ok
    }
}
