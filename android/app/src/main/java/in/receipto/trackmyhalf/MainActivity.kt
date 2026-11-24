package `in`.receipto.trackmyhalf

import android.Manifest
import android.annotation.SuppressLint
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.PowerManager
import android.provider.Settings
import android.text.InputType
import android.view.ViewGroup.LayoutParams.MATCH_PARENT
import android.view.ViewGroup.LayoutParams.WRAP_CONTENT
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.lifecycle.lifecycleScope
import com.google.firebase.messaging.FirebaseMessaging
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await
import org.json.JSONObject

/** Setup: number + secret code + permissions. Phase 1 me simple programmatic UI. */
class MainActivity : AppCompatActivity() {

    private lateinit var status: TextView
    private lateinit var phone: EditText
    private lateinit var code: EditText
    private lateinit var oldCode: EditText
    private val prefs by lazy { Prefs(this) }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        Notifs.channels(this)

        val col = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; setPadding(48, 64, 48, 48) }
        fun add(v: android.view.View) = col.addView(v, LinearLayout.LayoutParams(MATCH_PARENT, WRAP_CONTENT).apply { topMargin = 24 })

        add(TextView(this).apply { text = "Track My Half"; textSize = 26f })
        status = TextView(this).also(::add)
        phone = EditText(this).apply { hint = "Is phone ka number"; inputType = InputType.TYPE_CLASS_PHONE }.also(::add)
        code = EditText(this).apply { hint = "Naya secret code (min 6)"; inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_PASSWORD }.also(::add)
        oldCode = EditText(this).apply { hint = "Purana code (sirf reinstall par)"; inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_PASSWORD }.also(::add)
        add(Button(this).apply { text = "Code save karo"; setOnClickListener { register() } })
        add(Button(this).apply { text = "1. Location permission"; setOnClickListener { askLocation() } })
        add(Button(this).apply { text = "2. Location: Allow all the time"; setOnClickListener { askBackground() } })
        add(Button(this).apply { text = "3. Notifications"; setOnClickListener { askNotif() } })
        add(Button(this).apply { text = "4. Battery: Unrestricted"; setOnClickListener { askBattery() } })

        setContentView(ScrollView(this).apply { addView(col) })
        refresh()
    }

    override fun onResume() { super.onResume(); refresh() }

    private fun granted(p: String) = ContextCompat.checkSelfPermission(this, p) == PackageManager.PERMISSION_GRANTED

    private fun refresh() {
        val pm = getSystemService(POWER_SERVICE) as PowerManager
        val notif = Build.VERSION.SDK_INT < 33 || granted(Manifest.permission.POST_NOTIFICATIONS)
        status.text = buildString {
            appendLine(if (prefs.registered) "✅ Code set hai" else "❌ Code set nahi")
            appendLine(if (granted(Manifest.permission.ACCESS_FINE_LOCATION)) "✅ Location" else "❌ Location")
            appendLine(if (granted(Manifest.permission.ACCESS_BACKGROUND_LOCATION)) "✅ Background location" else "❌ Background location")
            appendLine(if (notif) "✅ Notifications" else "❌ Notifications")
            append(if (pm.isIgnoringBatteryOptimizations(packageName)) "✅ Battery unrestricted" else "❌ Battery unrestricted")
        }
    }

    private fun register() = lifecycleScope.launch {
        val c = code.text.toString()
        if (c.length < 6) { status.text = "Code kam se kam 6 characters ka rakho"; return@launch }
        val fcm = runCatching { FirebaseMessaging.getInstance().token.await() }.getOrNull()
        prefs.fcmToken = fcm
        val body = JSONObject().put("phone", phone.text.toString()).put("code", c).put("fcmToken", fcm)
            .put("deviceId", prefs.deviceId).put("deviceSecret", prefs.deviceSecret)
        if (oldCode.text.isNotEmpty()) body.put("oldCode", oldCode.text.toString())
        val r = runCatching { Api.call("register-device", body) }.getOrNull()
        when (r?.code) {
            200 -> {
                prefs.deviceId = r.body.getString("deviceId")
                prefs.deviceSecret = r.body.getString("deviceSecret")
                code.text.clear(); oldCode.text.clear()
                refresh()
            }
            409 -> status.text = "Ye number pehle se registered hai. Purana code bhi dalo."
            else -> status.text = "Save nahi hua (${r?.code ?: "network"}). Dobara try karo."
        }
    }

    private fun askLocation() = ActivityCompat.requestPermissions(
        this, arrayOf(Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION), 1)

    // Android 11+ par ye settings page kholta hai, wahan "Allow all the time" chunna hai
    private fun askBackground() = ActivityCompat.requestPermissions(
        this, arrayOf(Manifest.permission.ACCESS_BACKGROUND_LOCATION), 2)

    private fun askNotif() {
        if (Build.VERSION.SDK_INT >= 33)
            ActivityCompat.requestPermissions(this, arrayOf(Manifest.permission.POST_NOTIFICATIONS), 3)
    }

    @SuppressLint("BatteryLife")
    private fun askBattery() = startActivity(
        Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS, Uri.parse("package:$packageName")))

    override fun onRequestPermissionsResult(rc: Int, p: Array<out String>, g: IntArray) {
        super.onRequestPermissionsResult(rc, p, g); refresh()
    }
}
