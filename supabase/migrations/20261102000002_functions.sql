-- QIBING Transport Association: helper functions, audit triggers and business rules

-- ---------------------------------------------------------------- identity helpers
create or replace function public.current_actor()
returns uuid language sql stable as $$
  select coalesce(auth.uid(), nullif(current_setting('app.actor_id', true), '')::uuid)
$$;

create or replace function public.is_active_user()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and active)
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and active and role = 'admin')
$$;

-- ---------------------------------------------------------------- audit
create or replace function public.write_audit(
  p_actor uuid, p_action text, p_entity text, p_entity_id text,
  p_before jsonb default null, p_after jsonb default null, p_reason text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into audit_log (actor_id, actor_name, action, entity, entity_id, before, after, reason)
  values (p_actor, (select full_name from profiles where id = p_actor),
          p_action, p_entity, p_entity_id, p_before, p_after, p_reason);
end $$;

create or replace function public.audit_row_change()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_before jsonb := case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) - 'print_snapshot' - 'updated_at' end;
  v_after  jsonb := case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) - 'print_snapshot' - 'updated_at' end;
  v_action text := lower(tg_op);
begin
  if tg_op = 'UPDATE' and v_before = v_after then
    return new;
  end if;
  -- never record lockout counters as edits; sign-in events are logged separately
  if tg_table_name = 'profiles' and tg_op = 'UPDATE'
     and (v_before - 'failed_attempts' - 'locked_until' - 'last_sign_in_at')
       = (v_after  - 'failed_attempts' - 'locked_until' - 'last_sign_in_at') then
    return new;
  end if;
  perform write_audit(current_actor(), v_action, tg_table_name,
                      coalesce(v_after->>'id', v_before->>'id'), v_before, v_after,
                      nullif(current_setting('app.audit_reason', true), ''));
  return coalesce(new, old);
end $$;

