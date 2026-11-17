-- أكاديمية الزيتونة — the school database, to run once on a dedicated Supabase project.
-- Everything lives in schema itqan, which the API does not expose; the page reaches it only through the
-- public itqan_* functions, which check the cheikh's key or the student's token.
create extension if not exists pgcrypto with schema extensions;
create schema if not exists itqan;
revoke all on schema itqan from public, anon, authenticated;

create table itqan.teachers (id uuid primary key default gen_random_uuid(), name text not null, key_hash text not null unique, created_at timestamptz not null default now());
create table itqan.levels (id uuid primary key default gen_random_uuid(), program text not null default 'التجويد العملي', name text not null,
  description text not null default '', surahs int[] not null default '{}', sort int not null default 0, config jsonb not null default '{}', created_at timestamptz not null default now());
create table itqan.cohorts (id uuid primary key default gen_random_uuid(), level_id uuid references itqan.levels on delete set null, name text not null,
  join_code text not null unique, live_url text not null default '', schedule text not null default '', active boolean not null default true, created_at timestamptz not null default now());
create table itqan.students (id uuid primary key default gen_random_uuid(), cohort_id uuid references itqan.cohorts on delete set null, name text not null,
  phone text not null default '', token_hash text not null unique, active boolean not null default true, created_at timestamptz not null default now(), last_seen timestamptz);
create table itqan.sessions (id uuid primary key default gen_random_uuid(), cohort_id uuid not null references itqan.cohorts on delete cascade,
  at date not null default current_date, title text not null default '', surah int, created_at timestamptz not null default now());
create table itqan.attendance (session_id uuid not null references itqan.sessions on delete cascade, student_id uuid not null references itqan.students on delete cascade,
  status text not null check (status in ('present', 'late', 'absent', 'excused')), note text not null default '', primary key (session_id, student_id));
create table itqan.evaluations (id uuid primary key default gen_random_uuid(), student_id uuid not null references itqan.students on delete cascade,
  at date not null default current_date, surah int, scores jsonb not null default '{}', note text not null default '', created_at timestamptz not null default now());
create table itqan.attempts (id bigint generated always as identity primary key, student_id uuid not null references itqan.students on delete cascade,
  at timestamptz not null default now(), surah int not null, kind text not null, scope text not null default 'all', right_n int not null default 0,
  total_n int not null default 0, wrong_n int not null default 0, exam boolean not null default false, errors jsonb not null default '[]');
create index on itqan.cohorts (level_id);
create index on itqan.students (cohort_id);
create index on itqan.sessions (cohort_id, at);
create index on itqan.attendance (student_id);
create index on itqan.evaluations (student_id);
create index on itqan.attempts (student_id, surah, kind);
alter table itqan.teachers enable row level security;
alter table itqan.levels enable row level security;
alter table itqan.cohorts enable row level security;
alter table itqan.students enable row level security;
alter table itqan.sessions enable row level security;
alter table itqan.attendance enable row level security;
alter table itqan.evaluations enable row level security;
alter table itqan.attempts enable row level security;

-- helpers (not callable from the API)
create function itqan.h(p text) returns text language sql immutable set search_path = ''
as $$ select encode(extensions.digest(coalesce(p, ''), 'sha256'), 'hex') $$;
create function itqan.secret(n int) returns text language sql volatile set search_path = ''
as $$ select translate(encode(extensions.gen_random_bytes(n), 'base64'), '+/=', '-_') $$;
create function itqan.new_code() returns text language plpgsql volatile set search_path = ''
as $$
declare c text; abc text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
begin
  loop
    c := '';
    for i in 1..6 loop c := c || substr(abc, 1 + floor(random() * length(abc))::int, 1); end loop;
    exit when not exists (select 1 from itqan.cohorts where join_code = c);
  end loop;
  return c;
end $$;
create function itqan.teacher(p_key text) returns uuid language plpgsql stable set search_path = ''
as $$
declare t uuid;
begin
  select id into t from itqan.teachers where key_hash = itqan.h(p_key);
  if t is null then raise exception 'bad_key' using errcode = '28000'; end if;
  return t;
end $$;
create function itqan.student(p_token text) returns itqan.students language plpgsql set search_path = ''
as $$
declare s itqan.students;
begin
  select * into s from itqan.students where token_hash = itqan.h(p_token);
  if s.id is null then raise exception 'bad_token' using errcode = '28000'; end if;
  update itqan.students set last_seen = now() where id = s.id;
  return s;
