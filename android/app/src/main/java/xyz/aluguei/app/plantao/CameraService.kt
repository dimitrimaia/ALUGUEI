package xyz.aluguei.app.plantao

import android.Manifest
import android.annotation.SuppressLint
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.ContentValues
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.content.pm.ServiceInfo
import android.hardware.camera2.CameraCaptureSession
import android.hardware.camera2.CameraCharacteristics
import android.hardware.camera2.CameraDevice
import android.hardware.camera2.CameraManager
import android.media.MediaRecorder
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.os.Handler
import android.os.HandlerThread
import android.os.IBinder
import android.os.Looper
import android.os.ParcelFileDescriptor
import android.provider.MediaStore
import android.view.Surface
import android.widget.Toast
import androidx.core.app.NotificationCompat
import androidx.core.app.ServiceCompat
import androidx.core.content.ContextCompat
import xyz.aluguei.app.MainActivity
import xyz.aluguei.app.R
import java.io.File

/**
 * Câmera de segurança da corrida: serviço em primeiro plano (tipo camera, e
 * microphone quando o motorista deu a permissão do microfone) que grava vídeo em
 * arquivos de preferencias.camera.minutosPorArquivo minutos, com Camera2 +
 * MediaRecorder, em Movies/Aluguei/Corridas (MediaStore). Quando o total passa de
 * limiteGb, apaga os mais antigos que ELA MESMA gravou.
 *
 * Transparente: notificação fixa "Câmera de segurança gravando" com o botão
 * Parar enquanto grava. Só começa com o Aluguei visível (regra do Android 14
 * para câmera em primeiro plano): pelo plugin (cameraIniciar). Nada sai do
 * celular. Toda a câmera roda numa thread própria; qualquer erro só para a
 * gravação (nunca derruba o Copiloto).
 */
class CameraService : Service() {

