import { db } from "./db.ts";
import { safeEqual, sha256 } from "./crypto.ts";

/** App har call me deviceId + deviceSecret bhejta hai */
export async function authDevice(deviceId: string, deviceSecret: string) {
  if (!deviceId || !deviceSecret) return null;
  const { data } = await db.from("devices").select("*").eq("id", deviceId).maybeSingle();
  if (!data) return null;
  return safeEqual(data.secret_hash, await sha256(deviceSecret)) ? data : null;
}

/** Browser har call me requestId + webToken bhejta hai */
export async function authRequest(requestId: string, webToken: string) {
  if (!requestId || !webToken) return null;
  const { data } = await db.from("tracking_requests").select("*").eq("id", requestId).maybeSingle();
  if (!data) return null;
  return safeEqual(data.web_token_hash, await sha256(webToken)) ? data : null;
}
