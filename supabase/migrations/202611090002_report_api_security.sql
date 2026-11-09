-- Report data must be accessed through the report-api Edge Function.
-- The function validates both the Supabase user session and REPORT_ADMIN_PIN,
-- then uses the service role for the database operation.

drop policy if exists "report users can read visitors" on public.visitors;
drop policy if exists "report users can update visitors" on public.visitors;
drop policy if exists "report users can delete visitors" on public.visitors;

revoke select, update, delete on public.visitors from authenticated;
revoke execute on function public.get_visitor_summary() from authenticated;

drop policy if exists "report users can view visitor photos" on storage.objects;
