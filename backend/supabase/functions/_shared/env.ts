export const env = {
  supabaseUrl: Deno.env.get("SUPABASE_URL")!,
  serviceRoleKey: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  pepper: Deno.env.get("TMH_PEPPER")!,                 // lamba random secret
  firebaseProjectId: Deno.env.get("FIREBASE_PROJECT_ID")!,
  firebaseDbUrl: Deno.env.get("FIREBASE_DB_URL")!,     // https://<project>-default-rtdb.<region>.firebasedatabase.app
  firebaseClientEmail: Deno.env.get("FIREBASE_CLIENT_EMAIL")!,
  firebasePrivateKey: (Deno.env.get("FIREBASE_PRIVATE_KEY") ?? "").replace(/\\n/g, "\n"),
  timerSeconds: Number(Deno.env.get("TMH_TIMER_SECONDS") ?? "60"),
};
