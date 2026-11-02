-- Alumni Network schema: members, alumni profiles, private conversations, claim codes.
-- Every table has row level security. Server-only tables have no policies, so only the
-- service role (used by server code) can touch them.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Members: one row per signed-in person
-- ---------------------------------------------------------------------------
create type public.member_role as enum ('student', 'alum', 'teacher');

create table public.members (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text not null default '',
  avatar_url  text,
  role        public.member_role not null default 'student',
  grad_year   int check (grad_year between 1900 and 2100),
  linkedin_url text,
  is_staff    boolean not null default false,   -- granted by the server, never by the member
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select is_staff from public.members where id = auth.uid()), false);
$$;

alter table public.members enable row level security;
create policy "members are visible to signed-in users" on public.members
  for select to authenticated using (true);
create policy "members create their own row" on public.members
  for insert to authenticated with check (id = auth.uid() and is_staff = false);
create policy "members update their own row" on public.members
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- Members may not change is_staff: only these columns are updatable.
revoke update on public.members from authenticated;
grant update (full_name, avatar_url, role, grad_year, linkedin_url, updated_at) on public.members to authenticated;

-- ---------------------------------------------------------------------------
-- Alumni profiles: the directory
-- ---------------------------------------------------------------------------
create table public.alumni_profiles (
  id                uuid primary key default gen_random_uuid(),
  name              text not null check (length(name) between 1 and 120),
  class_year        int  not null check (class_year between 1900 and 2100),
  field             text not null,
  specialty         text,
  title             text,
  organization      text,
  city              text,
  college           text,
  open_to           text[] not null default '{}',
  email             text,
  phone             text,
  linkedin_url      text,
  preferred_contact text,
  bio               text check (length(bio) <= 4000),
  consent           boolean not null default false,  -- graduate agreed to share contact details
  is_sample         boolean not null default false,  -- made-up demo data
  claimed_by        uuid unique references public.members (id) on delete set null,
  created_by        uuid references public.members (id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index alumni_profiles_field_idx on public.alumni_profiles (field);
create index alumni_profiles_email_idx on public.alumni_profiles (lower(email));

alter table public.alumni_profiles enable row level security;
create policy "directory is visible to signed-in users" on public.alumni_profiles
  for select to authenticated using (true);
create policy "members can add profiles" on public.alumni_profiles
  for insert to authenticated with check (created_by = auth.uid() and claimed_by is null and is_sample = false);
create policy "owners and staff edit profiles" on public.alumni_profiles
  for update to authenticated
  using (claimed_by = auth.uid() or (claimed_by is null and created_by = auth.uid()) or public.is_staff());
create policy "staff delete profiles" on public.alumni_profiles
  for delete to authenticated using (public.is_staff());

-- Claims only change through verified server code, so claimed_by is not updatable by users.
revoke update on public.alumni_profiles from authenticated;
grant update (name, class_year, field, specialty, title, organization, city, college, open_to,
              email, phone, linkedin_url, preferred_contact, bio, consent, updated_at)
  on public.alumni_profiles to authenticated;

-- ---------------------------------------------------------------------------
-- Conversations: a member writing to an alumni profile. Private to the two sides + staff.
-- ---------------------------------------------------------------------------
create table public.conversations (
  id              uuid primary key default gen_random_uuid(),
  starter_id      uuid not null references public.members (id) on delete cascade,
  alumni_id       uuid not null references public.alumni_profiles (id) on delete cascade,
  created_at      timestamptz not null default now(),
  last_message_at timestamptz not null default now(),
  unique (starter_id, alumni_id)
);

create or replace function public.is_participant(conv_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.conversations c
    left join public.alumni_profiles a on a.id = c.alumni_id
    where c.id = conv_id and (c.starter_id = auth.uid() or a.claimed_by = auth.uid())
  );
$$;

alter table public.conversations enable row level security;
create policy "participants and staff read conversations" on public.conversations
  for select to authenticated using (public.is_participant(id) or public.is_staff());
create policy "members start conversations" on public.conversations
  for insert to authenticated with check (
    starter_id = auth.uid()
    and not exists (select 1 from public.alumni_profiles a where a.id = alumni_id and a.claimed_by = auth.uid())
  );

create table public.messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id       uuid not null references public.members (id) on delete cascade,
  body            text not null check (length(body) between 1 and 4000),
  emailed_at      timestamptz,
  created_at      timestamptz not null default now()
);
create index messages_conversation_idx on public.messages (conversation_id, created_at);

alter table public.messages enable row level security;
create policy "participants and staff read messages" on public.messages
  for select to authenticated using (public.is_participant(conversation_id) or public.is_staff());
create policy "participants send messages" on public.messages
  for insert to authenticated with check (sender_id = auth.uid() and public.is_participant(conversation_id));

-- Keep the conversation list ordered by latest activity.
create or replace function public.touch_conversation() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.conversations set last_message_at = new.created_at where id = new.conversation_id;
  return new;
end $$;
create trigger messages_touch after insert on public.messages
  for each row execute function public.touch_conversation();

create table public.conversation_reads (
  conversation_id uuid references public.conversations (id) on delete cascade,
  member_id       uuid references public.members (id) on delete cascade,
  last_read_at    timestamptz not null default now(),
  primary key (conversation_id, member_id)
);
alter table public.conversation_reads enable row level security;
create policy "members manage their own read markers" on public.conversation_reads
  for all to authenticated using (member_id = auth.uid()) with check (member_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Claim codes: server-only (no policies), hashed, expiring, attempt-limited
-- ---------------------------------------------------------------------------
create table public.claim_codes (
  alumni_id  uuid primary key references public.alumni_profiles (id) on delete cascade,
  member_id  uuid not null references public.members (id) on delete cascade,
  code_hash  text not null,
  attempts   int not null default 0,
  expires_at timestamptz not null,
  sent_at    timestamptz not null default now()
);
alter table public.claim_codes enable row level security;

-- Live message delivery (row level security still applies to realtime).
alter publication supabase_realtime add table public.messages;

-- Number of conversations with messages the caller hasn't read yet.
create or replace function public.unread_count() returns int
language sql stable security invoker set search_path = public as $$
  select count(*)::int
  from public.conversations c
  where public.is_participant(c.id)
    and exists (
      select 1 from public.messages m
      where m.conversation_id = c.id
        and m.sender_id <> auth.uid()
        and m.created_at > coalesce(
          (select r.last_read_at from public.conversation_reads r
            where r.conversation_id = c.id and r.member_id = auth.uid()),
          '-infinity'::timestamptz)
    );
$$;
