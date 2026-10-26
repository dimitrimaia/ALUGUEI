package xyz.aluguei.app

import android.os.Bundle
import com.getcapacitor.BridgeActivity
import xyz.aluguei.app.plantao.PlantaoPlugin

class MainActivity : BridgeActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        // Plugins próprios precisam ser registrados antes do super.onCreate.
        registerPlugin(PlantaoPlugin::class.java)
        super.onCreate(savedInstanceState)
    }
}
