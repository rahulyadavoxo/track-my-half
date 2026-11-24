// Keep-alive: GitHub Action roz call karta hai taaki free Supabase project pause na ho
import { handler, json } from "../_shared/http.ts";
import { db } from "../_shared/db.ts";

Deno.serve(handler(async () => {
  const { count } = await db.from("devices").select("id", { count: "exact", head: true });
  return json({ ok: true, devices: count ?? 0, t: Date.now() });
}));
