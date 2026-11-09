import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import http from "node:http";
import express from "express";
import helmet from "helmet";
import { Server } from "socket.io";
import { initializeDatabase, pool } from "./database.js";
import { login, logout, requireAdmin, userFromCookieHeader } from "./auth.js";
import visitorsRouter, { runRetentionCleanup, sendProtectedPhoto } from "./visitors.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const server = http.createServer(app);
const io = new Server(server, { serveClient: false });
const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || "0.0.0.0";

app.set("io", io);
app.set("trust proxy", 1);
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "same-origin" },
    contentSecurityPolicy: {
      directives: {
        "img-src": ["'self'", "data:", "blob:"],
        "connect-src": ["'self'", "ws:", "wss:"],
      },
    },
  })
);
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", async (_req, res, next) => {
  try {
    await pool.query("select 1");
    res.json({ status: "ok", database: "connected" });
  } catch (error) {
    next(error);
  }
});
app.post("/api/auth/login", login);
app.post("/api/auth/logout", logout);
app.get("/api/auth/me", requireAdmin, (req, res) => res.json({ username: req.admin.username }));
app.get("/api/photos/:filename", requireAdmin, sendProtectedPhoto);
app.use("/api/visitors", visitorsRouter);

io.use((socket, next) => {
  const user = userFromCookieHeader(socket.request.headers.cookie);
  if (!user) return next(new Error("unauthorized"));
  socket.admin = user;
  return next();
});

const distPath = path.resolve(__dirname, "../dist");
try {
  await fs.access(distPath);
  app.use(express.static(distPath));
  app.get(/^(?!\/api|\/socket\.io).*/, (_req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
} catch {
  console.log("dist/ not found; API-only development mode");
}

app.use((error, _req, res, _next) => {
  console.error(error);
  if (error?.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({ error: "ไฟล์รูปมีขนาดใหญ่เกินกำหนด" });
  }
  return res.status(500).json({ error: "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์" });
});

await initializeDatabase();
const cleanup = await runRetentionCleanup();
if (cleanup.deleted) console.log(`Retention cleanup deleted ${cleanup.deleted} visitors`);
setInterval(() => {
  runRetentionCleanup().catch((error) => console.error("Retention cleanup failed", error));
}, 24 * 60 * 60 * 1000).unref();

server.listen(port, host, () => {
  console.log(`VMS server listening on http://${host}:${port}`);
});

async function shutdown(signal) {
  console.log(`${signal} received, shutting down`);
  io.close();
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
}
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
