-- Laptop Business Mastery Student Hub — database setup
-- Paste this whole file into Supabase → SQL Editor → New query → Run.
-- Safe to run more than once.

create table if not exists public.students (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  name text not null default '',
  status text not null default 'invited' check (status in ('invited', 'active', 'paused')),
  intake jsonb,
  roadmap_summary text,
  onboarded_at timestamptz,
  tasks_total int not null default 0,
  tasks_done int not null default 0,
  last_task_done_at timestamptz,
  last_checkin_at timestamptz,
  last_active_at timestamptz,
  ai_day date,
  ai_count int not null default 0,
  reminders jsonb not null default '{}'::jsonb,
  coach_notes text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  phase int not null,
  week int not null,
  sort int not null default 0,
  title text not null,
  details text not null default '',
  playbook_id text not null default '',
  done boolean not null default false,
  done_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists tasks_student_idx on public.tasks (student_id);

create table if not exists public.checkins (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  week_label text not null default '',
  data jsonb not null default '{}'::jsonb,
  report text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists checkins_student_idx on public.checkins (student_id, created_at desc);

create table if not exists public.auctions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  url text not null default '',
  title text not null default '',
  rating text not null default '',
  result jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists auctions_student_idx on public.auctions (student_id, created_at desc);

-- Your Coach Knowledge library: video transcripts, documents, rules, and verified answers.
create table if not exists public.knowledge (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'video' check (kind in ('video', 'doc', 'rules', 'faq')),
  title text not null default '',
  source_url text not null default '',
  content text not null default '',
  words int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists knowledge_active_idx on public.knowledge (active, kind);

-- Students' thumbs up / down on Coach answers, and your review queue.
create table if not exists public.coach_feedback (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references public.students(id) on delete set null,
  question text not null default '',
  answer text not null default '',
  rating text not null check (rating in ('up', 'down')),
  comment text not null default '',
  status text not null default 'open' check (status in ('open', 'answered', 'dismissed', 'noted')),
  knowledge_id uuid references public.knowledge(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists coach_feedback_status_idx on public.coach_feedback (status, created_at desc);

-- Added for password sign-in (safe to run on an existing database).
alter table public.students add column if not exists password_set boolean not null default false;

-- Client Success System: profile fields, the checklist, comments and the coach message board.
alter table public.students add column if not exists phone text not null default '';
alter table public.students add column if not exists location text not null default '';
alter table public.students add column if not exists business_name text not null default '';
alter table public.students add column if not exists domain text not null default '';
alter table public.students add column if not exists partner text not null default '';
alter table public.students add column if not exists tier text not null default '';
alter table public.students add column if not exists focus_brand text not null default '';
alter table public.students add column if not exists monthly_goal numeric;
alter table public.students add column if not exists weekly_unit_target int;
alter table public.students add column if not exists logo_url text not null default '';
alter table public.students add column if not exists website_url text not null default '';
alter table public.students add column if not exists owner text not null default '';
alter table public.students add column if not exists sections_done jsonb not null default '{}'::jsonb;
alter table public.students add column if not exists gate_opened_at timestamptz;
alter table public.students add column if not exists last_activity_at timestamptz;
alter table public.students add column if not exists last_contact_at timestamptz;
alter table public.students add column if not exists reminders_paused boolean not null default false;
alter table public.students add column if not exists brand jsonb not null default '{}'::jsonb;
alter table public.students add column if not exists brand_submitted_at timestamptz;
alter table public.students add column if not exists sms_opt_out boolean not null default false;

create table if not exists public.checklist_items (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  key text not null,
  value text not null default '',
  done boolean not null default false,
  done_at timestamptz,
  done_by_name text not null default '',
  due_override timestamptz,
  awaiting_reply boolean not null default false,
  comment_count int not null default 0,
  reminded_at timestamptz,
  created_at timestamptz not null default now(),
  unique (student_id, key)
);
create index if not exists checklist_items_student_idx on public.checklist_items (student_id);

create table if not exists public.item_comments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  item_key text not null,
  author text not null default '',
  from_team boolean not null default false,
  body text not null,
  created_at timestamptz not null default now()
);
create index if not exists item_comments_student_idx on public.item_comments (student_id, created_at);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  author text not null default '',
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists messages_student_idx on public.messages (student_id, created_at desc);

-- Lock every table. Only the server (service role key) reads and writes;
-- students go through the hub's own endpoints, which check who they are.
alter table public.students enable row level security;
alter table public.tasks enable row level security;
alter table public.checkins enable row level security;
alter table public.auctions enable row level security;
alter table public.knowledge enable row level security;
alter table public.coach_feedback enable row level security;
alter table public.checklist_items enable row level security;
alter table public.item_comments enable row level security;
alter table public.messages enable row level security;
