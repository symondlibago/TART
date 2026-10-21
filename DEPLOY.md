# Deploying

| Part | Host | Notes |
|---|---|---|
| React frontend | **Vercel** | Root directory `frontend` |
| Laravel API | **Render** | Web Service (Docker), root directory `backend` |
| Database + photo storage | **Supabase** | Already running |

The two hosts have to know about each other:

- Render needs `FRONTEND_URL` = the Vercel URL (this is the CORS allow-list)
- Vercel needs `VITE_API_URL` = the Render URL + `/api`

Get either wrong and the browser blocks every API call. It is the most common
thing to trip over.

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

## Deploy the API on Render

**New → Web Service**, connect the repo, then set:

| Setting | Value |
|---|---|
| Language / Runtime | **Docker** |
| Root Directory | `backend` |
| Region | **Singapore** |
| Branch | `main` |
| Health Check Path | `/` |

Render finds `backend/Dockerfile` on its own.

Then add the environment variables:

| Variable | Where it comes from |
|---|---|
| `APP_KEY` | `php artisan key:generate --show` |
| `DB_USERNAME` | Supabase → Connect → Session pooler (`postgres.xxxxx`) |
| `DB_PASSWORD` | Your Supabase database password |
| `SUPABASE_URL` | `https://<project-ref>.supabase.co` |
| `SUPABASE_SERVICE_KEY` | Supabase → Settings → API → `service_role` |

### First deploy only

Set `RUN_MIGRATIONS=true` on the API service so the tables get created, then **set it back to `false`**. Leaving it on means every deploy runs migrations, which is a good way to be surprised one day.

### Then connect the two hosts

Render only gives you the API's URL once the service exists, so this is a second pass:

| Where | Variable | Value |
|---|---|---|
| Render | `APP_URL` | the Render URL |
| Render | `FRONTEND_URL` | the Vercel URL, no trailing slash |
| Vercel | `VITE_API_URL` | the Render URL **+ `/api`** |

On Vercel, add the variable under **Settings → Environment Variables**, then
**Deployments → ⋯ → Redeploy**. Vite bakes the value into the bundle at build
time, so a redeploy is required — restarting changes nothing.

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
