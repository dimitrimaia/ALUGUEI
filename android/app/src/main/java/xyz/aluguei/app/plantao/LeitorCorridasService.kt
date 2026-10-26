package xyz.aluguei.app.plantao

import android.accessibilityservice.AccessibilityService
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo

/**
 * Leitor de ofertas de corrida (serviço de acessibilidade).
 *
 * O que faz: quando a tela da Uber, 99 ou inDrive muda (só esses pacotes,
 * filtrados pelo Android em res/xml/leitor_corridas.xml), junta o texto
 * visível, procura valor/distâncias/tempos com o LeitorOferta e entrega os
 * números para a BolhaService mostrar o cartão. Só trabalha com o plantão ligado.
 *
 * O que NÃO faz: não guarda o texto da tela (só os números lidos), não envia
 * nada para fora do aparelho e não executa nenhuma ação (performAction) nos
 * outros apps. Quem aceita ou recusa a corrida é sempre o motorista.
 */
class LeitorCorridasService : AccessibilityService() {

    private companion object {
        const val MAXIMO_NOS = 400
        const val MAXIMO_PROFUNDIDADE = 30
        const val MAXIMO_CARACTERES = 4000
        const val JANELA_REPETICAO_MS = 20_000L
        const val PEDIDO_VALE_MS = 120_000L
        /** Intervalo mínimo entre duas leituras da tela (o mapa gera eventos sem parar). */
        const val INTERVALO_LEITURA_MS = 700L
    }

    private val principal = Handler(Looper.getMainLooper())
    private var pacotePendente: String? = null
    private var ultimaLeituraEm = 0L
    private val lerPendente = Runnable { pacotePendente?.let { lerAgora(it) } }

    private var pacotes: Set<String> = emptySet()

    /** Só o hash do último texto lido, para não reprocessar a mesma tela. */
    private var ultimoHash = 0
    private var ultimaChave: String? = null
    private var ultimaEm = 0L

    override fun onServiceConnected() {
        super.onServiceConnected()
        pacotes = Pacotes.lista(this)
        // O motorista acabou de ligar o leitor a partir do Aluguei: volta para o app sozinho.
        val pedido = Armazenamento.pedidoAcessibilidadeEm(this)
        if (pedido > 0 && System.currentTimeMillis() - pedido < PEDIDO_VALE_MS) {
            Armazenamento.limparPedidoAcessibilidade(this)
            Permissoes.trazerAppParaFrente(this)
            PlantaoPlugin.emitirPermissao(Permissoes.ACESSIBILIDADE, true)
        }
    }

    override fun onAccessibilityEvent(evento: AccessibilityEvent?) {
        val e = evento ?: return
        val pacote = e.packageName?.toString() ?: return
        if (pacote !in pacotes) return
        // Plantão desligado: não lê nada.
        if (BolhaService.instancia == null || !Armazenamento.ligado(this)) return

        // Junta a rajada de eventos: lê na hora se faz tempo, senão uma vez no fim do intervalo.
        pacotePendente = pacote
        val espera = INTERVALO_LEITURA_MS - (SystemClock.elapsedRealtime() - ultimaLeituraEm)
        principal.removeCallbacks(lerPendente)
        if (espera <= 0) lerAgora(pacote) else principal.postDelayed(lerPendente, espera)
    }

    private fun lerAgora(pacote: String) {
        pacotePendente = null
        ultimaLeituraEm = SystemClock.elapsedRealtime()
        val bolha = BolhaService.instancia ?: return
        if (!Armazenamento.ligado(this)) return
        val raiz = rootInActiveWindow?.takeIf { it.packageName?.toString() == pacote } ?: return
        val texto = juntarTexto(raiz)
        val hash = texto.hashCode()
        if (hash == ultimoHash) return
        ultimoHash = hash

        val oferta = LeitorOferta.lerOferta(texto) ?: return
        val chave = "${oferta.valor}|${oferta.kmCorrida}|${oferta.kmBusca}"
        val agora = SystemClock.elapsedRealtime()
        if (chave == ultimaChave && agora - ultimaEm < JANELA_REPETICAO_MS) return
        ultimaChave = chave
        ultimaEm = agora
        bolha.receberOferta(oferta.paraOferta(), "leitura", Pacotes.plataforma(pacote))
    }

    override fun onDestroy() {
        principal.removeCallbacks(lerPendente)
        super.onDestroy()
    }

    override fun onInterrupt() {
        // nada a interromper: o leitor não fala nem vibra
    }

    /** Texto dos nós visíveis, com limite de nós, profundidade e tamanho. */
    private fun juntarTexto(raiz: AccessibilityNodeInfo): String {
        val sb = StringBuilder()
        val pilha = ArrayDeque<Pair<AccessibilityNodeInfo, Int>>()
        pilha.addLast(Pair(raiz, 0))
        var visitados = 0
        while (pilha.isNotEmpty() && visitados < MAXIMO_NOS && sb.length < MAXIMO_CARACTERES) {
            val (no, profundidade) = pilha.removeLast()
            visitados++
            if (!no.isVisibleToUser) continue
            val t = no.text?.takeIf { it.isNotBlank() } ?: no.contentDescription?.takeIf { it.isNotBlank() }
            if (t != null) sb.append(t).append(' ')
            if (profundidade < MAXIMO_PROFUNDIDADE) {
                // de trás para frente na pilha, para ler na ordem da tela
                for (i in no.childCount - 1 downTo 0) {
                    no.getChild(i)?.let { pilha.addLast(Pair(it, profundidade + 1)) }
                }
            }
        }
        return if (sb.length > MAXIMO_CARACTERES) sb.substring(0, MAXIMO_CARACTERES) else sb.toString()
    }
}
