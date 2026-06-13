-- ============================================================
-- ONE DOT - Public Library / Global Leaderboard setup (Supabase)
--
-- 1. Create a free project at https://supabase.com
-- 2. Open the SQL Editor and run this whole file once
-- 3. Go to Project Settings -> API and copy the "Project URL"
--    and the "anon public" key
-- 4. Paste them into www/js/cloud.js as SUPABASE_URL and
--    SUPABASE_ANON_KEY
--
-- This whole script is idempotent - if you already ran an older version,
-- just run the whole file again to pick up new columns/policies/functions.
-- ============================================================

-- Shared songs + generated levels, uploaded by players
create table if not exists levels (
  id uuid primary key default gen_random_uuid(),
  song_hash text not null,
  title text not null,
  author_name text not null,
  bpm numeric,
  duration numeric,
  level_data jsonb not null,   -- { analysis, levelData } - same shape used locally
  storage_path text not null,  -- path inside the "songs" storage bucket
  play_count integer not null default 0,
  report_count integer not null default 0,  -- community moderation: auto-hidden past a threshold
  owner_token text,  -- secret held by the publishing device, lets it delete this level later
  created_at timestamptz not null default now()
);

-- (idempotent) add columns to projects created before they existed
alter table levels add column if not exists report_count integer not null default 0;
alter table levels add column if not exists owner_token text;

-- Global leaderboard entries, one per finished run on a shared level
create table if not exists scores (
  id uuid primary key default gen_random_uuid(),
  level_id uuid not null references levels(id) on delete cascade,
  player_name text not null,
  score numeric not null,
  max_combo integer,
  perfect_rate numeric,
  modifiers jsonb,
  created_at timestamptz not null default now()
);

create index if not exists scores_level_id_score_idx on scores (level_id, score desc);

-- Anonymous read/write: there is no login system, anyone can publish a
-- level or submit a score (RLS is still enabled so future restrictions
-- can be layered on without changing the app code).
alter table levels enable row level security;
alter table scores enable row level security;

-- Levels are public UNLESS the community has flagged them enough times
-- (5+ reports) - flagged levels disappear from every client automatically.
drop policy if exists "levels are publicly readable" on levels;
create policy "levels are publicly readable" on levels for select using (report_count < 5);

drop policy if exists "anyone can publish a level" on levels;
create policy "anyone can publish a level" on levels for insert with check (true);

drop policy if exists "anyone can bump play_count" on levels;
create policy "anyone can bump play_count" on levels for update using (true) with check (true);

-- Owner delete: the publishing device gets a random owner_token back from
-- publishLevel() and stores it locally. Deleting later sends it back as the
-- "x-owner-token" request header - PostgREST exposes request headers to RLS
-- via current_setting('request.headers', true), so only the matching device
-- can delete its own level (no login system needed).
drop policy if exists "owner can delete their level" on levels;
create policy "owner can delete their level" on levels for delete
  using (
    owner_token is not null
    and owner_token = (current_setting('request.headers', true)::json ->> 'x-owner-token')
  );

-- Cleanup: when a level row is deleted, also delete its audio file from the
-- "songs" bucket so storage doesn't accumulate orphaned uploads.
create or replace function delete_level_storage_object()
returns trigger as $$
begin
  delete from storage.objects where bucket_id = 'songs' and name = old.storage_path;
  return old;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_delete_level_storage_object on levels;
create trigger trg_delete_level_storage_object
  after delete on levels
  for each row execute function delete_level_storage_object();

drop policy if exists "scores are publicly readable" on scores;
create policy "scores are publicly readable" on scores for select using (true);

drop policy if exists "anyone can submit a score" on scores;
create policy "anyone can submit a score" on scores for insert with check (true);

-- RPC used to atomically increment play_count
create or replace function increment_play_count(p_level_id uuid)
returns void as $$
  update levels set play_count = play_count + 1 where id = p_level_id;
$$ language sql security definer;

grant execute on function increment_play_count(uuid) to anon;

-- Individual report records (reason kept for manual moderation review via
-- the Supabase dashboard). Write-only from clients - no select policy.
create table if not exists level_reports (
  id uuid primary key default gen_random_uuid(),
  level_id uuid not null references levels(id) on delete cascade,
  reason text not null default 'other',
  created_at timestamptz not null default now()
);

alter table level_reports enable row level security;

drop policy if exists "anyone can submit a report" on level_reports;
create policy "anyone can submit a report" on level_reports for insert with check (true);

-- RPC used to flag a level for moderation: records the reason and atomically
-- bumps report_count. Once a level reaches 5 reports the read policy above
-- hides it from everyone. Drop the old 1-arg signature first so calls with
-- just a level id (default reason 'other') and calls with a reason both work.
drop function if exists report_level(uuid);
create or replace function report_level(p_level_id uuid, p_reason text default 'other')
returns void as $$
begin
  insert into level_reports (level_id, reason) values (p_level_id, coalesce(p_reason, 'other'));
  update levels set report_count = report_count + 1 where id = p_level_id;
end;
$$ language plpgsql security definer;

grant execute on function report_level(uuid, text) to anon;

-- Storage bucket for uploaded song audio files.
-- A 15 MB per-file cap + audio-only MIME whitelist keep uploads cheap and
-- stop the bucket being abused as generic file hosting. Supabase enforces
-- both server-side, so a hacked client still cannot bypass them.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'songs', 'songs', true,
  15728640,  -- 15 MB
  array['audio/mpeg','audio/mp3','audio/mp4','audio/aac','audio/ogg','audio/opus','audio/wav','audio/x-wav','audio/flac','audio/x-m4a','audio/webm']
)
on conflict (id) do update
  set file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "songs are publicly readable" on storage.objects;
create policy "songs are publicly readable" on storage.objects
  for select using (bucket_id = 'songs');

drop policy if exists "anyone can upload a song" on storage.objects;
create policy "anyone can upload a song" on storage.objects
  for insert with check (bucket_id = 'songs');
