package `in`.receipto.trackmyhalf

import android.os.Build
import android.os.Bundle
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.biometric.BiometricManager.Authenticators.BIOMETRIC_STRONG
import androidx.biometric.BiometricManager.Authenticators.DEVICE_CREDENTIAL
import androidx.biometric.BiometricPrompt
import androidx.core.content.ContextCompat
import androidx.lifecycle.lifecycleScope
import kotlinx.coroutines.launch

/** Fingerprint ya phone ka PIN/pattern -> request cancel */
class CancelActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val requestId = intent.getStringExtra("requestId") ?: Prefs(this).activeRequestId
        if (requestId == null) { finish(); return }

        val prompt = BiometricPrompt(this, ContextCompat.getMainExecutor(this),
            object : BiometricPrompt.AuthenticationCallback() {
                override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) {
                    lifecycleScope.launch {
                        val p = Prefs(this@CancelActivity)
                        runCatching { Api.call("cancel-tracking", Api.deviceAuth(p).put("requestId", requestId)) }
                        TrackingService.stop(this@CancelActivity)
                        Toast.makeText(this@CancelActivity, "Request cancel ho gayi", Toast.LENGTH_SHORT).show()
                        finish()
                    }
                }
                override fun onAuthenticationError(code: Int, msg: CharSequence) { finish() }
            })

        val info = BiometricPrompt.PromptInfo.Builder()
            .setTitle("Verify karo")
            .setSubtitle("Ye request tumne nahi ki to cancel karo")
            .apply {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                    setAllowedAuthenticators(BIOMETRIC_STRONG or DEVICE_CREDENTIAL)
                } else {
                    @Suppress("DEPRECATION") setDeviceCredentialAllowed(true)
                }
            }
            .build()
        prompt.authenticate(info)
    }
}
