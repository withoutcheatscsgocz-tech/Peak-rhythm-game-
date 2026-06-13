-- ============================================================
-- ONE DOT - Public Library / Global Leaderboard setup (Supabase)
--
-- 1. Create a free project at https://supabase.com
-- 2. Open the SQL Editor and run this whole file once
-- 3. Go to Project Settings -> API and copy the "Project URL"
--    and the "anon public" key
-- 4. Paste them into www/js/cloud.js as SUPABASE_URL and
--    SUPABASE_ANON_KEY
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
  created_at timestamptz not null default now()
);

-- (idempotent) add moderation column to projects created before this column existed
alter table levels add column if not exists report_count integer not null default 0;

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

-- RPC used to flag a level for moderation (atomic increment). Once a level
-- reaches 5 reports the read policy above hides it from everyone.
create or replace function report_level(p_level_id uuid)
returns void as $$
  update levels set report_count = report_count + 1 where id = p_level_id;
$$ language sql security definer;

grant execute on function report_level(uuid) to anon;

-- Storage bucket for uploaded song audio files
insert into storage.buckets (id, name, public)
values ('songs', 'songs', true)
on conflict (id) do nothing;

drop policy if exists "songs are publicly readable" on storage.objects;
create policy "songs are publicly readable" on storage.objects
  for select using (bucket_id = 'songs');

drop policy if exists "anyone can upload a song" on storage.objects;
create policy "anyone can upload a song" on storage.objects
  for insert with check (bucket_id = 'songs');
