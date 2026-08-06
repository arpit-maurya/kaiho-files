package org.kaihofiles.app

import android.app.Activity
import android.content.Intent
import android.net.wifi.WifiManager
import android.os.Bundle
import android.view.Gravity
import android.widget.Button
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import org.kaihofiles.app.data.KaihoDevice
import org.kaihofiles.app.network.DiscoveryListener
import org.kaihofiles.app.pairing.QrScanActivity

class MainActivity : Activity() {
    private lateinit var list: LinearLayout
    private var discovery: DiscoveryListener? = null
    private val devices = linkedMapOf<String, KaihoDevice>()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(28, 28, 28, 28)
        }
        val title = TextView(this).apply {
            text = "Kaiho Files"
            textSize = 28f
        }
        val subtitle = TextView(this).apply {
            text = "Nearby Devices"
            textSize = 16f
        }
        val pairButton = Button(this).apply {
            text = "Scan QR Code"
            setOnClickListener { startActivity(Intent(this@MainActivity, QrScanActivity::class.java)) }
        }
        list = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.TOP
        }
        root.addView(title)
        root.addView(subtitle)
        root.addView(pairButton)
        root.addView(ScrollView(this).apply { addView(list) })
        setContentView(root)
        startDiscovery()
    }

    override fun onDestroy() {
        discovery?.stop()
        super.onDestroy()
    }

    private fun startDiscovery() {
        val wifiManager = applicationContext.getSystemService(WIFI_SERVICE) as WifiManager
        discovery = DiscoveryListener(wifiManager) { device ->
            runOnUiThread {
                devices[device.id] = device
                renderDevices()
            }
        }.also { it.start() }
    }

    private fun renderDevices() {
        list.removeAllViews()
        if (devices.isEmpty()) {
            list.addView(TextView(this).apply {
                text = "No devices found yet."
                textSize = 16f
                setPadding(0, 24, 0, 0)
            })
            return
        }
        devices.values.forEach { device ->
            list.addView(TextView(this).apply {
                text = "${device.name}\n${device.platform} · ${device.endpoints.firstOrNull()?.baseUrl ?: "No endpoint"}"
                textSize = 17f
                setPadding(0, 24, 0, 12)
            })
        }
    }
}

