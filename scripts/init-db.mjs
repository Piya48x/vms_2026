import "dotenv/config";
import { initializeDatabase, pool } from "../server/database.js";

try {
  await initializeDatabase();
  console.log("Database schema initialized successfully");
} finally {
  await pool.end();
}
