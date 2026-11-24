// Firebase Admin ka kaam bina Admin SDK: service account se JWT sign karke
// 1) FCM HTTP v1 se message bhejna  2) custom token banana  3) RTDB REST se data delete
import { importPKCS8, SignJWT } from "npm:jose@5";
import { env } from "./env.ts";

let pk: CryptoKey | null = null;
async function privateKey() {
  pk ??= (await importPKCS8(env.firebasePrivateKey, "RS256")) as CryptoKey;
  return pk;
}

let cached: { token: string; exp: number } | null = null;
async function accessToken() {
  const now = Math.floor(Date.now() / 1000);
  if (cached && cached.exp - 60 > now) return cached.token;
  const assertion = await new SignJWT({
    scope: [
      "https://www.googleapis.com/auth/firebase.messaging",
      "https://www.googleapis.com/auth/firebase.database",
      "https://www.googleapis.com/auth/userinfo.email",
    ].join(" "),
  })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .setIssuer(env.firebaseClientEmail)
    .setAudience("https://oauth2.googleapis.com/token")
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(await privateKey());
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  if (!res.ok) throw new Error(`oauth ${res.status} ${await res.text()}`);
  const j = await res.json();
  cached = { token: j.access_token, exp: now + j.expires_in };
  return cached.token;
}

/** High-priority data message: phone so raha ho tab bhi jagata hai */
export async function sendFcm(fcmToken: string, data: Record<string, string>) {
  const res = await fetch(
    `https://fcm.googleapis.com/v1/projects/${env.firebaseProjectId}/messages:send`,
    {
      method: "POST",
      headers: { authorization: `Bearer ${await accessToken()}`, "content-type": "application/json" },
      body: JSON.stringify({
        message: { token: fcmToken, data, android: { priority: "HIGH", ttl: "120s" } },
      }),
    },
  );
  if (!res.ok) console.error("fcm", res.status, await res.text());
  return res.ok;
}

/** Firebase custom token: client signInWithCustomToken() karega, claims rules me check honge */
export async function customToken(uid: string, claims: Record<string, unknown>) {
  const now = Math.floor(Date.now() / 1000);
  return await new SignJWT({ uid, claims })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .setIssuer(env.firebaseClientEmail)
    .setSubject(env.firebaseClientEmail)
    .setAudience("https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit")
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(await privateKey());
}

/** RTDB path delete (tracking band hone par location saaf) */
export async function rtdbDelete(path: string) {
  const res = await fetch(`${env.firebaseDbUrl}/${path}.json`, {
    method: "DELETE",
    headers: { authorization: `Bearer ${await accessToken()}` },
  });
  if (!res.ok) console.error("rtdb delete", path, res.status, await res.text());
}

export async function rtdbGet(path: string) {
  const res = await fetch(`${env.firebaseDbUrl}/${path}.json`, {
    headers: { authorization: `Bearer ${await accessToken()}` },
  });
  return res.ok ? await res.json() : null;
}
