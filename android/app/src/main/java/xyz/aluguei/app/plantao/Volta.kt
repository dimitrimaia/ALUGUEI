package xyz.aluguei.app.plantao

import org.json.JSONObject
import java.io.IOException
import java.net.HttpURLConnection
import java.net.URI
import java.net.URLEncoder
import java.util.Locale
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors
import kotlin.math.asin
import kotlin.math.cos
import kotlin.math.max
import kotlin.math.sin
import kotlin.math.sqrt

/** Ponto no mapa (graus). */
data class Ponto(val lat: Double, val lon: Double)

/**
 * Volta para a base: geocodifica o destino da oferta (Photon) e busca a rota
 * destino → base (OSRM). Sem Google Play Services.
 *
 * As regras de reserva são as de src/dominio/ganhos/particular.ts
 * (distanciaReta e rotaEstimada: linha reta × 1,35 a 25 km/h).
 *
 * Este objeto é puro (testado em VoltaTest.kt); a rede fica em [CalculadoraVolta].
 */
object Volta {
    const val PHOTON = "https://photon.komoot.io/api/"
    const val OSRM = "https://router.project-osrm.org/route/v1/driving/"
    const val USER_AGENT = "Aluguei/1.0"

    /** Destino pelo menos 30% mais perto da base que a posição atual → "Te leva para casa". */
    const val FATOR_LEVA_PARA_CASA = 0.7

    /** Distância em linha reta (km), igual a distanciaReta de particular.ts. */
    fun distanciaReta(a: Ponto, b: Ponto): Double {
        fun rad(g: Double) = g * Math.PI / 180
        val dLat = rad(b.lat - a.lat)
        val dLon = rad(b.lon - a.lon)
        val h = sin(dLat / 2).let { it * it } + cos(rad(a.lat)) * cos(rad(b.lat)) * sin(dLon / 2).let { it * it }
        return 6371 * 2 * asin(sqrt(h))
    }

    /** Rota de reserva (rotaEstimada de particular.ts): (km, minutos). */
    fun rotaEstimada(retaKm: Double): Pair<Double, Double> {
        val km = jsRound(retaKm * 1.35 * 10) / 10.0
        return Pair(km, max(1L, jsRound((km / 25) * 60)).toDouble())
    }

    fun levaParaCasa(destino: Ponto, base: Ponto, atual: Ponto?): Boolean {
        if (atual == null) return false
        val daqui = distanciaReta(atual, base)
        return daqui > 0.5 && distanciaReta(destino, base) <= daqui * FATOR_LEVA_PARA_CASA
    }

    private val PARENTESES = Regex("\\(([^()]*)\\)")
    private val TRACO = Regex("\\s+-\\s+")
    private val VIRGULAS = Regex("\\s*,[\\s,]*")
    private val ESPACOS = Regex("\\s+")

    /**
     * Textos para procurar o destino, do mais completo ao mais geral:
     * "Rua F, 70 (Vila Nova Esperança, Contagem - MG)" →
     * ["Rua F, 70, Vila Nova Esperança, Contagem, MG", "Vila Nova Esperança, Contagem, MG"].
     */
    fun consultas(destino: String): List<String> {
        fun limpar(s: String) = s.replace(TRACO, ", ").replace('(', ',').replace(')', ',')
            .replace(VIRGULAS, ", ").replace(ESPACOS, " ").trim().trim(',', ' ')
        val completa = limpar(destino)
        val dentro = PARENTESES.find(destino)?.groupValues?.get(1)?.let { limpar(it) }?.takeIf { it.length >= 3 }
        return listOfNotNull(completa.takeIf { it.length >= 3 }, dentro).distinct()
    }

    private fun num(v: Double) = String.format(Locale.US, "%.5f", v)

    fun urlPhoton(consulta: String, perto: Ponto?): String =
        PHOTON + "?q=" + URLEncoder.encode(consulta, "UTF-8") + "&limit=3" +
            (perto?.let { "&lat=${num(it.lat)}&lon=${num(it.lon)}" } ?: "")

