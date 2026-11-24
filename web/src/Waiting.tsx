import { useEffect, useState } from "react";
import { call, saveSession, Session } from "./api";

type Props = { session: Session; onActive: (deviceId: string, token: string) => void; onEnd: (msg: string) => void };

export default function Waiting({ session, onActive, onEnd }: Props) {
  const [left, setLeft] = useState(Math.max(0, Math.ceil((session.activateAt - Date.now()) / 1000)));

  useEffect(() => {
    const tick = setInterval(() => setLeft(Math.max(0, Math.ceil((session.activateAt - Date.now()) / 1000))), 500);
    const poll = setInterval(async () => {
      const { status, data } = await call("tracking-status", { requestId: session.requestId, webToken: session.webToken });
      if (status !== 200) return;
      if (data.status === "active") onActive(data.deviceId, data.firebaseToken);
      else if (data.status === "cancelled") { saveSession(null); onEnd("Phone par request cancel kar di gayi."); }
      else if (data.status === "expired" || data.status === "stopped") { saveSession(null); onEnd("Request khatam ho gayi."); }
    }, 2000);
    return () => { clearInterval(tick); clearInterval(poll); };
  }, [session]);

  return (
    <div className="card center">
      <h2>Phone ka intezaar</h2>
      <div className="timer">{left}s</div>
      <p className="muted">Agar phone par koi cancel nahi karta, to timer khatam hote hi live location yaha dikhegi.</p>
    </div>
  );
}
