import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { initializeDatabase, pool } from "../server/database.js";

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey =
  process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const bucket = process.env.SUPABASE_STORAGE_BUCKET || "visitor-photos";
const uploadDir = path.resolve(process.env.UPLOAD_DIR || "./data/uploads");
const watch = process.argv.includes("--watch");
const intervalMs = Math.max(15, Number(process.env.CLOUD_SYNC_INTERVAL_SECONDS || 60)) * 1000;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SECRET_KEY in .env");
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const fields = [
  "created_at",
  "id_type",
  "id_number",
  "full_name",
  "gender",
  "company",
  "phone",
  "contact_person",
  "purpose",
  "vehicle_plate",
  "vehicle_type",
  "chip_serial",
  "note",
  "checkin_time",
  "checkout_time",
  "qr_data",
  "other_purpose",
  "consent_given_at",
  "consent_notice_version",
  "consent_method",
];

function safeFilename(value) {
  return path.basename(String(value)).replace(/[^a-zA-Z0-9._-]/g, "_");
}

async function readState() {
  const { rows } = await pool.query("select value from app_settings where key = 'cloud_sync_state'");
  return rows[0]?.value || {};
}

async function writeState(value) {
  await pool.query(
    `insert into app_settings (key, value, updated_at)
     values ('cloud_sync_state', $1::jsonb, now())
     on conflict (key) do update set value = excluded.value, updated_at = now()`,
    [JSON.stringify(value)]
  );
}

async function fetchChangedVisitors(since) {
  const rows = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("visitors")
      .select("*")
      .gte("updated_at", since)
      .order("updated_at", { ascending: true })
      .order("id", { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < pageSize) break;
  }
  return rows;
}

async function downloadPhoto(visitor, existing) {
  if (!visitor.photo_url) return existing?.photo_url || null;
  const filename = `cloud_${visitor.id}_${safeFilename(visitor.photo_url)}`;
  const target = path.join(uploadDir, filename);

  if (existing?.cloud_photo_path === visitor.photo_url) {
    try {
      await fs.access(target);
      return `/api/photos/${filename}`;
    } catch {
      // Download again when the local file is missing.
    }
  }

  const { data, error } = await supabase.storage.from(bucket).download(visitor.photo_url);
  if (error) throw error;
  await fs.mkdir(uploadDir, { recursive: true });
  await fs.writeFile(target, Buffer.from(await data.arrayBuffer()));
  return `/api/photos/${filename}`;
}

async function upsertVisitor(visitor) {
  const existingResult = await pool.query(
    "select photo_url, cloud_photo_path from visitors where cloud_id = $1",
    [visitor.id]
  );
  const existing = existingResult.rows[0];
  let photoUrl = existing?.photo_url || null;
  let archiveReady = true;

  try {
    photoUrl = await downloadPhoto(visitor, existing);
  } catch (error) {
    archiveReady = false;
    console.warn(`Photo sync failed for visitor ${visitor.id}: ${error.message}`);
  }

  const columns = [
    ...fields,
    "photo_url",
    "cloud_id",
    "cloud_updated_at",
    "cloud_deleted_at",
    "cloud_photo_path",
    "cloud_synced_at",
  ];
  const values = [
    ...fields.map((field) => visitor[field] ?? null),
    photoUrl,
    visitor.id,
    visitor.updated_at,
    visitor.deleted_at,
    visitor.photo_url,
    new Date().toISOString(),
  ];
  const placeholders = values.map((_, index) => `$${index + 1}`);
  const updates = columns
    .filter((column) => column !== "cloud_id")
    .map((column) => `${column} = excluded.${column}`);

  await pool.query(
    `insert into visitors (${columns.join(", ")})
     values (${placeholders.join(", ")})
     on conflict (cloud_id) do update set ${updates.join(", ")}`,
    values
  );

  return archiveReady;
}

async function acknowledgeLocalArchive(visitor) {
  const { error } = await supabase.rpc("acknowledge_local_archive", {
    archive_visitor_id: visitor.id,
    archive_source_updated_at: visitor.updated_at,
  });

  if (!error) return true;

  // Keep the database sync running before the archive-retention migration is
  // installed. The row will be retried and acknowledged after migration.
  if (error.code === "PGRST202" || error.code === "42883") {
    console.warn("Archive receipt RPC is not installed yet; cleanup remains disabled.");
    return false;
  }

  throw error;
}

let running = false;
async function syncOnce() {
  if (running) return;
  running = true;
  try {
    const state = await readState();
    const previous = state.lastUpdatedAt
      ? new Date(new Date(state.lastUpdatedAt).getTime() - 5000).toISOString()
      : "1970-01-01T00:00:00.000Z";
    const visitors = await fetchChangedVisitors(previous);
    let retryFrom = null;
    let archiveCount = 0;

    for (const visitor of visitors) {
      const archiveReady = await upsertVisitor(visitor);
      const acknowledged = archiveReady
        ? await acknowledgeLocalArchive(visitor)
        : false;

      if (acknowledged) {
        archiveCount += 1;
      } else if (!retryFrom || visitor.updated_at < retryFrom) {
        retryFrom = visitor.updated_at;
      }
    }

    const latest = visitors.reduce(
      (value, visitor) => (!value || visitor.updated_at > value ? visitor.updated_at : value),
      state.lastUpdatedAt || null
    );
    await writeState({
      lastUpdatedAt: retryFrom || latest,
      lastRunAt: new Date().toISOString(),
      lastCount: visitors.length,
      lastArchiveCount: archiveCount,
      retryFrom,
    });
    console.log(
      `[cloud-sync] ${visitors.length} row(s) synchronized, ${archiveCount} archive receipt(s) confirmed at ${new Date().toLocaleString("th-TH")}`
    );
  } finally {
    running = false;
  }
}

await initializeDatabase();
await syncOnce();

if (watch) {
  console.log(`[cloud-sync] watching every ${intervalMs / 1000} seconds`);
  const timer = setInterval(() => {
    syncOnce().catch((error) => console.error("[cloud-sync] failed", error));
  }, intervalMs);

  const shutdown = async () => {
    clearInterval(timer);
    await pool.end();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
} else {
  await pool.end();
}
