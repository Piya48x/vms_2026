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
    let baselineId = null;
    let realtimeChannel = null;
    let realtimeReady = false;
    let fallbackTimer = null;
    const seenVisitorIds = new Set();
    const startedAt = Date.now();

    const emitInsert = (row) => {
      const rowId = Number(row?.id);
      if (!Number.isFinite(rowId)) return;

      const key = String(rowId);
      if (seenVisitorIds.has(key)) return;
      seenVisitorIds.add(key);
      callback({ eventType: "INSERT", new: row });
    };

    const pollForNewVisitors = async () => {
      if (stopped || polling) return;
      polling = true;

      try {
        const rows = await reportRequest("latest", { limit: 25 });
        if (stopped) return;

        const orderedRows = (rows || [])
          .filter((row) => Number.isFinite(Number(row.id)))
          .sort((left, right) => Number(left.id) - Number(right.id));
        const newestId = orderedRows.length
          ? Number(orderedRows[orderedRows.length - 1].id)
          : 0;

        if (baselineId === null) {
          // Do not print old records when the report is first opened. A record
          // created while this first request was in flight is still considered new.
          baselineId = newestId;
          orderedRows.forEach((row) => {
            if (new Date(row.created_at).getTime() >= startedAt) {
              emitInsert(row);
            } else {
              seenVisitorIds.add(String(Number(row.id)));
            }
          });
          return;
        }

        const insertedRows = orderedRows.filter(
          (row) =>
            Number(row.id) > baselineId &&
            !seenVisitorIds.has(String(Number(row.id)))
        );
        insertedRows.forEach(emitInsert);
        if (newestId > baselineId) baselineId = newestId;
      } catch (error) {
        console.warn("Unable to check for new visitors", error);
      } finally {
        polling = false;
      }
    };

    const scheduleFallback = () => {
      if (stopped) return;
      const delay = realtimeReady ? 15000 : 1500;
      fallbackTimer = window.setTimeout(async () => {
        await pollForNewVisitors();
        scheduleFallback();
      }, delay);
    };

    const connectRealtime = async () => {
      try {
        await supabase.realtime.setAuth();
        if (stopped) return;

        realtimeChannel = supabase
          .channel("vms-report", { config: { private: true } })
          .on(
            "broadcast",
            { event: "visitor_insert" },
            (message) => emitInsert(message?.payload || message)
          )
          .subscribe((status) => {
            realtimeReady = status === "SUBSCRIBED";
            if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
              console.warn("Realtime visitor notifications unavailable; using fallback polling");
            }
          });
      } catch (error) {
        realtimeReady = false;
        console.warn("Unable to connect visitor Realtime channel", error);
      }
    };

    pollForNewVisitors().finally(() => {
      if (stopped) return;
      connectRealtime();
      scheduleFallback();
    });
    const refreshTimer = setInterval(
      () => callback({ eventType: "REFRESH" }),
      30000
    );

    return () => {
      stopped = true;
      if (fallbackTimer) clearTimeout(fallbackTimer);
      clearInterval(refreshTimer);
      if (realtimeChannel) supabase.removeChannel(realtimeChannel);
    };
  },
};
