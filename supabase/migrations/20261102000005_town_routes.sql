-- QIBING Transport Association: a route from the association's town to every South African town
-- Routes start at association_settings.town (Wepener), so this adds nothing before first-run setup;
-- the setup route calls add_town_routes() once setup is complete. Safe to run again: existing
-- routes (same from/to, any spelling case) are skipped, and none are changed or removed.
-- Names that occur in two provinces carry the province: Middelburg (MP) / Middelburg (EC).

create table if not exists public.sa_towns (
  name text primary key,
  province text not null check (province in ('EC','FS','GP','KZN','LP','MP','NC','NW','WC'))
);
alter table public.sa_towns enable row level security;
drop policy if exists sa_towns_select on public.sa_towns;
create policy sa_towns_select on public.sa_towns for select to authenticated using (true);
revoke insert, update, delete on public.sa_towns from authenticated;

insert into public.sa_towns (name, province) values
-- Free State
('Allanridge','FS'),('Arlington','FS'),('Bethlehem','FS'),('Bethulie','FS'),('Bloemfontein','FS'),
('Boshof','FS'),('Bothaville','FS'),('Botshabelo','FS'),('Brandfort','FS'),('Bultfontein','FS'),
('Clarens','FS'),('Clocolan','FS'),('Cornelia','FS'),('Dealesville','FS'),('Deneysville','FS'),
('Dewetsdorp','FS'),('Edenburg','FS'),('Edenville','FS'),('Excelsior','FS'),('Fauresmith','FS'),
('Ficksburg','FS'),('Fouriesburg','FS'),('Frankfort','FS'),('Harrismith','FS'),('Heilbron','FS'),
('Hennenman','FS'),('Hertzogville','FS'),('Hobhouse','FS'),('Hoopstad','FS'),('Jacobsdal','FS'),
('Jagersfontein','FS'),('Kestell','FS'),('Koffiefontein','FS'),('Koppies','FS'),('Kroonstad','FS'),
('Ladybrand','FS'),('Lindley','FS'),('Luckhoff','FS'),('Marquard','FS'),('Memel','FS'),
('Odendaalsrus','FS'),('Oranjeville','FS'),('Parys','FS'),('Paul Roux','FS'),('Petrus Steyn','FS'),
('Petrusburg','FS'),('Philippolis','FS'),('Phuthaditjhaba','FS'),('Reddersburg','FS'),('Reitz','FS'),
('Rosendal','FS'),('Rouxville','FS'),('Sasolburg','FS'),('Senekal','FS'),('Smithfield','FS'),
('Springfontein','FS'),('Steynsrus','FS'),('Thaba Nchu','FS'),('Theunissen','FS'),('Trompsburg','FS'),
('Tweeling','FS'),('Tweespruit','FS'),('Van Stadensrus','FS'),('Ventersburg','FS'),('Viljoenskroon','FS'),
('Villiers','FS'),('Virginia','FS'),('Vrede','FS'),('Vredefort','FS'),('Warden','FS'),
('Welkom','FS'),('Wepener','FS'),('Wesselsbron','FS'),('Winburg','FS'),('Zastron','FS'),
-- Gauteng
('Alberton','GP'),('Atteridgeville','GP'),('Benoni','GP'),('Boksburg','GP'),('Brakpan','GP'),
('Bronkhorstspruit','GP'),('Carletonville','GP'),('Centurion','GP'),('Cullinan','GP'),('Daveyton','GP'),
('Diepsloot','GP'),('Edenvale','GP'),('Ennerdale','GP'),('Evaton','GP'),('Ga-Rankuwa','GP'),
('Germiston','GP'),('Hammanskraal','GP'),('Heidelberg (GP)','GP'),('Johannesburg','GP'),('Katlehong','GP'),
('Kempton Park','GP'),('Krugersdorp','GP'),('KwaThema','GP'),('Lenasia','GP'),('Mabopane','GP'),
('Magaliesburg','GP'),('Mamelodi','GP'),('Meyerton','GP'),('Midrand','GP'),('Nigel','GP'),
('Orange Farm','GP'),('Pretoria','GP'),('Randburg','GP'),('Randfontein','GP'),('Roodepoort','GP'),
('Sandton','GP'),('Sebokeng','GP'),('Soshanguve','GP'),('Soweto','GP'),('Springs','GP'),
('Tembisa','GP'),('Tsakane','GP'),('Vanderbijlpark','GP'),('Vereeniging','GP'),('Vosloorus','GP'),
('Westonaria','GP'),
-- North West
('Bloemhof','NW'),('Brits','NW'),('Christiana','NW'),('Coligny','NW'),('Delareyville','NW'),
('Ganyesa','NW'),('Groot Marico','NW'),('Hartbeespoort','NW'),('Klerksdorp','NW'),('Koster','NW'),
('Letlhabile','NW'),('Lichtenburg','NW'),('Mahikeng','NW'),('Marikana','NW'),('Mmabatho','NW'),
('Mogwase','NW'),('Mooinooi','NW'),('Orkney','NW'),('Ottosdal','NW'),('Phokeng','NW'),
('Potchefstroom','NW'),('Reivilo','NW'),('Rustenburg','NW'),('Sannieshof','NW'),('Schweizer-Reneke','NW'),
('Stella','NW'),('Stilfontein','NW'),('Swartruggens','NW'),('Taung','NW'),('Tlhabane','NW'),
('Ventersdorp','NW'),('Vryburg','NW'),('Wolmaransstad','NW'),('Zeerust','NW'),
-- Northern Cape
('Alexander Bay','NC'),('Barkly West','NC'),('Brandvlei','NC'),('Britstown','NC'),('Calvinia','NC'),
('Campbell','NC'),('Carnarvon','NC'),('Colesberg','NC'),('Danielskuil','NC'),('De Aar','NC'),
('Delportshoop','NC'),('Douglas','NC'),('Fraserburg','NC'),('Garies','NC'),('Griekwastad','NC'),
('Groblershoop','NC'),('Hanover','NC'),('Hartswater','NC'),('Hopetown','NC'),('Hotazel','NC'),
('Jan Kempdorp','NC'),('Kakamas','NC'),('Kamieskroon','NC'),('Kathu','NC'),('Keimoes','NC'),
('Kenhardt','NC'),('Kimberley','NC'),('Kuruman','NC'),('Loeriesfontein','NC'),('Loxton','NC'),
('Marydale','NC'),('Nababeep','NC'),('Niekerkshoop','NC'),('Noupoort','NC'),('Okiep','NC'),
('Olifantshoek','NC'),('Petrusville','NC'),('Philipstown','NC'),('Pofadder','NC'),('Port Nolloth','NC'),
('Postmasburg','NC'),('Prieska','NC'),('Richmond (NC)','NC'),('Springbok','NC'),('Strydenburg','NC'),
('Sutherland','NC'),('Upington','NC'),('Vanderkloof','NC'),('Victoria West','NC'),('Vosburg','NC'),
('Warrenton','NC'),('Williston','NC'),('Windsorton','NC'),
-- Eastern Cape
('Aberdeen','EC'),('Adelaide','EC'),('Alexandria','EC'),('Alice','EC'),('Aliwal North','EC'),
('Barkly East','EC'),('Bathurst','EC'),('Bedford','EC'),('Bhisho','EC'),('Bizana','EC'),
('Burgersdorp','EC'),('Butterworth','EC'),('Cala','EC'),('Cathcart','EC'),('Centane','EC'),
('Cofimvaba','EC'),('Cradock','EC'),('Despatch','EC'),('Dordrecht','EC'),('East London','EC'),
('Elliot','EC'),('Flagstaff','EC'),('Fort Beaufort','EC'),('Gqeberha','EC'),('Graaff-Reinet','EC'),
('Hankey','EC'),('Hofmeyr','EC'),('Humansdorp','EC'),('Idutywa','EC'),('Indwe','EC'),
('Jamestown','EC'),('Jansenville','EC'),('Jeffreys Bay','EC'),('Joubertina','EC'),('Kareedouw','EC'),
('Kariega','EC'),('Keiskammahoek','EC'),('Kenton-on-Sea','EC'),('King William''s Town','EC'),('Kirkwood','EC'),
('Komani','EC'),('Komga','EC'),('Lady Frere','EC'),('Lady Grey','EC'),('Libode','EC'),
('Lusikisiki','EC'),('Maclear','EC'),('Makhanda','EC'),('Matatiele','EC'),('Mdantsane','EC'),
('Middelburg (EC)','EC'),('Middledrift','EC'),('Molteno','EC'),('Mount Ayliff','EC'),('Mount Fletcher','EC'),
('Mount Frere','EC'),('Mqanduli','EC'),('Mthatha','EC'),('Ngcobo','EC'),('Ngqeleni','EC'),
('Ntabankulu','EC'),('Patensie','EC'),('Pearston','EC'),('Peddie','EC'),('Port Alfred','EC'),
('Port St Johns','EC'),('Qumbu','EC'),('Somerset East','EC'),('Sterkspruit','EC'),('Sterkstroom','EC'),
('Steynsburg','EC'),('Steytlerville','EC'),('Stutterheim','EC'),('Tarkastad','EC'),('Tsolo','EC'),
('Tsomo','EC'),('Ugie','EC'),('Venterstad','EC'),('Whittlesea','EC'),('Willowmore','EC'),
('Willowvale','EC'),('Zwelitsha','EC'),
-- KwaZulu-Natal
('Amanzimtoti','KZN'),('Babanango','KZN'),('Ballito','KZN'),('Bergville','KZN'),('Bulwer','KZN'),
('Camperdown','KZN'),('Colenso','KZN'),('Creighton','KZN'),('Dannhauser','KZN'),('Dundee','KZN'),
('Durban','KZN'),('Empangeni','KZN'),('Eshowe','KZN'),('Estcourt','KZN'),('Gingindlovu','KZN'),
('Glencoe','KZN'),('Greytown','KZN'),('Hammarsdale','KZN'),('Harding','KZN'),('Hibberdene','KZN'),
('Himeville','KZN'),('Hlabisa','KZN'),('Hluhluwe','KZN'),('Howick','KZN'),('Impendle','KZN'),
('Ingwavuma','KZN'),('Ixopo','KZN'),('Jozini','KZN'),('Kokstad','KZN'),('Kranskop','KZN'),
('KwaDukuza','KZN'),('Ladysmith','KZN'),('Louwsburg','KZN'),('Madadeni','KZN'),('Mahlabathini','KZN'),
('Mandeni','KZN'),('Manguzi','KZN'),('Margate','KZN'),('Melmoth','KZN'),('Mkuze','KZN'),
('Mooi River','KZN'),('Mtubatuba','KZN'),('Mtunzini','KZN'),('New Hanover','KZN'),('Newcastle','KZN'),
('Nkandla','KZN'),('Nongoma','KZN'),('Nottingham Road','KZN'),('Nquthu','KZN'),('Paulpietersburg','KZN'),
('Pietermaritzburg','KZN'),('Pinetown','KZN'),('Pongola','KZN'),('Port Shepstone','KZN'),('Richards Bay','KZN'),
('Richmond (KZN)','KZN'),('Scottburgh','KZN'),('Tongaat','KZN'),('Ulundi','KZN'),('Umkomaas','KZN'),
('Umlazi','KZN'),('Umzinto','KZN'),('Underberg','KZN'),('Utrecht','KZN'),('Verulam','KZN'),
('Vryheid','KZN'),('Wartburg','KZN'),('Weenen','KZN'),('Winterton','KZN'),
-- Mpumalanga
('Acornhoek','MP'),('Amersfoort','MP'),('Badplaas','MP'),('Balfour','MP'),('Barberton','MP'),
('Belfast','MP'),('Bethal','MP'),('Bushbuckridge','MP'),('Carolina','MP'),('Delmas','MP'),
('Dullstroom','MP'),('eMalahleni','MP'),('Ermelo','MP'),('Evander','MP'),('Graskop','MP'),
('Greylingstad','MP'),('Hazyview','MP'),('Hendrina','MP'),('Kabokweni','MP'),('KaNyamazane','MP'),
('Komatipoort','MP'),('Kriel','MP'),('KwaMhlanga','MP'),('Leandra','MP'),('Lydenburg','MP'),
('Machadodorp','MP'),('Malelane','MP'),('Matsulu','MP'),('Mbombela','MP'),('Middelburg (MP)','MP'),
('Morgenzon','MP'),('Ogies','MP'),('Piet Retief','MP'),('Pilgrim''s Rest','MP'),('Sabie','MP'),
('Secunda','MP'),('Siyabuswa','MP'),('Standerton','MP'),('Thulamahashe','MP'),('Trichardt','MP'),
('Volksrust','MP'),('Wakkerstroom','MP'),('Waterval Boven','MP'),('White River','MP'),
-- Limpopo
('Alldays','LP'),('Bela-Bela','LP'),('Botlokwa','LP'),('Burgersfort','LP'),('Elim','LP'),
('Giyani','LP'),('Gravelotte','LP'),('Groblersdal','LP'),('Haenertsburg','LP'),('Hoedspruit','LP'),
('Jane Furse','LP'),('Lebowakgomo','LP'),('Lephalale','LP'),('Lenyenye','LP'),('Letsitele','LP'),
('Makhado','LP'),('Malamulele','LP'),('Mankweng','LP'),('Marble Hall','LP'),('Modimolle','LP'),
('Modjadjiskloof','LP'),('Mogwadi','LP'),('Mokopane','LP'),('Mookgophong','LP'),('Musina','LP'),
('Namakgale','LP'),('Northam','LP'),('Phalaborwa','LP'),('Polokwane','LP'),('Roedtan','LP'),
('Senwabarwana','LP'),('Seshego','LP'),('Steelpoort','LP'),('Thabazimbi','LP'),('Thohoyandou','LP'),
('Tzaneen','LP'),('Vaalwater','LP'),
-- Western Cape
('Albertinia','WC'),('Ashton','WC'),('Atlantis','WC'),('Barrydale','WC'),('Beaufort West','WC'),
('Bellville','WC'),('Bredasdorp','WC'),('Caledon','WC'),('Calitzdorp','WC'),('Cape Town','WC'),
('Ceres','WC'),('Citrusdal','WC'),('Clanwilliam','WC'),('Darling','WC'),('De Doorns','WC'),
('De Rust','WC'),('Franschhoek','WC'),('Gansbaai','WC'),('George','WC'),('Gordon''s Bay','WC'),
('Grabouw','WC'),('Heidelberg (WC)','WC'),('Hermanus','WC'),('Hopefield','WC'),('Khayelitsha','WC'),
('Kleinmond','WC'),('Klawer','WC'),('Knysna','WC'),('Kuils River','WC'),('Ladismith','WC'),
('Laingsburg','WC'),('Lambert''s Bay','WC'),('Langebaan','WC'),('Malmesbury','WC'),('Merweville','WC'),
('Mitchells Plain','WC'),('Montagu','WC'),('Moorreesburg','WC'),('Mossel Bay','WC'),('Murraysburg','WC'),
('Napier','WC'),('Oudtshoorn','WC'),('Paarl','WC'),('Piketberg','WC'),('Plettenberg Bay','WC'),
('Porterville','WC'),('Prince Albert','WC'),('Riebeek-Kasteel','WC'),('Riversdale','WC'),('Robertson','WC'),
('Saldanha','WC'),('Sedgefield','WC'),('Somerset West','WC'),('Stellenbosch','WC'),('Still Bay','WC'),
('Strand','WC'),('Struisbaai','WC'),('Swellendam','WC'),('Touws River','WC'),('Tulbagh','WC'),
('Uniondale','WC'),('Vanrhynsdorp','WC'),('Velddrif','WC'),('Vredenburg','WC'),('Vredendal','WC'),
('Wellington','WC'),('Wolseley','WC'),('Worcester','WC')
on conflict (name) do nothing;

