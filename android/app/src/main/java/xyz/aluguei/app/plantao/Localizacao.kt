package xyz.aluguei.app.plantao

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.location.Location
import android.location.LocationManager
import android.os.Build
import android.os.CancellationSignal
import android.os.Handler
import android.os.Looper
import androidx.core.content.ContextCompat
import java.util.concurrent.atomic.AtomicBoolean

/**
 * Localização do aparelho pelo LocationManager do Android (sem Google Play Services).
 * Só é usada para a volta até a base e para "Definir base aqui"; não guarda trajeto.
 */
object Localizacao {

    /** Mais velha que isso, a última posição conhecida não vale como "onde estou agora". */
    private const val VALIDADE_MS = 10 * 60_000L
    private const val PRAZO_ATUAL_MS = 8_000L

    fun permitida(ctx: Context): Boolean =
        ContextCompat.checkSelfPermission(ctx, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED ||
            ContextCompat.checkSelfPermission(ctx, Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED

    private fun gerente(ctx: Context): LocationManager? = ctx.getSystemService(Context.LOCATION_SERVICE) as? LocationManager

    private fun provedores(lm: LocationManager): List<String> {
        val todos = try {
            lm.getProviders(true)
        } catch (e: RuntimeException) {
            emptyList()
        }
        val ordem = mutableListOf<String>()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && LocationManager.FUSED_PROVIDER in todos) ordem.add(LocationManager.FUSED_PROVIDER)
        listOf(LocationManager.NETWORK_PROVIDER, LocationManager.GPS_PROVIDER, LocationManager.PASSIVE_PROVIDER).forEach { if (it in todos) ordem.add(it) }
        return ordem
    }

    /**
     * Última posição conhecida (rápido, sem ligar o GPS). Os apps de corrida usam
     * o GPS o tempo todo, então ela costuma estar fresca. Null sem permissão ou se velha.
     */
    @Suppress("MissingPermission")
    fun ultima(ctx: Context, validadeMs: Long = VALIDADE_MS): Ponto? {
        if (!permitida(ctx)) return null
        val lm = gerente(ctx) ?: return null
        var melhor: Location? = null
        for (p in provedores(lm)) {
            val l = try {
                lm.getLastKnownLocation(p)
            } catch (e: RuntimeException) {
                null
            } ?: continue
            if (melhor == null || l.time > melhor.time) melhor = l
        }
        val l = melhor ?: return null
        if (System.currentTimeMillis() - l.time > validadeMs) return null
        return Ponto(l.latitude, l.longitude)
    }

    /**
     * Posição atual: getCurrentLocation no Android 11+ (com prazo de 8 s), senão a
     * última conhecida. `aoTerminar` roda na thread principal, uma vez só (null = sem posição).
     */
    @Suppress("MissingPermission")
    fun atual(ctx: Context, aoTerminar: (Ponto?) -> Unit) {
        val principal = Handler(Looper.getMainLooper())
        val feito = AtomicBoolean(false)
        fun terminar(p: Ponto?) {
            if (feito.compareAndSet(false, true)) principal.post { aoTerminar(p) }
        }
        if (!permitida(ctx)) {
            terminar(null)
            return
        }
        val lm = gerente(ctx)
        val reserva = { ultima(ctx, validadeMs = 60 * 60_000L) }
        if (lm == null || Build.VERSION.SDK_INT < Build.VERSION_CODES.R) {
            terminar(reserva())
            return
        }
        val provedor = provedores(lm).firstOrNull { it != LocationManager.PASSIVE_PROVIDER }
        if (provedor == null) {
            terminar(reserva())
            return
        }
        val cancelar = CancellationSignal()
        principal.postDelayed({
            if (!feito.get()) {
                cancelar.cancel()
                terminar(reserva())
            }
        }, PRAZO_ATUAL_MS)
        try {
            lm.getCurrentLocation(provedor, cancelar, ContextCompat.getMainExecutor(ctx)) { l: Location? ->
                terminar(l?.let { Ponto(it.latitude, it.longitude) } ?: reserva())
            }
        } catch (e: RuntimeException) {
            terminar(reserva())
        }
    }
}
