-- Coding registry: the pick-lists the promote wizard reads instead of asking
-- a curator to type a code.
--
-- Every door whose subject is not decided by a project field (brand / program /
-- publication issue / topic) needs a small controlled vocabulary. Keeping it in
-- a table means a new brand or a new programme is a form submission, not a
-- deploy - which is the whole point of moving the wizard off free text.

create table if not exists lmsy_archive.catalog_registry (
  id uuid primary key default gen_random_uuid(),
  -- brand      -> BRAND subject, first segment
  -- program    -> TALK subject, second segment (scope = the talk shelf)
  -- publication-> MAG subject, first segment (issue number already folded in)
  -- topic      -> FEAT subject
  kind text not null check (kind in ('brand', 'program', 'publication', 'topic')),
  -- Only programs use it: interview / variety / radio. Empty string for the rest
  -- so the unique index works without NULL semantics.
  scope text not null default '',
  code text not null,
  name text not null,
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  constraint catalog_registry_code_shape check (code ~ '^[A-Z0-9]{2,24}$')
);

create unique index if not exists catalog_registry_unique
  on lmsy_archive.catalog_registry (kind, scope, code);

alter table lmsy_archive.catalog_registry enable row level security;

-- Everyone may read the vocabulary (the admin UI renders it, and codes are not
-- secret); only the service role writes, which is what the API route uses.
drop policy if exists catalog_registry_read on lmsy_archive.catalog_registry;
create policy catalog_registry_read on lmsy_archive.catalog_registry
  for select using (true);

-- Publications: spec section 4.2. The code carries the issue number when the
-- magazine numbers its issues (KAZZ217), so one row = one issue.
insert into lmsy_archive.catalog_registry (kind, code, name, sort_order) values
  ('publication', 'BEATXL',   'BEAT''XL',        10),
  ('publication', 'STARRY21', 'STARRY 星光画报', 20),
  ('publication', 'UNIQUE',   'UNIQUE',          30),
  ('publication', 'RETRO',    'RETRO',           40),
  ('publication', 'OAT',      'OAT',             50),
  ('publication', 'UMAG',     'U!',              60),
  ('publication', 'ISLAND',   'ISLAND JOY',      70),
  ('publication', 'GAZE',     'GAZE',            80),
  ('publication', 'THER',     'THE R',           90),
  ('publication', 'PERLA',    'PERLA',          100),
  ('publication', 'FIVEME',   'FIVEME',         110),
  ('publication', 'KAZZ211',  'KAZZ 211',       120),
  ('publication', 'KAZZ217',  'KAZZ 217',       130),
  ('publication', 'KAZZ2410', 'KAZZ 2024-10',   140),
  ('publication', 'KAZZ2502', 'KAZZ 2025-02',   150)
on conflict (kind, scope, code) do nothing;

-- Programs already in the archive: one variety spot and one radio hour. A new
-- programme is added from the wizard, not from here.
insert into lmsy_archive.catalog_registry (kind, scope, code, name, sort_order) values
  ('program', 'variety', 'INTHE8IGHT', 'InThe8ight', 10),
  ('program', 'radio',   'FLEX1045',   'Flex 104.5',  10)
on conflict (kind, scope, code) do nothing;

-- Topics: the one theme project that exists (Back View).
insert into lmsy_archive.catalog_registry (kind, code, name, sort_order) values
  ('topic', 'BACKVIEW', 'Back View', 10)
on conflict (kind, scope, code) do nothing;
