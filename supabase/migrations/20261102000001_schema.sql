-- QIBING Transport Association: schema
-- Creates tables, constraints and indexes. Inserts NO rows.

create extension if not exists pgcrypto;
create extension if not exists pg_trgm;

-- ---------------------------------------------------------------- types
create type public.user_role as enum ('marshal', 'admin');
create type public.trip_status as enum ('draft', 'closed');
create type public.owner_title as enum ('Mr', 'Mrs', 'Ms', 'none');

-- ---------------------------------------------------------------- helpers
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ---------------------------------------------------------------- profiles
create table public.profiles (
  id uuid primary key references auth.users (id) on delete restrict,
  full_name text not null check (length(trim(full_name)) between 2 and 120),
  username text not null unique check (username ~ '^[a-z0-9.]{3,30}$'),
  role public.user_role not null default 'marshal',
  active boolean not null default true,
  must_change_pin boolean not null default false,
  failed_attempts integer not null default 0,
  locked_until timestamptz,
  last_sign_in_at timestamptz,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- drivers
create table public.drivers (
  id uuid primary key default gen_random_uuid(),
  full_name text not null check (length(trim(full_name)) between 2 and 120),
  id_or_licence_no text not null unique check (length(trim(id_or_licence_no)) between 4 and 30),
  cell_no text not null check (cell_no ~ '^\+27[0-9]{9}$'),
  photo_path text,
  active boolean not null default true,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index drivers_name_trgm on public.drivers using gin (full_name gin_trgm_ops);

-- ---------------------------------------------------------------- vehicles
create table public.vehicles (
  id uuid primary key default gen_random_uuid(),
  registration_no text not null unique check (registration_no ~ '^[A-Z0-9]{2,12}$'),
  owner_title public.owner_title not null default 'none',
  owner_name text not null check (length(trim(owner_name)) between 2 and 120),
  default_driver_id uuid references public.drivers (id),
  active boolean not null default true,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- routes
create table public.routes (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 2 and 120),
  from_place text not null check (length(trim(from_place)) between 2 and 80),
  to_place text not null check (length(trim(to_place)) between 2 and 80),
  is_default boolean not null default false,
  active boolean not null default true,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (not is_default or active)
);
-- exactly one default among active routes (at most one enforced here; setup creates the first)
create unique index routes_one_default on public.routes ((true)) where is_default;

-- ---------------------------------------------------------------- settings (single row)
create table public.association_settings (
  id boolean primary key default true check (id),
  association_name text not null,
  short_name text not null,
  street_address text not null,
  town text not null,
  postal_code text not null,
  cell_no text not null,
  email text not null,
  registration_no text not null,
  chairperson_line text not null,
  secretary_line text not null,
  logo_path text not null,
  watermark_path text,
  paper_size text not null default 'letter' check (paper_size in ('letter', 'a4')),
  passenger_limit integer not null default 29 check (passenger_limit between 1 and 29),
  child_limit integer not null default 3 check (child_limit between 0 and 3),
  show_list_reference boolean not null default false,
  updated_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.committee_members (
  id uuid primary key default gen_random_uuid(),
  role_title text not null check (length(trim(role_title)) between 2 and 60),
  name text not null check (length(trim(name)) between 2 and 120),
  sort_order integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- trips (the lists)
create table public.trips (
  id uuid primary key default gen_random_uuid(),
  trip_date date not null,
  vehicle_id uuid not null references public.vehicles (id),
  driver_id uuid not null references public.drivers (id),
  route_id uuid not null references public.routes (id),
  marshal_id uuid not null references public.profiles (id),
  marshal_name text not null,
  status public.trip_status not null default 'draft',
  closed_at timestamptz,
  closed_by uuid references public.profiles (id),
  print_snapshot jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((status = 'closed') = (closed_at is not null and print_snapshot is not null))
);
create index trips_date_idx on public.trips (trip_date desc);
create index trips_marshal_idx on public.trips (marshal_id, trip_date desc);
create index trips_vehicle_idx on public.trips (vehicle_id, trip_date desc);
create index trips_status_idx on public.trips (status, created_at);

-- ---------------------------------------------------------------- passengers (directory)
create table public.passengers (
  id uuid primary key default gen_random_uuid(),
  full_name text not null check (length(trim(full_name)) between 2 and 120),
  next_of_kin_no text not null check (next_of_kin_no ~ '^\+27[0-9]{9}$'),
  last_from_address text,
  last_destination_address text,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index passengers_name_trgm on public.passengers using gin (full_name gin_trgm_ops);
create index passengers_kin_idx on public.passengers (next_of_kin_no);

-- ---------------------------------------------------------------- trip passengers
-- id is generated on the phone so offline retries are idempotent (upsert on id)
create table public.trip_passengers (
  id uuid primary key,
  trip_id uuid not null references public.trips (id) on delete restrict,
  passenger_id uuid not null references public.passengers (id),
  full_name text not null check (length(trim(full_name)) between 2 and 120),
  from_address text not null check (length(trim(from_address)) between 2 and 120),
  destination_address text not null check (length(trim(destination_address)) between 2 and 120),
  next_of_kin_no text not null check (next_of_kin_no ~ '^\+27[0-9]{9}$'),
  paid_cents integer not null check (paid_cents between 0 and 500000),
  is_child boolean not null default false,
  seat_order integer not null,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index trip_passengers_trip_idx on public.trip_passengers (trip_id, is_child, seat_order);
create index trip_passengers_passenger_idx on public.trip_passengers (passenger_id);

create table public.trip_reopenings (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id),
  reopened_by uuid not null references public.profiles (id),
  reason text not null check (length(trim(reason)) >= 5),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- audit log (insert-only)
create table public.audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles (id),
  actor_name text,
  action text not null,
  entity text not null,
  entity_id text,
  before jsonb,
  after jsonb,
  reason text,
  created_at timestamptz not null default now()
);
create index audit_log_created_idx on public.audit_log (created_at desc);
create index audit_log_actor_idx on public.audit_log (actor_id, created_at desc);
create index audit_log_entity_idx on public.audit_log (entity, entity_id);

-- ---------------------------------------------------------------- updated_at triggers
do $$
declare t text;
begin
  foreach t in array array['profiles','drivers','vehicles','routes','association_settings',
                           'committee_members','trips','passengers','trip_passengers']
  loop
    execute format('create trigger %I_touch before update on public.%I
                    for each row execute function public.touch_updated_at()', t, t);
  end loop;
end $$;
