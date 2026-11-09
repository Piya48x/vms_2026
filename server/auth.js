import crypto from "node:crypto";

const COOKIE_NAME = "vms_admin";
const sessionHours = Math.max(1, Number(process.env.SESSION_HOURS || 12));
const secret =
  process.env.SESSION_SECRET ||
  "development-only-secret-change-before-production";

const encode = (value) => Buffer.from(value).toString("base64url");
const sign = (value) =>
  crypto.createHmac("sha256", secret).update(value).digest("base64url");

function safeEqual(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function parseCookies(header = "") {
  return Object.fromEntries(
    header
      .split(";")
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => {
        const index = item.indexOf("=");
        return [
          decodeURIComponent(index >= 0 ? item.slice(0, index) : item),
          decodeURIComponent(index >= 0 ? item.slice(index + 1) : ""),
        ];
      })
  );
}

function createToken(username) {
  const payload = encode(
    JSON.stringify({ username, expiresAt: Date.now() + sessionHours * 3_600_000 })
  );
  return `${payload}.${sign(payload)}`;
}

export function verifyToken(token) {
  if (!token || !token.includes(".")) return null;
  const [payload, signature] = token.split(".");
  if (!safeEqual(signature, sign(payload))) return null;

  try {
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return decoded.expiresAt > Date.now() ? decoded : null;
  } catch {
    return null;
  }
}

export function userFromCookieHeader(header) {
  return verifyToken(parseCookies(header)[COOKIE_NAME]);
}

export function requireAdmin(req, res, next) {
  const user = userFromCookieHeader(req.headers.cookie);
  if (!user) return res.status(401).json({ error: "กรุณาเข้าสู่ระบบ" });
  req.admin = user;
  return next();
}

export function login(req, res) {
  const expectedUsername = process.env.ADMIN_USERNAME || "admin";
  const expectedPassword = process.env.ADMIN_PASSWORD || "change-this-admin-password";
  const { username = "", password = "" } = req.body || {};

  if (!safeEqual(username, expectedUsername) || !safeEqual(password, expectedPassword)) {
    return res.status(401).json({ error: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" });
  }

  const secure = String(process.env.COOKIE_SECURE).toLowerCase() === "true";
  const parts = [
    `${COOKIE_NAME}=${encodeURIComponent(createToken(username))}`,
    "HttpOnly",
    "SameSite=Strict",
    "Path=/",
    `Max-Age=${sessionHours * 3600}`,
  ];
  if (secure) parts.push("Secure");
  res.setHeader("Set-Cookie", parts.join("; "));
  return res.json({ username });
}

export function logout(_req, res) {
  res.setHeader(
    "Set-Cookie",
    `${COOKIE_NAME}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0`
  );
  return res.status(204).end();
}