end $$;
create function itqan.me_json(p_student uuid) returns jsonb language sql stable set search_path = ''
as $$
  select jsonb_build_object(
    'student', jsonb_build_object('id', s.id, 'name', s.name),
    'cohort', (select jsonb_build_object('id', c.id, 'name', c.name, 'live_url', c.live_url, 'schedule', c.schedule) from itqan.cohorts c where c.id = s.cohort_id),
    'level', (select jsonb_build_object('id', l.id, 'name', l.name, 'program', l.program, 'description', l.description, 'surahs', l.surahs, 'config', l.config)
              from itqan.cohorts c join itqan.levels l on l.id = c.level_id where c.id = s.cohort_id),
    'sessions', coalesce((select jsonb_agg(jsonb_build_object('id', se.id, 'at', se.at, 'title', se.title, 'surah', se.surah, 'status', a.status) order by se.at desc)
              from itqan.sessions se left join itqan.attendance a on a.session_id = se.id and a.student_id = s.id where se.cohort_id = s.cohort_id), '[]'),
    'evaluations', coalesce((select jsonb_agg(jsonb_build_object('at', e.at, 'surah', e.surah, 'scores', e.scores, 'note', e.note) order by e.at desc)
              from itqan.evaluations e where e.student_id = s.id), '[]'),
    'progress', coalesce((select jsonb_agg(p) from (
              select jsonb_build_object('surah', surah, 'kind', kind, 'n', count(*),
                'best', max(case when total_n > 0 then round(100.0 * right_n / total_n) end),
                'exam', max(case when exam and total_n > 0 then round(100.0 * right_n / total_n) end)) p
              from itqan.attempts where student_id = s.id group by surah, kind) x), '[]'))
  from itqan.students s where s.id = p_student
$$;

-- ===== student API =====
create function public.itqan_join(p_code text, p_name text) returns jsonb language plpgsql security definer set search_path = ''
as $$
declare c itqan.cohorts; tok text; sid uuid;
begin
  select * into c from itqan.cohorts where join_code = upper(trim(p_code)) and active;
  if c.id is null then raise exception 'bad_code' using errcode = '28000'; end if;
  if length(trim(coalesce(p_name, ''))) < 2 then raise exception 'name_required'; end if;
  tok := itqan.secret(18);
  insert into itqan.students (cohort_id, name, token_hash) values (c.id, left(trim(p_name), 60), itqan.h(tok)) returning id into sid;
  return jsonb_build_object('token', tok) || itqan.me_json(sid);
end $$;
create function public.itqan_me(p_token text) returns jsonb language plpgsql security definer set search_path = ''
as $$
declare s itqan.students;
begin
  s := itqan.student(p_token);
  return itqan.me_json(s.id);
end $$;
create function public.itqan_attempt(p_token text, p_surah int, p_kind text, p_scope text, p_right int, p_total int, p_wrong int, p_exam boolean, p_errors jsonb)
returns void language plpgsql security definer set search_path = ''
as $$
declare s itqan.students;
begin
  s := itqan.student(p_token);
  if p_surah not between 1 and 114 or p_kind not in ('paint', 'time', 'nun', 'wasl', 'madd', 'ra', 'huruf') then raise exception 'bad_attempt'; end if;
  insert into itqan.attempts (student_id, surah, kind, scope, right_n, total_n, wrong_n, exam, errors)
  values (s.id, p_surah, p_kind, left(coalesce(p_scope, 'all'), 12), greatest(0, least(p_right, 100000)), greatest(0, least(p_total, 100000)),
          greatest(0, least(p_wrong, 100000)), coalesce(p_exam, false),
          case when jsonb_typeof(p_errors) = 'array' then (select coalesce(jsonb_agg(e), '[]') from (select e from jsonb_array_elements(p_errors) e limit 60) x) else '[]' end);
end $$;

