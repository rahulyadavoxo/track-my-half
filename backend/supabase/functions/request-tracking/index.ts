// Web: owner number + code dalta hai. Input: { phone, code }
import { clientIp, handler, json } from "../_shared/http.ts";
import { db } from "../_shared/db.ts";
import { codeHash, normalizePhone, phoneHash, randomToken, safeEqual, sha256 } from "../_shared/crypto.ts";
import { sendFcm } from "../_shared/firebase.ts";
import { env } from "../_shared/env.ts";

const MAX_FAILS = 5;
const LOCK_MINUTES = 15;

Deno.serve(handler(async (b, req) => {
  const ipHash = await sha256(`ip:${clientIp(req)}`);
  const since = new Date(Date.now() - LOCK_MINUTES * 60_000).toISOString();

  // 1) Lockout: is IP se 15 min me 5 galat try = lock
  const { count } = await db.from("failed_attempts")
    .select("id", { count: "exact", head: true })
    .eq("ip_hash", ipHash).gte("created_at", since);
  if ((count ?? 0) >= MAX_FAILS) return json({ error: "locked", retryAfterMinutes: LOCK_MINUTES }, 429);

  const phone = normalizePhone(b.phone);
  const code = String(b.code ?? "");
  const pHash = phone ? await phoneHash(phone) : "";
  const { data: dev } = phone
    ? await db.from("devices").select("*").eq("phone_hash", pHash).maybeSingle()
    : { data: null };

  const ok = dev && safeEqual(dev.code_hash, await codeHash(phone, code));
  if (!ok) {
    await db.from("failed_attempts").insert({ ip_hash: ipHash, phone_hash: pHash || null });
    // Owner ko pata chale ki kisi ne galat code try kiya
    if (dev?.fcm_token) await sendFcm(dev.fcm_token, { type: "wrong_attempt" });
    return json({ error: "invalid", attemptsLeft: Math.max(0, MAX_FAILS - (count ?? 0) - 1) }, 401);
  }

  // 2) Purani pending request ho to use expire karo
  await db.from("tracking_requests").update({ status: "expired" })
    .eq("device_id", dev.id).eq("status", "pending");

  const webToken = randomToken();
  const activateAt = new Date(Date.now() + env.timerSeconds * 1000);
  const { data: tr, error } = await db.from("tracking_requests").insert({
    device_id: dev.id,
    web_token_hash: await sha256(webToken),
    activate_at: activateAt.toISOString(),
    ip_hash: ipHash,
  }).select("id").single();
  if (error) throw error;

  // 3) Phone ko jagao: prompt + timer, aur chupchap location collect shuru
  const delivered = dev.fcm_token
    ? await sendFcm(dev.fcm_token, { type: "request", requestId: tr.id, activateAt: String(activateAt.getTime()) })
    : false;

  return json({
    requestId: tr.id,
    webToken,
    activateAt: activateAt.getTime(),
    phoneReached: delivered,
    lastKnown: dev.last_lat != null
      ? { lat: dev.last_lat, lng: dev.last_lng, battery: dev.last_battery, t: dev.last_seen_at }
      : null,
  });
}));
