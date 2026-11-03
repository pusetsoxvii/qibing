-- QIBING Transport Association: the PIN the office gives a marshal is permanent
-- Marshals are no longer asked to choose a new PIN at first sign-in or after a reset.
-- New admin accounts still must change their password at first sign-in.

create or replace function public.admin_create_profile(
  p_actor uuid, p_id uuid, p_full_name text, p_username text, p_role public.user_role)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from profiles where id = p_actor and role = 'admin' and active) then
    raise exception 'NOT_ALLOWED';
  end if;
  perform set_config('app.actor_id', p_actor::text, true);
  insert into profiles (id, full_name, username, role, active, must_change_pin, created_by)
  values (p_id, trim(p_full_name), lower(trim(p_username)), p_role, true, p_role <> 'marshal', p_actor);
end $$;

-- Marshals still waiting on a forced change keep the PIN they were given.
update public.profiles set must_change_pin = false where role = 'marshal' and must_change_pin;
