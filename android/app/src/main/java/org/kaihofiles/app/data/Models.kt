package org.kaihofiles.app.data

data class KaihoDevice(
    val id: String,
    val name: String,
    val platform: String,
    val endpoints: List<KaihoEndpoint> = emptyList(),
    val paired: Boolean = false
)

data class KaihoEndpoint(
    val host: String,
    val port: Int
) {
    val baseUrl: String get() = "http://$host:$port"
}

data class KaihoFile(
    val name: String,
    val path: String,
    val type: String,
    val size: Long?,
    val modifiedAt: String,
    val contentType: String?,
    val preview: String
)

data class SharedFolder(
    val displayName: String,
    val treeUri: String
)

