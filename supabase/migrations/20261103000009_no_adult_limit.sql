-- QIBING Transport Association: no limit on adult passengers per trip
-- Only children under 3 are still limited (child_limit). A list with more adults than the
-- form's 28 rows prints on further sheets. passenger_limit is no longer used.

alter table public.association_settings alter column passenger_limit drop not null;
alter table public.association_settings drop constraint if exists association_settings_passenger_limit_check;
update public.association_settings set passenger_limit = null;

create or replace function public.trip_passengers_guard()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_trip uuid := coalesce(new.trip_id, old.trip_id);
  v_status trip_status;
  v_child_limit int;
  v_count int;
begin
  select status into v_status from trips where id = v_trip for update;
  if v_status = 'closed' then
    raise exception 'LIST_CLOSED';
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  if tg_op = 'UPDATE' and new.trip_id <> old.trip_id then
    raise exception 'A passenger cannot be moved to another list';
  end if;
  if new.is_child then
    select child_limit into v_child_limit from association_settings;
    select count(*) into v_count from trip_passengers
     where trip_id = v_trip and is_child and id <> new.id;
    if v_count >= v_child_limit then
      raise exception 'CHILD_LIMIT_REACHED';
    end if;
  end if;
  return new;
end $$;
