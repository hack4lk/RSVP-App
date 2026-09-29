require("dotenv").config();
const express = require("express");
const path = require("path");
const { Pool } = require("pg");
const fs = require("fs");
const { generateShowcasePayload } = require("./langchain-showcase");

const app = express();
const port = process.env.PORT || 3000;
const useDatabaseSsl =
  process.env.DB_SSL === "true" ||
  (process.env.DB_SSL !== "false" &&
    Boolean(process.env.RAILWAY_DEPLOYMENT_ID));
const parsedMaxEntries = Number.parseInt(process.env.MAX_ENTRIES || "10", 10);
const maxEntries =
  Number.isInteger(parsedMaxEntries) && parsedMaxEntries > 0
    ? parsedMaxEntries
    : 10;

// load the logos
const logos = JSON.parse(
  fs.readFileSync(path.join(__dirname, "logos.json"), "utf-8"),
);
console.log(`Loaded ${logos.length} car logos`);

const event = {
  title: process.env.EVENT_TITLE || "Sunday Sunset Cruise",
  date: process.env.EVENT_DATE || "Sunday, October 18 · 10:00 AM",
  description:
    process.env.EVENT_DESCRIPTION ||
    "Bring your favorite ride for a relaxed morning cruise, good coffee, and great company. All makes and models are welcome.",
  image:
    process.env.EVENT_IMAGE ||
    "https://images.unsplash.com/photo-1504215680853-026ed2a45def?auto=format&fit=crop&w=1800&q=85",
  locationName: process.env.LOCATION_NAME || "Riverside Coffee House",
  mapDescription:
    process.env.MAP_DESCRIPTION ||
    "Tap the map image to open the meet-up location in Google Maps.",
  locationImage:
    process.env.LOCATION_IMAGE ||
    "https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&w=1200&q=85",
  mapsUrl: process.env.GOOGLE_MAPS_URL || "https://maps.google.com/",
  startName: process.env.START_NAME || "Cruise start",
  startAddress: process.env.START_ADDRESS || "123 Main Street, Your City",
  startMapsUrl:
    process.env.START_MAPS_URL ||
    "https://maps.google.com/?q=123+Main+Street,+Your+City",
  destinationName: process.env.DESTINATION_NAME || "Cruise destination",
  destinationAddress:
    process.env.DESTINATION_ADDRESS || "456 Scenic Drive, Your City",
  destinationMapsUrl:
    process.env.DESTINATION_MAPS_URL ||
    "https://maps.google.com/?q=456+Scenic+Drive,+Your+City",
};

if (!process.env.DATABASE_URL) {
  console.error(
    "DATABASE_URL is required. Add PostgreSQL locally or in Railway.",
  );
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: useDatabaseSsl ? { rejectUnauthorized: false } : false,
});