    companion object {
        const val ACAO_PARAR = "xyz.aluguei.app.plantao.CAMERA_PARAR"
        private const val CANAL = "camera"
        private const val ID_NOTIFICACAO = 4022

        @Volatile
        var instancia: CameraService? = null
            private set

        /** Início da gravação atual (epoch ms), ou null. */
        @Volatile
        var desde: Long? = null
            private set

        val gravando: Boolean get() = instancia != null && desde != null

        fun permitidaCamera(ctx: Context) = ContextCompat.checkSelfPermission(ctx, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED
        fun permitidoMicrofone(ctx: Context) = ContextCompat.checkSelfPermission(ctx, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED

        /** Chamar só com o app visível (plugin). */
        fun iniciar(ctx: Context) {
            ContextCompat.startForegroundService(ctx, Intent(ctx, CameraService::class.java))
        }

        fun parar(ctx: Context) {
            ctx.stopService(Intent(ctx, CameraService::class.java))
        }
    }

    private var thread: HandlerThread? = null
    private var camera: Handler? = null
    private val principal = Handler(Looper.getMainLooper())

    // tudo abaixo só é tocado na thread da câmera
    private var dispositivo: CameraDevice? = null
    private var sessao: CameraCaptureSession? = null
    private var gravador: MediaRecorder? = null
    private var arquivoAtual: Destino? = null
    private var encerrando = false

    /** Onde o segmento está sendo gravado. */
    private class Destino(val id: String, val uri: Uri?, val arquivo: File?, val pfd: ParcelFileDescriptor?, val criadoEm: Long)

    private val trocarSegmento = Runnable { proximoSegmento() }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        criarCanal()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == ACAO_PARAR) {
            stopSelf()
            return START_NOT_STICKY
        }
        if (instancia != null) return START_NOT_STICKY // já gravando
        if (!permitidaCamera(this)) {
            stopSelf()
            return START_NOT_STICKY
        }
        val comAudio = permitidoMicrofone(this)
        try {
            var tipos = 0
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                tipos = ServiceInfo.FOREGROUND_SERVICE_TYPE_CAMERA
                if (comAudio) tipos = tipos or ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE
            }
            ServiceCompat.startForeground(this, ID_NOTIFICACAO, notificacao(), tipos)
        } catch (e: RuntimeException) {
            // O Android não deixou (ex.: app em segundo plano no Android 14): não grava.
            aviso("A câmera só pode começar com o Aluguei aberto.")
            stopSelf()
            return START_NOT_STICKY
        }
        instancia = this
        desde = System.currentTimeMillis()
        val t = HandlerThread("aluguei-camera").also { it.start() }
        thread = t
        camera = Handler(t.looper).also { h -> h.post { abrirCamera(comAudio) } }
        PlantaoPlugin.emitirEstado(this)
        // Não volta sozinho se o sistema matar o serviço (só com o motorista vendo).
        return START_NOT_STICKY
    }

    override fun onDestroy() {
        val h = camera
        val t = thread
        instancia = null
        desde = null
        if (h != null && t != null) {
            h.removeCallbacks(trocarSegmento)
            // Fecha tudo na thread da câmera e só então encerra a thread.
            h.post {
                encerrando = true
                fecharSegmento()
                fecharCamera()
                t.quitSafely()
            }
        }
        camera = null
        thread = null
        PlantaoPlugin.emitirEstado(this)
        super.onDestroy()
    }

    // ------------------------------------------------------------------ notificação

    private fun criarCanal() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val canal = NotificationChannel(CANAL, "Câmera de segurança", NotificationManager.IMPORTANCE_LOW).apply {
            description = "Aviso fixo enquanto a câmera de segurança da corrida estiver gravando."
            setShowBadge(false)
        }
        (getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager).createNotificationChannel(canal)
    }

    private fun notificacao(): Notification {
        val imutavel = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0
        val parar = PendingIntent.getService(
            this, 30,
            Intent(this, CameraService::class.java).setAction(ACAO_PARAR),
            imutavel or PendingIntent.FLAG_UPDATE_CURRENT,
        )
        val abrir = PendingIntent.getActivity(
            this, 31,
            Intent(this, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_REORDER_TO_FRONT),
            imutavel or PendingIntent.FLAG_UPDATE_CURRENT,
        )
        return NotificationCompat.Builder(this, CANAL)
            .setSmallIcon(R.drawable.ic_copiloto_simbolo)
            .setContentTitle("Câmera de segurança gravando")
            .setContentText("Os vídeos ficam só neste celular (Movies/Aluguei/Corridas).")
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE)
            .setContentIntent(abrir)
            .addAction(0, "Parar", parar)
            .build()
    }

    private fun aviso(t: String) {
        principal.post {
            try {
                Toast.makeText(this, t, Toast.LENGTH_LONG).show()
            } catch (e: RuntimeException) {
                // sem toast
            }
        }
    }

    /** Erro na câmera: para tudo (na thread principal) com um aviso. */
    private fun falhou(t: String) {
        if (encerrando) return
        encerrando = true
        aviso(t)
        principal.post { stopSelf() }
    }

    // ------------------------------------------------------------------ câmera (thread própria)

    private var comAudio = false

    @SuppressLint("MissingPermission")
    private fun abrirCamera(audio: Boolean) {
        comAudio = audio
        try {
            val cm = getSystemService(Context.CAMERA_SERVICE) as CameraManager
            val lente = Armazenamento.preferencias(this).camera.lente
            val queroFrente = lente == "frontal"
            val ids = cm.cameraIdList.toList()
            val id = ids.firstOrNull { cid ->
                val f = cm.getCameraCharacteristics(cid).get(CameraCharacteristics.LENS_FACING)
                f == (if (queroFrente) CameraCharacteristics.LENS_FACING_FRONT else CameraCharacteristics.LENS_FACING_BACK)
            } ?: ids.firstOrNull()
            if (id == null) {
                falhou("Este celular não tem câmera disponível.")
                return
            }
            cm.openCamera(id, object : CameraDevice.StateCallback() {
                override fun onOpened(d: CameraDevice) {
                    if (encerrando) {
                        d.close()
                        return
                    }
                    dispositivo = d
                    iniciarSegmento()
                }

                override fun onDisconnected(d: CameraDevice) {
                    d.close()
                    if (dispositivo === d) dispositivo = null
                    falhou("Outro app pegou a câmera: a gravação parou.")
                }

                override fun onError(d: CameraDevice, erro: Int) {
                    d.close()
                    if (dispositivo === d) dispositivo = null
                    falhou("A câmera deu erro ($erro): a gravação parou.")
                }
            }, camera)
        } catch (e: Exception) {
            falhou("Não deu para abrir a câmera.")
        }
    }

    private fun tamanhoVideo(d: CameraDevice): Pair<Int, Int> {
        val q = Gravacoes.qualidade(Armazenamento.preferencias(this).camera.qualidade)
        return try {
            val cm = getSystemService(Context.CAMERA_SERVICE) as CameraManager
            val mapa = cm.getCameraCharacteristics(d.id).get(CameraCharacteristics.SCALER_STREAM_CONFIGURATION_MAP)
            val lista = mapa?.getOutputSizes(MediaRecorder::class.java)?.map { Pair(it.width, it.height) } ?: emptyList()
            Gravacoes.escolherTamanho(lista, q.altura) ?: Pair(q.altura * 16 / 9, q.altura)
        } catch (e: RuntimeException) {
            Pair(q.altura * 16 / 9, q.altura)
        }
    }

    private fun orientacao(d: CameraDevice): Int = try {
        val cm = getSystemService(Context.CAMERA_SERVICE) as CameraManager
        cm.getCameraCharacteristics(d.id).get(CameraCharacteristics.SENSOR_ORIENTATION) ?: 0
    } catch (e: RuntimeException) {
        0
    }

    /** Cria o arquivo do segmento (MediaStore no Android 10+; pasta do app antes disso). */
    private fun novoDestino(): Destino? {
        val agora = System.currentTimeMillis()
        val nome = Gravacoes.nomeVideo(agora)
        return try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                val valores = ContentValues().apply {
                    put(MediaStore.Video.Media.DISPLAY_NAME, nome)
                    put(MediaStore.Video.Media.MIME_TYPE, "video/mp4")
                    put(MediaStore.Video.Media.RELATIVE_PATH, Gravacoes.PASTA_VIDEOS)
                    put(MediaStore.Video.Media.IS_PENDING, 1)
                }
                val uri = contentResolver.insert(MediaStore.Video.Media.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY), valores) ?: return null
                val pfd = contentResolver.openFileDescriptor(uri, "rw") ?: return null
                Destino(uri.toString(), uri, null, pfd, agora)
            } else {
                val pasta = File(getExternalFilesDir(Environment.DIRECTORY_MOVIES), "Corridas").apply { mkdirs() }
                val f = File(pasta, nome)
                Destino(f.absolutePath, null, f, null, agora)
            }
        } catch (e: Exception) {
            null
        }
    }

    @Suppress("DEPRECATION")
    private fun novoGravador(): MediaRecorder =
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) MediaRecorder(this) else MediaRecorder()

    private fun iniciarSegmento() {
        val d = dispositivo ?: return
        if (encerrando) return
        val destino = novoDestino()
        if (destino == null) {
            falhou("Sem espaço ou sem acesso para gravar o vídeo.")
            return
        }
        val prefs = Armazenamento.preferencias(this).camera
        val q = Gravacoes.qualidade(prefs.qualidade)
        val (largura, altura) = tamanhoVideo(d)
        val r = novoGravador()
        try {
            if (comAudio) r.setAudioSource(MediaRecorder.AudioSource.CAMCORDER)
            r.setVideoSource(MediaRecorder.VideoSource.SURFACE)
            r.setOutputFormat(MediaRecorder.OutputFormat.MPEG_4)
            if (destino.pfd != null) r.setOutputFile(destino.pfd.fileDescriptor) else r.setOutputFile(destino.arquivo!!.absolutePath)
            r.setVideoEncoder(MediaRecorder.VideoEncoder.H264)
            r.setVideoEncodingBitRate(q.bitsPorSegundo)
            r.setVideoFrameRate(30)
            r.setVideoSize(largura, altura)
            if (comAudio) {
                r.setAudioEncoder(MediaRecorder.AudioEncoder.AAC)
                r.setAudioEncodingBitRate(64_000)
                r.setAudioSamplingRate(44_100)
            }
            r.setOrientationHint(orientacao(d))
            r.prepare()
        } catch (e: Exception) {
            r.release()
            descartar(destino)
            falhou("Não deu para preparar a gravação neste celular.")
            return
        }
        gravador = r
        arquivoAtual = destino
        val superficie: Surface = r.surface
        try {
            @Suppress("DEPRECATION")
            d.createCaptureSession(listOf(superficie), object : CameraCaptureSession.StateCallback() {
                override fun onConfigured(s: CameraCaptureSession) {
                    if (encerrando || gravador !== r) {
                        s.close()
                        return
                    }
                    sessao = s
                    try {
                        val pedido = d.createCaptureRequest(CameraDevice.TEMPLATE_RECORD).apply { addTarget(superficie) }.build()
                        s.setRepeatingRequest(pedido, null, camera)
                        r.start()
                        camera?.postDelayed(trocarSegmento, Gravacoes.segmentoMs(prefs.minutosPorArquivo))
                    } catch (e: Exception) {
                        falhou("A câmera não começou a gravar.")
                    }
                }

                override fun onConfigureFailed(s: CameraCaptureSession) {
                    falhou("A câmera não aceitou a gravação neste celular.")
                }
            }, camera)
        } catch (e: Exception) {
            falhou("A câmera não aceitou a gravação neste celular.")
        }
    }

    /** Fecha o arquivo atual e abre o próximo (a câmera continua aberta). */
    private fun proximoSegmento() {
        if (encerrando) return
        fecharSegmento()
        iniciarSegmento()
    }

    /** Para o gravador, publica o arquivo e aplica o limite de espaço. */
    private fun fecharSegmento() {
        camera?.removeCallbacks(trocarSegmento)
        try {
            sessao?.stopRepeating()
        } catch (e: Exception) {
            // sessão já fechada
        }
        try {
            sessao?.close()
        } catch (e: Exception) {
            // idem
        }
        sessao = null
        val r = gravador
        val destino = arquivoAtual
        gravador = null
        arquivoAtual = null
        var ok = false
        if (r != null) {
            ok = try {
                r.stop()
                true
            } catch (e: RuntimeException) {
                false // parou antes de gravar qualquer quadro
            }
            r.release()
        }
        if (destino == null) return
        try {
            destino.pfd?.close()
        } catch (e: Exception) {
            // ok
        }
        if (!ok) {
            descartar(destino)
            return
        }
        val bytes = publicar(destino)
        val lista = Armazenamento.videos(this) + Gravacoes.Arquivo(destino.id, bytes, destino.criadoEm)
        limpar(lista)
    }

    private fun publicar(destino: Destino): Long {
        return try {
            if (destino.uri != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                contentResolver.update(destino.uri, ContentValues().apply { put(MediaStore.Video.Media.IS_PENDING, 0) }, null, null)
                contentResolver.openFileDescriptor(destino.uri, "r")?.use { it.statSize } ?: 0L
            } else {
                destino.arquivo?.length() ?: 0L
            }
        } catch (e: Exception) {
            0L
        }
    }

    private fun descartar(destino: Destino) {
        try {
            destino.pfd?.close()
        } catch (e: Exception) {
            // ok
        }
        apagar(destino.id)
    }

    private fun apagar(id: String): Boolean = try {
        if (id.startsWith("content://")) {
            contentResolver.delete(Uri.parse(id), null, null)
            true
        } else {
            File(id).delete()
            true
        }
    } catch (e: Exception) {
        false
    }

    /** Passou de limiteGb: apaga os mais antigos (só os que esta câmera gravou). */
    private fun limpar(lista: List<Gravacoes.Arquivo>) {
        val limite = Gravacoes.limiteBytes(Armazenamento.preferencias(this).camera.limiteGb)
        val sair = Gravacoes.paraApagar(lista, limite, arquivoAtual?.id).toSet()
        sair.forEach { apagar(it) }
        Armazenamento.salvarVideos(this, lista.filter { it.id !in sair })
    }

    private fun fecharCamera() {
        try {
            dispositivo?.close()
        } catch (e: Exception) {
            // ok
        }
        dispositivo = null
    }
}
