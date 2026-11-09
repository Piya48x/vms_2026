import { createClient } from "@supabase/supabase-js";

const supabaseUrl = String(import.meta.env.VITE_SUPABASE_URL || "").replace(/\/$/, "");
const supabaseKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  "";
const photoBucket = import.meta.env.VITE_SUPABASE_PHOTO_BUCKET || "visitor-photos";

export const supabase = createClient(
  supabaseUrl || "https://missing-project.supabase.co",
  supabaseKey || "missing-anon-key",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);

function requireConfiguration() {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error("ยังไม่ได้ตั้งค่า VITE_SUPABASE_URL และ VITE_SUPABASE_PUBLISHABLE_KEY");
  }
}

function throwIfError(error) {
  if (error) throw error;
}

const bangkokDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Bangkok",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function bangkokDate(date = new Date()) {
  return bangkokDateFormatter.format(date);
}

function addBangkokDays(dateText, days) {
  const date = new Date(`${dateText}T12:00:00+07:00`);
  date.setUTCDate(date.getUTCDate() + days);
  return bangkokDate(date);
}

function dayRange(column, dateText = bangkokDate()) {
  return {
    column,
    start: `${dateText}T00:00:00+07:00`,
    end: `${addBangkokDays(dateText, 1)}T00:00:00+07:00`,
  };
}

function cleanSearch(value) {
  return String(value || "")
    .replace(/[,%()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isStoragePath(value) {
  return Boolean(value) && !/^(https?:|data:|blob:|\/)/i.test(value);
}

async function hydratePhotos(rows) {
  const paths = [...new Set(rows.map((row) => row.photo_url).filter(isStoragePath))];
  if (!paths.length) return rows;

  const { data, error } = await supabase.storage.from(photoBucket).createSignedUrls(paths, 60 * 60);
  if (error) {
    console.warn("Unable to create photo links", error.message);
    return rows;
  }

  const urls = new Map((data || []).map((item) => [item.path, item.signedUrl]));
  return rows.map((row) => ({
    ...row,
    photo_storage_path: isStoragePath(row.photo_url) ? row.photo_url : null,
    photo_url: urls.get(row.photo_url) || row.photo_url,
  }));
}

function buildListQuery(params = {}) {
  let query = supabase.from("visitors").select("*").is("deleted_at", null);
  const filter = String(params.filter || "ALL").toUpperCase();

  if (filter === "TODAY") {
    const range = dayRange("checkin_time");
    query = query.gte(range.column, range.start).lt(range.column, range.end);
  } else if (filter === "STAYING" || params.staying === true || params.staying === "true") {
    query = query.is("checkout_time", null);
  } else if (filter === "CHECKOUT_TODAY") {
    const range = dayRange("checkout_time");
    query = query.gte(range.column, range.start).lt(range.column, range.end);
  }

  if (params.start) query = query.gte("checkin_time", params.start);
  if (params.end) query = query.lte("checkin_time", params.end);

  const search = cleanSearch(params.search);
  if (search) {
    query = query.or(
      `full_name.ilike.%${search}%,company.ilike.%${search}%,contact_person.ilike.%${search}%,phone.ilike.%${search}%`
    );
  }

  const allowedOrders = new Set(["id", "checkin_time", "checkout_time", "full_name"]);
  const orderBy = allowedOrders.has(params.orderBy) ? params.orderBy : "id";
  const ascending = String(params.order || "desc").toLowerCase() === "asc";
  const limit = Math.min(10_000, Math.max(1, Number(params.limit || 10_000)));
  return query.order(orderBy, { ascending, nullsFirst: false }).limit(limit);
}

export const supabaseAdminApi = {
  async me() {
    requireConfiguration();
    const { data, error } = await supabase.auth.getUser();
    throwIfError(error);
    if (!data.user) throw new Error("กรุณาเข้าสู่ระบบ");
    return { username: data.user.email, user: data.user };
  },
  async login(email, password) {
    requireConfiguration();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    throwIfError(error);
    return { username: data.user?.email, user: data.user };
  },
  async logout() {
    const { error } = await supabase.auth.signOut();
    throwIfError(error);
  },
};

export const supabaseVisitorsApi = {
  async list(params = {}) {
    requireConfiguration();
    const { data, error } = await buildListQuery(params);
    throwIfError(error);
    return hydratePhotos(data || []);
  },

  async summary() {
    requireConfiguration();
    const { data, error } = await supabase.rpc("get_visitor_summary");
    throwIfError(error);
    const value = Array.isArray(data) ? data[0] : data;
    return value || { today: 0, staying: 0, outToday: 0, all: 0 };
  },

  async suggestions(query, limit = 12) {
    requireConfiguration();
    const search = cleanSearch(query);
    if (search.length < 2) return [];
    const { data, error } = await supabase
      .from("visitors")
      .select("id,full_name,company,contact_person,phone")
      .is("deleted_at", null)
      .or(`full_name.ilike.%${search}%,company.ilike.%${search}%,contact_person.ilike.%${search}%,phone.ilike.%${search}%`)
      .order("id", { ascending: false })
      .limit(Math.min(20, Math.max(1, Number(limit || 12))));
    throwIfError(error);
    return data || [];
  },

  async get(id) {
    requireConfiguration();
    const { data, error } = await supabase
      .from("visitors")
      .select("*")
      .eq("id", id)
      .is("deleted_at", null)
      .single();
    throwIfError(error);
    const [visitor] = await hydratePhotos([data]);
    return visitor;
  },

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

  async update(id, values) {
    requireConfiguration();
    const { data, error } = await supabase
      .from("visitors")
      .update(values)
      .eq("id", id)
      .is("deleted_at", null)
      .select("*")
      .single();
    throwIfError(error);
    const [visitor] = await hydratePhotos([data]);
    return visitor;
  },

  async remove(id) {
    requireConfiguration();
    const { error } = await supabase
      .from("visitors")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id)
      .is("deleted_at", null);
    throwIfError(error);
    return null;
  },

  async removeMany(ids) {
    requireConfiguration();
    const { data, error } = await supabase
      .from("visitors")
      .update({ deleted_at: new Date().toISOString() })
      .in("id", ids)
      .is("deleted_at", null)
      .select("id");
    throwIfError(error);
    return { deleted: data?.length || 0 };
  },

  subscribe(callback) {
    requireConfiguration();
    const channel = supabase
      .channel(`visitors-report-${crypto.randomUUID()}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "visitors" },
        callback
      )
      .subscribe();
    return () => supabase.removeChannel(channel);
  },
};
