import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { Router } from "express";
import multer from "multer";
import { pool } from "./database.js";
import { requireAdmin } from "./auth.js";

const router = Router();
const uploadDir = path.resolve(process.env.UPLOAD_DIR || "./data/uploads");
const maxUploadBytes = Math.max(1, Number(process.env.MAX_UPLOAD_MB || 8)) * 1024 * 1024;
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: maxUploadBytes, files: 1 },
  fileFilter: (_req, file, callback) => {
    callback(null, ["image/jpeg", "image/png", "image/webp"].includes(file.mimetype));
  },
});

const insertFields = [
  "id_type", "id_number", "full_name", "gender", "company", "phone",
  "contact_person", "purpose", "vehicle_plate", "vehicle_type", "chip_serial",
  "note", "checkin_time", "checkout_time", "qr_data", "other_purpose",
  "consent_given_at", "consent_notice_version", "consent_method",
];
const updateFields = [...insertFields, "photo_url"];

function parseVisitorBody(req) {
  if (req.body?.visitor) return JSON.parse(req.body.visitor);
  return req.body || {};
}

function sqlAssignments(input, allowedFields, offset = 1) {
  const entries = allowedFields
    .filter((field) => Object.prototype.hasOwnProperty.call(input, field))
    .map((field) => [field, input[field] === "" ? null : input[field]]);
  return {
    entries,
    columns: entries.map(([field]) => field),
    values: entries.map(([, value]) => value),
    placeholders: entries.map((_, index) => `$${index + offset}`),
  };
}

function extensionFor(mime) {
  if (mime === "image/png") return ".png";
  if (mime === "image/webp") return ".webp";
  return ".jpg";
}

function localPhotoPath(photoUrl) {
  if (!photoUrl?.startsWith("/api/photos/")) return null;
  const filename = path.basename(photoUrl);
  return path.join(uploadDir, filename);
}

async function removePhoto(photoUrl) {
  const photoPath = localPhotoPath(photoUrl);
  if (!photoPath) return;
  await fs.rm(photoPath, { force: true }).catch(() => undefined);
}

function emitChange(req, eventType, current, previous = null) {
  req.app.get("io").emit("visitors:change", {
    eventType,
    new: current,
    old: previous,
  });
}

router.get("/summary", requireAdmin, async (_req, res, next) => {
  try {
    const { rows } = await pool.query(`
      select
        count(*) filter (where cloud_deleted_at is null
          and checkin_time >= date_trunc('day', now() at time zone 'Asia/Bangkok') at time zone 'Asia/Bangkok'
          and checkin_time < (date_trunc('day', now() at time zone 'Asia/Bangkok') + interval '1 day') at time zone 'Asia/Bangkok')::int as today,
        count(*) filter (where cloud_deleted_at is null and checkout_time is null)::int as staying,
        count(*) filter (where cloud_deleted_at is null
          and checkout_time >= date_trunc('day', now() at time zone 'Asia/Bangkok') at time zone 'Asia/Bangkok'
          and checkout_time < (date_trunc('day', now() at time zone 'Asia/Bangkok') + interval '1 day') at time zone 'Asia/Bangkok')::int as "outToday",
        count(*) filter (where cloud_deleted_at is null)::int as all
      from visitors
    `);
    res.json(rows[0]);
  } catch (error) {
    next(error);
  }
});

router.get("/suggestions", requireAdmin, async (req, res, next) => {
  try {
    const query = String(req.query.q || "").trim();
    if (query.length < 2) return res.json([]);
    const limit = Math.min(20, Math.max(1, Number(req.query.limit || 12)));
    const { rows } = await pool.query(
      `select id, full_name, company, contact_person, phone
       from visitors
       where cloud_deleted_at is null
         and concat_ws(' ', full_name, company, contact_person, phone) ilike $1
       order by id desc limit $2`,
      [`%${query}%`, limit]
    );
    return res.json(rows);
  } catch (error) {
    return next(error);
  }
});

router.get("/", requireAdmin, async (req, res, next) => {
  try {
    const conditions = ["cloud_deleted_at is null"];
    const values = [];
    const add = (sql, value) => {
      values.push(value);
      conditions.push(sql.replace("?", `$${values.length}`));
    };
    const filter = String(req.query.filter || "ALL").toUpperCase();

    if (filter === "TODAY") {
      conditions.push("checkin_time >= date_trunc('day', now() at time zone 'Asia/Bangkok') at time zone 'Asia/Bangkok'");
      conditions.push("checkin_time < (date_trunc('day', now() at time zone 'Asia/Bangkok') + interval '1 day') at time zone 'Asia/Bangkok'");
    } else if (filter === "STAYING" || req.query.staying === "true") {
      conditions.push("checkout_time is null");
    } else if (filter === "CHECKOUT_TODAY") {
      conditions.push("checkout_time >= date_trunc('day', now() at time zone 'Asia/Bangkok') at time zone 'Asia/Bangkok'");
      conditions.push("checkout_time < (date_trunc('day', now() at time zone 'Asia/Bangkok') + interval '1 day') at time zone 'Asia/Bangkok'");
    }
    if (req.query.start) add("checkin_time >= ?", req.query.start);
    if (req.query.end) add("checkin_time <= ?", req.query.end);
    if (req.query.search) {
      add("concat_ws(' ', full_name, company, contact_person, phone) ilike ?", `%${String(req.query.search).trim()}%`);
    }

    const allowedOrders = new Set(["id", "checkin_time", "checkout_time", "full_name"]);
    const orderColumn = allowedOrders.has(req.query.orderBy) ? req.query.orderBy : "id";
    const orderDirection = String(req.query.order || "desc").toLowerCase() === "asc" ? "asc" : "desc";
    const limit = Math.min(10_000, Math.max(1, Number(req.query.limit || 10_000)));
    values.push(limit);

    const where = conditions.length ? `where ${conditions.join(" and ")}` : "";
    const { rows } = await pool.query(
      `select * from visitors ${where} order by ${orderColumn} ${orderDirection} limit $${values.length}`,
      values
    );
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

router.get("/:id", requireAdmin, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      "select * from visitors where id = $1 and cloud_deleted_at is null",
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: "ไม่พบข้อมูลผู้มาติดต่อ" });
    return res.json(rows[0]);
  } catch (error) {
    return next(error);
  }
});

