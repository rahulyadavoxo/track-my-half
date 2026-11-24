-- Track My Half: Phase 1 schema
-- Saara access sirf Edge Functions (service role) se. Client ko direct table access nahi.

create extension if not exists pgcrypto;

create table if not exists devices (
  id            uuid primary key default gen_random_uuid(),
  phone_hash    text not null unique,          -- HMAC(pepper, normalized phone)
  code_hash     text not null,                 -- HMAC(pepper, phone || ':' || code)
  secret_hash   text not null,                 -- sha256(device_secret), app ke paas raw secret
  fcm_token     text,
  last_lat      double precision,
  last_lng      double precision,
  last_battery  int,
  last_seen_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create type request_status as enum ('pending', 'cancelled', 'active', 'stopped', 'expired');

create table if not exists tracking_requests (
  id              uuid primary key default gen_random_uuid(),
  device_id       uuid not null references devices(id) on delete cascade,
  web_token_hash  text not null,               -- sha256(web_token), sirf usi browser ke paas raw token
  status          request_status not null default 'pending',
  requested_at    timestamptz not null default now(),
  activate_at     timestamptz not null,        -- requested_at + timer
  cancelled_at    timestamptz,
  activated_at    timestamptz,
  stopped_at      timestamptz,
  ip_hash         text
);
create index if not exists tracking_requests_device_idx on tracking_requests(device_id, requested_at desc);

-- Galat code attempts: lock per IP (owner ko lock out na kar sake koi)
create table if not exists failed_attempts (
  id          bigint generated always as identity primary key,
  ip_hash     text not null,
  phone_hash  text,
  created_at  timestamptz not null default now()
);
create index if not exists failed_attempts_ip_idx on failed_attempts(ip_hash, created_at desc);

alter table devices enable row level security;
alter table tracking_requests enable row level security;
alter table failed_attempts enable row level security;
-- Koi policy nahi = anon/authenticated ke liye sab band. Service role RLS bypass karta hai.

-- Purane failed attempts saaf (pg_cron enable ho to)
-- select cron.schedule('cleanup-failed-attempts', '0 * * * *', $$delete from failed_attempts where created_at < now() - interval '1 day'$$);
