import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const allowedFields = [
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
] as const;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
  });
}

function extensionFor(type: string) {
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  return "jpg";
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

  let uploadedPath: string | null = null;
  try {
    const form = await request.formData();
    const rawVisitor = JSON.parse(String(form.get("visitor") || "{}"));
    const fullName = String(rawVisitor.full_name || "").trim();
    if (!fullName) return json({ error: "กรุณาระบุชื่อผู้มาติดต่อ" }, 400);

    const visitor: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(rawVisitor, field)) {
        visitor[field] = rawVisitor[field] === "" ? null : rawVisitor[field];
      }
    }
    visitor.full_name = fullName;

    const photo = form.get("photo");
    if (photo instanceof File && photo.size > 0) {
      const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
      if (!allowedTypes.has(photo.type)) return json({ error: "รองรับเฉพาะรูป JPG, PNG และ WebP" }, 400);
      if (photo.size > 8 * 1024 * 1024) return json({ error: "รูปต้องมีขนาดไม่เกิน 8 MB" }, 413);

      const month = new Date().toISOString().slice(0, 7);
      uploadedPath = `${month}/${crypto.randomUUID()}.${extensionFor(photo.type)}`;
      const { error: uploadError } = await supabase.storage
        .from("visitor-photos")
        .upload(uploadedPath, photo, { contentType: photo.type, upsert: false });
      if (uploadError) throw uploadError;
      visitor.photo_url = uploadedPath;
    }

    const { data, error } = await supabase
      .from("visitors")
      .insert(visitor)
      .select("*")
      .single();
    if (error) throw error;
    return json(data, 201);
  } catch (error) {
    if (uploadedPath) {
      await supabase.storage.from("visitor-photos").remove([uploadedPath]).catch(() => undefined);
    }
    console.error(error);
    return json({ error: error instanceof Error ? error.message : "บันทึกข้อมูลไม่สำเร็จ" }, 500);
  }
});
