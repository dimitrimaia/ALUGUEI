package xyz.aluguei.app.plantao

import android.content.ActivityNotFoundException
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.PowerManager
import android.provider.Settings
import androidx.core.app.NotificationManagerCompat
import xyz.aluguei.app.MainActivity

/** Confere e pede as permissões do plantão, e traz o Aluguei de volta para a frente. */
object Permissoes {
    const val SOBREPOSICAO = "sobreposicao"
    const val ACESSIBILIDADE = "acessibilidade"
    const val NOTIFICACOES = "notificacoes"
    const val BATERIA = "bateria"

    fun sobreposicao(ctx: Context): Boolean = Build.VERSION.SDK_INT < Build.VERSION_CODES.M || Settings.canDrawOverlays(ctx)

    /** O leitor de corridas está ligado em Configurações > Acessibilidade? */
    fun acessibilidade(ctx: Context): Boolean {
        val alvo = ComponentName(ctx, LeitorCorridasService::class.java)
        val ativos = Settings.Secure.getString(ctx.contentResolver, Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES) ?: return false
        return ativos.split(':').any { ComponentName.unflattenFromString(it) == alvo }
    }

    fun notificacoes(ctx: Context): Boolean = NotificationManagerCompat.from(ctx).areNotificationsEnabled()

    fun semOtimizacaoBateria(ctx: Context): Boolean {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) return true
        val pm = ctx.getSystemService(Context.POWER_SERVICE) as PowerManager
        return pm.isIgnoringBatteryOptimizations(ctx.packageName)
    }

    fun concedida(ctx: Context, tipo: String): Boolean = when (tipo) {
        SOBREPOSICAO -> sobreposicao(ctx)
        ACESSIBILIDADE -> acessibilidade(ctx)
        NOTIFICACOES -> notificacoes(ctx)
        BATERIA -> semOtimizacaoBateria(ctx)
        else -> false
    }

    private fun pacote(ctx: Context) = Uri.parse("package:" + ctx.packageName)

    /** Intent da tela de configurações certa para cada permissão (com alternativas, do mais certeiro ao mais geral). */
    fun intents(ctx: Context, tipo: String): List<Intent> = when (tipo) {
        SOBREPOSICAO -> listOf(
            Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, pacote(ctx)),
            Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION),
        )
        ACESSIBILIDADE -> {
            // Os extras destacam o nosso serviço na lista em vários Androids (quando não, só abre a lista).
            val componente = ComponentName(ctx, LeitorCorridasService::class.java).flattenToString()
            val argumentos = Bundle().apply { putString(":settings:fragment_args_key", componente) }
            listOf(
                Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS)
                    .putExtra(":settings:fragment_args_key", componente)
                    .putExtra(":settings:show_fragment_args", argumentos),
            )
        }
        NOTIFICACOES -> if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            listOf(
                Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).putExtra(Settings.EXTRA_APP_PACKAGE, ctx.packageName),
                Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, pacote(ctx)),
            )
        } else {
            listOf(Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, pacote(ctx)))
        }
        BATERIA -> listOf(
            Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS, pacote(ctx)),
            Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS),
        )
        else -> emptyList()
    }

    /** Abre a primeira tela de configurações que existir neste aparelho. */
    fun abrirConfiguracoes(ctx: Context, tipo: String): Boolean {
        for (intent in intents(ctx, tipo)) {
            try {
                ctx.startActivity(intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
                return true
            } catch (e: ActivityNotFoundException) {
                // tenta a próxima
            } catch (e: SecurityException) {
                // tenta a próxima
            }
        }
        return false
    }

    /**
     * Traz o Aluguei de volta para a frente. O Android só deixa abrir uma tela
     * a partir do segundo plano em alguns casos (ex.: o app já tem a
     * sobreposição, ou é o serviço de acessibilidade ligado pelo sistema);
     * quando não deixa, nada acontece e o motorista volta pelo botão Voltar.
     */
    fun trazerAppParaFrente(ctx: Context) {
        try {
            ctx.startActivity(
                Intent(ctx, MainActivity::class.java)
                    .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_REORDER_TO_FRONT),
            )
        } catch (e: RuntimeException) {
            // sem permissão para abrir do segundo plano: o evento "permissao" ainda chega quando a tela voltar
        }
    }
}
