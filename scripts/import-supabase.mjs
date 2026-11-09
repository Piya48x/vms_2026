import "dotenv/config";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { initializeDatabase, pool } from "../server/database.js";

const sourceUrl = process.env.MIGRATION_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const sourceKey = process.env.MIGRATION_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const uploadDir = path.resolve(process.env.UPLOAD_DIR || "./data/uploads");

if (!sourceUrl || !sourceKey) {
  throw new Error(
    "Set MIGRATION_SUPABASE_URL and MIGRATION_SUPABASE_ANON_KEY in .env before importing"
  );
}

const fields = [
  "id", "created_at", "id_type", "id_number", "full_name", "gender",
  "company", "phone", "contact_person", "purpose", "vehicle_plate",
  "vehicle_type", "chip_serial", "note", "checkin_time", "checkout_time",
  "photo_url", "qr_data", "other_purpose", "consent_given_at",
  "consent_notice_version", "consent_method",
];

function extensionFromResponse(response, url) {
  const type = response.headers.get("content-type") || "";
  if (type.includes("png")) return ".png";
  if (type.includes("webp")) return ".webp";
  const pathname = new URL(url).pathname.toLowerCase();
  if (pathname.endsWith(".png")) return ".png";
  if (pathname.endsWith(".webp")) return ".webp";
  return ".jpg";
}

async function downloadPhoto(visitor) {
  if (!visitor.photo_url) return null;
  try {
    const response = await fetch(visitor.photo_url, {
      headers: { apikey: sourceKey, Authorization: `Bearer ${sourceKey}` },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const extension = extensionFromResponse(response, visitor.photo_url);
    const filename = `imported_${visitor.id}_${crypto.createHash("sha1").update(visitor.photo_url).digest("hex").slice(0, 10)}${extension}`;
    const destination = path.join(uploadDir, filename);
    await fs.mkdir(uploadDir, { recursive: true });
    try {
      await fs.access(destination);
    } catch {
      await fs.writeFile(destination, Buffer.from(await response.arrayBuffer()), { flag: "wx" });
    }
    return `/api/photos/${filename}`;
  } catch (error) {
    console.warn(`Photo import failed for visitor ${visitor.id}: ${error.message}`);
    return visitor.photo_url;
  }
}

async function fetchPage(offset) {
  const url = new URL(`${sourceUrl.replace(/\/$/, "")}/rest/v1/visitors`);
  url.searchParams.set("select", "*");
  url.searchParams.set("order", "id.asc");
  url.searchParams.set("offset", String(offset));
  url.searchParams.set("limit", "500");
  const response = await fetch(url, {
    headers: { apikey: sourceKey, Authorization: `Bearer ${sourceKey}` },
  });
  if (!response.ok) throw new Error(`Supabase REST HTTP ${response.status}: ${await response.text()}`);
  return response.json();
}

async function upsertVisitor(visitor) {
  const localPhotoUrl = await downloadPhoto(visitor);
  const values = fields.map((field) =>
    field === "photo_url" ? localPhotoUrl : (visitor[field] ?? null)
  );
  const placeholders = fields.map((_, index) => `$${index + 1}`);
  const updates = fields
    .filter((field) => field !== "id")
    .map((field) => `${field} = excluded.${field}`);
  await pool.query(
    `insert into visitors (${fields.join(", ")}) values (${placeholders.join(", ")})
     on conflict (id) do update set ${updates.join(", ")}`,
    values
  );
}

await initializeDatabase();
let imported = 0;
try {
  for (let offset = 0; ; offset += 500) {
    const page = await fetchPage(offset);
    for (const visitor of page) {
      await upsertVisitor(visitor);
      imported += 1;
      if (imported % 100 === 0) console.log(`Imported ${imported} visitors...`);
    }
    if (page.length < 500) break;
  }
  await pool.query(`
    select setval(
      pg_get_serial_sequence('visitors', 'id'),
      greatest(coalesce((select max(id) from visitors), 1), 1),
      true
    )
  `);
  console.log(`Import complete: ${imported} visitors`);
} finally {
  await pool.end();
}
