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
  ('Lo-Fi', 'lofi');

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
