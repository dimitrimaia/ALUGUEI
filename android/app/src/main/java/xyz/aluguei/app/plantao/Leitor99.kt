package xyz.aluguei.app.plantao

/** 99: "R$ 12,50 … 1,2 km · 4 min … 6,8 km · 17 min". Mesmo leitor genérico. */
object Leitor99 {
    fun ler(textos: List<String>): TelaLida = LeitorGenerico.ler(textos, "99")
}