router.post("/", upload.single("photo"), async (req, res, next) => {
  let savedPhotoPath;
  const client = await pool.connect();
  try {
    const visitor = parseVisitorBody(req);
    if (!String(visitor.full_name || "").trim()) {
      return res.status(400).json({ error: "กรุณาระบุชื่อผู้มาติดต่อ" });
    }

    const prepared = sqlAssignments(visitor, insertFields);
    await client.query("begin");
    const insertResult = await client.query(
      `insert into visitors (${prepared.columns.join(", ")})
       values (${prepared.placeholders.join(", ")}) returning *`,
      prepared.values
    );
    let current = insertResult.rows[0];

    if (req.file) {
      await fs.mkdir(uploadDir, { recursive: true });
      const filename = `visitor_${current.id}_${Date.now()}_${crypto.randomUUID()}${extensionFor(req.file.mimetype)}`;
      savedPhotoPath = path.join(uploadDir, filename);
      await fs.writeFile(savedPhotoPath, req.file.buffer, { flag: "wx" });
      const photoUrl = `/api/photos/${filename}`;
      const updateResult = await client.query(
        "update visitors set photo_url = $1 where id = $2 returning *",
        [photoUrl, current.id]
      );
      current = updateResult.rows[0];
    }

    await client.query("commit");
    emitChange(req, "INSERT", current);
    return res.status(201).json(current);
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    if (savedPhotoPath) await fs.rm(savedPhotoPath, { force: true }).catch(() => undefined);
    return next(error);
  } finally {
    client.release();
  }
});

router.patch("/:id", requireAdmin, async (req, res, next) => {
  try {
    const existing = await pool.query("select * from visitors where id = $1", [req.params.id]);
    if (!existing.rows[0]) return res.status(404).json({ error: "ไม่พบข้อมูลผู้มาติดต่อ" });
    const prepared = sqlAssignments(req.body || {}, updateFields);
    if (!prepared.entries.length) return res.status(400).json({ error: "ไม่มีข้อมูลที่ต้องแก้ไข" });
    const setters = prepared.columns.map((column, index) => `${column} = $${index + 1}`);
    const { rows } = await pool.query(
      `update visitors set ${setters.join(", ")} where id = $${prepared.values.length + 1} returning *`,
      [...prepared.values, req.params.id]
    );
    emitChange(req, "UPDATE", rows[0], existing.rows[0]);
    return res.json(rows[0]);
  } catch (error) {
    return next(error);
  }
});

router.post("/bulk-delete", requireAdmin, async (req, res, next) => {
  try {
    const ids = Array.isArray(req.body?.ids) ? req.body.ids : [];
    if (!ids.length || ids.some((id) => !/^\d+$/.test(String(id)))) {
      return res.status(400).json({ error: "รายการที่จะลบไม่ถูกต้อง" });
    }
    const { rows } = await pool.query(
      "delete from visitors where id = any($1::bigint[]) returning *",
      [ids]
    );
    await Promise.all(rows.map((row) => removePhoto(row.photo_url)));
    rows.forEach((row) => emitChange(req, "DELETE", null, row));
    return res.json({ deleted: rows.length });
  } catch (error) {
    return next(error);
  }
});

router.delete("/:id", requireAdmin, async (req, res, next) => {
  try {
    const { rows } = await pool.query("delete from visitors where id = $1 returning *", [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: "ไม่พบข้อมูลผู้มาติดต่อ" });
    await removePhoto(rows[0].photo_url);
    emitChange(req, "DELETE", null, rows[0]);
    return res.status(204).end();
  } catch (error) {
    return next(error);
  }
});

export async function sendProtectedPhoto(req, res, next) {
  try {
    const filename = path.basename(req.params.filename);
    const photoPath = path.join(uploadDir, filename);
    await fs.access(photoPath);
    return res.sendFile(photoPath);
  } catch (error) {
    if (error.code === "ENOENT") return res.status(404).end();
    return next(error);
  }
}

export async function runRetentionCleanup() {
  const retentionDays = Number(process.env.RETENTION_DAYS || 0);
  if (!Number.isFinite(retentionDays) || retentionDays <= 0) return { deleted: 0 };
  const { rows } = await pool.query(
    "delete from visitors where checkin_time < now() - ($1 * interval '1 day') returning photo_url",
    [retentionDays]
  );
  await Promise.all(rows.map((row) => removePhoto(row.photo_url)));
  return { deleted: rows.length };
}

export default router;
