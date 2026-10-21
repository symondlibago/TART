# Deploying to Render

Two services come out of this repo:

| Service | What it is | Render type |
|---|---|---|
| `event-tracker-api` | Laravel API | Web Service (Docker) |
| `event-tracker-web` | React frontend | Static Site |

The database is Supabase and stays where it is.

---

## Before you start

**1. Push to GitHub.** Render deploys from a Git repository, so the code has to be there first.

```bash
cd "C:\TART SYSTEM\TART"
git init
git add .
git commit -m "Event tracker"
git branch -M main
git remote add origin https://github.com/<you>/<repo>.git
git push -u origin main
```

`.env` is gitignored and must stay that way. Secrets go in Render's dashboard, never in the repo.

**2. Generate an app key** and keep it somewhere safe:

```bash
cd backend
php artisan key:generate --show
```

Copy the whole thing including the `base64:` prefix.

**3. Create the photo bucket.** In Supabase: **Storage → New bucket**, name it `attendance`, tick **Public**. Then **Settings → API** and copy the `service_role` key.

> The `service_role` key bypasses row-level security. It belongs only in the backend's environment variables — never in the frontend, never in the repo.

---

## Deploy

In Render: **New → Blueprint**, pick your repo. It reads [`render.yaml`](render.yaml) and creates both services.

You'll be asked for the values marked `sync: false`:

| Variable | Where it comes from |
|---|---|
| `APP_KEY` | `php artisan key:generate --show` |
| `DB_USERNAME` | Supabase → Connect → Session pooler (`postgres.xxxxx`) |
| `DB_PASSWORD` | Your Supabase database password |
| `SUPABASE_URL` | `https://<project-ref>.supabase.co` |
| `SUPABASE_SERVICE_KEY` | Supabase → Settings → API → `service_role` |

### First deploy only

Set `RUN_MIGRATIONS=true` on the API service so the tables get created, then **set it back to `false`**. Leaving it on means every deploy runs migrations, which is a good way to be surprised one day.

### Then fix the URLs

Render assigns real URLs once the services exist. Update three variables so they match:

| Service | Variable | Value |
|---|---|---|
| API | `APP_URL` | the API's URL |
| API | `FRONTEND_URL` | the **frontend's** URL |
| Frontend | `VITE_API_URL` | the API's URL **+ `/api`** |

`FRONTEND_URL` is what the CORS policy allows. If it doesn't match the frontend exactly — including `https://` and no trailing slash — the browser blocks every API call. This is the single most common thing to get wrong.

Changing `VITE_API_URL` needs a **rebuild**, not just a restart: Vite bakes it into the bundle at build time.

---

## After it's live

1. Open the API URL. You should see `{"application":"Event Tracker","status":"ok"}`.
2. Open `<api>/api/health`. It should report `"database":"ok"`.
3. Open the frontend and sign in with `admin` / `password`.
4. **Change that password immediately** — Settings → Change Password.
5. Go to **Attendance → QR & Storage**, download the QR, and print it.

The kiosk camera needs HTTPS. Render gives you that automatically, so it works once deployed even though it won't over a plain LAN address.

---

## Region

Both services should sit near the Supabase project (Tokyo). `render.yaml` uses **Singapore**, the closest Render offers.

This is not a detail. Every query is a network round trip — about 106ms from the Philippines to Tokyo. A backend in Oregon would add roughly 150ms to *every single query*. Once the API is deployed near the database, requests that take ~700ms locally should drop well under 100ms.

---

## Costs

| | Free | Paid |
|---|---|---|
| Static site | Yes | — |
| Web service | Spins down after 15 min idle (~30s cold start) | ~$7/mo, always on |
| Supabase | 500MB database, 1GB storage | — |

The free web service tier is usable but the cold start is painful for a QR kiosk — someone scans it and waits 30 seconds. If staff use this daily, the paid tier is worth it.

---

## Updating later

```bash
git add .
git commit -m "What changed"
git push
```

Render rebuilds automatically. If you changed migrations, flip `RUN_MIGRATIONS` to `true` for that deploy, then back to `false`.

---

## When something breaks

| Symptom | Cause |
|---|---|
| Every API call fails, console says CORS | `FRONTEND_URL` doesn't exactly match the frontend URL |
| Frontend loads, calls go to `localhost` | `VITE_API_URL` wasn't set, or wasn't rebuilt after setting it |
| 500 on every request | `APP_KEY` missing — the container logs say so and exits |
| Tables don't exist | `RUN_MIGRATIONS` was never set to `true` |
| Refreshing `/attendance` gives 404 | The static site's rewrite rule is missing |
| Camera won't open | Not HTTPS, or permission denied in the browser |

Logs are under each service's **Logs** tab. `APP_DEBUG` is `false` in production, so errors are not shown to users — the detail is in the logs.
