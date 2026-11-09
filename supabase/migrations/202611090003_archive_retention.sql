-- A receipt is written only after the office PostgreSQL database and visitor
-- photo have both been stored successfully. Cleanup is allowed only when the
-- receipt still matches the current cloud row version and is at least one
-- month old.

create table if not exists public.local_archive_receipts (
  visitor_id bigint primary key
    references public.visitors(id) on delete cascade,
  source_updated_at timestamptz not null,
  archived_at timestamptz not null default now()
);

create index if not exists local_archive_receipts_archived_at_idx
on public.local_archive_receipts (archived_at);

alter table public.local_archive_receipts enable row level security;

revoke all on public.local_archive_receipts from public, anon, authenticated;
grant select, insert, update, delete on public.local_archive_receipts to service_role;

-- Database rows are removed atomically and their object paths are placed in
-- this outbox. If Storage deletion fails, the path remains queued for the next
-- cleanup run instead of becoming an untracked orphan.
create table if not exists public.storage_deletion_queue (
  object_path text primary key,
  queued_at timestamptz not null default now()
);

alter table public.storage_deletion_queue enable row level security;

revoke all on public.storage_deletion_queue from public, anon, authenticated;
grant select, insert, update, delete on public.storage_deletion_queue to service_role;

create or replace function public.acknowledge_local_archive(
  archive_visitor_id bigint,
  archive_source_updated_at timestamptz
)
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  receipt_time timestamptz;
begin
  insert into public.local_archive_receipts (
    visitor_id,
    source_updated_at,
    archived_at
  ) values (
    archive_visitor_id,
    archive_source_updated_at,
    now()
  )
  on conflict (visitor_id) do update
  set source_updated_at = excluded.source_updated_at,
      archived_at = excluded.archived_at
  where local_archive_receipts.source_updated_at
    is distinct from excluded.source_updated_at
  returning archived_at into receipt_time;

  if receipt_time is null then
    select archived_at into receipt_time
    from public.local_archive_receipts
    where visitor_id = archive_visitor_id;
  end if;

  return receipt_time;
end;
$$;

create or replace function public.delete_expired_local_archives(
  batch_size integer default 500
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count bigint;
  cleanup_limit integer;
begin
  cleanup_limit := least(greatest(coalesce(batch_size, 500), 1), 500);

  with eligible as materialized (
    select v.id, v.photo_url
    from public.visitors v
    join public.local_archive_receipts r on r.visitor_id = v.id
    where r.source_updated_at = v.updated_at
      and r.archived_at <= now() - interval '1 month'
    order by r.archived_at, v.id
    for update of v skip locked
    limit cleanup_limit
  ),
  queued as (
    insert into public.storage_deletion_queue (object_path)
    select distinct photo_url
    from eligible
    where photo_url is not null
      and photo_url <> ''
      and photo_url !~* '^(https?:|data:|blob:|/)'
    on conflict (object_path) do nothing
    returning object_path
  ),
  deleted as (
    delete from public.visitors v
    using eligible e
    where v.id = e.id
    returning v.id
  )
  select count(*) into deleted_count from deleted;

  return deleted_count;
end;
$$;

revoke all on function public.delete_expired_local_archives(integer)
from public, anon, authenticated;

revoke all on function public.acknowledge_local_archive(bigint, timestamptz)
from public, anon, authenticated;

grant execute on function public.delete_expired_local_archives(integer)
to service_role;

grant execute on function public.acknowledge_local_archive(bigint, timestamptz)
to service_role;