-- ===== the cheikh's API =====
create function public.itqan_t_data(p_key text) returns jsonb language plpgsql security definer set search_path = ''
as $$
declare t uuid;
begin
  t := itqan.teacher(p_key);
  return jsonb_build_object(
    'teacher', (select name from itqan.teachers where id = t),
    'levels', coalesce((select jsonb_agg(to_jsonb(l) order by l.sort, l.created_at) from itqan.levels l), '[]'),
    'cohorts', coalesce((select jsonb_agg(to_jsonb(c) order by c.created_at) from itqan.cohorts c), '[]'),
    'students', coalesce((select jsonb_agg(jsonb_build_object('id', s.id, 'name', s.name, 'phone', s.phone, 'cohort_id', s.cohort_id, 'active', s.active,
                  'created_at', s.created_at, 'last_seen', s.last_seen) order by s.name) from itqan.students s), '[]'),
    'sessions', coalesce((select jsonb_agg(to_jsonb(se) order by se.at desc) from itqan.sessions se), '[]'),
    'attendance', coalesce((select jsonb_agg(jsonb_build_array(a.session_id, a.student_id, a.status, a.note)) from itqan.attendance a), '[]'),
    'evaluations', coalesce((select jsonb_agg(to_jsonb(e) order by e.at desc) from itqan.evaluations e), '[]'),
    'progress', coalesce((select jsonb_agg(jsonb_build_array(student_id, surah, kind, n, best, exam, last_at)) from (
        select student_id, surah, kind, count(*) n, max(case when total_n > 0 then round(100.0 * right_n / total_n) end) best,
          max(case when exam and total_n > 0 then round(100.0 * right_n / total_n) end) exam, max(at) last_at
        from itqan.attempts group by student_id, surah, kind) x), '[]'),
    'errors', coalesce((select jsonb_agg(jsonb_build_array(student_id, kind, rule, word, cnt)) from (
        select a.student_id, a.kind, coalesce(nullif(e->>1, ''), e->>2) rule, e->>0 word, sum(coalesce((e->>3)::int, 1)) cnt
        from itqan.attempts a, jsonb_array_elements(a.errors) e where a.at > now() - interval '120 days' group by 1, 2, 3, 4) x), '[]'));
end $$;

create function public.itqan_t_save(p_key text, p_kind text, p_row jsonb) returns jsonb language plpgsql security definer set search_path = ''
as $$
declare t uuid; rid uuid := nullif(p_row->>'id', '')::uuid; out jsonb;
begin
  t := itqan.teacher(p_key);
  if p_kind = 'level' then
    if rid is null then
      insert into itqan.levels (program, name, description, surahs, sort, config)
      values (coalesce(nullif(p_row->>'program', ''), 'التجويد العملي'), coalesce(p_row->>'name', 'مستوى جديد'), coalesce(p_row->>'description', ''),
              coalesce((select array_agg(x::int) from jsonb_array_elements_text(p_row->'surahs') x), '{}'), coalesce((p_row->>'sort')::int, 0), coalesce(p_row->'config', '{}'))
      returning to_jsonb(levels.*) into out;
    else
      update itqan.levels set program = coalesce(nullif(p_row->>'program', ''), program), name = coalesce(p_row->>'name', name), description = coalesce(p_row->>'description', description),
        surahs = coalesce((select array_agg(x::int) from jsonb_array_elements_text(p_row->'surahs') x), case when p_row ? 'surahs' then '{}'::int[] else surahs end),
        sort = coalesce((p_row->>'sort')::int, sort), config = coalesce(p_row->'config', config)
      where id = rid returning to_jsonb(levels.*) into out;
    end if;
  elsif p_kind = 'cohort' then
    if rid is null then
      insert into itqan.cohorts (level_id, name, join_code, live_url, schedule)
      values (nullif(p_row->>'level_id', '')::uuid, coalesce(p_row->>'name', 'دفعة جديدة'), itqan.new_code(), coalesce(p_row->>'live_url', ''), coalesce(p_row->>'schedule', ''))
      returning to_jsonb(cohorts.*) into out;
    else
      update itqan.cohorts set level_id = case when p_row ? 'level_id' then nullif(p_row->>'level_id', '')::uuid else level_id end,
        name = coalesce(p_row->>'name', name), live_url = coalesce(p_row->>'live_url', live_url), schedule = coalesce(p_row->>'schedule', schedule),
        active = coalesce((p_row->>'active')::boolean, active), join_code = case when (p_row->>'new_code')::boolean then itqan.new_code() else join_code end
      where id = rid returning to_jsonb(cohorts.*) into out;
    end if;
  elsif p_kind = 'student' then
    if rid is null then raise exception 'students join with the cohort code'; end if;
    update itqan.students set name = coalesce(left(p_row->>'name', 60), name), phone = coalesce(left(p_row->>'phone', 30), phone),
      cohort_id = case when p_row ? 'cohort_id' then nullif(p_row->>'cohort_id', '')::uuid else cohort_id end, active = coalesce((p_row->>'active')::boolean, active)
    where id = rid returning jsonb_build_object('id', id, 'name', name, 'phone', phone, 'cohort_id', cohort_id, 'active', active) into out;
  elsif p_kind = 'session' then
    if rid is null then
      insert into itqan.sessions (cohort_id, at, title, surah)
      values ((p_row->>'cohort_id')::uuid, coalesce((p_row->>'at')::date, current_date), coalesce(p_row->>'title', ''), nullif(p_row->>'surah', '')::int)
      returning to_jsonb(sessions.*) into out;
    else
      update itqan.sessions set at = coalesce((p_row->>'at')::date, at), title = coalesce(p_row->>'title', title),
        surah = case when p_row ? 'surah' then nullif(p_row->>'surah', '')::int else surah end
      where id = rid returning to_jsonb(sessions.*) into out;
    end if;
  elsif p_kind = 'attendance' then
    if coalesce(p_row->>'status', '') = '' then
      delete from itqan.attendance where session_id = (p_row->>'session_id')::uuid and student_id = (p_row->>'student_id')::uuid;
      out := '{}';
    else
      insert into itqan.attendance (session_id, student_id, status, note)
      values ((p_row->>'session_id')::uuid, (p_row->>'student_id')::uuid, p_row->>'status', coalesce(p_row->>'note', ''))
      on conflict (session_id, student_id) do update set status = excluded.status, note = excluded.note
      returning to_jsonb(attendance.*) into out;
    end if;
  elsif p_kind = 'evaluation' then
    if rid is null then
      insert into itqan.evaluations (student_id, at, surah, scores, note)
      values ((p_row->>'student_id')::uuid, coalesce((p_row->>'at')::date, current_date), nullif(p_row->>'surah', '')::int, coalesce(p_row->'scores', '{}'), coalesce(p_row->>'note', ''))
      returning to_jsonb(evaluations.*) into out;
    else
      update itqan.evaluations set at = coalesce((p_row->>'at')::date, at), surah = case when p_row ? 'surah' then nullif(p_row->>'surah', '')::int else surah end,
        scores = coalesce(p_row->'scores', scores), note = coalesce(p_row->>'note', note)
      where id = rid returning to_jsonb(evaluations.*) into out;
    end if;
  else
    raise exception 'bad_kind';
  end if;
  return out;
