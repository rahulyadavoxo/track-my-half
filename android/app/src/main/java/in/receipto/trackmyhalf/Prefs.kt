package `in`.receipto.trackmyhalf

import android.content.Context

/** MVP: plain prefs. Phase 2: EncryptedSharedPreferences / Keystore. */
class Prefs(ctx: Context) {
    private val p = ctx.getSharedPreferences("tmh", Context.MODE_PRIVATE)
    var deviceId: String? get() = p.getString("deviceId", null); set(v) = p.edit().putString("deviceId", v).apply()
    var deviceSecret: String? get() = p.getString("deviceSecret", null); set(v) = p.edit().putString("deviceSecret", v).apply()
    var fcmToken: String? get() = p.getString("fcmToken", null); set(v) = p.edit().putString("fcmToken", v).apply()
    var activeRequestId: String? get() = p.getString("activeRequestId", null); set(v) = p.edit().putString("activeRequestId", v).apply()
    val registered get() = deviceId != null && deviceSecret != null
}
