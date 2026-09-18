-- Team Cerebus -- initial schema (proof of concept)
--
-- Creates one tiny table so the homepage has something real to read, and
-- demonstrates the Row Level Security pattern every future table should follow.
--
-- Apply it by pasting this whole file into the Supabase SQL Editor, or with
-- `supabase db push`. See docs/06-deploying-supabase.md.

create table if not exists public.messages (
  id         uuid primary key default gen_random_uuid(),
  body       text not null check (char_length(body) between 1 and 500),
  created_at timestamptz not null default now()
);

-- RLS is off by default on a new table, which would leave it wide open to
-- anyone holding the (public) anon key. Turning it on denies everything until
-- a policy explicitly allows something.
alter table public.messages enable row level security;

-- Public read access. This is deliberate for a POC homepage: the anon key is
-- public, so anything readable here is readable by the whole internet. Do not
-- copy this policy onto a table holding private data.
drop policy if exists "messages are publicly readable" on public.messages;
create policy "messages are publicly readable"
  on public.messages
  for select
  to anon, authenticated
  using (true);

-- Note there is no insert/update/delete policy, so the anon key cannot write.
-- Writes must go through a trusted server context (an edge function using the
-- service-role key) or a policy you add later.

insert into public.messages (body)
select 'Hello from Supabase.'
where not exists (select 1 from public.messages);
