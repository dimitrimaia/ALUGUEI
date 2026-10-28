package xyz.aluguei.app.plantao

import org.json.JSONArray

/**
 * Lugares que 3+ motoristas do Aluguei evitam (anônimo, vem do servidor). O
 * Copiloto avisa quando o embarque ou o destino cai num deles. Só avisa: o sinal
 * e o cálculo não mudam.
 *
 * Puro (sem Android): testado em ComunidadeTest.kt.
 */
object Comunidade {
    data class Lugar(val nome: String, val dia: Int, val noite: Int)

    data class Alerta(val ondeEmbarque: Boolean, val nome: String, val motoristas: Int, val noite: Boolean) {
        /** "⚠ Destino: 14 motoristas evitam Vila X à noite" */
        fun texto(): String =
            "⚠ ${if (ondeEmbarque) "Embarque" else "Destino"}: $motoristas motoristas evitam $nome${if (noite) " à noite" else ""}"

        fun fala(): String = "Atenção ao ${if (ondeEmbarque) "embarque" else "destino"}."
    }

    const val MINIMO = 3

    fun deJson(arr: JSONArray?): List<Lugar> {
        if (arr == null) return emptyList()
        return (0 until minOf(arr.length(), 500)).mapNotNull { i ->
            val o = arr.optJSONObject(i) ?: return@mapNotNull null
            val nome = o.optString("nome").trim().takeIf { it.length >= 3 } ?: return@mapNotNull null
            Lugar(nome.take(60), o.optInt("dia", 0), o.optInt("noite", 0))
        }
    }

    fun paraJson(lista: List<Lugar>): JSONArray = JSONArray().apply {
        lista.forEach { put(org.json.JSONObject().put("nome", it.nome).put("dia", it.dia).put("noite", it.noite)) }
    }

    /** Embarque primeiro (é onde o motorista para), depois o destino; o lugar com mais motoristas no período. */
    fun alerta(o: OfertaDetalhada, lista: List<Lugar>, noite: Boolean): Alerta? {
        if (lista.isEmpty()) return null
        fun busca(endereco: String?, embarque: Boolean): Alerta? {
            if (endereco.isNullOrEmpty()) return null
            return lista.mapNotNull { l ->
                val n = if (noite) l.noite else l.dia
                if (n >= MINIMO && bateLista(endereco, listOf(l.nome)) != null) Alerta(embarque, l.nome, n, noite) else null
            }.maxByOrNull { it.motoristas }
        }
        return busca(o.embarque, true) ?: busca(o.destino, false)
    }

    /** Noite das 19h às 5h (igual a periodoDaHora de comunidade.ts). */
    fun ehNoite(hora: Int): Boolean = hora >= 19 || hora < 5
}
