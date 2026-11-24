import { useState } from "react";
import { call, saveSession, Session } from "./api";

export default function CodeForm({ onStart }: { onStart: (s: Session) => void }) {
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setMsg("");
    const { status, data } = await call("request-tracking", { phone, code });
    setBusy(false);
    if (status === 200) {
      const s = { requestId: data.requestId, webToken: data.webToken, activateAt: data.activateAt };
      saveSession(s); onStart(s);
      if (!data.phoneReached) setMsg("Phone tak signal abhi nahi pahuncha. Phone online aate hi pahunch jayega.");
    } else if (status === 429) {
      setMsg(`Bahut galat try. ${data.retryAfterMinutes} minute baad try karo.`);
    } else if (status === 401) {
      setMsg(`Number ya code galat hai. ${data.attemptsLeft} try bache.`);
    } else setMsg("Kuch gadbad hui, dobara try karo.");
  }

  return (
    <form className="card" onSubmit={submit}>
      <h1>Track My Half</h1>
      <p className="muted">Apne chori hue phone ka number aur secret code dalo.</p>
      <input inputMode="tel" placeholder="Phone number" value={phone} onChange={(e) => setPhone(e.target.value)} required />
      <input type="password" placeholder="Secret code" value={code} onChange={(e) => setCode(e.target.value)} required minLength={6} />
      <button disabled={busy}>{busy ? "Bhej rahe hai..." : "Phone dhundho"}</button>
      {msg && <p className="msg">{msg}</p>}
    </form>
  );
}
