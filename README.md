# Cruise RSVP

A simple, mobile-friendly RSVP site for a car cruise. It uses Node.js, Express, and PostgreSQL—well suited to a Railway app service plus Railway PostgreSQL.

## Customize the event

Copy `.env.example` to `.env` and change its event fields. The hero image, location image, map description, Google Maps link, event title, date, and copy can all be changed with environment variables; no code changes are needed. In production, enter the same values in the Railway app service's Variables tab.

Set `START_NAME`, `START_ADDRESS`, `START_MAPS_URL`, `DESTINATION_NAME`, `DESTINATION_ADDRESS`, and `DESTINATION_MAPS_URL` to show the cruise route on the landing page.

`ADMIN_USERNAME` and `ADMIN_PASSWORD` protect `/admin` using browser basic authentication. Set a long, unique production password.

From `/admin`, add car-logo rows for the public page. Each row has an image (upload a PNG, JPG, GIF, or WebP under 3.5 MB, or provide an image URL), title, and description. The rows are stored in PostgreSQL and render in the public car-community list.

## Run locally

1. Install dependencies: `npm install`
2. Start a local PostgreSQL database and set `DATABASE_URL` in `.env`.
3. Run `npm run dev`, then open `http://localhost:3000`.

The app creates the `rsvps` table automatically when it starts.

### Database variables: local versus Railway

The `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`, and `DATABASE_URL` values shown inside Railway's **Postgres** service are created for that database service. Do not copy its `PGHOST` into `.env`: it is a private Railway hostname and will not work from your computer.

Keep your local `.env` on a local connection string, for example:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/cruise_rsvp
```

On Railway, open the **app service** (not the Postgres service), go to **Variables**, and add this reference variable. Replace `Postgres` if your database service has another name:

```env
DATABASE_URL=${{Postgres.DATABASE_URL}}
```

The app needs no other Postgres variables. It automatically enables SSL when it is deployed on Railway. If you deliberately want to use your Railway database from your computer, first enable **Postgres → Settings → Networking → Public Access**, then place the resulting `DATABASE_PUBLIC_URL` value in local `.env` as `DATABASE_URL` and add `DB_SSL=true`. Public database access incurs Railway network egress, so a local database is preferred for day-to-day development.

## Deploy to Railway

Create **two services in one Railway project**:

1. **PostgreSQL** — the persistent RSVP database.
2. **Your Node app** — this repository, deployed from GitHub or the CLI.

### GitHub deployment

1. Push this folder to GitHub.
2. In Railway, create a project and choose **Deploy from GitHub repo**; select this repository.
3. Add a **PostgreSQL** database from the project canvas (**+ New → Database → PostgreSQL**).
4. In the app service’s Variables tab, add `DATABASE_URL` with the reference value `${{Postgres.DATABASE_URL}}`. If your database has a different service name, use that name instead.
5. Add `ADMIN_USERNAME`, `ADMIN_PASSWORD`, and optionally the event variables from `.env.example`.
6. In the app service, generate a public domain from **Settings → Networking → Public Networking**. Railway will redeploy on future pushes to the connected branch.

### CLI deployment

Install and authenticate with the Railway CLI, then from this directory:

```sh
railway login
railway init
railway add --database postgres
railway add --service cruise-rsvp
railway service   # choose the cruise-rsvp app service if prompted
railway variable set DATABASE_URL='${{Postgres.DATABASE_URL}}' ADMIN_USERNAME=admin ADMIN_PASSWORD='use-a-long-unique-password'
railway up
railway domain
```

Use the actual name of your database service in place of `Postgres` if you rename it. The CLI deploys the app with `railway up`; `railway deploy` is for Railway templates such as databases.

Railway references: [Express deployment guide](https://docs.railway.com/guides/express), [PostgreSQL](https://docs.railway.com/databases/postgresql), and [CLI deployment](https://docs.railway.com/cli/deploying).
