-- QIBING Transport Association: a list may be saved before its driver is known
-- The marshal starts the list and adds passengers while the driver is still on the way,
-- then sets the driver. A list cannot be closed (and so cannot be finalised for printing)
-- until it has a driver.

alter table public.trips alter column driver_id drop not null;

create or replace function public.trips_require_driver()
returns trigger language plpgsql as $$
begin
  if new.status = 'closed' and new.driver_id is null then
    raise exception 'DRIVER_REQUIRED';
  end if;
  return new;
end $$;

drop trigger if exists trips_require_driver on public.trips;
create trigger trips_require_driver before update on public.trips
  for each row execute function public.trips_require_driver();
