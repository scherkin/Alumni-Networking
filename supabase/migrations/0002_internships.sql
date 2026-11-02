-- Internship board: graduates and staff post openings, every signed-in member can read them.

create table public.internships (
  id            uuid primary key default gen_random_uuid(),
  posted_by     uuid references public.members (id) on delete cascade,   -- empty only for sample postings
  is_sample     boolean not null default false,                         -- made-up demo posting
  sample_poster_id uuid references public.alumni_profiles (id) on delete set null,
  company       text not null check (length(company) between 1 and 120),
  role_title    text not null check (length(role_title) between 1 and 120),
  description   text not null check (length(description) between 1 and 600),
  signup_url    text not null check (signup_url ~* '^https?://[^\s]+$'),
  spots         int check (spots between 1 and 1000),
  grade_levels  text[] not null default '{}',
  min_gpa       numeric(3, 2) check (min_gpa between 0 and 5),
  experience    text check (length(experience) <= 600),
  paid          boolean not null,
  pay_details   text check (length(pay_details) <= 120),
  location      text check (length(location) <= 120),
  field         text,
  deadline      date,
  is_open       boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint internships_has_poster check (posted_by is not null or is_sample)
);
create index internships_open_idx on public.internships (is_open, created_at desc);

create or replace function public.can_post_internships() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select role in ('alum', 'teacher') or is_staff from public.members where id = auth.uid()), false);
$$;

alter table public.internships enable row level security;
create policy "members read internships" on public.internships
  for select to authenticated using (true);
create policy "graduates and staff post internships" on public.internships
  for insert to authenticated with check (posted_by = auth.uid() and is_sample = false and public.can_post_internships());
create policy "posters and staff edit internships" on public.internships
  for update to authenticated using (posted_by = auth.uid() or public.is_staff());
create policy "posters and staff delete internships" on public.internships
  for delete to authenticated using (posted_by = auth.uid() or public.is_staff());

-- Who posted it can't be changed after the fact.
revoke update on public.internships from authenticated;
grant update (company, role_title, description, signup_url, spots, grade_levels, min_gpa, experience,
              paid, pay_details, location, field, deadline, is_open, updated_at)
  on public.internships to authenticated;
