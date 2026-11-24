// Web har 2 sec poll karta hai jab tak active na ho. Input: { requestId, webToken }
import { handler, json } from "../_shared/http.ts";
import { db } from "../_shared/db.ts";
import { authRequest } from "../_shared/device.ts";
import { customToken } from "../_shared/firebase.ts";

Deno.serve(handler(async (b) => {
  const r = await authRequest(b.requestId, b.webToken);
  if (!r) return json({ error: "unauthorized" }, 401);

  let status = r.status;
  // Timer server par chalta hai: phone se roka nahi ja sakta
  if (status === "pending" && Date.now() >= Date.parse(r.activate_at)) {
    const { data } = await db.from("tracking_requests")
      .update({ status: "active", activated_at: new Date().toISOString() })
      .eq("id", r.id).eq("status", "pending").select("status").maybeSingle();
    status = data?.status ?? (await db.from("tracking_requests").select("status").eq("id", r.id).single()).data!.status;
  }

  const out: Record<string, unknown> = { status, activateAt: Date.parse(r.activate_at) };
  if (status === "active") {
    out.deviceId = r.device_id;
    out.firebaseToken = await customToken(`viewer_${r.id}`, {
      role: "viewer", deviceId: r.device_id, requestId: r.id,
    });
  }
  return json(out);
}));
