import { createClient } from "@supabase/supabase-js";

const supabaseUrl = String(import.meta.env.VITE_SUPABASE_URL || "").replace(/\/$/, "");
const supabaseKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  "";
const supabase = createClient(
  supabaseUrl || "https://missing-project.supabase.co",
  supabaseKey || "missing-publishable-key",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);

const reportPinBridgeKey = "vms-report-pin-bridge";
let reportPin = typeof window === "undefined"
  ? ""
  : window.sessionStorage.getItem(reportPinBridgeKey) || "";

if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", () => {
    window.sessionStorage.removeItem(reportPinBridgeKey);
  });
}

function requireConfiguration() {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error("ยังไม่ได้ตั้งค่า VITE_SUPABASE_URL และ VITE_SUPABASE_PUBLISHABLE_KEY");
  }
}

async function reportRequest(action, payload = {}, pin = reportPin) {
  requireConfiguration();
  if (!pin) {
    const error = new Error("กรุณาใส่ PIN");
    error.status = 401;
    throw error;
  }

  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (!accessToken) {
    const error = new Error("กรุณาเข้าสู่ระบบ");
    error.status = 401;
    throw error;
  }

  const response = await fetch(`${supabaseUrl}/functions/v1/report-api`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: supabaseKey,
      Authorization: `Bearer ${accessToken}`,
      "x-admin-pin": pin,
    },
    body: JSON.stringify({ action, payload }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(body.error || `HTTP ${response.status}`);
    error.status = response.status;
    throw error;
  }
  return body;
}

export const supabaseAdminApi = {
  async me() {
    requireConfiguration();
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;
    if (!data.user) throw new Error("กรุณาเข้าสู่ระบบ");
    return { username: data.user.email, user: data.user };
  },
  async login(email, password) {
    requireConfiguration();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return { username: data.user?.email, user: data.user };
  },
  async verifyPin(pin) {
    await reportRequest("me", {}, pin);
    reportPin = pin;
    window.sessionStorage.setItem(reportPinBridgeKey, pin);
    return { ok: true };
  },
  async logout() {
    reportPin = "";
    window.sessionStorage.removeItem(reportPinBridgeKey);
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },
};

export const supabaseVisitorsApi = {
  list: (params = {}) => reportRequest("list", { params }),
  summary: () => reportRequest("summary"),
  suggestions: (query, limit = 12) =>
    reportRequest("suggestions", { query, limit }),
  get: (id) => reportRequest("get", { id }),

  async create(visitor, photo) {
    requireConfiguration();
    const form = new FormData();
    form.append("visitor", JSON.stringify(visitor));
    if (photo) form.append("photo", photo, "visitor.jpg");

    const response = await fetch(`${supabaseUrl}/functions/v1/register-visitor`, {
      method: "POST",
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
      },
      body: form,
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || `HTTP ${response.status}`);
    return body;
  },

  update: (id, values) => reportRequest("update", { id, values }),
  remove: (id) => reportRequest("remove", { id }),
  removeMany: (ids) => reportRequest("removeMany", { ids }),

  subscribe(callback) {
    let stopped = false;
    let polling = false;
    let latestSeenId = null;
    const startedAt = Date.now();

    const pollForNewVisitors = async () => {
      if (stopped || polling) return;
      polling = true;

      try {
        const rows = await reportRequest("list", {
          params: { orderBy: "id", order: "desc", limit: 25 },
        });
        if (stopped) return;

        const orderedRows = (rows || [])
          .filter((row) => Number.isFinite(Number(row.id)))
          .sort((left, right) => Number(left.id) - Number(right.id));
        const newestId = orderedRows.length
          ? Number(orderedRows[orderedRows.length - 1].id)
          : 0;

        if (latestSeenId === null) {
          latestSeenId = newestId;

          // Do not print old records when the report is first opened. A record
          // created while this first request was in flight is still considered new.
          orderedRows
            .filter((row) => new Date(row.created_at).getTime() >= startedAt)
            .forEach((row) => callback({ eventType: "INSERT", new: row }));
          return;
        }

        const insertedRows = orderedRows.filter(
          (row) => Number(row.id) > latestSeenId
        );
        if (newestId > latestSeenId) latestSeenId = newestId;

        insertedRows.forEach((row) =>
          callback({ eventType: "INSERT", new: row })
        );
      } catch (error) {
        console.warn("Unable to check for new visitors", error);
      } finally {
        polling = false;
      }
    };

    pollForNewVisitors();
    const insertTimer = setInterval(pollForNewVisitors, 5000);
    const refreshTimer = setInterval(
      () => callback({ eventType: "REFRESH" }),
      30000
    );

    return () => {
      stopped = true;
      clearInterval(insertTimer);
      clearInterval(refreshTimer);
    };
  },
};
