-- QIBING Transport Association: row-level security and storage

alter table public.profiles enable row level security;
alter table public.drivers enable row level security;
alter table public.vehicles enable row level security;
alter table public.routes enable row level security;
alter table public.association_settings enable row level security;
alter table public.committee_members enable row level security;
alter table public.trips enable row level security;
alter table public.passengers enable row level security;
alter table public.trip_passengers enable row level security;
alter table public.trip_reopenings enable row level security;
alter table public.audit_log enable row level security;

-- Anonymous visitors get nothing from any table.
revoke all on all tables in schema public from anon;

-- ---------------------------------------------------------------- profiles
-- Account changes go through server routes that verify the caller is an admin
-- and then use the service role, so there are no client update policies here.
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin());

-- ---------------------------------------------------------------- drivers
-- Marshals read drivers through drivers_directory (ID masked) and add them
-- through register_driver(). The base table is admin-only.
create policy drivers_admin_select on public.drivers for select to authenticated using (public.is_admin());
create policy drivers_admin_insert on public.drivers for insert to authenticated with check (public.is_admin());
create policy drivers_admin_update on public.drivers for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
revoke delete on public.drivers from authenticated;
grant select on public.drivers_directory to authenticated;

-- ---------------------------------------------------------------- vehicles
create policy vehicles_select on public.vehicles for select to authenticated using (public.is_active_user());
create policy vehicles_insert on public.vehicles for insert to authenticated
  with check (public.is_active_user() and created_by = auth.uid());
create policy vehicles_admin_update on public.vehicles for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
revoke delete on public.vehicles from authenticated;

-- ---------------------------------------------------------------- routes
create policy routes_select on public.routes for select to authenticated using (public.is_active_user());
create policy routes_admin_insert on public.routes for insert to authenticated with check (public.is_admin());
create policy routes_admin_update on public.routes for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
revoke delete on public.routes from authenticated;

-- ---------------------------------------------------------------- settings and committee
create policy settings_select on public.association_settings for select to authenticated
  using (public.is_active_user());
create policy settings_admin_update on public.association_settings for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
revoke insert, delete on public.association_settings from authenticated;

create policy committee_select on public.committee_members for select to authenticated
  using (public.is_active_user());
create policy committee_admin_all on public.committee_members for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------- trips
create policy trips_select on public.trips for select to authenticated
  using (public.is_admin() or (public.is_active_user() and marshal_id = auth.uid()));
create policy trips_insert on public.trips for insert to authenticated
  with check (public.is_active_user());
create policy trips_update on public.trips for update to authenticated
  using (public.is_admin() or (public.is_active_user() and marshal_id = auth.uid() and status = 'draft'))
  with check (public.is_admin() or (marshal_id = auth.uid() and status = 'draft'));
revoke delete on public.trips from authenticated;

-- ---------------------------------------------------------------- passengers directory
create policy passengers_select on public.passengers for select to authenticated
  using (public.is_active_user());
create policy passengers_insert on public.passengers for insert to authenticated
  with check (public.is_active_user() and created_by = auth.uid());
create policy passengers_admin_update on public.passengers for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
revoke delete on public.passengers from authenticated;

-- ---------------------------------------------------------------- trip passengers
create policy trip_passengers_select on public.trip_passengers for select to authenticated
  using (exists (select 1 from public.trips t where t.id = trip_id
                 and (public.is_admin() or (public.is_active_user() and t.marshal_id = auth.uid()))));
create policy trip_passengers_write on public.trip_passengers for all to authenticated
  using (exists (select 1 from public.trips t where t.id = trip_id and t.status = 'draft'
                 and (public.is_admin() or (public.is_active_user() and t.marshal_id = auth.uid()))))
  with check (exists (select 1 from public.trips t where t.id = trip_id and t.status = 'draft'
                 and (public.is_admin() or (public.is_active_user() and t.marshal_id = auth.uid()))));

-- ---------------------------------------------------------------- reopenings and audit log (read-only to admins)
create policy reopenings_admin_select on public.trip_reopenings for select to authenticated using (public.is_admin());
revoke insert, update, delete on public.trip_reopenings from authenticated;

create policy audit_admin_select on public.audit_log for select to authenticated using (public.is_admin());
revoke insert, update, delete, truncate on public.audit_log from authenticated;

-- ---------------------------------------------------------------- storage
-- branding: the association logo. Public read, because the login page shows it
-- before anyone signs in. It contains no personal data. Admin-only writes.
-- driver-photos: private; signed-in active users only.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('branding', 'branding', true, 5242880, array['image/png', 'image/jpeg']),
       ('driver-photos', 'driver-photos', false, 1048576, array['image/jpeg', 'image/webp'])
on conflict (id) do nothing;

create policy branding_admin_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'branding' and public.is_admin());

create policy driver_photos_read on storage.objects for select to authenticated
  using (bucket_id = 'driver-photos' and public.is_active_user());
create policy driver_photos_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'driver-photos' and public.is_active_user());
