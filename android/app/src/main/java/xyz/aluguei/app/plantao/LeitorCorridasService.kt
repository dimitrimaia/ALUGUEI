package xyz.aluguei.app.plantao

import android.accessibilityservice.AccessibilityService
import android.content.ContentValues
import android.graphics.Bitmap
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import android.provider.MediaStore
import android.view.Display
import java.util.concurrent.Executors
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo

/**
 * Leitor de ofertas de corrida do Copiloto (serviço de acessibilidade).
 *
 * O que faz: quando a tela da Uber, 99 ou inDrive muda (só esses pacotes,
 * filtrados pelo Android em res/xml/leitor_corridas.xml), junta os textos
 * visíveis em LISTA (na ordem da tela), entrega ao leitor do app
 * ([LeitorInDrive], [LeitorUber], [Leitor99]) e passa o resultado para a
 * BolhaService mostrar ou esconder o cartão. Só trabalha com o Copiloto
 * ligado e não pausado.
 *
 * Economia (preferencias.economia, padrão ligada): com o inDrive offline
 * ("Offline" sem "Online", ou o botão de ficar online), o leitor dorme: não
 * monta a árvore da tela e só olha o texto dos eventos; acorda ao ver
 * "Online" ou uma oferta (e confere a tela inteira a cada 2 s em telas novas,
 * ou a cada 20 s no máximo).
 *
 * Print das ofertas (preferencias.printOfertas, Android 11+): quando uma oferta
 * nova é lida, guarda UM print da tela em Pictures/Aluguei/Ofertas (JPEG), para o
 * motorista contestar no app de corrida. No máximo 1 a cada 3 s, comprimido numa
 * thread de fundo. Abaixo do Android 11 fica desligado (aviso no diagnóstico).
 *
 * O que NÃO faz: não guarda a tela (fora o print acima, só se o motorista ligar), não envia nada para fora do aparelho e não
 * executa nenhuma ação (performAction, gestos) nos outros apps. Quem aceita,
 * recusa ou oferece tarifa é sempre o motorista.
 */
class LeitorCorridasService : AccessibilityService() {

    companion object {
        /**
         * Economia: o inDrive está offline e o leitor não monta a árvore da tela,
         * só olha o texto dos eventos até ver "Online" ou uma oferta.
         */
        @Volatile
        var dormindo = false
            private set

        /** O leitor ligado agora (para a BolhaService pedir o print da oferta). */
        @Volatile
        var instancia: LeitorCorridasService? = null
            private set

        /** O print das ofertas funciona neste Android? (takeScreenshot é do Android 11+.) */
        val printDisponivel: Boolean get() = Build.VERSION.SDK_INT >= Build.VERSION_CODES.R

        private const val MAXIMO_NOS = 500
        private const val MAXIMO_PROFUNDIDADE = 30
        private const val MAXIMO_CARACTERES = 6000
        private const val MAXIMO_TEXTOS = 250
        private const val PEDIDO_VALE_MS = 120_000L
        /** Intervalo mínimo entre duas leituras da tela (o mapa gera eventos sem parar). */
        private const val INTERVALO_LEITURA_MS = 1_000L
        /** Corrida em andamento e nenhum cartão aberto: o mapa muda o tempo todo; lê com calma (bateria). */
        private const val INTERVALO_EM_CORRIDA_MS = 5_000L
        /** Dormindo: uma leitura completa de conferência no máximo a cada tanto (tela nova / qualquer evento). */
        private const val CONFERIR_TELA_NOVA_MS = 2_000L
        private const val CONFERIR_SEMPRE_MS = 20_000L
    }

    private var ultimaConferencia = 0L

    private val principal = Handler(Looper.getMainLooper())
    private var pacotePendente: String? = null
    private var ultimaLeituraEm = 0L
    private val lerPendente = Runnable { pacotePendente?.let { lerAgora(it) } }

    private var pacotes: Set<String> = emptySet()

    /** Só o hash da última lista lida, para não reprocessar a mesma tela. */
    private var ultimoHash = 0

    /** Fila de uma thread só para comprimir e salvar os prints (nunca na thread principal). */
    private val fundo = Executors.newSingleThreadExecutor()
    private var ultimoPrint: Long? = null

