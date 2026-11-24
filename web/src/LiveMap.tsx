import { useEffect, useState } from "react";
import { signInWithCustomToken, signOut } from "firebase/auth";
import { limitToLast, onValue, orderByChild, query, ref } from "firebase/database";
import { MapContainer, Marker, Polyline, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { auth, rtdb } from "./firebase";
import { call, saveSession, Session } from "./api";

type Live = { lat: number; lng: number; acc?: number; speed?: number; battery?: number; t: number };

const dot = L.divIcon({ className: "dot", iconSize: [18, 18] });

function Follow({ pos }: { pos: [number, number] }) {
  const map = useMap();
  useEffect(() => { map.panTo(pos, { animate: true }); }, [pos[0], pos[1]]);
  return null;
}

export default function LiveMap({ session, deviceId, token, onEnd }:
  { session: Session; deviceId: string; token: string; onEnd: (m: string) => void }) {
  const [live, setLive] = useState<Live | null>(null);
  const [trail, setTrail] = useState<[number, number][]>([]);
  const [address, setAddress] = useState("");
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    let offLive = () => {}, offTrail = () => {};
    signInWithCustomToken(auth, token).then(() => {
      offLive = onValue(ref(rtdb, `live/${deviceId}`), (s) => setLive(s.val()));
      offTrail = onValue(query(ref(rtdb, `trail/${session.requestId}`), orderByChild("t"), limitToLast(2000)), (s) => {
        const pts: [number, number][] = [];
        s.forEach((c) => { const v = c.val(); pts.push([v.lat, v.lng]); });
        setTrail(pts);
      });
    });
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => { offLive(); offTrail(); clearInterval(t); };
  }, [token]);

  // Pata (address): har ~30 sec, OpenStreetMap Nominatim (free, rate limit 1/sec)
  useEffect(() => {
    if (!live) return;
    const id = setTimeout(async () => {
      try {
        const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${live.lat}&lon=${live.lng}`);
        setAddress((await r.json()).display_name ?? "");
      } catch { /* ignore */ }
    }, address ? 30000 : 0);
    return () => clearTimeout(id);
  }, [live && Math.round(live.lat * 1000), live && Math.round(live.lng * 1000)]);

  async function stop() {
    if (!confirm("Tracking band karein? Saari location delete ho jayegi.")) return;
    await call("stop-tracking", { requestId: session.requestId, webToken: session.webToken });
    await signOut(auth); saveSession(null);
    onEnd("Tracking band. Location delete kar di gayi.");
  }

  const pos: [number, number] | null = live ? [live.lat, live.lng] : null;
  const ago = live ? Math.round((now - live.t) / 1000) : null;

  return (
    <div className="mapwrap">
      {pos ? (
        <MapContainer center={pos} zoom={17} className="map">
          <TileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {trail.length > 1 && <Polyline positions={trail} />}
          <Marker position={pos} icon={dot} />
          <Follow pos={pos} />
        </MapContainer>
      ) : <div className="map center"><p>Location ka intezaar...</p></div>}
      <div className="panel">
        <div><b>Last update:</b> {ago == null ? "-" : ago <= 2 ? "abhi" : `${ago}s pehle`}</div>
        <div><b>Battery:</b> {live?.battery ?? "-"}%</div>
        {live?.speed != null && <div><b>Speed:</b> {(live.speed * 3.6).toFixed(0)} km/h</div>}
        {address && <div className="addr">{address}</div>}
        <button className="stop" onClick={stop}>Stop tracking</button>
      </div>
    </div>
  );
}
