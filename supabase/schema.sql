-- Database Schema for TuneTribe v2
-- City-based Listening Events

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Profiles (extends Supabase Auth)
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique,
  avatar_url text,
  city text default 'Toronto',
  top_genres text[] default '{}',
  top_artists jsonb default '[]',
  top_tracks jsonb default '[]',
  created_at timestamptz default now()
);

-- Trigger to create profile on user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data->>'name',
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Cities
create table cities (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  state text,
  country text not null default 'Canada',
  slug text unique not null,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- Insert Toronto as default city
insert into cities (name, state, country, slug) 
values ('Toronto', 'Ontario', 'Canada', 'toronto');

-- Genres (seed data)
create table genres (
  id uuid default gen_random_uuid() primary key,
  name text not null unique,
  slug text unique not null,
  image_url text
);

-- Seed common music genres
insert into genres (name, slug) values
  ('Pop', 'pop'),
  ('Rock', 'rock'),
  ('Hip-Hop', 'hip-hop'),
  ('R&B', 'rb'),
  ('Electronic', 'electronic'),
  ('Jazz', 'jazz'),
  ('Classical', 'classical'),
  ('Country', 'country'),
  ('Indie', 'indie'),
  ('Metal', 'metal'),
  ('Folk', 'folk'),
  ('Blues', 'blues'),
  ('Reggae', 'reggae'),
  ('Latin', 'latin'),
  ('World', 'world'),
  ('Alternative', 'alternative'),
  ('Dance', 'dance'),
  ('Soul', 'soul'),
  ('Punk', 'punk'),
  ('Lo-Fi', 'lofi'),
  -- Indian Music
  ('Indian Classical', 'indian-classical'),
  ('Bollywood', 'bollywood'),
  ('Bhangra', 'bhangra'),
  ('Filmi', 'filmi'),
  ('Indian Fusion', 'indian-fusion'),
  ('Carnatic', 'carnatic'),
  ('Hindustani Classical', 'hindustani-classical'),
  ('Qawwali', 'qawwali'),
  ('Indian Pop', 'indian-pop'),
  ('Desi Hip-Hop', 'desi-hip-hop'),
  ('Bhojpuri', 'bhojpuri'),
  ('Punjabi', 'punjabi'),
  ('Tamil', 'tamil'),
  ('Telugu', 'telugu'),
  ('Kannada', 'kannada'),
  ('Malayalam', 'malayalam'),
  ('Marathi', 'marathi'),
  ('Bengali', 'bengali'),
  -- Asian Music
  ('K-Pop', 'kpop'),
  ('J-Pop', 'jpop'),
  ('C-Pop', 'cpop'),
  ('Mandopop', 'mandopop'),
  ('Cantopop', 'cantopop'),
  ('Japanese City Pop', 'japanese-city-pop'),
  ('Chinese Classical', 'chinese-classical'),
  ('Traditional Chinese', 'traditional-chinese'),
  ('Okinawan', 'okinawan'),
  ('Vietnamese', 'vietnamese'),
  ('Thai', 'thai'),
  ('Indonesian', 'indonesian'),
  ('Malaysian', 'malaysian'),
  ('Filipino', 'filipino'),
  -- European Folk & Traditional
  ('Irish Folk', 'irish-folk'),
  ('Scottish Folk', 'scottish-folk'),
  ('English Folk', 'english-folk'),
  ('Welsh Folk', 'welsh-folk'),
  ('Breton', 'breton'),
  ('Galician', 'galician'),
  ('Catalan', 'catalan'),
  ('Basque', 'basque'),
  ('Scandinavian Folk', 'scandinavian-folk'),
  ('Nordic', 'nordic'),
  ('Finnish', 'finnish'),
  ('Swedish Folk', 'swedish-folk'),
  ('Norwegian Folk', 'norwegian-folk'),
  ('Danish Folk', 'danish-folk'),
  ('Icelandic', 'icelandic'),
  ('Baltic', 'baltic'),
  ('Estonian', 'estonian'),
  ('Latvian', 'latvian'),
  ('Lithuanian', 'lithuanian'),
  ('Polish Folk', 'polish-folk'),
  ('Czech Folk', 'czech-folk'),
  ('Slovak', 'slovak'),
  ('Hungarian Folk', 'hungarian-folk'),
  ('Romani', 'romani'),
  ('Balkans', 'balkans'),
  ('Greek Folk', 'greek-folk'),
  ('Turkish', 'turkish'),
  ('Armenian', 'armenian'),
  ('Georgian', 'georgian'),
  ('Caucasian', 'caucasian'),
  -- African Music
  ('Afrobeat', 'afrobeat'),
  ('Afro-Pop', 'afro-pop'),
  ('Highlife', 'highlife'),
  ('Juju', 'juju'),
  ('Fuji', 'fuji'),
  ('Jit', 'jit'),
  ('Kwaito', 'kwaito'),
  ('Amapiano', 'amapiano'),
  ('South African', 'south-african'),
  ('Nigerian', 'nigerian'),
  ('Ghanaian', 'ghanaian'),
  ('Senegalese', 'senegalese'),
  ('Malian', 'malian'),
  ('Moroccan', 'moroccan'),
  ('Ethiopian', 'ethiopian'),
  ('East African', 'east-african'),
  ('West African', 'west-african'),
  -- Latin American
  ('Salsa', 'salsa'),
  ('Bachata', 'bachata'),
  ('Merengue', 'merengue'),
  ('Cumbia', 'cumbia'),
  ('Tango', 'tango'),
  ('Samba', 'samba'),
  ('Bossa Nova', 'bossa-nova'),
  ('Forro', 'forro'),
  ('Sertanejo', 'sertanejo'),
  ('MPB', 'mpb'),
  ('Reggaeton', 'reggaeton'),
  ('Trap Latino', 'trap-latino'),
  ('Cumbia Villera', 'cumbia-villera'),
  ('Vallenato', 'vallenato'),
  ('Mariachi', 'mariachi'),
  ('Ranchera', 'ranchera'),
  ('Norteño', 'norteno'),
  ('Tejano', 'tejano'),
  ('Cuban', 'cuban'),
  ('Puerto Rican', 'puerto-rican'),
  ('Dominican', 'dominican'),
  -- Middle Eastern
  ('Arabic', 'arabic'),
  ('Arabic Pop', 'arabic-pop'),
  ('Shami', 'shami'),
  ('Lebanese', 'lebanese'),
  ('Egyptian',anese', 'le 'egyptian'),
  ('Persian', 'persian'),
  ('Iranian', 'iranian'),
  ('Israeli', 'israeli'),
  -- Electronic Subgenres
  ('House', 'house'),
  ('Techno', 'techno'),
  ('Trance', 'trance'),
  ('Drum & Bass', 'drum-and-bass'),
  ('Dubstep', 'dubstep'),
  ('Deep House', 'deep-house'),
  ('Progressive House', 'progressive-house'),
  ('Electro', 'electro'),
  ('IDM', 'idm'),
  ('Ambient', 'ambient'),
  ('Chillwave', 'chillwave'),
  ('Synthwave', 'synthwave'),
  ('Vaporwave', 'vaporwave'),
  ('Future Bass', 'future-bass'),
  ('Hardstyle', 'hardstyle'),
  ('Hardcore', 'hardcore'),
  ('Gabber', 'gabber'),
  ('Psytrance', 'psytrance'),
  ('Darkwave', 'darkwave'),
  ('Industrial', 'industrial'),
  -- Rock Subgenres
  ('Hard Rock', 'hard-rock'),
  ('Progressive Rock', 'progressive-rock'),
  ('Psychedelic Rock', 'psychedelic-rock'),
  ('Post-Rock', 'post-rock'),
  ('Shoegaze', 'shoegaze'),
  ('Dream Pop', 'dream-pop'),
  ('Gothic Rock', 'gothic-rock'),
  ('Post-Punk', 'post-punk'),
  ('New Wave', 'new-wave'),
  ('Power Pop', 'power-pop'),
  ('Grunge', 'grunge'),
  ('Stoner Rock', 'stoner-rock'),
  ('Doom Metal', 'doom-metal'),
  ('Death Metal', 'death-metal'),
  ('Black Metal', 'black-metal'),
  ('Thrash Metal', 'thrash-metal'),
  ('Heavy Metal', 'heavy-metal'),
  ('Metalcore', 'metalcore'),
  ('Deathcore', 'deathcore'),
  ('Math Rock', 'math-rock'),
  ('Emo', 'emo'),
  ('Screamo', 'screamo'),
  -- Hip-Hop Subgenres
  ('Trap', 'trap'),
  ('Old School Hip-Hop', 'old-school-hip-hop'),
  ('Boom Bap', 'boom-bap'),
  ('Conscious Hip-Hop', 'conscious-hip-hop'),
  ('Gangsta Rap', 'gangsta-rap'),
  ('Drill', 'drill'),
  ('Cloud Rap', 'cloud-rap'),
  ('Mumble Rap', 'mumble-rap'),
  ('Abstract Hip-Hop', 'abstract-hip-hop'),
  ('Jazz Rap', 'jazz-rap'),
  ('Country Rap', 'country-rap'),
  ('Latin Rap', 'latin-rap'),
  ('UK Hip-Hop', 'uk-hip-hop'),
  ('UK Grime', 'uk-grime'),
  -- Jazz & Blues Subgenres
  ('Smooth Jazz', 'smooth-jazz'),
  ('Free Jazz', 'free-jazz'),
  ('Fusion', 'fusion'),
  ('Bebop', 'bebop'),
  ('Swing', 'swing'),
  ('Big Band', 'big-band'),
  ('Cool Jazz', 'cool-jazz'),
  ('Hard Bop', 'hard-bop'),
  ('Soul Jazz', 'soul-jazz'),
  ('Acid Jazz', 'acid-jazz'),
  ('Delta Blues', 'delta-blues'),
  ('Chicago Blues', 'chicago-blues'),
  ('Texas Blues', 'texas-blues'),
  ('Jump Blues', 'jump-blues'),
  ('British Blues', 'british-blues'),
  -- Classical & Orchestral
  ('Orchestral', 'orchestral'),
  ('Chamber Music', 'chamber-music'),
  ('Baroque', 'baroque'),
  ('Romantic Classical', 'romantic-classical'),
  ('Opera', 'opera'),
  ('Symphony', 'symphony'),
  ('Minimalist', 'minimalist'),
  ('Contemporary Classical', 'contemporary-classical'),
  ('Renaissance', 'renaissance'),
  ('Medieval', 'medieval'),
  ('Indian Orchestral', 'indian-orchestral'),
  -- R&B & Soul Subgenres
  ('Neo-Soul', 'neo-soul'),
  ('Quiet Storm', 'quiet-storm'),
  ('New Jack Swing', 'new-jack-swing'),
  ('Funk', 'funk'),
  ('Disco', 'disco'),
  ('Boogie', 'boogie'),
  ('Gospel', 'gospel'),
  ('Contemporary R&B', 'contemporary-rb'),
  ('UK Soul', 'uk-soul'),
  ('Northern Soul', 'northern-soul'),
  -- Folk & Americana
  ('Americana', 'americana'),
  ('Bluegrass', 'bluegrass'),
  ('Old-Time', 'old-time'),
  ('Celtic', 'celtic'),
  ('Celtic Rock', 'celtic-rock'),
  ('New Weird America', 'new-weird-america'),
  ('Anti-Folk', 'anti-folk'),
  ('Contemporary Folk', 'contemporary-folk'),
  ('Singer-Songwriter', 'singer-songwriter'),
  ('Psychedelic Folk', 'psychedelic-folk'),
  ('Mumble Folk', 'mumble-folk'),
  -- Indie & Alternative
  ('Indie Rock', 'indie-rock'),
  ('Indie Pop', 'indie-pop'),
  ('Indie Folk', 'indie-folk'),
  ('Chamber Pop', 'chamber-pop'),
  ('Noise Pop', 'noise-pop'),
  ('Post-R&B', 'post-rb'),
  ('Alt-Country', 'alt-country'),
  ('Slowcore', 'slowcore'),
  ('Sadcore', 'sadcore'),
  ('Wonky', 'wonky'),
  ('Glam Rock', 'glam-rock'),
  ('Art Rock', 'art-rock'),
  ('Experimental', 'experimental'),
  ('Avant-Garde', 'avant-garde'),
  -- Pop Subgenres
  ('Synth Pop', 'synth-pop'),
  ('Electropop', 'electropop'),
  ('Dance-Pop', 'dance-pop'),
  ('Teen Pop', 'teen-pop'),
  ('Europop', 'europop'),
  ('Eurodance', 'eurodance'),
  ('Italo Disco', 'italo-disco'),
  ('Hi-NRG', 'hi-nrg'),
  ('Bubblegum Pop', 'bubblegum-pop'),
  ('Power Pop', 'power-pop'),
  -- Country Subgenres
  ('Nashville Sound', 'nashville-sound'),
  ('Outlaw Country', 'outlaw-country'),
  ('Alt-Country', 'alt-country'),
  ('Country Rock', 'country-rock'),
  ('Country Pop', 'country-pop'),
  ('Bro-Country', 'bro-country'),
  ('Texas Country', 'texas-country'),
  ('Red Dirt', 'red-dirt'),
  ('Bluegrass', 'bluegrass'),
  ('Honky Tonk', 'honky-tonk'),
  ('Western', 'western'),
  -- Other Genres
  ('Soundtrack', 'soundtrack'),
  ('Video Game Music', 'video-game-music'),
  ('Anime', 'anime'),
  ('Musical Theatre', 'musical-theatre'),
  ('Comedy', 'comedy'),
  ('Spoken Word', 'spoken-word'),
  ('New Age', 'new-age'),
  ('Meditation', 'meditation'),
  ('Sleep', 'sleep'),
  ('Podcast', 'podcast'),
  ('Audiobook', 'audiobook');

-- Listening Events
create table events (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  organizer_id uuid references profiles(id) on delete set null,
  city_id uuid references cities(id) on delete cascade,
  venue text not null,
  address text,
  date date,
  time time,
  is_recurring boolean default false,
  recurring_pattern text, -- e.g., 'weekly_friday', 'monthly_first_sunday'
  genre_id uuid references genres(id) on delete set null,
  cover_image text,
  max_attendees int,
  created_at timestamptz default now()
);

-- Event Attendees
create table event_attendees (
  event_id uuid references events(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  rsvp_status text default 'going' check (rsvp_status in ('going', 'maybe', 'not_going')),
  joined_at timestamptz default now(),
  primary key (event_id, user_id)
);

-- Connected Music Services (OAuth tokens)
create table connected_services (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade,
  provider text not null check (provider in ('spotify', 'apple', 'youtube')),
  access_token text,
  refresh_token text,
  expires_at timestamptz,
  unique(user_id, provider)
);

-- Disable RLS for development
alter table profiles disable row level security;
alter table cities disable row level security;
alter table genres disable row level security;
alter table events disable row level security;
alter table event_attendees disable row level security;
alter table connected_services disable row level security;
