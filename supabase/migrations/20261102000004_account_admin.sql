-- QIBING Transport Association: account management functions (server only)
-- The server verifies the caller is an active admin, then calls these with the
-- service role so every change is attributed to that admin in the audit log.

create or replace function public.admin_create_profile(
  p_actor uuid, p_id uuid, p_full_name text, p_username text, p_role public.user_role)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from profiles where id = p_actor and role = 'admin' and active) then
    raise exception 'NOT_ALLOWED';
  end if;
  perform set_config('app.actor_id', p_actor::text, true);
  insert into profiles (id, full_name, username, role, active, must_change_pin, created_by)
  values (p_id, trim(p_full_name), lower(trim(p_username)), p_role, true, true, p_actor);
end $$;

create or replace function public.admin_update_profile(
  p_actor uuid, p_id uuid, p_active boolean default null, p_must_change_pin boolean default null,
  p_unlock boolean default false, p_action text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  -- an admin may only change their own must_change_pin flag (after changing their own password)
  if not exists (select 1 from profiles where id = p_actor and active and (role = 'admin' or p_actor = p_id)) then
    raise exception 'NOT_ALLOWED';
  end if;
  if p_actor = p_id and p_active is false then
    raise exception 'CANNOT_DEACTIVATE_SELF';
  end if;
  perform set_config('app.actor_id', p_actor::text, true);
  update profiles
     set active = coalesce(p_active, active),
         must_change_pin = coalesce(p_must_change_pin, must_change_pin),
         failed_attempts = case when p_unlock then 0 else failed_attempts end,
         locked_until = case when p_unlock then null else locked_until end
   where id = p_id;
  if not found then raise exception 'PROFILE_NOT_FOUND'; end if;
  if p_action is not null then
    perform write_audit(p_actor, p_action, 'profiles', p_id::text);
  end if;
end $$;

revoke execute on function public.admin_create_profile(uuid, uuid, text, text, public.user_role) from public, anon, authenticated;
revoke execute on function public.admin_update_profile(uuid, uuid, boolean, boolean, boolean, text) from public, anon, authenticated;
grant execute on function public.admin_create_profile(uuid, uuid, text, text, public.user_role) to service_role;
grant execute on function public.admin_update_profile(uuid, uuid, boolean, boolean, boolean, text) to service_role;

-- Dashboard summary for a date range (SAST dates). Admin only.
create or replace function public.dashboard_summary(p_from date, p_to date)
returns table (lists_created bigint, lists_closed bigint, drafts_open bigint,
               adult_passengers bigint, children bigint, total_paid_cents bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'NOT_ALLOWED'; end if;
  return query
  select (select count(*) from trips t where t.trip_date between p_from and p_to),
         (select count(*) from trips t where t.trip_date between p_from and p_to and t.status = 'closed'),
         (select count(*) from trips t where t.status = 'draft'),
         (select count(*) from trip_passengers p join trips t on t.id = p.trip_id
           where t.trip_date between p_from and p_to and not p.is_child),
         (select count(*) from trip_passengers p join trips t on t.id = p.trip_id
           where t.trip_date between p_from and p_to and p.is_child),
         (select coalesce(sum(p.paid_cents), 0)::bigint from trip_passengers p join trips t on t.id = p.trip_id
           where t.trip_date between p_from and p_to);
end $$;
revoke execute on function public.dashboard_summary(date, date) from public, anon;
grant execute on function public.dashboard_summary(date, date) to authenticated;
