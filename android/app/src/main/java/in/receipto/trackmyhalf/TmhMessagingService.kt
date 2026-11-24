package `in`.receipto.trackmyhalf

import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class TmhMessagingService : FirebaseMessagingService() {

    override fun onNewToken(token: String) {
        val p = Prefs(this)
        p.fcmToken = token
        if (p.registered) CoroutineScope(Dispatchers.IO).launch {
            runCatching { Api.call("device-token", Api.deviceAuth(p).put("fcmToken", token)) }
        }
    }

    override fun onMessageReceived(msg: RemoteMessage) {
        Notifs.channels(this)
        val d = msg.data
        when (d["type"]) {
            "request" -> {
                val id = d["requestId"] ?: return
                val at = d["activateAt"]?.toLongOrNull() ?: (System.currentTimeMillis() + 60_000)
                // High-priority FCM se background me bhi foreground service start ho sakti hai
                TrackingService.start(this, id, at)
            }
            "stop" -> TrackingService.stop(this)
            "wrong_attempt" -> Notifs.wrongAttempt(this)
        }
    }
}
