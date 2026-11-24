// Phone: owner ne fingerprint/PIN se cancel kiya. Input: { deviceId, deviceSecret, requestId }
import { handler, json } from "../_shared/http.ts";
import { db } from "../_shared/db.ts";
import { authDevice } from "../_shared/device.ts";
import { rtdbDelete } from "../_shared/firebase.ts";

Deno.serve(handler(async (b) => {
  const dev = await authDevice(b.deviceId, b.deviceSecret);
  if (!dev) return json({ error: "unauthorized" }, 401);

  const { data } = await db.from("tracking_requests")
    .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
    .eq("id", b.requestId).eq("device_id", dev.id).in("status", ["pending", "active"])
    .select("id").maybeSingle();

  // Cancel = jo bhi location chupchap gayi thi, sab delete
  await rtdbDelete(`live/${dev.id}`);
  if (b.requestId) await rtdbDelete(`trail/${b.requestId}`);
  return json({ cancelled: !!data });
}));
