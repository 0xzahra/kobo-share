-- Anonymous page-visit log: insert-only for anon/authenticated, no reads from the client.
create table if not exists public.visits (id bigint generated always as identity primary key, created_at timestamptz not null default now(), page text not null check (char_length(page)<=60), anon_id text check (char_length(anon_id)<=40), signed_in boolean not null default false);
alter table public.visits enable row level security;
drop policy if exists "anyone insert visit" on public.visits;
create policy "anyone insert visit" on public.visits for insert to anon, authenticated with check (true);
revoke all on public.visits from anon, authenticated;
grant insert (page, anon_id, signed_in) on public.visits to anon, authenticated;
