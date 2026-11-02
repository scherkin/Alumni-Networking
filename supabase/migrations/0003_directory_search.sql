-- Server-side directory search: seniority computed in the database, paged search, and filter counts.

-- Seniority level from job-title keywords (0 none, 1 student ... 6 executive/owner). Highest match wins.
create or replace function public.title_seniority(t text) returns int
language sql immutable parallel safe as $$
  select case
    when t is null or btrim(t) = '' then 0
    when t ~* 'physician assistant' then 4
    when t ~* '\y(student|trainee|apprentice)\y' then 1
    when t ~* '\y(chief|ceo|cfo|cto|coo|president|vice president|vp|owner|founder|partner|executive director|artistic director|publisher|mayor|senator|state representative|judge)\y' then 6
    when t ~* '\y(manager|director|administrator|head of|supervisor|principal|managing editor|executive chef|executive producer)\y' then 5
    when t ~* '\y(senior|sr|lead|physician|surgeon|cardiologist|dentist|cpa|actuary|professional engineer|attorney|architect|counsel|correspondent|anchor|producer)\y' then 4
    when t ~* '\y(resident|intern|associate|junior|jr|assistant|co-op|investment banking analyst|staff accountant|paralegal|aide|fellow|clerk)\y' then 2
    else 3
  end;
$$;

alter table public.alumni_profiles
  add column seniority int generated always as (public.title_seniority(title)) stored;

-- One page of directory results plus the total match count.
create or replace function public.search_alumni(
  p_q text default '', p_field text default null, p_open text default null, p_decade int default null,
  p_sort text default 'recent', p_limit int default 48, p_offset int default 0
)
returns table (
  id uuid, name text, class_year int, field text, specialty text, title text, organization text, city text,
  open_to text[], is_sample boolean, claimed_by uuid, seniority int, total bigint
)
language sql stable security invoker set search_path = public as $$
  with words as (
    select w from regexp_split_to_table(lower(btrim(coalesce(p_q, ''))), '\s+') as w where w <> ''
  ),
  matched as (
    select a.* from public.alumni_profiles a
    where (p_field is null or a.field = p_field)
      and (p_open is null or p_open = any (a.open_to))
      and (p_decade is null or (a.class_year / 10) * 10 = p_decade)
      and not exists (
        select 1 from words
        where position(words.w in lower(concat_ws(' ', a.name, a.title, a.organization, a.college, a.city, a.field, a.specialty))) = 0
      )
  )
  select m.id, m.name, m.class_year, m.field, m.specialty, m.title, m.organization, m.city,
         m.open_to, m.is_sample, m.claimed_by, m.seniority, count(*) over () as total
  from matched m
  order by
    case when p_sort = 'name' then m.name end asc,
    case when p_sort = 'title' then coalesce(m.title, '~') end asc,
    case when p_sort = 'senior' then m.seniority end desc,
    case when p_sort = 'junior' then m.seniority end asc,
    case when p_sort in ('oldest', 'senior') then m.class_year end asc,
    case when p_sort in ('recent', 'junior') then m.class_year end desc,
    m.name asc, m.id
  limit least(greatest(p_limit, 1), 200) offset greatest(p_offset, 0);
$$;

-- Counts for the field tabs and the decade filter.
create or replace function public.directory_facets() returns json
language sql stable security invoker set search_path = public as $$
  select json_build_object(
    'total',   (select count(*) from public.alumni_profiles),
    'samples', (select count(*) from public.alumni_profiles where is_sample),
    'fields',  (select coalesce(json_object_agg(field, n), '{}'::json)
                from (select field, count(*) as n from public.alumni_profiles group by field) s),
    'decades', (select coalesce(json_agg(d order by d desc), '[]'::json)
                from (select distinct (class_year / 10) * 10 as d from public.alumni_profiles) s)
  );
$$;

create index alumni_profiles_class_year_idx on public.alumni_profiles (class_year);