-- Adds "<home town> to <town>" for every town that has no route yet. Returns how many were added.
-- Row-by-row audit entries are switched off for the bulk insert and replaced by one summary entry.
create or replace function public.add_town_routes(p_actor uuid default null)
returns integer language plpgsql security definer set search_path = public as $$
declare
  v_home text;
  v_added integer;
begin
  select trim(town) into v_home from association_settings;
  if v_home is null then return 0; end if;

  alter table routes disable trigger routes_audit;
  insert into routes (name, from_place, to_place, is_default, active, created_by)
  select v_home || ' to ' || t.name, v_home, t.name, false, true, p_actor
    from sa_towns t
   where lower(t.name) <> lower(v_home)
     and not exists (select 1 from routes r
                      where lower(r.from_place) = lower(v_home) and lower(r.to_place) = lower(t.name));
  get diagnostics v_added = row_count;
  alter table routes enable trigger routes_audit;

  if v_added > 0 then
    perform write_audit(p_actor, 'add_town_routes', 'routes', null, null,
                        jsonb_build_object('added', v_added, 'from', v_home));
  end if;
  return v_added;
end $$;

revoke execute on function public.add_town_routes(uuid) from public, anon, authenticated;
grant execute on function public.add_town_routes(uuid) to service_role;

-- For an association that has already finished setup.
select public.add_town_routes();
