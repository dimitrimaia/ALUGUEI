package xyz.aluguei.app.plantao

import java.util.Calendar
import java.util.TimeZone

/**
 * Regras puras dos arquivos que o Copiloto grava no celular (prints das ofertas e
 * vídeos da câmera de segurança): nomes, tamanho do vídeo, segmentos e limpeza
 * pelo limite. Os testes JUnit conferem; quem grava de verdade é a CameraService
 * e o LeitorCorridasService.
 */
object Gravacoes {
    const val PASTA_PRINTS = "Pictures/Aluguei/Ofertas"
    const val PASTA_VIDEOS = "Movies/Aluguei/Corridas"

    /** Um print a cada 3 s no máximo. */
    const val INTERVALO_PRINT_MS = 3_000L

    private const val FUSO = "America/Sao_Paulo"

    /** "2026-10-26_14-03-22" no horário de Brasília. */
    fun carimbo(epochMs: Long): String {
        val c = Calendar.getInstance(TimeZone.getTimeZone(FUSO)).apply { timeInMillis = epochMs }
        fun d2(n: Int) = n.toString().padStart(2, '0')
        return "${c.get(Calendar.YEAR)}-${d2(c.get(Calendar.MONTH) + 1)}-${d2(c.get(Calendar.DAY_OF_MONTH))}_" +
            "${d2(c.get(Calendar.HOUR_OF_DAY))}-${d2(c.get(Calendar.MINUTE))}-${d2(c.get(Calendar.SECOND))}"
    }

    /** "oferta_2026-10-26_14-03-22_R18-40_indrive.jpg" (valor em centavos; sem "$" nem vírgula no nome). */
    fun nomePrint(epochMs: Long, valor: Long?, app: String?): String {
        val partes = mutableListOf("oferta", carimbo(epochMs))
        if (valor != null && valor > 0) partes.add("R${valor / 100}-${(valor % 100).toString().padStart(2, '0')}")
        app?.takeIf { it.matches(Regex("^[a-z0-9]{1,12}$")) }?.let { partes.add(it) }
        return partes.joinToString("_") + ".jpg"
    }

    /** "corrida_2026-10-26_14-03-22.mp4" */
    fun nomeVideo(epochMs: Long): String = "corrida_${carimbo(epochMs)}.mp4"

    /** Pode tirar outro print agora? (um a cada 3 s; relógio monotônico). */
    fun podePrint(agoraMs: Long, ultimoMs: Long?): Boolean = ultimoMs == null || agoraMs - ultimoMs >= INTERVALO_PRINT_MS

    // ------------------------------------------------------------------ vídeo

    /** Qualidade do vídeo: altura alvo e taxa de bits. */
    data class Qualidade(val altura: Int, val bitsPorSegundo: Int)

    fun qualidade(q: String): Qualidade = when (q) {
        "baixa" -> Qualidade(360, 1_000_000)
        "alta" -> Qualidade(720, 4_000_000)
        else -> Qualidade(480, 2_000_000)
    }

    /**
     * Tamanho de gravação entre os que a câmera oferece (largura x altura, em
     * paisagem): o de lado menor mais perto da altura alvo e, no empate, o mais
     * largo (pega mais do carro), depois o menor. Null se a lista vier vazia.
     */
    fun escolherTamanho(disponiveis: List<Pair<Int, Int>>, alturaAlvo: Int): Pair<Int, Int>? {
        if (disponiveis.isEmpty()) return null
        fun lado(t: Pair<Int, Int>) = minOf(t.first, t.second)
        fun largo(t: Pair<Int, Int>) = maxOf(t.first, t.second)
        return disponiveis.filter { lado(it) > 0 }.minWithOrNull(
            compareBy<Pair<Int, Int>>({ kotlin.math.abs(lado(it) - alturaAlvo) }, { -largo(it).toDouble() / lado(it) }, { lado(it) * largo(it) }),
        )
    }

    /** Duração de cada arquivo (1 a 30 min). */
    fun segmentoMs(minutos: Int): Long = minutos.coerceIn(1, 30) * 60_000L

    fun limiteBytes(gb: Int): Long = gb.coerceIn(1, 128).toLong() * 1024L * 1024L * 1024L

    /** Um vídeo que a própria câmera gravou (id = uri ou caminho). */
    data class Arquivo(val id: String, val bytes: Long, val criadoEm: Long)

    /**
     * Quais apagar para o total caber no limite: os mais antigos primeiro, nunca
     * o que está gravando agora ([emUso]).
     */
    fun paraApagar(arquivos: List<Arquivo>, limite: Long, emUso: String? = null): List<String> {
        var total = arquivos.sumOf { it.bytes.coerceAtLeast(0) }
        if (total <= limite) return emptyList()
        val saida = mutableListOf<String>()
        for (a in arquivos.sortedBy { it.criadoEm }) {
            if (total <= limite) break
            if (a.id == emUso) continue
            saida.add(a.id)
            total -= a.bytes.coerceAtLeast(0)
        }
        return saida
    }

    fun megas(bytes: Long): Long = bytes / (1024L * 1024L)
}
