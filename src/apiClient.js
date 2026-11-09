import { localAdminApi, localVisitorsApi } from "./api/localApiClient";
import { supabaseAdminApi, supabaseVisitorsApi } from "./api/supabaseApiClient";

export const dataMode =
  String(import.meta.env.VITE_DATA_MODE || "local").toLowerCase() === "supabase"
    ? "supabase"
    : "local";

export const adminApi = dataMode === "supabase" ? supabaseAdminApi : localAdminApi;
export const visitorsApi = dataMode === "supabase" ? supabaseVisitorsApi : localVisitorsApi;