    override fun onServiceConnected() {
        super.onServiceConnected()
        instancia = this
        pacotes = Pacotes.lista(this)
        // O motorista acabou de ligar o leitor a partir do Aluguei: volta para o app sozinho.
        val pedido = Armazenamento.pedidoAcessibilidadeEm(this)
        if (pedido > 0 && System.currentTimeMillis() - pedido < PEDIDO_VALE_MS) {
            Armazenamento.limparPedidoAcessibilidade(this)
            Permissoes.trazerAppParaFrente(this)
            PlantaoPlugin.emitirPermissao(Permissoes.ACESSIBILIDADE, true)
        }
    }

    private fun ativo(): Boolean = BolhaService.instancia != null && Armazenamento.ligado(this) && !Armazenamento.pausado(this)

    override fun onAccessibilityEvent(evento: AccessibilityEvent?) {
        val e = evento ?: return
        val pacote = e.packageName?.toString() ?: return
        if (pacote !in pacotes) return
        // Copiloto desligado ou pausado: não lê nada.
        if (!ativo()) {
            principal.removeCallbacks(lerPendente)
            if (dormindo) definirDormindo(false)
            return
        }

        if (dormindo && Pacotes.plataforma(pacote) == "indrive") {
            if (!Armazenamento.preferencias(this).economia) {
                definirDormindo(false)
            } else {
                // Só o texto do próprio evento (barato); a árvore inteira só para conferir de vez em quando.
                val textos = ArrayList<String>()
                e.text?.forEach { t -> t?.toString()?.let { textos.add(it) } }
                e.contentDescription?.toString()?.let { textos.add(it) }
                val agora = SystemClock.elapsedRealtime()
                val telaNova = e.eventType == AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED
                when {
                    textos.isNotEmpty() && LeitorInDrive.conexao(textos) == LeitorInDrive.Conexao.ONLINE -> definirDormindo(false)
                    (telaNova && agora - ultimaConferencia > CONFERIR_TELA_NOVA_MS) || agora - ultimaConferencia > CONFERIR_SEMPRE_MS -> {
                        ultimaConferencia = agora
                        ultimoHash = 0
                    }
                    else -> return
                }
            }
        }

        // Junta a rajada de eventos: lê na hora se faz tempo, senão uma vez no fim do intervalo.
        pacotePendente = pacote
        val intervalo = if (BolhaService.instancia?.emCorridaSemCartao() == true) INTERVALO_EM_CORRIDA_MS else INTERVALO_LEITURA_MS
        val espera = intervalo - (SystemClock.elapsedRealtime() - ultimaLeituraEm)
        principal.removeCallbacks(lerPendente)
        if (espera <= 0) lerAgora(pacote) else principal.postDelayed(lerPendente, espera)
    }

    private fun lerAgora(pacote: String) {
        pacotePendente = null
        ultimaLeituraEm = SystemClock.elapsedRealtime()
        val bolha = BolhaService.instancia ?: return
        if (!ativo()) return
        try {
            val raiz = raizDo(pacote) ?: return
            val textos = juntarTextos(raiz)
            val hash = textos.hashCode()
            if (hash == ultimoHash) return
            ultimoHash = hash
            val app = Pacotes.plataforma(pacote)
            if (app == "indrive" && Armazenamento.preferencias(this).economia) {
                when (LeitorInDrive.conexao(textos)) {
                    LeitorInDrive.Conexao.OFFLINE -> {
                        definirDormindo(true)
                        return
                    }
                    LeitorInDrive.Conexao.ONLINE -> definirDormindo(false)
                    LeitorInDrive.Conexao.DESCONHECIDA -> if (dormindo) return
                }
            }
            val tela = Leitores.ler(app, textos)
            bolha.receberTela(app, tela)
        } catch (e: RuntimeException) {
            // Nó que sumiu no meio da leitura etc.: ignora esta tela, a próxima vem em 700 ms.
        }
    }

    /**
     * Raiz da janela do app de corrida. Normalmente é a janela ativa; com a tela
     * bloqueada (o inDrive mostra a oferta por cima do bloqueio) ou com outra
     * janela por cima, a ativa pode ser a do sistema: procura entre as janelas
     * da tela (flagRetrieveInteractiveWindows), da de cima para a de baixo.
     */
    private fun raizDo(pacote: String): AccessibilityNodeInfo? {
        rootInActiveWindow?.takeIf { it.packageName?.toString() == pacote }?.let { return it }
        return try {
            windows.asSequence()
                .mapNotNull { j -> j.root }
                .firstOrNull { it.packageName?.toString() == pacote }
        } catch (e: RuntimeException) {
            null
        }
    }

