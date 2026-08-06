package org.kaihofiles.app.network

import android.net.wifi.WifiManager
import org.json.JSONObject
import org.kaihofiles.app.data.KaihoDevice
import org.kaihofiles.app.data.KaihoEndpoint
import java.net.DatagramPacket
import java.net.InetAddress
import java.net.MulticastSocket
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicBoolean

class DiscoveryListener(
    private val wifiManager: WifiManager,
    private val onDevice: (KaihoDevice) -> Unit,
    private val executor: ExecutorService = Executors.newSingleThreadExecutor()
) {
    private val running = AtomicBoolean(false)
    private var socket: MulticastSocket? = null
    private var lock: WifiManager.MulticastLock? = null

    fun start() {
        if (!running.compareAndSet(false, true)) return
        lock = wifiManager.createMulticastLock("kaiho-files-discovery").apply {
            setReferenceCounted(false)
            acquire()
        }
        executor.execute {
            runCatching {
                socket = MulticastSocket(38470).apply {
                    reuseAddress = true
                    joinGroup(InetAddress.getByName("239.255.42.42"))
                }
                val buffer = ByteArray(8192)
                while (running.get()) {
                    val packet = DatagramPacket(buffer, buffer.size)
                    socket?.receive(packet)
                    val message = String(packet.data, 0, packet.length)
                    parseAnnouncement(message)?.let(onDevice)
                }
            }
        }
    }

    fun stop() {
        running.set(false)
        socket?.close()
        lock?.release()
    }

    private fun parseAnnouncement(message: String): KaihoDevice? {
        val json = JSONObject(message)
        if (json.optString("app") != "kaiho.files") return null
        val device = json.getJSONObject("device")
        val endpoints = json.getJSONArray("endpoints")
        return KaihoDevice(
            id = device.getString("id"),
            name = device.getString("name"),
            platform = device.getString("platform"),
            endpoints = buildList {
                for (index in 0 until endpoints.length()) {
                    val endpoint = endpoints.getJSONObject(index)
                    add(KaihoEndpoint(endpoint.getString("host"), endpoint.getInt("port")))
                }
            }
        )
    }
}

