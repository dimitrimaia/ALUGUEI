package xyz.aluguei.app.plantao

import android.accessibilityservice.AccessibilityService
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
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
 * O que NÃO faz: não guarda a tela, não envia nada para fora do aparelho e não
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

        private const val MAXIMO_NOS = 500
        private const val MAXIMO_PROFUNDIDADE = 30
        private const val MAXIMO_CARACTERES = 6000
        private const val MAXIMO_TEXTOS = 250
        private const val PEDIDO_VALE_MS = 120_000L
        /** Intervalo mínimo entre duas leituras da tela (o mapa gera eventos sem parar). */
        private const val INTERVALO_LEITURA_MS = 700L
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
        val espera = INTERVALO_LEITURA_MS - (SystemClock.elapsedRealtime() - ultimaLeituraEm)
        principal.removeCallbacks(lerPendente)
        if (espera <= 0) lerAgora(pacote) else principal.postDelayed(lerPendente, espera)
    }

    private fun lerAgora(pacote: String) {
        pacotePendente = null
        ultimaLeituraEm = SystemClock.elapsedRealtime()
        val bolha = BolhaService.instancia ?: return
        if (!ativo()) return
        try {
            val raiz = rootInActiveWindow?.takeIf { it.packageName?.toString() == pacote } ?: return
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

    private fun definirDormindo(valor: Boolean) {
        if (dormindo == valor) return
        dormindo = valor
        ultimaConferencia = SystemClock.elapsedRealtime()
        if (!valor) ultimoHash = 0
        BolhaService.instancia?.dormindoMudou(valor)
        PlantaoPlugin.emitirEstado(this)
    }

    override fun onDestroy() {
        principal.removeCallbacks(lerPendente)
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
