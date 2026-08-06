package org.kaihofiles.app.pairing

import org.json.JSONObject

data class QrPayload(
    val pairingId: String,
    val deviceId: String,
    val name: String,
    val platform: String,
    val host: String,
    val port: Int,
    val identityPublicKey: String,
    val ephemeralPublicKey: String,
    val expiresAt: Long,
    val nonce: String
)

object QrPayloadParser {
    private const val PREFIX = "kaiho-pair:"

    fun parse(raw: String): Result<QrPayload> = runCatching {
        require(raw.startsWith(PREFIX)) { "This isn't a valid Kaiho Files pairing code." }
        val json = JSONObject(raw.removePrefix(PREFIX))
        require(json.getString("app") == "kaiho.files") { "This isn't a valid Kaiho Files pairing code." }
        require(json.getInt("v") == 1) { "This pairing code uses an unsupported version of Kaiho Files." }
        val expiresAt = json.getLong("exp")
        require(expiresAt > System.currentTimeMillis() / 1000) { "QR code expired. Generate a new code." }
        val endpoint = json.getJSONArray("eps").getJSONObject(0)
        QrPayload(
            pairingId = json.getString("pid"),
            deviceId = json.getString("did"),
            name = json.optString("name", "Kaiho Device"),
            platform = json.getString("plat"),
            host = endpoint.getString("host"),
            port = endpoint.getInt("port"),
            identityPublicKey = json.getString("idpk"),
            ephemeralPublicKey = json.getString("epk"),
            expiresAt = expiresAt,
            nonce = json.getString("nonce")
        )
    }
}

