const BASE = import.meta.env.VITE_FUNCTIONS_URL as string;
const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export async function call<T = any>(fn: string, body: unknown): Promise<{ status: number; data: T }> {
  const res = await fetch(`${BASE}/${fn}`, {
    method: "POST",
    headers: { "content-type": "application/json", apikey: ANON, authorization: `Bearer ${ANON}` },
    body: JSON.stringify(body),
  });
  return { status: res.status, data: await res.json().catch(() => ({})) };
}

export type Session = { requestId: string; webToken: string; activateAt: number };
const KEY = "tmh_session";
export const saveSession = (s: Session | null) =>
  s ? sessionStorage.setItem(KEY, JSON.stringify(s)) : sessionStorage.removeItem(KEY);
export const loadSession = (): Session | null => {
  try { return JSON.parse(sessionStorage.getItem(KEY) ?? "null"); } catch { return null; }
};
