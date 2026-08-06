package org.kaihofiles.app.network

import org.json.JSONObject
import org.kaihofiles.app.data.KaihoFile
import java.io.BufferedReader
import java.io.InputStream
import java.io.InputStreamReader
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder
import java.nio.charset.StandardCharsets
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors

class KaihoProtocolClient(
    private val executor: ExecutorService = Executors.newFixedThreadPool(4)
) {
    fun listFiles(baseUrl: String, path: String, callback: (Result<List<KaihoFile>>) -> Unit) {
        executor.execute {
            runCatching {
                val encoded = URLEncoder.encode(path, StandardCharsets.UTF_8.name())
                val json = getJson("$baseUrl/api/files?path=$encoded&limit=200")
                val entries = json.getJSONArray("entries")
                buildList {
                    for (index in 0 until entries.length()) {
                        val item = entries.getJSONObject(index)
                        add(
                            KaihoFile(
                                name = item.getString("name"),
                                path = item.getString("path"),
                                type = item.getString("type"),
                                size = if (item.isNull("size")) null else item.getLong("size"),
                                modifiedAt = item.getString("modifiedAt"),
                                contentType = if (item.isNull("contentType")) null else item.getString("contentType"),
                                preview = item.getString("preview")
                            )
                        )
                    }
                }
            }.also(callback)
        }
    }

    fun openStream(baseUrl: String, path: String, range: String? = null): InputStream {
        val encoded = URLEncoder.encode(path, StandardCharsets.UTF_8.name())
        val connection = URL("$baseUrl/api/file/stream?path=$encoded").openConnection() as HttpURLConnection
        if (range != null) connection.setRequestProperty("Range", range)
        connection.connectTimeout = 5000
        connection.readTimeout = 30000
        return connection.inputStream
    }

    private fun getJson(url: String): JSONObject {
        val connection = URL(url).openConnection() as HttpURLConnection
        connection.connectTimeout = 5000
        connection.readTimeout = 15000
        connection.requestMethod = "GET"
        val text = BufferedReader(InputStreamReader(connection.inputStream)).use { it.readText() }
        return JSONObject(text)
    }
}

