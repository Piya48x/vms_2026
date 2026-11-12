-- A notification problem must never block visitor registration. The fallback
-- poller will recover the print job if Realtime is temporarily unavailable.

create or replace function public.broadcast_new_visitor()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
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
  exception
    when others then
      raise warning 'Unable to broadcast visitor %: %', new.id, sqlerrm;
  end;

  return new;
end;
$$;

