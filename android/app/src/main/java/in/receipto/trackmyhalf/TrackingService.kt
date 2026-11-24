package `in`.receipto.trackmyhalf

import android.annotation.SuppressLint
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.location.Location
import android.os.BatteryManager
import android.os.IBinder
import android.os.Looper
import android.os.PowerManager
import androidx.core.app.ServiceCompat
import androidx.core.content.ContextCompat
import com.google.android.gms.location.LocationCallback
import com.google.android.gms.location.LocationRequest
import com.google.android.gms.location.LocationResult
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.database.FirebaseDatabase
import com.google.firebase.database.ServerValue
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await

/**
 * Request aate hi chupchap location bhejna shuru. Web par ye tabhi dikhegi jab
 * server timer khatam hone par viewer token dega. Cancel hua to server sab delete karega.
 */
class TrackingService : Service() {

    companion object {
        fun start(ctx: Context, requestId: String, activateAt: Long) {
            val i = Intent(ctx, TrackingService::class.java)
                .putExtra("requestId", requestId).putExtra("activateAt", activateAt)
            ContextCompat.startForegroundService(ctx, i)
        }
        fun stop(ctx: Context) {
            ctx.startService(Intent(ctx, TrackingService::class.java).setAction("stop"))
        }
    }

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private val fused by lazy { LocationServices.getFusedLocationProviderClient(this) }
    private var requestId: String? = null
    private var deviceId: String? = null
    private var wake: PowerManager.WakeLock? = null
    private var lastMoveAt = 0L

    private val callback = object : LocationCallback() {
        override fun onLocationResult(r: LocationResult) { r.lastLocation?.let(::push) }
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        Notifs.channels(this)
        ServiceCompat.startForeground(
            this, Notifs.ID_SERVICE, Notifs.service(this),
            ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION,
        )
        if (intent?.action == "stop") { shutdown(); return START_NOT_STICKY }

        val rid = intent?.getStringExtra("requestId") ?: Prefs(this).activeRequestId
        if (rid == null) { shutdown(); return START_NOT_STICKY }
        val activateAt = intent?.getLongExtra("activateAt", 0L) ?: 0L
        if (rid == requestId) return START_STICKY // pehle se chal raha

        requestId = rid
        Prefs(this).activeRequestId = rid
        if (activateAt > System.currentTimeMillis()) Notifs.prompt(this, rid, activateAt)

        wake = (getSystemService(POWER_SERVICE) as PowerManager)
            .newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "tmh:track").apply { acquire(6 * 60 * 60 * 1000L) }

        scope.launch { signInAndTrack() }
        return START_STICKY
    }

    private suspend fun signInAndTrack() {
        val p = Prefs(this)
        val res = runCatching { Api.call("device-token", Api.deviceAuth(p).put("fcmToken", p.fcmToken)) }.getOrNull()
        val token = res?.body?.optString("firebaseToken").orEmpty()
        if (token.isEmpty()) { shutdown(); return }
        deviceId = p.deviceId
        FirebaseAuth.getInstance().signInWithCustomToken(token).await()
        startUpdates()
    }

    @SuppressLint("MissingPermission")
    private fun startUpdates() {
        val req = LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, 1000L)
            .setMinUpdateIntervalMillis(1000L)
            .setMinUpdateDistanceMeters(0f)
            .setWaitForAccurateLocation(false)
            .build()
        fused.requestLocationUpdates(req, callback, Looper.getMainLooper())
    }

    private fun battery(): Int =
        (getSystemService(BATTERY_SERVICE) as BatteryManager).getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY)

    private fun push(loc: Location) {
        val rid = requestId ?: return
        val did = deviceId ?: return
        val now = System.currentTimeMillis()
        val data = mapOf(
            "requestId" to rid,
            "lat" to loc.latitude, "lng" to loc.longitude,
            "acc" to loc.accuracy.toDouble(),
            "speed" to (if (loc.hasSpeed()) loc.speed.toDouble() else null),
            "bearing" to (if (loc.hasBearing()) loc.bearing.toDouble() else null),
            "battery" to battery(),
            "t" to now,
            "st" to ServerValue.TIMESTAMP,
        )
        val db = FirebaseDatabase.getInstance().reference
        db.child("live").child(did).setValue(data)
        // Trail: chalte waqt har point, ruke ho to har 10 sec (data bachane ke liye)
        val moving = loc.hasSpeed() && loc.speed > 0.5f
        if (moving || now - lastMoveAt > 10_000) {
            lastMoveAt = now
            db.child("trail").child(rid).push().setValue(mapOf("lat" to loc.latitude, "lng" to loc.longitude, "t" to now))
        }
    }

    private fun shutdown() {
        runCatching { fused.removeLocationUpdates(callback) }
        Notifs.cancelPrompt(this)
        Prefs(this).activeRequestId = null
        requestId = null
        runCatching { wake?.release() }
        FirebaseAuth.getInstance().signOut()
        ServiceCompat.stopForeground(this, ServiceCompat.STOP_FOREGROUND_REMOVE)
        stopSelf()
    }

    override fun onDestroy() {
        runCatching { fused.removeLocationUpdates(callback) }
        runCatching { wake?.release() }
        scope.cancel()
        super.onDestroy()
    }
}