end $$;

create function public.itqan_t_delete(p_key text, p_kind text, p_id uuid) returns void language plpgsql security definer set search_path = ''
as $$
begin
  perform itqan.teacher(p_key);
  if p_kind = 'level' then delete from itqan.levels where id = p_id;
  elsif p_kind = 'cohort' then delete from itqan.cohorts where id = p_id;
  elsif p_kind = 'student' then delete from itqan.students where id = p_id;
  elsif p_kind = 'session' then delete from itqan.sessions where id = p_id;
  elsif p_kind = 'evaluation' then delete from itqan.evaluations where id = p_id;
  else raise exception 'bad_kind'; end if;
end $$;

create function public.itqan_t_student(p_key text, p_student uuid) returns jsonb language plpgsql security definer set search_path = ''
as $$
begin
  perform itqan.teacher(p_key);
  return itqan.me_json(p_student) || jsonb_build_object('attempts', coalesce((select jsonb_agg(jsonb_build_object('at', at, 'surah', surah, 'kind', kind, 'scope', scope,
    'right', right_n, 'total', total_n, 'wrong', wrong_n, 'exam', exam, 'errors', errors) order by at desc)
    from (select * from itqan.attempts where student_id = p_student order by at desc limit 200) a), '[]'));
end $$;

revoke all on function itqan.h(text), itqan.secret(int), itqan.new_code(), itqan.teacher(text), itqan.student(text), itqan.me_json(uuid) from public, anon, authenticated;
grant execute on function public.itqan_join(text, text), public.itqan_me(text), public.itqan_attempt(text, int, text, text, int, int, int, boolean, jsonb),
  public.itqan_t_data(text), public.itqan_t_save(text, text, jsonb), public.itqan_t_delete(text, text, uuid), public.itqan_t_student(text, uuid) to anon, authenticated;

-- starting content (the cheikh edits it from the «الطلاب» page)
insert into itqan.levels (program, name, description, surahs, sort, config) values
  ('التجويد العملي', 'المستوى الأول', 'أزمنة الحروف، إتمام الحركات، تخليص الحروف، ضبط همزة الوصل', '{1,114,113,112,111}', 1, '{"drills":["paint","time","wasl"]}'),
  ('التجويد العملي', 'المستوى الثاني', 'أحكام النون الساكنة والتنوين والميم الساكنة، المدود، الراءات، المخارج والصفات', '{92}', 2, '{"drills":["paint","nun","madd","ra","huruf"],"letters":{"92":"ء ه ع"}}');
insert into itqan.cohorts (level_id, name, join_code) select id, 'الدفعة الأولى', itqan.new_code() from itqan.levels where name = 'المستوى الأول';
-- the cheikh's key: insert its sha-256 hash, never the key itself
--   insert into itqan.teachers (name, key_hash) values ('الشيخ محمّد بن عبد الله جوّاد', '<sha256 hex of the key>');
