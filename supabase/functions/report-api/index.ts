import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "apikey, authorization, content-type, x-admin-pin, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const updateFields = new Set([
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
]);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
  });
}

function cleanSearch(value: unknown) {
  return String(value || "")
    .replace(/[,%()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
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

function addBangkokDays(dateText: string, days: number) {
  const date = new Date(`${dateText}T12:00:00+07:00`);
  date.setUTCDate(date.getUTCDate() + days);
  return bangkokDate(date);
}

function dayRange(column: string) {
  const dateText = bangkokDate();
  return {
    column,
    start: `${dateText}T00:00:00+07:00`,
    end: `${addBangkokDays(dateText, 1)}T00:00:00+07:00`,
  };
}

function isStoragePath(value: unknown): value is string {
  return Boolean(value) && !/^(https?:|data:|blob:|\/)/i.test(String(value));
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) return json({ error: "Supabase service configuration is missing" }, 500);

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const authorization = request.headers.get("authorization") || "";
  const accessToken = authorization.replace(/^Bearer\s+/i, "").trim();
  if (!accessToken) return json({ error: "กรุณาเข้าสู่ระบบ" }, 401);

  const { data: authData, error: authError } = await supabase.auth.getUser(accessToken);
  if (authError || !authData.user) {
    return json({ error: "Session หมดอายุ กรุณาเข้าสู่ระบบใหม่" }, 401);
  }

  const expectedPin = Deno.env.get("REPORT_ADMIN_PIN");
  const suppliedPin = request.headers.get("x-admin-pin") || "";
  if (!expectedPin) return json({ error: "REPORT_ADMIN_PIN is not configured" }, 500);
  if (suppliedPin !== expectedPin) {
    await new Promise((resolve) => setTimeout(resolve, 400));
    return json({ error: "PIN ไม่ถูกต้อง" }, 401);
  }

  const bucket = "visitor-photos";

  async function hydratePhotos(rows: Record<string, unknown>[]) {
    const paths = [...new Set(rows.map((row) => row.photo_url).filter(isStoragePath))];
    if (!paths.length) return rows;
    const { data, error } = await supabase.storage.from(bucket).createSignedUrls(paths, 60 * 60);
    if (error) throw error;
    const urls = new Map((data || []).map((item) => [item.path, item.signedUrl]));
    return rows.map((row) => ({
      ...row,
      photo_storage_path: isStoragePath(row.photo_url) ? row.photo_url : null,
      photo_url: urls.get(String(row.photo_url)) || row.photo_url,
    }));
  }

  try {
    const body = await request.json().catch(() => ({}));
    const action = String(body.action || "");
    const payload = body.payload || {};

    if (action === "me") {
      return json({ ok: true, user: { id: authData.user.id, email: authData.user.email } });
    }

    if (action === "summary") {
      const { data, error } = await supabase.rpc("get_visitor_summary");
      if (error) throw error;
      return json(Array.isArray(data) ? data[0] : data);
    }

    if (action === "latest") {
      const limit = Math.min(50, Math.max(1, Number(payload.limit || 25)));
      const { data, error } = await supabase
        .from("visitors")
        .select("id,created_at")
        .is("deleted_at", null)
        .order("id", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return json(data || []);
    }

    if (action === "list") {
      const params = payload.params || {};
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
      const limit = Math.min(1000, Math.max(1, Number(params.limit || 1000)));
      const { data, error } = await query
        .order(orderBy, { ascending, nullsFirst: false })
        .limit(limit);
      if (error) throw error;
      return json(await hydratePhotos(data || []));
    }

    if (action === "suggestions") {
      const search = cleanSearch(payload.query);
      if (search.length < 2) return json([]);
      const limit = Math.min(20, Math.max(1, Number(payload.limit || 12)));
      const { data, error } = await supabase
        .from("visitors")
        .select("id,full_name,company,contact_person,phone")
        .is("deleted_at", null)
        .or(`full_name.ilike.%${search}%,company.ilike.%${search}%,contact_person.ilike.%${search}%,phone.ilike.%${search}%`)
        .order("id", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return json(data || []);
    }

    if (action === "get") {
      const { data, error } = await supabase
        .from("visitors")
        .select("*")
        .eq("id", payload.id)
        .is("deleted_at", null)
        .single();
      if (error) throw error;
      return json((await hydratePhotos([data]))[0]);
    }

    if (action === "update") {
      const values = Object.fromEntries(
        Object.entries(payload.values || {}).filter(([key]) => updateFields.has(key))
      );
      if (!Object.keys(values).length) return json({ error: "ไม่มีข้อมูลที่ต้องแก้ไข" }, 400);
      const { data, error } = await supabase
        .from("visitors")
        .update(values)
        .eq("id", payload.id)
        .is("deleted_at", null)
        .select("*")
        .single();
      if (error) throw error;
      return json((await hydratePhotos([data]))[0]);
    }

    if (action === "remove") {
      const { error } = await supabase
        .from("visitors")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", payload.id)
        .is("deleted_at", null);
      if (error) throw error;
      return json({ deleted: 1 });
    }

    if (action === "removeMany") {
      const ids = Array.isArray(payload.ids) ? payload.ids : [];
      if (!ids.length) return json({ error: "ไม่มีรายการที่ต้องลบ" }, 400);
      const { data, error } = await supabase
        .from("visitors")
        .update({ deleted_at: new Date().toISOString() })
        .in("id", ids)
        .is("deleted_at", null)
        .select("id");
      if (error) throw error;
      return json({ deleted: data?.length || 0 });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (error) {
    console.error(error);
    return json({ error: error instanceof Error ? error.message : "เกิดข้อผิดพลาด" }, 500);
  }
});
