-- RLS and business-rule test. Run ONLY against a throwaway database:
--   createdb qibing_test && psql -d qibing_test -f supabase_stub.sql
--   for f in ../migrations/*.sql; do psql -d qibing_test -f $f; done
--   psql -v ON_ERROR_STOP=1 -d qibing_test -f rls_test.sql && dropdb qibing_test
-- It creates throwaway records inside one transaction and rolls everything back.
\set ON_ERROR_STOP 1
begin;

-- ids generated at run time
create temp table ids as select gen_random_uuid() admin_id, gen_random_uuid() m1, gen_random_uuid() m2;
grant select on ids to authenticated, service_role;
insert into auth.users select admin_id from ids union all select m1 from ids union all select m2 from ids;

create or replace function pg_temp.expect_error(p_sql text, p_like text) returns void language plpgsql as $$
begin
  execute p_sql;
  raise exception 'EXPECTED FAILURE DID NOT HAPPEN: %', p_sql;
exception when others then
  if sqlerrm like 'EXPECTED FAILURE%' then raise; end if;
  if p_like is not null and sqlerrm not like p_like then
    raise exception 'Wrong error for %: % (wanted %)', p_sql, sqlerrm, p_like;
  end if;
end $$;
grant execute on function pg_temp.expect_error(text, text) to authenticated, service_role;

-- 1. setup runs once ---------------------------------------------------------
set local role service_role;
select public.complete_setup((select admin_id from ids), 'Office Admin', 'office.admin',
  jsonb_build_object('association_name','A','short_name','A','street_address','S','town','T',
    'postal_code','P','cell_no','C','email','E','registration_no','R','chairperson_line','CL',
    'secretary_line','SL','logo_path','branding/logo.png','passenger_limit',2,'child_limit',1),
  '[{"role_title":"Chairperson","name":"Committee Person"}]'::jsonb,
  '{"name":"From to To","from_place":"From","to_place":"To"}'::jsonb);
select pg_temp.expect_error(format($q$select public.complete_setup(%L,'B','second.admin','{}','[]','{}')$q$,
  (select m1 from ids)), '%SETUP_ALREADY_COMPLETE%');

-- marshals created by the server
insert into public.profiles (id, full_name, username, role) select m1, 'Marshal One', 'marshal.one', 'marshal' from ids;
insert into public.profiles (id, full_name, username, role) select m2, 'Marshal Two', 'marshal.two', 'marshal' from ids;

-- 2. lockout after 5 failures --------------------------------------------------
select public.record_sign_in((select m1 from ids), false) from generate_series(1,4);
do $$ begin
  if (select locked_until from public.profiles where id = (select m1 from ids)) is not null then
    raise exception 'locked too early'; end if; end $$;
select public.record_sign_in((select m1 from ids), false);
do $$ begin
  if (select locked_until from public.profiles where id = (select m1 from ids)) <= now() then
    raise exception 'not locked after 5 failures'; end if;
  if (select count(*) from public.audit_log where action = 'account_locked') <> 1 then
    raise exception 'lockout not audited'; end if; end $$;
select public.record_sign_in((select m1 from ids), true);

-- 3. marshal one registers data and starts a list --------------------------------
select set_config('request.jwt.claim.sub', (select m1::text from ids), true);
set local role authenticated;
select public.register_driver('Driver Person', 'AB12345678', '+27681234567');
insert into public.vehicles (registration_no, owner_title, owner_name, default_driver_id, created_by)
  select 'ABC123FS', 'Ms', 'Owner Person', (select id from public.drivers_directory limit 1), auth.uid();
do $$ begin
  if (select id_or_licence_no from public.drivers_directory limit 1) <> '••••5678' then
    raise exception 'marshal sees full ID number'; end if;
  if exists (select 1 from public.drivers) then
    raise exception 'marshal can read drivers base table'; end if; end $$;

insert into public.trips (trip_date, vehicle_id, driver_id, route_id, marshal_id, marshal_name)
  select current_date, v.id, v.default_driver_id, r.id, gen_random_uuid(), 'Someone Else'
  from public.vehicles v, public.routes r;
do $$ begin
  if (select marshal_name from public.trips limit 1) <> 'Marshal One' then
    raise exception 'marshal name was not taken from the signed-in profile'; end if; end $$;

insert into public.passengers (id, full_name, next_of_kin_no, created_by)
  values ('00000000-0000-4000-8000-000000000001', 'Passenger A', '+27731234567', auth.uid());
-- 1 child is allowed in this test; adults have no limit
insert into public.trip_passengers (id, trip_id, passenger_id, full_name, from_address, destination_address,
  next_of_kin_no, paid_cents, is_child, seat_order)
select gen_random_uuid(), t.id, '00000000-0000-4000-8000-000000000001', 'Passenger A', 'Here', 'There',
  '+27731234567', 15000, n = 3, n
from public.trips t, generate_series(1,3) n;
insert into public.trip_passengers (id, trip_id, passenger_id, full_name, from_address, destination_address,
  next_of_kin_no, paid_cents, is_child, seat_order)
select gen_random_uuid(), t.id, '00000000-0000-4000-8000-000000000001', 'P', 'Here', 'There',
  '+27731234567', 1000, false, 8 + n
from public.trips t, generate_series(1,30) n;
select pg_temp.expect_error($q$insert into public.trip_passengers (id, trip_id, passenger_id, full_name,
  from_address, destination_address, next_of_kin_no, paid_cents, is_child, seat_order)
  select gen_random_uuid(), id, '00000000-0000-4000-8000-000000000001', 'P', 'Here', 'There', '+27731234567',
  0, true, 9 from public.trips$q$, '%CHILD_LIMIT_REACHED%');
-- re-sending the same passenger id is an upsert, not a duplicate
insert into public.trip_passengers (id, trip_id, passenger_id, full_name, from_address, destination_address,
  next_of_kin_no, paid_cents, is_child, seat_order)
select tp.id, tp.trip_id, tp.passenger_id, tp.full_name, tp.from_address, tp.destination_address,
  tp.next_of_kin_no, 16000, tp.is_child, tp.seat_order
from public.trip_passengers tp where seat_order = 1
on conflict (id) do update set paid_cents = excluded.paid_cents;
do $$ begin
  if (select count(*) from public.trip_passengers) <> 33 then raise exception 'upsert duplicated a row'; end if; end $$;

select pg_temp.expect_error($q$update public.trips set status = 'closed'$q$, '%close_trip%');
select public.close_trip((select id from public.trips));
do $$ begin
  if (select jsonb_array_length(print_snapshot->'passengers') from public.trips) <> 33 then
    raise exception 'snapshot incomplete'; end if;
  if (select print_snapshot->'trip'->>'marshal_name' from public.trips) <> 'Marshal One' then
    raise exception 'snapshot marshal wrong'; end if; end $$;
update public.trip_passengers set paid_cents = 1; -- RLS hides closed rows: 0 rows change
do $$ begin
  if (select count(*) from public.trip_passengers where paid_cents = 1) > 0 then
    raise exception 'closed list was changed'; end if; end $$;
select pg_temp.expect_error($q$select public.reopen_trip((select id from public.trips), 'wrong person')$q$, '%NOT_ALLOWED%');
select pg_temp.expect_error($q$delete from public.audit_log$q$, '%permission denied%');
do $$ begin
  if exists (select 1 from public.audit_log) then raise exception 'marshal can read audit log'; end if; end $$;

-- 4. marshal two sees nothing of marshal one's lists ------------------------------
select set_config('request.jwt.claim.sub', (select m2::text from ids), true);
do $$ begin
  if exists (select 1 from public.trips) or exists (select 1 from public.trip_passengers) then
    raise exception 'marshal two can see marshal one''s list'; end if; end $$;

-- 5. admin reopens with a reason; reopening is logged; audit log cannot be changed --
select set_config('request.jwt.claim.sub', (select admin_id::text from ids), true);
select pg_temp.expect_error($q$select public.reopen_trip((select id from public.trips), 'x')$q$, '%REASON_REQUIRED%');
select public.reopen_trip((select id from public.trips), 'Passenger name misspelt');
do $$ begin
  if (select status from public.trips) <> 'draft' then raise exception 'reopen failed'; end if;
  if not exists (select 1 from public.audit_log where action = 'reopen') then raise exception 'reopen not audited'; end if;
end $$;
reset role;
select pg_temp.expect_error($q$update public.audit_log set action = 'x'$q$, '%cannot be changed%');

-- 6. a deactivated marshal loses access at once ----------------------------------
update public.profiles set active = false where id = (select m1 from ids);
select set_config('request.jwt.claim.sub', (select m1::text from ids), true);
set local role authenticated;
do $$ begin
  if exists (select 1 from public.trips) or exists (select 1 from public.routes) then
    raise exception 'deactivated marshal still has access'; end if; end $$;

reset role;
\echo 'ALL RLS TESTS PASSED'
rollback;
