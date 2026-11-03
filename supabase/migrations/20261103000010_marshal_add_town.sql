-- QIBING Transport Association: any marshal may add a route to any destination
-- When the destination a marshal types has no route, the marshal adds "<home town> to <destination>"
-- on the spot instead of asking the office. Any destination is accepted, including places outside
-- South Africa and the home town itself. Towns in sa_towns keep their usual spelling; anything else
-- is kept as typed. If the route already exists (any spelling case) it is returned instead,
-- and switched back on if it was switched off. Routes still cannot be edited by marshals.

-- Room for a long home town plus a long destination in the route name, and one-letter places.
alter table public.routes drop constraint if exists routes_name_check;
alter table public.routes add constraint routes_name_check check (length(trim(name)) between 2 and 200);
alter table public.routes drop constraint if exists routes_to_place_check;
alter table public.routes add constraint routes_to_place_check check (length(trim(to_place)) between 1 and 80);

-- The town list is only used for spelling. It is filled by 20261102000005_town_routes.sql;
-- if that has not been run yet, an empty list lets this work and that file fills it later.
create table if not exists public.sa_towns (
  name text primary key,
  province text not null check (province in ('EC','FS','GP','KZN','LP','MP','NC','NW','WC'))
);
alter table public.sa_towns enable row level security;
drop policy if exists sa_towns_select on public.sa_towns;
create policy sa_towns_select on public.sa_towns for select to authenticated using (true);
revoke insert, update, delete on public.sa_towns from authenticated;

create or replace function public.add_route_to_town(p_town text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_home text;
  v_town text := regexp_replace(trim(coalesce(p_town, '')), '\s+', ' ', 'g');
  v_id uuid;
begin
  if not is_active_user() then raise exception 'NOT_ALLOWED'; end if;
  if length(v_town) not between 1 and 80 then raise exception 'TOWN_NAME_INVALID'; end if;

  select trim(town) into v_home from association_settings;
  if v_home is null then raise exception 'NOT_ALLOWED'; end if;

  v_town := coalesce((select t.name from sa_towns t where lower(t.name) = lower(v_town)),
                     upper(left(v_town, 1)) || substr(v_town, 2));

  select id into v_id from routes
   where lower(from_place) = lower(v_home) and lower(to_place) = lower(v_town)
   order by active desc limit 1;
  if v_id is not null then
    update routes set active = true where id = v_id and not active;
    return v_id;
  end if;

  insert into routes (name, from_place, to_place, is_default, active, created_by)
  values (v_home || ' to ' || v_town, v_home, v_town, false, true, auth.uid())
  returning id into v_id;
  return v_id;
end $$;

revoke execute on function public.add_route_to_town(text) from public, anon;
grant execute on function public.add_route_to_town(text) to authenticated;

-- Make the API see the new function straight away.
notify pgrst, 'reload schema';