    private fun definirDormindo(valor: Boolean) {
        if (dormindo == valor) return
        dormindo = valor
        ultimaConferencia = SystemClock.elapsedRealtime()
        if (!valor) ultimoHash = 0
        BolhaService.instancia?.dormindoMudou(valor)
        PlantaoPlugin.emitirEstado(this)
    }

    /**
     * Guarda um print da oferta que acabou de ser lida (chamado pela BolhaService uma
     * vez por oferta). Sem travar: o Android tira o print em segundo plano, e a
     * compressão e o salvamento vão para a thread de fundo. Qualquer erro: sem print.
     */
    fun printOferta(valor: Long?, app: String?) {
        if (!printDisponivel) return
        if (!Armazenamento.preferencias(this).printOfertas) return
        val agora = SystemClock.elapsedRealtime()
        if (!Gravacoes.podePrint(agora, ultimoPrint)) return
        ultimoPrint = agora
        val nome = Gravacoes.nomePrint(System.currentTimeMillis(), valor, app)
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.R) return
        try {
            takeScreenshot(
                Display.DEFAULT_DISPLAY,
                fundo,
                object : TakeScreenshotCallback {
                    override fun onSuccess(resultado: ScreenshotResult) {
                        salvarPrint(resultado, nome)
                    }

                    override fun onFailure(erro: Int) {
                        // muito seguido ou tela protegida: sem print desta vez
                    }
                },
            )
        } catch (e: RuntimeException) {
            // sem print
        }
    }

    /** Na thread de fundo: HardwareBuffer → JPEG 80% → MediaStore. */
    private fun salvarPrint(resultado: ScreenshotResult, nome: String) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.R) return
        val buffer = resultado.hardwareBuffer
        try {
            val hw = Bitmap.wrapHardwareBuffer(buffer, resultado.colorSpace) ?: return
            val bmp = hw.copy(Bitmap.Config.ARGB_8888, false)
            hw.recycle()
            if (bmp == null) return
            try {
                val valores = ContentValues().apply {
                    put(MediaStore.Images.Media.DISPLAY_NAME, nome)
                    put(MediaStore.Images.Media.MIME_TYPE, "image/jpeg")
                    put(MediaStore.Images.Media.RELATIVE_PATH, Gravacoes.PASTA_PRINTS)
                    put(MediaStore.Images.Media.IS_PENDING, 1)
                }
                val uri = contentResolver.insert(MediaStore.Images.Media.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY), valores) ?: return
                val ok = contentResolver.openOutputStream(uri)?.use { bmp.compress(Bitmap.CompressFormat.JPEG, 80, it) } ?: false
                if (ok) {
                    contentResolver.update(uri, ContentValues().apply { put(MediaStore.Images.Media.IS_PENDING, 0) }, null, null)
                } else {
                    contentResolver.delete(uri, null, null)
                }
            } finally {
                bmp.recycle()
            }
        } catch (e: Exception) {
            // sem espaço etc.: sem print
        } finally {
            try {
                buffer.close()
            } catch (e: Exception) {
                // ok
            }
        }
    }

    override fun onDestroy() {
        principal.removeCallbacks(lerPendente)
        if (instancia === this) instancia = null
        fundo.shutdown()
        dormindo = false
        super.onDestroy()
    }

    override fun onInterrupt() {
        // nada a interromper: o leitor não fala nem vibra
    }

    /** Textos dos nós visíveis, na ordem da tela, com limite de nós, profundidade e tamanho. */
    private fun juntarTextos(raiz: AccessibilityNodeInfo): List<String> {
        val saida = ArrayList<String>()
        var caracteres = 0
        val pilha = ArrayDeque<Pair<AccessibilityNodeInfo, Int>>()
        pilha.addLast(Pair(raiz, 0))
        var visitados = 0
        while (pilha.isNotEmpty() && visitados < MAXIMO_NOS && caracteres < MAXIMO_CARACTERES && saida.size < MAXIMO_TEXTOS) {
            val (no, profundidade) = pilha.removeLast()
            visitados++
            if (!no.isVisibleToUser) continue
            val t = no.text?.takeIf { it.isNotBlank() } ?: no.contentDescription?.takeIf { it.isNotBlank() }
            if (t != null) {
                val s = t.toString().take(300)
                saida.add(s)
                caracteres += s.length
            }
            if (profundidade < MAXIMO_PROFUNDIDADE) {
                // de trás para frente na pilha, para ler na ordem da tela
                for (i in no.childCount - 1 downTo 0) {
                    no.getChild(i)?.let { pilha.addLast(Pair(it, profundidade + 1)) }
                }
            }
        }
        return saida
    }
}
