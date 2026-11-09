import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const { Pool } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const connection = process.env.DATABASE_URL
  ? { connectionString: process.env.DATABASE_URL }
  : {
      host: process.env.PGHOST || "localhost",
      port: Number(process.env.PGPORT || 5432),
      database: process.env.PGDATABASE || process.env.POSTGRES_DB || "vms",
      user: process.env.PGUSER || process.env.POSTGRES_USER || "vms",
      password:
        process.env.PGPASSWORD ||
        process.env.POSTGRES_PASSWORD ||
        "vms_change_this_password",
    };

export const pool = new Pool({
  ...connection,
  max: Number(process.env.DB_POOL_SIZE || 10),
  idleTimeoutMillis: 30_000,
});

pool.on("error", (error) => {
  console.error("Unexpected PostgreSQL pool error", error);
});

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function initializeDatabase() {
  const schemaPath = path.resolve(__dirname, "../database/schema.sql");
  const schema = await fs.readFile(schemaPath, "utf8");
  let lastError;

  for (let attempt = 1; attempt <= 30; attempt += 1) {
    try {
      await pool.query(schema);
      await pool.query("select 1");
      console.log("PostgreSQL is ready");
      return;
    } catch (error) {
      lastError = error;
      console.log(`Waiting for PostgreSQL (${attempt}/30)...`);
      await wait(2_000);
    }
  }

  throw lastError;
}
