-- Per-user practice state (practice credits only, not real money). RLS: each user reads/writes only their own rows.
create table if not exists public.practice_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  cash bigint not null default 500000000,      -- kobo
  start bigint not null default 500000000,
  wallet bigint not null default 0,
  dep bigint not null default 0,
  wd bigint not null default 0,
  extra jsonb not null default '{}'::jsonb,     -- remaining small app fields (challenge, picks, lists, version)
  client_updated_at bigint not null default 0,  -- ms epoch from the device that last saved
  updated_at timestamptz not null default now()
);
create table if not exists public.practice_holdings (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  pos int not null,
  biz_id text not null,
  qty int not null check (qty > 0),
  price bigint not null,
  day int not null
);
create index if not exists practice_holdings_user_idx on public.practice_holdings(user_id, pos);
create table if not exists public.practice_activity (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  pos int not null,
  day int not null,
  text text not null,
  amount bigint not null,
  kind text not null
);
create index if not exists practice_activity_user_idx on public.practice_activity(user_id, pos);

alter table public.practice_state enable row level security;
alter table public.practice_holdings enable row level security;
alter table public.practice_activity enable row level security;

do $$ declare t text; begin
  foreach t in array array['practice_state','practice_holdings','practice_activity'] loop
    execute format('create policy "own rows select" on public.%I for select to authenticated using ((select auth.uid()) = user_id)', t);
    execute format('create policy "own rows insert" on public.%I for insert to authenticated with check ((select auth.uid()) = user_id)', t);
    execute format('create policy "own rows update" on public.%I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', t);
    execute format('create policy "own rows delete" on public.%I for delete to authenticated using ((select auth.uid()) = user_id)', t);
  end loop;
end $$;
revoke all on public.practice_state, public.practice_holdings, public.practice_activity from anon;
grant select, insert, update, delete on public.practice_state, public.practice_holdings, public.practice_activity to authenticated;

-- Atomic save of the whole practice state for the caller. SECURITY INVOKER: RLS still applies.
create or replace function public.practice_save(p_state jsonb, p_holdings jsonb, p_activity jsonb)
returns void language plpgsql security invoker set search_path = '' as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not signed in'; end if;
  insert into public.practice_state(user_id, cash, start, wallet, dep, wd, extra, client_updated_at, updated_at)
  values (uid, (p_state->>'cash')::bigint, coalesce((p_state->>'start')::bigint,0), coalesce((p_state->>'wallet')::bigint,0),
          coalesce((p_state->>'dep')::bigint,0), coalesce((p_state->>'wd')::bigint,0), coalesce(p_state->'extra','{}'::jsonb),
          coalesce((p_state->>'updatedAt')::bigint,0), now())
  on conflict (user_id) do update set cash=excluded.cash, start=excluded.start, wallet=excluded.wallet, dep=excluded.dep, wd=excluded.wd,
     extra=excluded.extra, client_updated_at=excluded.client_updated_at, updated_at=now();
  delete from public.practice_holdings where user_id = uid;
  insert into public.practice_holdings(user_id, pos, biz_id, qty, price, day)
    select uid, (o-1)::int, h->>'id', (h->>'q')::int, (h->>'p')::bigint, coalesce((h->>'d')::int,0)
    from jsonb_array_elements(coalesce(p_holdings,'[]'::jsonb)) with ordinality as x(h,o) where (h->>'q')::int > 0;
  delete from public.practice_activity where user_id = uid;
  insert into public.practice_activity(user_id, pos, day, text, amount, kind)
    select uid, (o-1)::int, coalesce((a->>'d')::int,0), left(coalesce(a->>'t',''),300), coalesce((a->>'a')::bigint,0), coalesce(a->>'k','pay')
    from jsonb_array_elements(coalesce(p_activity,'[]'::jsonb)) with ordinality as x(a,o);
end $$;
revoke all on function public.practice_save(jsonb,jsonb,jsonb) from public, anon;
grant execute on function public.practice_save(jsonb,jsonb,jsonb) to authenticated;
