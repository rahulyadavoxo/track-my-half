export const cors = {
  "Access-Control-Allow-Origin": Deno.env.get("TMH_WEB_ORIGIN") ?? "*",
  "Access-Control-Allow-Headers": "content-type, authorization, apikey, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "content-type": "application/json" },
  });
}

export function handler(fn: (body: any, req: Request) => Promise<Response>) {
  return async (req: Request) => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
    if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
    try {
      const body = await req.json().catch(() => ({}));
      return await fn(body, req);
    } catch (e) {
      console.error(e);
      return json({ error: "server_error" }, 500);
    }
  };
}

export function clientIp(req: Request): string {
  return (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
}
