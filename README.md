# Cruise RSVP

A simple, mobile-friendly RSVP site for a car cruise. It uses Node.js, Express, and PostgreSQL—well suited to a Railway app service plus Railway PostgreSQL.

## Customize the event

Copy `.env.example` to `.env` and change its event fields. The hero image, location image, map description, Google Maps link, event title, date, and copy can all be changed with environment variables; no code changes are needed. In production, enter the same values in the Railway app service's Variables tab.

Set `START_NAME`, `START_ADDRESS`, `START_MAPS_URL`, `DESTINATION_NAME`, `DESTINATION_ADDRESS`, and `DESTINATION_MAPS_URL` to show the cruise route on the landing page.

Set `MAX_ENTRIES` to the maximum number of guests who select “Yes” on the RSVP form. It defaults to `10`; when reached, the public RSVP buttons close and the server rejects any further attending RSVPs.

`ADMIN_USERNAME` and `ADMIN_PASSWORD` protect `/admin` using browser basic authentication. Set a long, unique production password.

From `/admin`, add car-logo rows for the public page. Each row has an image (upload a PNG, JPG, GIF, or WebP under 3.5 MB, or provide an image URL), title, and description. The rows are stored in PostgreSQL and render in the public car-community list.

## Automatic Showcase Creation with LangChain

This app uses **LangChain and OpenAI** to automatically create car showcase items when users RSVP with "Yes". Here's how it works:

1. **User submits RSVP** with their car (e.g., "2020 Ford Mustang")
2. **LangChain extracts** the vehicle make (e.g., "Ford") using OpenAI's GPT-3.5-turbo
3. **Logo matching** finds the matching logo from `logos.json`
4. **Showcase item created** automatically and added to the public car gallery
5. **RSVP response is immediate** — LangChain processing happens in the background

### Setup LangChain

1. Install dependencies: `npm install` (includes `langchain` and `@langchain/openai`)
2. Get an OpenAI API key from https://platform.openai.com/account/api-keys
3. Add to `.env`:
   ```env
   OPENAI_API_KEY=sk-proj-your-actual-key-here
   ```
4. Customize the car logos in `logos.json`:
   ```json
   [
     { "name": "Ford", "url": "https://..." },
     { "name": "Chevy", "url": "https://..." },
     { "name": "Nissan", "url": "https://..." }
   ]
   ```

On Railway, add `OPENAI_API_KEY` to your app service Variables tab.

**Note:** LangChain processes RSVPs asynchronously. If it fails (e.g., invalid API key), the RSVP still succeeds and the error is logged to the server console.

### Admin Features

From `/admin`, you can now:
- **View all RSVPs** with attending status, car make/model, and submission date
- **Delete RSVPs** — click "Remove" on any RSVP row (with confirmation)
- **Manage showcase items** — add/remove car logos manually or let LangChain auto-create them


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
4. In the app service's Variables tab, add:
   - `DATABASE_URL` with the reference value `${{Postgres.DATABASE_URL}}`
   - `OPENAI_API_KEY` with your OpenAI API key (get one at https://platform.openai.com/account/api-keys)
   - `ADMIN_USERNAME`, `ADMIN_PASSWORD`, and optionally the event variables from `.env.example`
5. In the app service, generate a public domain from **Settings → Networking → Public Networking**. Railway will redeploy on future pushes to the connected branch.

### CLI deployment

Install and authenticate with the Railway CLI, then from this directory:

```sh
railway login
railway init
railway add --database postgres
railway add --service cruise-rsvp
railway service   # choose the cruise-rsvp app service if prompted
railway variable set DATABASE_URL='${{Postgres.DATABASE_URL}}' ADMIN_USERNAME=admin ADMIN_PASSWORD='use-a-long-unique-password' OPENAI_API_KEY='sk-proj-your-actual-key-here'
railway up
railway domain
```

Use the actual name of your database service in place of `Postgres` if you rename it. The CLI deploys the app with `railway up`; `railway deploy` is for Railway templates such as databases.

Railway references: [Express deployment guide](https://docs.railway.com/guides/express), [PostgreSQL](https://docs.railway.com/databases/postgresql), and [CLI deployment](https://docs.railway.com/cli/deploying).