async function initializeDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS rsvps (
      id BIGSERIAL PRIMARY KEY,
      event_title TEXT NOT NULL,
      attending BOOLEAN NOT NULL,
      full_name TEXT NOT NULL,
      car_make_model TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS car_showcase_items (
      id BIGSERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      image_src TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

async function createShowcaseItemFromRSVP(carMakeModel) {
  try {
    const showcaseData = await generateShowcasePayload(carMakeModel, logos);

    if (!showcaseData) {
      console.error(
        "Failed to generate showcase data for car make/model:",
        carMakeModel,
        showcaseData,
      );
      return null;
    }

    await pool.query(
      "INSERT INTO car_showcase_items (title, description, image_src) VALUES ($1, $2, $3)",
      [showcaseData.title, showcaseData.description, showcaseData.logoUrl],
    );

    console.log("Created showcase item for car make/model:", carMakeModel);
  } catch (error) {
    console.error(
      "Error creating showcase item for car make/model:",
      carMakeModel,
      error,
    );
  }
}

function requireAdmin(req, res, next) {
  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;
  if (!username || !password)
    return res
      .status(500)
      .send("Set ADMIN_USERNAME and ADMIN_PASSWORD to access the dashboard.");
  const header = req.headers.authorization || "";
  const [kind, encoded] = header.split(" ");
  const credentials =
    kind === "Basic" && encoded
      ? Buffer.from(encoded, "base64").toString()
      : "";
  const colon = credentials.indexOf(":");
  const suppliedUser = colon >= 0 ? credentials.slice(0, colon) : "";
  const suppliedPassword = colon >= 0 ? credentials.slice(colon + 1) : "";
  if (suppliedUser === username && suppliedPassword === password) return next();
  res.set("WWW-Authenticate", 'Basic realm="Cruise RSVP Admin"');
  res.status(401).send("Authentication required.");
}

app.use(express.json({ limit: "6mb" }));
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/event", async (req, res, next) => {
  try {
    const [showcaseResult, attendanceResult] = await Promise.all([
      pool.query(
        "SELECT id, title, description, image_src FROM car_showcase_items ORDER BY created_at ASC",
      ),
      pool.query(
        "SELECT COUNT(*)::int AS count FROM rsvps WHERE attending = true",
      ),
    ]);
    const attendingCount = attendanceResult.rows[0].count;
    res.json({
      ...event,
      showcaseItems: showcaseResult.rows,
      maxEntries,
      attendingCount,
      isFull: attendingCount >= maxEntries,
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/rsvps", async (req, res, next) => {
  let client;
  try {
    const { attending, fullName, carMakeModel } = req.body;
    if (
      typeof attending !== "boolean" ||
      !String(fullName || "").trim() ||
      !String(carMakeModel || "").trim()
    ) {
      return res
        .status(400)
        .json({ error: "Please complete all RSVP fields." });
    }
    client = await pool.connect();
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(918274)");
    const countResult = await client.query(
      "SELECT COUNT(*)::int AS count FROM rsvps WHERE attending = true",
    );
    if (attending && countResult.rows[0].count >= maxEntries) {
      await client.query("ROLLBACK");
      return res
        .status(409)
        .json({ error: "No more spots are available for this cruise." });
    }
    await client.query(
      "INSERT INTO rsvps (event_title, attending, full_name, car_make_model) VALUES ($1, $2, $3, $4)",
      [
        event.title,
        attending,
        fullName.trim().slice(0, 160),
        carMakeModel.trim().slice(0, 160),
      ],
    );
    await client.query("COMMIT");

    if (attending) {
      // we are intentionally not awaiting this promise to avoid blocking the response.
      createShowcaseItemFromRSVP(carMakeModel).catch((error) => {
        console.error("Error creating showcase item for car make/model:");
      });
    }

    res.status(201).json({
      message: attending
        ? "You are on the list. See you there!"
        : "Thanks for letting us know.",
    });
  } catch (error) {
    if (client) await client.query("ROLLBACK").catch(() => {});
    next(error);
  } finally {
    client?.release();
  }
});

app.get("/admin", requireAdmin, (req, res) =>
  res.sendFile(path.join(__dirname, "public", "admin.html")),
);
app.get("/api/admin/rsvps", requireAdmin, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      "SELECT id, event_title, attending, full_name, car_make_model, created_at FROM rsvps ORDER BY created_at DESC",
    );
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

app.get("/api/admin/showcase-items", requireAdmin, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      "SELECT id, title, description, image_src FROM car_showcase_items ORDER BY created_at ASC",
    );
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

app.post("/api/admin/showcase-items", requireAdmin, async (req, res, next) => {
  try {
    const title = String(req.body.title || "")
      .trim()
      .slice(0, 100);
    const description = String(req.body.description || "")
      .trim()
      .slice(0, 1000);
    const imageSrc = String(req.body.imageSrc || "")
      .trim()
      .slice(0, 5_000_000);
    if (!title || !description || !imageSrc)
      return res
        .status(400)
        .json({ error: "Add a title, description, and image." });
    if (
      !/^https?:\/\//i.test(imageSrc) &&
      !/^data:image\/(png|jpe?g|gif|webp);base64,/i.test(imageSrc)
    )
      return res.status(400).json({
        error: "Use an image URL or upload a PNG, JPG, GIF, or WebP image.",
      });
    const { rows } = await pool.query(
      "INSERT INTO car_showcase_items (title, description, image_src) VALUES ($1, $2, $3) RETURNING id, title, description, image_src",
      [title, description, imageSrc],
    );
    res.status(201).json(rows[0]);
  } catch (error) {
    next(error);
  }
});

app.delete(
  "/api/admin/rsvps/:id",
  requireAdmin,
  async (req, res, next) => {
    try {
      await pool.query("DELETE FROM rsvps WHERE id = $1", [req.params.id]);
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  },
);

app.delete(
  "/api/admin/showcase-items/:id",
  requireAdmin,
  async (req, res, next) => {
    try {
      await pool.query("DELETE FROM car_showcase_items WHERE id = $1", [
        req.params.id,
      ]);
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  },
);

app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).json({ error: "Something went wrong. Please try again." });
});

initializeDatabase()
  .then(() =>
    app.listen(port, () =>
      console.log(`Cruise RSVP listening on port ${port}`),
    ),
  )
  .catch((error) => {
    console.error("Database setup failed", error);
    process.exit(1);
  });
