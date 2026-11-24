package `in`.receipto.trackmyhalf

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat

object Notifs {
    const val CH_SERVICE = "tmh_service"
    const val CH_ALERT = "tmh_alert"
    const val ID_SERVICE = 1
    const val ID_PROMPT = 2
    const val ID_WRONG = 3

    fun channels(ctx: Context) {
        val nm = ctx.getSystemService(NotificationManager::class.java)
        nm.createNotificationChannel(NotificationChannel(CH_SERVICE, "Sync", NotificationManager.IMPORTANCE_MIN))
        nm.createNotificationChannel(NotificationChannel(CH_ALERT, "Security alerts", NotificationManager.IMPORTANCE_HIGH))
    }

    /** Jaan-boojh ke normal dikhne wala notification, taaki chor ko alert na ho */
    fun service(ctx: Context) = NotificationCompat.Builder(ctx, CH_SERVICE)
        .setSmallIcon(android.R.drawable.stat_notify_sync)
        .setContentTitle("Syncing")
        .setPriority(NotificationCompat.PRIORITY_MIN)
        .setOngoing(true)
        .build()

    /** Owner ke liye: "Kya ye request tumne ki?" + countdown. Tap -> fingerprint/PIN */
    fun prompt(ctx: Context, requestId: String, activateAt: Long) {
        val pi = PendingIntent.getActivity(
            ctx, 0,
            Intent(ctx, CancelActivity::class.java).putExtra("requestId", requestId)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
        )
        val n = NotificationCompat.Builder(ctx, CH_ALERT)
            .setSmallIcon(android.R.drawable.ic_lock_idle_lock)
            .setContentTitle("Account security check")
            .setContentText("Tumne ye request nahi ki? Tap karke verify karo.")
            .setWhen(activateAt).setShowWhen(true)
            .setUsesChronometer(true).setChronometerCountDown(true)
            .setTimeoutAfter((activateAt - System.currentTimeMillis()).coerceAtLeast(1000))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setVisibility(NotificationCompat.VISIBILITY_PRIVATE)
            .setContentIntent(pi).setAutoCancel(true)
            .build()
        runCatching { NotificationManagerCompat.from(ctx).notify(ID_PROMPT, n) }
    }

    fun wrongAttempt(ctx: Context) {
        val n = NotificationCompat.Builder(ctx, CH_ALERT)
            .setSmallIcon(android.R.drawable.stat_sys_warning)
            .setContentTitle("Galat code try hua")
            .setContentText("Kisi ne tumhara Track My Half code galat dala. Code badalne ka socho.")
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .build()
        runCatching { NotificationManagerCompat.from(ctx).notify(ID_WRONG, n) }
    }

    fun cancelPrompt(ctx: Context) = NotificationManagerCompat.from(ctx).cancel(ID_PROMPT)
}
