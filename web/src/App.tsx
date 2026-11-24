import { useState } from "react";
import CodeForm from "./CodeForm";
import Waiting from "./Waiting";
import LiveMap from "./LiveMap";
import { loadSession, Session } from "./api";

type View =
  | { k: "form"; msg?: string }
  | { k: "wait"; s: Session }
  | { k: "map"; s: Session; deviceId: string; token: string };

export default function App() {
  const saved = loadSession();
  const [v, setV] = useState<View>(saved ? { k: "wait", s: saved } : { k: "form" });
  const end = (msg: string) => setV({ k: "form", msg });

  if (v.k === "wait")
    return <Waiting session={v.s} onEnd={end} onActive={(deviceId, token) => setV({ k: "map", s: v.s, deviceId, token })} />;
  if (v.k === "map") return <LiveMap session={v.s} deviceId={v.deviceId} token={v.token} onEnd={end} />;
  return (
    <>
      {v.msg && <p className="banner">{v.msg}</p>}
      <CodeForm onStart={(s) => setV({ k: "wait", s })} />
    </>
  );
}
