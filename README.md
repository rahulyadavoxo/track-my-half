# Track My Half

Phone chori hone ke baad use dhundhne ka system. Owner kisi bhi browser se apna **number + secret code** dalta hai, phone par ek verify prompt aur 60 second ka timer aata hai. Fingerprint/PIN se cancel nahi hua to phone ki **live location har second** web map par dikhne lagti hai.

## Kaise kaam karta hai

1. Web par number + code → Supabase function code check karta hai (5 galat try = 15 min lock, us IP par).
2. Phone ko high-priority FCM jata hai → phone **chupchap** location bhejna shuru karta hai aur owner ko "security check" notification + countdown dikhata hai.
3. Owner ke paas phone hai → notification tap → fingerprint/PIN → cancel, saari bheji location delete.
4. Timer khatam (server par, phone se roka nahi ja sakta) → web ko Firebase viewer token milta hai → map par live dot + raasta + battery + pata.
5. Stop → phone location bhejna band karta hai, sab location delete, sirf aakhri location save.

## Folder

| Folder | Kya hai |
|---|---|
| `android/` | Native Kotlin app (FCM, foreground location service, BiometricPrompt) |
| `web/` | React + Vite + Leaflet/OpenStreetMap dashboard |
| `backend/supabase/` | Postgres schema + Edge Functions (code check, timer, FCM, Firebase tokens) |
| `firebase/` | Realtime Database rules + Hosting config |
| `.github/workflows/keepalive.yml` | Roz Supabase ko ping, taaki free project pause na ho |

Sab free: Firebase **Spark** (no card) + Supabase free.

## Setup

### 1. Firebase (Spark plan)
- Naya project banao, **Realtime Database** enable karo.
- `firebase/database.rules.json` deploy karo: `cd firebase && firebase deploy --only database`
- Android app add karo (package `in.receipto.trackmyhalf`), `google-services.json` ko `android/app/` me rakho (git me commit nahi hota).
- Web app add karo, config `web/.env` me.
- Project settings → Service accounts → **Generate new private key** (JSON). Ye kabhi commit mat karna.

### 2. Supabase
- Naya project, phir `backend/supabase/migrations/0001_init.sql` SQL editor me chalao.
- Function secrets:
  ```
  supabase secrets set TMH_PEPPER=<lamba random string> \
    FIREBASE_PROJECT_ID=... FIREBASE_DB_URL=https://<project>-default-rtdb.<region>.firebasedatabase.app \
    FIREBASE_CLIENT_EMAIL=<service account client_email> \
    FIREBASE_PRIVATE_KEY="<service account private_key>" \
    TMH_TIMER_SECONDS=60
  ```
- Deploy: `cd backend && supabase functions deploy --project-ref <ref>`
- GitHub repo secret `SUPABASE_FUNCTIONS_URL` = `https://<ref>.supabase.co/functions/v1`

### 3. Web
```
cd web && cp .env.example .env   # values bharo
npm install && npm run build
cd ../firebase && firebase deploy --only hosting
```

### 4. Android
- Android Studio me `android/` folder kholo (Gradle 8.9 wrapper repo me hai).
- `android/local.properties` me:
  ```
  tmh.functionsUrl=https://<ref>.supabase.co/functions/v1
  tmh.anonKey=<supabase anon key>
  ```
- Install karo, number + code save karo, chaaro permission do (location → **Allow all the time**, notifications, battery **Unrestricted**).

## Limitations
Phone band / internet band / location band / SIM nikali / app uninstall / factory reset → live location nahi, sirf aakhri location. Realme, Xiaomi jaise phone me battery Unrestricted zaroori.

## Phase 2
Request history, Keystore me secrets, App Check, code change UI, testing.