do $$
declare t text;
begin
  foreach t in array array['profiles','drivers','vehicles','routes','association_settings',
                           'committee_members','trips','passengers','trip_passengers']
  loop
    execute format('create trigger %I_audit after insert or update or delete on public.%I
                    for each row execute function public.audit_row_change()', t, t);
  end loop;
end $$;

-- audit log is insert-only, even for the table owner path through triggers
create or replace function public.audit_log_immutable()
returns trigger language plpgsql as $$
begin
  raise exception 'The audit log cannot be changed or deleted';
end $$;
create trigger audit_log_no_update before update or delete on public.audit_log
  for each row execute function public.audit_log_immutable();
create trigger audit_log_no_truncate before truncate on public.audit_log
  for each statement execute function public.audit_log_immutable();

-- ---------------------------------------------------------------- first-run setup
-- Called only by the server (service role) after it has verified SETUP_CODE and
-- created the auth user. Runs in one transaction and refuses if an admin exists.
create or replace function public.complete_setup(
  p_user_id uuid, p_full_name text, p_username text,
  p_settings jsonb, p_committee jsonb, p_route jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare
  m jsonb;
  i integer := 0;
begin
  perform pg_advisory_xact_lock(hashtext('qibing_first_run_setup'));
  if exists (select 1 from profiles where role = 'admin') then
    raise exception 'SETUP_ALREADY_COMPLETE';
  end if;

  perform set_config('app.actor_id', p_user_id::text, true);

  insert into profiles (id, full_name, username, role, active, must_change_pin)
  values (p_user_id, trim(p_full_name), lower(trim(p_username)), 'admin', true, false);

  insert into association_settings (association_name, short_name, street_address, town, postal_code,
    cell_no, email, registration_no, chairperson_line, secretary_line, logo_path, watermark_path,
    paper_size, passenger_limit, child_limit, updated_by)
  values (p_settings->>'association_name', p_settings->>'short_name', p_settings->>'street_address',
    p_settings->>'town', p_settings->>'postal_code', p_settings->>'cell_no', p_settings->>'email',
    p_settings->>'registration_no', p_settings->>'chairperson_line', p_settings->>'secretary_line',
    p_settings->>'logo_path', nullif(p_settings->>'watermark_path', ''),
    coalesce(nullif(p_settings->>'paper_size', ''), 'letter'), (p_settings->>'passenger_limit')::int, (p_settings->>'child_limit')::int,
    p_user_id);

  for m in select * from jsonb_array_elements(p_committee) loop
    i := i + 1;
    insert into committee_members (role_title, name, sort_order)
    values (trim(m->>'role_title'), trim(m->>'name'), i);
  end loop;

  insert into routes (name, from_place, to_place, is_default, active, created_by)
  values (trim(p_route->>'name'), trim(p_route->>'from_place'), trim(p_route->>'to_place'),
          true, true, p_user_id);

  perform write_audit(p_user_id, 'setup_complete', 'association_settings', 'true');
end $$;

-- ---------------------------------------------------------------- sign-in bookkeeping (server only)
create or replace function public.record_sign_in(p_profile_id uuid, p_success boolean)
returns table (locked_until timestamptz, failed_attempts integer)
language plpgsql security definer set search_path = public as $$
declare
  v_attempts integer;
  v_locked timestamptz;
begin
  if p_success then
    update profiles p set failed_attempts = 0, locked_until = null, last_sign_in_at = now()
    where p.id = p_profile_id;
    perform write_audit(p_profile_id, 'sign_in', 'profiles', p_profile_id::text);
    return query select null::timestamptz, 0;
    return;
  end if;

  update profiles p
     set failed_attempts = p.failed_attempts + 1,
         locked_until = case when p.failed_attempts + 1 >= 5 then now() + interval '15 minutes'
                             else p.locked_until end
   where p.id = p_profile_id
  returning p.failed_attempts, p.locked_until into v_attempts, v_locked;

  perform write_audit(p_profile_id, 'sign_in_failed', 'profiles', p_profile_id::text);
  if v_attempts >= 5 then
    perform write_audit(p_profile_id, 'account_locked', 'profiles', p_profile_id::text,
                        null, jsonb_build_object('locked_until', v_locked));
    update profiles p set failed_attempts = 0 where p.id = p_profile_id;
  end if;
  return query select v_locked, v_attempts;
end $$;

create or replace function public.log_event(p_actor uuid, p_action text, p_entity text,
                                            p_entity_id text, p_reason text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform write_audit(p_actor, p_action, p_entity, p_entity_id, null, null, p_reason);
end $$;

-- ---------------------------------------------------------------- public branding for the login page
create or replace function public.public_branding()
returns table (association_name text, short_name text, logo_path text, setup_complete boolean)
language sql stable security definer set search_path = public as $$
  select s.association_name, s.short_name, s.logo_path,
         exists (select 1 from profiles where role = 'admin')
  from (select 1) d left join association_settings s on true
$$;

-- ---------------------------------------------------------------- routes
create or replace function public.set_default_route(p_route_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'NOT_ALLOWED'; end if;
  update routes set is_default = false where is_default and id <> p_route_id;
  update routes set is_default = true where id = p_route_id and active;
  if not found then raise exception 'ROUTE_NOT_ACTIVE'; end if;
end $$;

-- ---------------------------------------------------------------- drivers directory (ID masked for marshals)
create or replace view public.drivers_directory
with (security_barrier = true) as
  select d.id, d.full_name,
         case when public.is_admin() then d.id_or_licence_no
              else '••••' || right(d.id_or_licence_no, 4) end as id_or_licence_no,
         d.cell_no, d.photo_path, d.active, d.created_at
  from public.drivers d
  where public.is_active_user();

create or replace function public.register_driver(p_full_name text, p_id_no text, p_cell_no text,
                                                  p_photo_path text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if not is_active_user() then raise exception 'NOT_ALLOWED'; end if;
  if exists (select 1 from drivers where upper(id_or_licence_no) = upper(trim(p_id_no))) then
    raise exception 'DRIVER_EXISTS';
  end if;
  insert into drivers (full_name, id_or_licence_no, cell_no, photo_path, created_by)
  values (trim(p_full_name), upper(trim(p_id_no)), p_cell_no, p_photo_path, auth.uid())
  returning id into v_id;
  return v_id;
end $$;

-- ---------------------------------------------------------------- trips: guard status changes
create or replace function public.trips_guard()
returns trigger language plpgsql as $$
begin
  if current_setting('app.trip_transition', true) = 'on' then
    return new;
  end if;
  if new.status is distinct from old.status
     or new.print_snapshot is distinct from old.print_snapshot
     or new.closed_at is distinct from old.closed_at then
    raise exception 'Use close_trip or reopen_trip to change a list''s status';
  end if;
  if old.status = 'closed' then
    raise exception 'LIST_CLOSED';
  end if;
  if new.marshal_id is distinct from old.marshal_id or new.marshal_name is distinct from old.marshal_name then
    raise exception 'The marshal on a list cannot be changed';
  end if;
  return new;
end $$;
create trigger trips_guard before update on public.trips
  for each row execute function public.trips_guard();

create or replace function public.trips_set_marshal()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.marshal_id := auth.uid();
  new.marshal_name := (select full_name from profiles where id = auth.uid());
  new.status := 'draft';
  new.closed_at := null;
  new.closed_by := null;
  new.print_snapshot := null;
  return new;
end $$;
create trigger trips_set_marshal before insert on public.trips
  for each row execute function public.trips_set_marshal();

-- ---------------------------------------------------------------- trip passengers: limits and locking
create or replace function public.trip_passengers_guard()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_trip uuid := coalesce(new.trip_id, old.trip_id);
  v_status trip_status;
  v_adult_limit int;
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
  select passenger_limit, child_limit into v_adult_limit, v_child_limit from association_settings;
  select count(*) into v_count from trip_passengers
   where trip_id = v_trip and is_child = new.is_child and id <> new.id;
  if new.is_child and v_count >= v_child_limit then
    raise exception 'CHILD_LIMIT_REACHED';
  elsif not new.is_child and v_count >= v_adult_limit then
    raise exception 'PASSENGER_LIMIT_REACHED';
  end if;
  return new;
end $$;
create trigger trip_passengers_guard before insert or update or delete on public.trip_passengers
  for each row execute function public.trip_passengers_guard();

-- ---------------------------------------------------------------- close / reopen
create or replace function public.close_trip(p_trip_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  t trips%rowtype;
  s association_settings%rowtype;
  v_snapshot jsonb;
begin
  select * into t from trips where id = p_trip_id for update;
  if not found then raise exception 'LIST_NOT_FOUND'; end if;
  if not (is_admin() or (is_active_user() and t.marshal_id = auth.uid())) then
    raise exception 'NOT_ALLOWED';
  end if;
  if t.status = 'closed' then raise exception 'LIST_CLOSED'; end if;
  select * into s from association_settings;

  select jsonb_build_object(
    'version', 1,
    'settings', jsonb_build_object(
      'association_name', s.association_name, 'short_name', s.short_name,
      'street_address', s.street_address, 'town', s.town, 'postal_code', s.postal_code,
      'cell_no', s.cell_no, 'email', s.email, 'registration_no', s.registration_no,
      'chairperson_line', s.chairperson_line, 'secretary_line', s.secretary_line,
      'logo_path', s.logo_path, 'watermark_path', s.watermark_path, 'paper_size', s.paper_size,
      'passenger_limit', s.passenger_limit, 'child_limit', s.child_limit,
      'show_list_reference', s.show_list_reference),
    'committee', coalesce((select jsonb_agg(jsonb_build_object('role_title', c.role_title, 'name', c.name)
                                            order by c.sort_order) from committee_members c), '[]'::jsonb),
    'trip', jsonb_build_object(
      'id', t.id, 'trip_date', t.trip_date, 'marshal_name', t.marshal_name,
      'owner_title', v.owner_title, 'owner_name', v.owner_name, 'registration_no', v.registration_no,
      'driver_name', d.full_name, 'route_name', r.name),
    'passengers', coalesce((select jsonb_agg(jsonb_build_object(
        'full_name', p.full_name, 'from_address', p.from_address,
        'destination_address', p.destination_address, 'next_of_kin_no', p.next_of_kin_no,
        'paid_cents', p.paid_cents, 'is_child', p.is_child) order by p.is_child, p.seat_order)
      from trip_passengers p where p.trip_id = t.id), '[]'::jsonb)
  ) into v_snapshot
  from vehicles v, drivers d, routes r
  where v.id = t.vehicle_id and d.id = t.driver_id and r.id = t.route_id;

  perform set_config('app.trip_transition', 'on', true);
  update trips set status = 'closed', closed_at = now(), closed_by = auth.uid(),
                   print_snapshot = v_snapshot
   where id = p_trip_id;
  perform set_config('app.trip_transition', 'off', true);
  perform write_audit(auth.uid(), 'close', 'trips', p_trip_id::text);
end $$;

create or replace function public.reopen_trip(p_trip_id uuid, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'NOT_ALLOWED'; end if;
  if p_reason is null or length(trim(p_reason)) < 5 then raise exception 'REASON_REQUIRED'; end if;
  perform set_config('app.trip_transition', 'on', true);
  update trips set status = 'draft', closed_at = null, closed_by = null, print_snapshot = null
   where id = p_trip_id and status = 'closed';
  if not found then raise exception 'LIST_NOT_CLOSED'; end if;
  perform set_config('app.trip_transition', 'off', true);
  insert into trip_reopenings (trip_id, reopened_by, reason) values (p_trip_id, auth.uid(), trim(p_reason));
  perform write_audit(auth.uid(), 'reopen', 'trips', p_trip_id::text, null, null, trim(p_reason));
end $$;

-- ---------------------------------------------------------------- function privileges
revoke execute on function public.complete_setup(uuid, text, text, jsonb, jsonb, jsonb) from public, anon, authenticated;
revoke execute on function public.record_sign_in(uuid, boolean) from public, anon, authenticated;
revoke execute on function public.log_event(uuid, text, text, text, text) from public, anon, authenticated;
revoke execute on function public.write_audit(uuid, text, text, text, jsonb, jsonb, text) from public, anon, authenticated;
grant execute on function public.complete_setup(uuid, text, text, jsonb, jsonb, jsonb) to service_role;
grant execute on function public.record_sign_in(uuid, boolean) to service_role;
grant execute on function public.log_event(uuid, text, text, text, text) to service_role;
grant execute on function public.public_branding() to anon, authenticated;
revoke execute on function public.set_default_route(uuid) from public, anon;
revoke execute on function public.register_driver(text, text, text, text) from public, anon;
revoke execute on function public.close_trip(uuid) from public, anon;
revoke execute on function public.reopen_trip(uuid, text) from public, anon;
grant execute on function public.set_default_route(uuid) to authenticated;
grant execute on function public.register_driver(text, text, text, text) to authenticated;
grant execute on function public.close_trip(uuid) to authenticated;
grant execute on function public.reopen_trip(uuid, text) to authenticated;
