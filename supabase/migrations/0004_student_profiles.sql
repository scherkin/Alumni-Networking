-- Student details collected at sign-up: activities, interests and an optional transcript PDF.
--
-- Who can see what:
--   * Activities and interests: the student, staff, and graduates the student has messaged
--     (so a graduate knows who is writing to them).
--   * The transcript file: only the student and staff.

create table public.student_profiles (
  member_id            uuid primary key references public.members (id) on delete cascade,
  academic_activities  text[] not null default '{}',   -- e.g. "National Honor Society", "AP Biology"
  extracurriculars     text[] not null default '{}',   -- e.g. "Varsity soccer", "School newspaper"
  interests            text[] not null default '{}',   -- career fields from the directory's list
  interest_notes       text check (length(interest_notes) <= 500),
  transcript_path      text,                            -- object path in the private "transcripts" bucket
  transcript_name      text check (length(transcript_name) <= 200),
  transcript_uploaded_at timestamptz,
  updated_at           timestamptz not null default now(),
  check (cardinality(academic_activities) <= 20 and cardinality(extracurriculars) <= 20 and cardinality(interests) <= 20)
);

alter table public.student_profiles enable row level security;

create policy "student, staff and contacted graduates read" on public.student_profiles
  for select to authenticated using (
    member_id = auth.uid()
    or public.is_staff()
    or exists (
      select 1 from public.conversations c
      join public.alumni_profiles a on a.id = c.alumni_id
      where c.starter_id = student_profiles.member_id and a.claimed_by = auth.uid()
    )
  );
create policy "students create their own profile" on public.student_profiles
  for insert to authenticated with check (member_id = auth.uid());
create policy "students update their own profile" on public.student_profiles
  for update to authenticated using (member_id = auth.uid()) with check (member_id = auth.uid());
create policy "students delete their own profile" on public.student_profiles
  for delete to authenticated using (member_id = auth.uid());

-- Private storage bucket for transcripts: PDF only, 10 MB maximum.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('transcripts', 'transcripts', false, 10485760, array['application/pdf'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Each student's files live in a folder named after their user id: transcripts/<user id>/transcript.pdf
create policy "students manage their own transcript" on storage.objects
  for all to authenticated
  using (bucket_id = 'transcripts' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'transcripts' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "staff read transcripts" on storage.objects
  for select to authenticated using (bucket_id = 'transcripts' and public.is_staff());
