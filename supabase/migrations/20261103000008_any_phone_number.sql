-- QIBING Transport Association: phone numbers may be any number, not only South African
-- South African numbers are still stored as +27xxxxxxxxx; others as 3 to 15 digits, optionally with a leading +.

alter table public.drivers drop constraint if exists drivers_cell_no_check;
alter table public.drivers add constraint drivers_cell_no_check
  check (cell_no ~ '^\+?[0-9]{3,15}$');

alter table public.passengers drop constraint if exists passengers_next_of_kin_no_check;
alter table public.passengers add constraint passengers_next_of_kin_no_check
  check (next_of_kin_no ~ '^\+?[0-9]{3,15}$');

alter table public.trip_passengers drop constraint if exists trip_passengers_next_of_kin_no_check;
alter table public.trip_passengers add constraint trip_passengers_next_of_kin_no_check
  check (next_of_kin_no ~ '^\+?[0-9]{3,15}$');
