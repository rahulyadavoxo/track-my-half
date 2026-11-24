// App setup / code badalna. Input: { phone, code, fcmToken, deviceId?, deviceSecret?, oldCode? }
import { handler, json } from "../_shared/http.ts";
import { db } from "../_shared/db.ts";
import { codeHash, normalizePhone, phoneHash, randomToken, safeEqual, sha256 } from "../_shared/crypto.ts";
import { authDevice } from "../_shared/device.ts";

Deno.serve(handler(async (b) => {
  const phone = normalizePhone(b.phone);
  const code = String(b.code ?? "");
  if (!phone) return json({ error: "invalid_phone" }, 400);
  if (code.length < 6) return json({ error: "code_too_short", min: 6 }, 400);

  const pHash = await phoneHash(phone);
  const cHash = await codeHash(phone, code);
  const deviceSecret = randomToken();
  const secretHash = await sha256(deviceSecret);

  const { data: existing } = await db.from("devices").select("*").eq("phone_hash", pHash).maybeSingle();

  if (existing) {
    // Same number pehle se registered: ya to wahi phone (deviceSecret) ya purana code chahiye
    const sameDevice = await authDevice(b.deviceId, b.deviceSecret);
    const knowsOld = b.oldCode && safeEqual(existing.code_hash, await codeHash(phone, String(b.oldCode)));
    if (!(sameDevice && sameDevice.id === existing.id) && !knowsOld) {
      return json({ error: "already_registered_need_old_code" }, 409);
    }
    await db.from("devices").update({
      code_hash: cHash, secret_hash: secretHash, fcm_token: b.fcmToken ?? existing.fcm_token,
      updated_at: new Date().toISOString(),
    }).eq("id", existing.id);
    return json({ deviceId: existing.id, deviceSecret });
  }

  const { data, error } = await db.from("devices").insert({
    phone_hash: pHash, code_hash: cHash, secret_hash: secretHash, fcm_token: b.fcmToken ?? null,
  }).select("id").single();
  if (error) throw error;
  return json({ deviceId: data.id, deviceSecret });
}));