    /**
     * Resultado do Photon no Brasil mais perto de `perto` (onde o motorista está),
     * desde que a até `limiteKm` em linha reta dele. Rua com o mesmo nome em outra
     * cidade virava volta de 300 km; agora é descartada. Sem `perto`, o primeiro.
     */
    fun lerPhoton(json: String, perto: Ponto? = null, limiteKm: Double = Double.MAX_VALUE): Ponto? {
        val features = JSONObject(json).optJSONArray("features") ?: return null
        val achados = mutableListOf<Ponto>()
        for (i in 0 until features.length()) {
            val f = features.optJSONObject(i) ?: continue
            val pais = f.optJSONObject("properties")?.optString("countrycode", "") ?: ""
            if (!pais.equals("BR", ignoreCase = true)) continue
            val c = f.optJSONObject("geometry")?.optJSONArray("coordinates") ?: continue
            if (c.length() < 2) continue
            val lon = c.optDouble(0, Double.NaN)
            val lat = c.optDouble(1, Double.NaN)
            if (lat.isNaN() || lon.isNaN()) continue
            achados.add(Ponto(lat, lon))
        }
        if (perto == null) return achados.firstOrNull()
        return achados.map { it to distanciaReta(perto, it) }.filter { it.second <= limiteKm }.minByOrNull { it.second }?.first
    }

    fun urlOsrm(de: Ponto, para: Ponto): String =
        OSRM + "${num(de.lon)},${num(de.lat)};${num(para.lon)},${num(para.lat)}?overview=false"

    /** (km, minutos) da primeira rota do OSRM, ou null. */
    fun lerOsrm(json: String): Pair<Double, Double>? {
        val o = JSONObject(json)
        if (o.optString("code") != "Ok") return null
        val r = o.optJSONArray("routes")?.optJSONObject(0) ?: return null
        val metros = r.optDouble("distance", Double.NaN)
        val segundos = r.optDouble("duration", Double.NaN)
        if (metros.isNaN() || segundos.isNaN() || metros < 0) return null
        return Pair(metros / 1000, segundos / 60)
    }

    /** Chave do cache: o texto do destino e a base (arredondada a ~100 m). */
    fun chave(destino: String, base: Ponto): String =
        Textos.semAcento(destino) + "|" + String.format(Locale.US, "%.3f,%.3f", base.lat, base.lon)
}

/** Cache LRU pequeno e sincronizado. */
class CacheLru<K, V>(private val maximo: Int) {
    private val mapa = object : LinkedHashMap<K, V>(16, 0.75f, true) {
        override fun removeEldestEntry(eldest: MutableMap.MutableEntry<K, V>?): Boolean = size > maximo
    }

    @Synchronized
    fun get(k: K): V? = mapa[k]

    @Synchronized
    fun put(k: K, v: V) {
        mapa[k] = v
    }

    @Synchronized
    fun tamanho(): Int = mapa.size
}

/**
 * Calcula a volta em uma thread de fundo, com prazo total de 4 s e cache por
 * destino (LRU de 50). Nunca bloqueia quem chama: o resultado chega em
 * `aoTerminar` (na thread de fundo; quem usa a UI repassa para a principal).
 */
