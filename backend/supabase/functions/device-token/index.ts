// App: FCM token update + Firebase custom token (RTDB me likhne ke liye) + chal rahi request.
// Input: { deviceId, deviceSecret, fcmToken? }
import { handler, json } from "../_shared/http.ts";
import { db } from "../_shared/db.ts";
import { authDevice } from "../_shared/device.ts";
import { customToken } from "../_shared/firebase.ts";

Deno.serve(handler(async (b) => {
  const dev = await authDevice(b.deviceId, b.deviceSecret);
  if (!dev) return json({ error: "unauthorized" }, 401);

  if (b.fcmToken && b.fcmToken !== dev.fcm_token) {
    await db.from("devices").update({ fcm_token: b.fcmToken, updated_at: new Date().toISOString() }).eq("id", dev.id);
  }

  const { data: req } = await db.from("tracking_requests")
    .select("id,status,activate_at")
    .eq("device_id", dev.id).in("status", ["pending", "active"])
    .order("requested_at", { ascending: false }).limit(1).maybeSingle();

  const firebaseToken = await customToken(`device_${dev.id}`, { role: "device", deviceId: dev.id });
  return json({
    firebaseToken,
    activeRequest: req ? { requestId: req.id, status: req.status, activateAt: Date.parse(req.activate_at) } : null,
  });
}));
