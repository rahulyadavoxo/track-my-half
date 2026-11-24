import { createClient } from "npm:@supabase/supabase-js@2";
import { env } from "./env.ts";

export const db = createClient(env.supabaseUrl, env.serviceRoleKey, {
  auth: { persistSession: false },
});
