// Web: phone mil gaya, Stop. Input: { requestId, webToken }
import { handler, json } from "../_shared/http.ts";
import { db } from "../_shared/db.ts";
import { authRequest } from "../_shared/device.ts";
import { rtdbDelete, rtdbGet, sendFcm } from "../_shared/firebase.ts";

Deno.serve(handler(async (b) => {
  const r = await authRequest(b.requestId, b.webToken);
  if (!r) return json({ error: "unauthorized" }, 401);

  await db.from("tracking_requests")
    .update({ status: "stopped", stopped_at: new Date().toISOString() })
    .eq("id", r.id).in("status", ["pending", "active"]);

  // Sirf aakhri location devices table me rakho, baaki sab delete
  const live = await rtdbGet(`live/${r.device_id}`);
  if (live?.lat != null) {
    await db.from("devices").update({
      last_lat: live.lat, last_lng: live.lng, last_battery: live.battery ?? null,
      last_seen_at: new Date(live.t ?? Date.now()).toISOString(),
    }).eq("id", r.device_id);
  }

  const { data: dev } = await db.from("devices").select("fcm_token").eq("id", r.device_id).single();
  if (dev?.fcm_token) await sendFcm(dev.fcm_token, { type: "stop", requestId: r.id });

  await rtdbDelete(`live/${r.device_id}`);
  await rtdbDelete(`trail/${r.id}`);
  return json({ stopped: true });
}));
