import { createClient } from "npm:@supabase/supabase-js@2";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const expectedToken = Deno.env.get("CLEANUP_TOKEN") || "";
  const suppliedToken = request.headers.get("x-cleanup-token") || "";
  if (!expectedToken) return json({ error: "CLEANUP_TOKEN is not configured" }, 500);
  if (suppliedToken !== expectedToken) return json({ error: "Unauthorized" }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const bucket = Deno.env.get("VISITOR_PHOTO_BUCKET") || "visitor-photos";
  if (!supabaseUrl || !serviceKey) {
    return json({ error: "Supabase service configuration is missing" }, 500);
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    // This RPC atomically removes only version-matched, month-old rows and
    // places their Storage object paths in a durable deletion queue.
    const { data: rowsDeleted, error: deleteError } = await supabase.rpc(
      "delete_expired_local_archives",
      { batch_size: 500 }
    );
    if (deleteError) throw deleteError;

    const { data: queuedObjects, error: queueError } = await supabase
      .from("storage_deletion_queue")
      .select("object_path")
      .order("queued_at", { ascending: true })
      .limit(500);
    if (queueError) throw queueError;

    const photoPaths = (queuedObjects || []).map((row) => row.object_path);

    // Storage must be deleted through its API. On failure the durable queue is
    // left untouched, so the next scheduled run retries the same object paths.
    if (photoPaths.length) {
      const { error: storageError } = await supabase.storage
        .from(bucket)
        .remove(photoPaths);
      if (storageError) throw storageError;

      const { error: queueDeleteError } = await supabase
        .from("storage_deletion_queue")
        .delete()
        .in("object_path", photoPaths);
      if (queueDeleteError) throw queueDeleteError;
    }

    return json({
      photosDeleted: photoPaths.length,
      rowsDeleted: Number(rowsDeleted || 0),
    });
  } catch (error) {
    console.error(error);
    return json(
      { error: error instanceof Error ? error.message : "Cleanup failed" },
      500
    );
  }
});
