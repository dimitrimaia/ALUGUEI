package xyz.aluguei.app.plantao

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.IOException

class VoltaTest {
    private val bh = Ponto(-19.9167, -43.9345)
    private val contagem = Ponto(-19.9386, -44.0529)

    @Test
    fun `distância e rota de reserva iguais às de particular ts`() {
        assertEquals(361L, Math.round(Volta.distanciaReta(Ponto(-23.5505, -46.6333), Ponto(-22.9068, -43.1729))))
        assertEquals(Pair(13.5, 32.0), Volta.rotaEstimada(10.0))
    }

    @Test
    fun `consultas para o Photon`() {
        assertEquals(
            listOf("Rua F, 70, Vila Nova Esperança, Contagem, MG", "Vila Nova Esperança, Contagem, MG"),
            Volta.consultas("Rua F, 70 (Vila Nova Esperança, Contagem - MG)"),
        )
        assertEquals(listOf("Rua dos Otoni 927"), Volta.consultas("Rua dos Otoni 927"))
        val url = Volta.urlPhoton("Rua F, 70", bh)
        assertTrue(url.startsWith("https://photon.komoot.io/api/?q=Rua+F%2C+70&limit=3&lat=-19.91670&lon=-43.93450"))
        assertEquals("https://router.project-osrm.org/route/v1/driving/-44.05290,-19.93860;-43.93450,-19.91670?overview=false", Volta.urlOsrm(contagem, bh))
    }

    private val photon = """{"features":[
        {"geometry":{"coordinates":[-58.1,-34.5]},"properties":{"countrycode":"AR","name":"Contagem"}},
        {"geometry":{"coordinates":[-44.0529,-19.9386]},"properties":{"countrycode":"BR","name":"Contagem"}}]}"""
    private val osrm = """{"code":"Ok","routes":[{"distance":17600.5,"duration":1800}]}"""

    @Test
    fun `lê Photon (só Brasil) e OSRM`() {
        assertEquals(contagem, Volta.lerPhoton(photon))
        assertNull(Volta.lerPhoton("""{"features":[{"geometry":{"coordinates":[-58.1,-34.5]},"properties":{"countrycode":"AR"}}]}"""))
        assertNull(Volta.lerPhoton("""{"features":[]}"""))
        val r = Volta.lerOsrm(osrm)!!
        assertEquals(17.6005, r.first, 1e-9)
        assertEquals(30.0, r.second, 0.0)
        assertNull(Volta.lerOsrm("""{"code":"NoRoute","routes":[]}"""))
    }

    @Test
    fun `te leva para casa - destino 30 por cento mais perto da base`() {
        val longe = Ponto(-19.80, -43.95) // ~13 km de BH
        val perto = Ponto(-19.90, -43.94) // ~2 km de BH
        assertTrue(Volta.levaParaCasa(perto, bh, longe))
        assertFalse(Volta.levaParaCasa(longe, bh, perto))
        assertFalse(Volta.levaParaCasa(perto, bh, null))
    }

    @Test
    fun `calculadora - OSRM, reserva em linha reta e cache`() {
        var chamadas = 0
        val c = CalculadoraVolta(buscar = { url, _ ->
            chamadas++
            if (url.startsWith(Volta.PHOTON)) photon else osrm
        })
        val r = c.calcularAgora("Rua F, 70 (Vila Nova Esperança, Contagem - MG)", bh)!!
        assertEquals(contagem, r.destino)
        assertEquals(17.6005, r.km, 1e-9)
        assertEquals(2, chamadas)
        assertNotNull(c.doCache("Rua F, 70 (Vila Nova Esperança, Contagem - MG)", bh)?.rota)
        assertNull(c.doCache("Outro lugar", bh))

        val semOsrm = CalculadoraVolta(buscar = { url, _ -> if (url.startsWith(Volta.PHOTON)) photon else throw IOException("fora do ar") })
        val reserva = semOsrm.calcularAgora("Contagem", bh)!!
        assertEquals(Volta.rotaEstimada(Volta.distanciaReta(contagem, bh)).first, reserva.km, 0.0)
    }

    @Test
    fun `sem internet não guarda e endereço fora do Brasil fica como não achado`() {
        val semRede = CalculadoraVolta(buscar = { _, _ -> throw IOException("sem rede") })
        assertNull(semRede.calcularAgora("Contagem", bh))
        assertNull(semRede.doCache("Contagem", bh))

        val vazio = CalculadoraVolta(buscar = { _, _ -> """{"features":[]}""" })
        assertNull(vazio.calcularAgora("Lugar nenhum", bh))
        val guardado = vazio.doCache("Lugar nenhum", bh)
        assertNotNull(guardado)
        assertNull(guardado!!.rota)
    }

    @Test
    fun `prazo total de 4 segundos`() {
        var relogio = 0L
        val lenta = CalculadoraVolta(
            buscar = { url, prazo ->
                assertTrue(prazo <= CalculadoraVolta.PRAZO_MS)
                relogio += 3900 // o Photon gastou quase todo o prazo
                if (url.startsWith(Volta.PHOTON)) photon else osrm
            },
            agora = { relogio },
        )
        val r = lenta.calcularAgora("Contagem", bh)!!
        // Sem tempo para o OSRM: linha reta × 1,35.
        assertEquals(Volta.rotaEstimada(Volta.distanciaReta(contagem, bh)).first, r.km, 0.0)
    }

    @Test
    fun `cache LRU de tamanho fixo`() {
        val c = CacheLru<Int, Int>(3)
        (1..5).forEach { c.put(it, it) }
        assertEquals(3, c.tamanho())
        assertNull(c.get(1))
        assertEquals(5, c.get(5))
    }
}
