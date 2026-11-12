-- Send a small, private Realtime event as soon as a visitor is committed.
-- The report still loads the full record through report-api, so the broadcast
-- contains no personal information beyond the row id and creation timestamp.

drop policy if exists "report users can receive visitor notifications"
on realtime.messages;

create policy "report users can receive visitor notifications"
on realtime.messages
for select
to authenticated
using (
  (select realtime.topic()) = 'vms-report'
  and realtime.messages.extension = 'broadcast'
);

create or replace function public.broadcast_new_visitor()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform realtime.send(
    jsonb_build_object(
      'id', new.id,
      'created_at', new.created_at
    ),
    'visitor_insert',
    'vms-report',
    true
  );

  return new;
end;
$$;

drop trigger if exists visitors_broadcast_insert on public.visitors;
create trigger visitors_broadcast_insert
after insert on public.visitors
for each row execute function public.broadcast_new_visitor();

