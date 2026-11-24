package `in`.receipto.trackmyhalf

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

object Api {
    data class Res(val code: Int, val body: JSONObject)

    suspend fun call(fn: String, body: JSONObject): Res = withContext(Dispatchers.IO) {
        val c = URL("${BuildConfig.FUNCTIONS_URL}/$fn").openConnection() as HttpURLConnection
        try {
            c.requestMethod = "POST"
            c.connectTimeout = 10_000
            c.readTimeout = 15_000
            c.doOutput = true
            c.setRequestProperty("content-type", "application/json")
            c.setRequestProperty("apikey", BuildConfig.ANON_KEY)
            c.setRequestProperty("authorization", "Bearer ${BuildConfig.ANON_KEY}")
            c.outputStream.use { it.write(body.toString().toByteArray()) }
            val code = c.responseCode
            val text = (if (code < 400) c.inputStream else c.errorStream)?.bufferedReader()?.readText() ?: "{}"
            Res(code, runCatching { JSONObject(text) }.getOrDefault(JSONObject()))
        } finally {
            c.disconnect()
        }
    }

    fun deviceAuth(p: Prefs) = JSONObject().put("deviceId", p.deviceId).put("deviceSecret", p.deviceSecret)
}
