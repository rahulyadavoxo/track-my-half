import { env } from "./env.ts";

const enc = new TextEncoder();
const hex = (buf: ArrayBuffer) =>
  [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");

let hmacKey: CryptoKey | null = null;
async function key() {
  hmacKey ??= await crypto.subtle.importKey(
    "raw", enc.encode(env.pepper), { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  return hmacKey;
}

export async function hmac(value: string) {
  return hex(await crypto.subtle.sign("HMAC", await key(), enc.encode(value)));
}

export async function sha256(value: string) {
  return hex(await crypto.subtle.digest("SHA-256", enc.encode(value)));
}

export function randomToken(bytes = 32) {
  const a = crypto.getRandomValues(new Uint8Array(bytes));
  return btoa(String.fromCharCode(...a)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Sirf digits, last 10 (India). +91 98765 43210 -> 9876543210 */
export function normalizePhone(p: string) {
  const d = String(p ?? "").replace(/\D/g, "");
  return d.length >= 10 ? d.slice(-10) : "";
}

export const phoneHash = (phone: string) => hmac(`phone:${phone}`);
export const codeHash = (phone: string, code: string) => hmac(`code:${phone}:${code}`);

/** Constant-time compare */
export function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}
