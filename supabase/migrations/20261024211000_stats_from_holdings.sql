-- Market totals now read from practice_holdings; fall back to legacy profiles.practice_state for users not yet moved.
create or replace function public.kobo_stats()
 returns json language sql stable security definer set search_path to '' as $function$
with own as (select coalesce(auth.jwt()->>'email','') = 'usmanzahra19@gmail.com' is_owner),
pl as (select count(*) n from public.profiles),
com as (select (pl.n>=50 or own.is_owner) ok, own.is_owner from pl, own),
st as (select coalesce(nullif(trim(state),''),'Unknown') k from public.waitlist union all select coalesce(nullif(trim(state),''),'Unknown') from public.business_interest),
st3 as (select case when n<5 then 'Other (fewer than 5 each)' else k end k, sum(n)::int n from (select k, count(*) n from st group by k) a group by 1),
ca as (select lower(coalesce(nullif(trim(c),''),'other')) k from (select business_type c from public.waitlist where kind='owner' union all select category from public.business_interest) x),
ca3 as (select case when n<5 then 'Other (fewer than 5 each)' else k end k, sum(n)::int n from (select k, count(*) n from ca group by k) a group by 1),
oc as (select (select count(*) from public.business_interest) + (select count(*) from public.waitlist where kind='owner') n),
lots as (
  select h.user_id pid, h.biz_id id, h.qty q from public.practice_holdings h
  union all
  select p.id, l->>'id', coalesce((l->>'q')::int,0) from public.profiles p, jsonb_array_elements(case when jsonb_typeof(p.practice_state->'lots')='array' then p.practice_state->'lots' else '[]'::jsonb end) l
  where not exists (select 1 from public.practice_state s where s.user_id = p.id)),
top as (select id, count(distinct pid) owners, sum(q)::int slots from lots group by id order by 3 desc limit 40)
select json_build_object(
 'community', (select ok from com),
 'is_owner', (select is_owner from com),
 'players', (select case when com.ok then pl.n end from pl, com),
 'waitlist', (select case when com.ok then count(*) end from public.waitlist, com group by com.ok),
 'owners', (select case when com.ok and (oc.n>=20 or com.is_owner) then oc.n end from oc, com),
 'by_state', (select case when com.ok then (select coalesce(json_agg(json_build_object('k',k,'n',n) order by n desc),'[]') from st3) end from com),
 'by_category', (select case when com.ok then (select coalesce(json_agg(json_build_object('k',k,'n',n) order by n desc),'[]') from ca3) end from com),
 'slots_bought', (select coalesce(sum(q),0) from lots),
 'market', (select coalesce(json_agg(json_build_object('id',id,'slots',slots,'owners',owners) order by slots desc),'[]') from top)
);
$function$;