class CalculadoraVolta(
    private val buscar: (String, Int) -> String = ::baixar,
    private val agora: () -> Long = System::currentTimeMillis,
) {
    /** Rota calculada: onde fica o destino e a volta até a base. */
    data class Rota(val destino: Ponto, val km: Double, val minutos: Double)

    companion object {
        const val PRAZO_MS = 4000
        const val TAMANHO_CACHE = 50

        /** Sem saber onde o motorista está: destino a mais de 150 km da base não é volta de corrida. */
        const val LIMITE_PADRAO_KM = 150.0

        /** GET com User-Agent "Aluguei/1.0" e o tempo que sobra do prazo. */
        fun baixar(url: String, prazoMs: Int): String {
            val c = URI(url).toURL().openConnection() as HttpURLConnection
            try {
                c.connectTimeout = prazoMs
                c.readTimeout = prazoMs
                c.instanceFollowRedirects = true
                c.setRequestProperty("User-Agent", Volta.USER_AGENT)
                c.setRequestProperty("Accept", "application/json")
                if (c.responseCode !in 200..299) throw IOException("HTTP ${c.responseCode}")
                return c.inputStream.use { entrada ->
                    val bytes = entrada.readBytes()
                    if (bytes.size > 512 * 1024) throw IOException("resposta grande demais")
                    String(bytes, Charsets.UTF_8)
                }
            } finally {
                c.disconnect()
            }
        }
    }

    /** Item do cache: `rota` null = o endereço não foi achado no Brasil (não adianta perguntar de novo). */
    data class Cacheado(val rota: Rota?)

    private val cache = CacheLru<String, Cacheado>(TAMANHO_CACHE)
    private val emAndamento = mutableMapOf<String, MutableList<(Rota?) -> Unit>>()
    private val executor: ExecutorService = Executors.newSingleThreadExecutor { r ->
        Thread(r, "aluguei-volta").apply { isDaemon = true; priority = Thread.MIN_PRIORITY }
    }

    /** O que já foi calculado para este destino e base, ou null se ainda não está no cache. */
    fun doCache(destino: String, base: Ponto): Cacheado? = cache.get(Volta.chave(destino, base))

    /** Pede a volta; `aoTerminar(null)` quando não deu (sem internet, endereço não achado). */
    fun calcular(destino: String, base: Ponto, perto: Ponto? = null, limiteKm: Double = LIMITE_PADRAO_KM, aoTerminar: (Rota?) -> Unit) {
        val k = Volta.chave(destino, base)
        synchronized(emAndamento) {
            emAndamento[k]?.let { it.add(aoTerminar); return }
            emAndamento[k] = mutableListOf(aoTerminar)
        }
        try {
            executor.execute {
                val r = try {
                    calcularAgora(destino, base, k, perto, limiteKm)
                } catch (e: Exception) {
                    null
                }
                val ouvintes = synchronized(emAndamento) { emAndamento.remove(k) } ?: emptyList()
                ouvintes.forEach { runCatching { it(r) } }
            }
        } catch (e: RuntimeException) {
            // executor encerrado (serviço desligando)
            synchronized(emAndamento) { emAndamento.remove(k) }
        }
    }

    /** Na thread de fundo. Guarda no cache o que for definitivo (achou, ou o endereço não existe). */
    internal fun calcularAgora(destino: String, base: Ponto, k: String = Volta.chave(destino, base), perto: Ponto? = null, limiteKm: Double = LIMITE_PADRAO_KM): Rota? {
        val inicio = agora()
        fun resta(): Int = (PRAZO_MS - (agora() - inicio)).toInt()
        var ponto: Ponto? = null
        var falhaDeRede = false
        for (q in Volta.consultas(destino)) {
            if (resta() < 300) { falhaDeRede = true; break }
            try {
                ponto = Volta.lerPhoton(buscar(Volta.urlPhoton(q, perto ?: base), resta()), perto ?: base, limiteKm)
            } catch (e: Exception) {
                falhaDeRede = true
                break
            }
            if (ponto != null) break
        }
        val p = ponto
        if (p == null) {
            if (!falhaDeRede) guardar(k, null) // não existe no Brasil: não adianta perguntar de novo
            return null
        }
        val rota = if (resta() >= 300) {
            try {
                Volta.lerOsrm(buscar(Volta.urlOsrm(p, base), resta()))
            } catch (e: Exception) {
                null
            }
        } else {
            null
        }
        val (km, minutos) = rota ?: Volta.rotaEstimada(Volta.distanciaReta(p, base))
        return Rota(p, km, minutos).also { guardar(k, it) }
    }

    private fun guardar(k: String, r: Rota?) = cache.put(k, Cacheado(r))

    fun encerrar() {
        executor.shutdownNow()
    }
}
