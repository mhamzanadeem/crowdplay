begin;
create extension if not exists pgcrypto;
create table public.app_users(id uuid primary key default gen_random_uuid(),twitch_id text unique not null,login text not null,display_name text not null,created_at timestamptz not null default now());
create table public.channels(id uuid primary key default gen_random_uuid(),twitch_id text unique not null,login text not null,display_name text not null,subscription_status text not null default 'not_subscribed',last_event_at timestamptz,created_at timestamptz not null default now());
create table public.channel_members(channel_id uuid references public.channels on delete cascade,user_id uuid references public.app_users on delete cascade,role text not null check(role in ('owner','moderator')),primary key(channel_id,user_id));
create table public.oauth_tokens(user_id uuid primary key references public.app_users on delete cascade,access_cipher text not null,refresh_cipher text not null,expires_at timestamptz not null,validated_at timestamptz not null default now(),scopes text[] not null default '{}');
create table public.app_sessions(token_hash text primary key,user_id uuid not null references public.app_users on delete cascade,expires_at timestamptz not null,created_at timestamptz not null default now());
create table public.application_settings(channel_id uuid primary key references public.channels on delete cascade,retention_days integer not null default 7 check(retention_days between 1 and 30),hourly_cap numeric not null default .5 check(hourly_cap between .01 and 50),classification_enabled boolean not null default false,third_party_consent boolean not null default false,batch_size integer not null default 20 check(batch_size between 1 and 20));
create table public.channel_rules(channel_id uuid primary key references public.channels on delete cascade,rules jsonb not null default '[]',updated_at timestamptz not null default now());
create table public.messages(id uuid primary key default gen_random_uuid(),channel_id uuid not null references public.channels on delete cascade,twitch_id text not null,user_id text not null,username text not null,body text not null check(length(body)<=2000),sent_at timestamptz not null,payload jsonb not null,risk text not null default 'low' check(risk in ('low','medium','high')),review_status text not null default 'pending' check(review_status in ('pending','reviewed','dismissed','confirmed_violation','investigate','action_taken')),processing text not null default 'pending' check(processing in ('pending','complete','failed','paused')),error text,expires_at timestamptz not null,unique(channel_id,twitch_id),unique(id,channel_id));
create index messages_channel_time on public.messages(channel_id,sent_at desc);
create index messages_channel_viewer on public.messages(channel_id,user_id,sent_at desc);
create index messages_expiry on public.messages(expires_at);
create table public.classifications(message_id uuid primary key,channel_id uuid not null,result jsonb not null,created_at timestamptz not null default now(),foreign key(message_id,channel_id) references public.messages(id,channel_id) on delete cascade);
create table public.viewer_profiles(channel_id uuid references public.channels on delete cascade,user_id text not null,username text not null,message_count bigint not null default 0,last_activity timestamptz not null,primary key(channel_id,user_id));
create table public.moderation_reviews(id uuid primary key default gen_random_uuid(),channel_id uuid not null references public.channels on delete cascade,message_id uuid,moderator_id uuid not null references public.app_users,decision text not null check(decision in ('reviewed','dismissed','confirmed_violation','investigate','action_taken')),note text not null default '' check(length(note)<=1000),created_at timestamptz not null default now(),foreign key(message_id,channel_id) references public.messages(id,channel_id) on delete set null (message_id));
create table public.moderation_actions(id uuid primary key default gen_random_uuid(),request_id text not null,channel_id uuid not null references public.channels on delete cascade,message_id uuid,moderator_id uuid references public.app_users,kind text not null,result text not null check(result in ('pending','recorded','success','failed')),note text not null default '',created_at timestamptz not null default now(),unique(request_id,result),foreign key(message_id,channel_id) references public.messages(id,channel_id) on delete set null (message_id));
create index actions_channel_time on public.moderation_actions(channel_id,created_at desc);
create table public.webhook_events(id text primary key,channel_id uuid references public.channels on delete cascade,event_type text not null,received_at timestamptz not null default now());
create table public.classification_jobs(id uuid primary key default gen_random_uuid(),channel_id uuid not null references public.channels on delete cascade,message_id uuid not null unique,status text not null default 'pending' check(status in ('pending','leased','done','failed','paused')),attempts integer not null default 0,available_at timestamptz not null default now(),lease_until timestamptz,lease_token uuid,error text,created_at timestamptz not null default now(),foreign key(message_id,channel_id) references public.messages(id,channel_id) on delete cascade);
create index jobs_ready on public.classification_jobs(channel_id,status,available_at);
create table public.usage_reservations(id uuid primary key default gen_random_uuid(),channel_id uuid not null references public.channels on delete cascade,reserved_usd numeric not null check(reserved_usd>=0),actual_usd numeric check(actual_usd>=0),state text not null default 'reserved' check(state in ('reserved','settled','uncertain')),created_at timestamptz not null default now());
create table public.request_limits(key text primary key,count integer not null,window_start timestamptz not null);

create function public.can_access_channel(cid uuid) returns boolean language sql stable security definer set search_path=public as $$ select exists(select 1 from channel_members where channel_id=cid and user_id=auth.uid()); $$;
alter table public.app_users enable row level security;
create policy own_user on public.app_users for select to authenticated using(id=auth.uid());
alter table public.channel_members enable row level security;
create policy own_membership on public.channel_members for select to authenticated using(user_id=auth.uid());
alter table public.channels enable row level security;
create policy member_channels on public.channels for select to authenticated using(public.can_access_channel(id));
do $$ declare t text; begin foreach t in array array['application_settings','channel_rules','messages','classifications','viewer_profiles','moderation_reviews','moderation_actions'] loop execute format('alter table public.%I enable row level security',t);execute format('create policy member_read on public.%I for select to authenticated using(public.can_access_channel(channel_id))',t);end loop;foreach t in array array['oauth_tokens','app_sessions','webhook_events','classification_jobs','usage_reservations','request_limits'] loop execute format('alter table public.%I enable row level security',t);end loop;end $$;
-- No browser writes; all mutations require the server's session/membership/CSRF checks.

create function public.ingest_chat(p_event_id text,p_channel uuid,p_message jsonb) returns boolean language plpgsql security definer set search_path=public as $$
declare mid uuid; days integer;
begin
 insert into webhook_events(id,channel_id,event_type) values(p_event_id,p_channel,'channel.chat.message') on conflict do nothing;
 if not found then return false;end if;
 select retention_days into days from application_settings where channel_id=p_channel;
 insert into messages(channel_id,twitch_id,user_id,username,body,sent_at,payload,expires_at) values(p_channel,p_message->>'twitchId',p_message->>'userId',p_message->>'username',p_message->>'text',(p_message->>'at')::timestamptz,p_message,now()+make_interval(days=>coalesce(days,7))) on conflict(channel_id,twitch_id) do nothing returning id into mid;
 if mid is not null then
  insert into classification_jobs(channel_id,message_id,available_at) values(p_channel,mid,now()+interval '800 milliseconds');
  insert into viewer_profiles(channel_id,user_id,username,message_count,last_activity) values(p_channel,p_message->>'userId',p_message->>'username',1,(p_message->>'at')::timestamptz) on conflict(channel_id,user_id) do update set message_count=viewer_profiles.message_count+1,username=excluded.username,last_activity=greatest(viewer_profiles.last_activity,excluded.last_activity);
 end if;
 update channels set last_event_at=now(),subscription_status='enabled' where id=p_channel;
 return mid is not null;
end $$;
create function public.claim_jobs(p_channel uuid,p_limit integer) returns setof public.classification_jobs language plpgsql security definer set search_path=public as $$
begin
 return query with selected as(select id from classification_jobs where channel_id=p_channel and attempts<5 and ((status='pending' and available_at<=now()) or (status='leased' and lease_until<now())) order by created_at for update skip locked limit least(greatest(p_limit,1),20)) update classification_jobs j set status='leased',attempts=j.attempts+1,lease_until=now()+interval '90 seconds',lease_token=gen_random_uuid() from selected s where j.id=s.id returning j.*;
end $$;
create function public.reserve_usage(p_channel uuid,p_amount numeric) returns uuid language plpgsql security definer set search_path=public as $$
declare cap numeric;spent numeric;reservation uuid;
begin
 select hourly_cap into cap from application_settings where channel_id=p_channel and classification_enabled and third_party_consent for update;
 if cap is null or p_amount<=0 then return null;end if;
 select coalesce(sum(coalesce(actual_usd,reserved_usd)),0) into spent from usage_reservations where channel_id=p_channel and created_at>now()-interval '1 hour';
 if spent+p_amount>cap then return null;end if;
 insert into usage_reservations(channel_id,reserved_usd) values(p_channel,p_amount) returning id into reservation;return reservation;
end $$;
create function public.complete_classification(p_job uuid,p_lease uuid,p_result jsonb,p_signals jsonb,p_risk text) returns boolean language plpgsql security definer set search_path=public as $$
declare job classification_jobs;
begin
 select * into job from classification_jobs where id=p_job and status='leased' and lease_token=p_lease for update;
 if not found then return false;end if;
 if p_result is not null then insert into classifications(message_id,channel_id,result) values(job.message_id,job.channel_id,p_result) on conflict(message_id) do update set result=excluded.result;end if;
 update messages set payload=jsonb_set(payload,'{signals}',p_signals),risk=p_risk,processing='complete',error=null where id=job.message_id;
 update classification_jobs set status='done',lease_until=null where id=job.id;return true;
end $$;
create function public.record_review(p_channel uuid,p_message uuid,p_moderator uuid,p_decision text,p_note text) returns void language plpgsql security definer set search_path=public as $$
begin
 if not exists(select 1 from channel_members where channel_id=p_channel and user_id=p_moderator) then raise exception 'Forbidden';end if;
 update messages set review_status=p_decision where id=p_message and channel_id=p_channel;
 if not found then raise exception 'Message unavailable';end if;
 insert into moderation_reviews(channel_id,message_id,moderator_id,decision,note) values(p_channel,p_message,p_moderator,p_decision,p_note);
 insert into moderation_actions(request_id,channel_id,message_id,moderator_id,kind,result,note) values(gen_random_uuid()::text,p_channel,p_message,p_moderator,p_decision,'recorded',p_note);
end $$;
create function public.check_rate(p_key text,p_limit integer,p_seconds integer) returns boolean language plpgsql security definer set search_path=public as $$
declare n integer;
begin
 insert into request_limits(key,count,window_start) values(p_key,1,now()) on conflict(key) do update set count=case when request_limits.window_start<now()-make_interval(secs=>p_seconds) then 1 else request_limits.count+1 end,window_start=case when request_limits.window_start<now()-make_interval(secs=>p_seconds) then now() else request_limits.window_start end returning count into n;return n<=p_limit;
end $$;
create function public.retention_cleanup() returns void language plpgsql security definer set search_path=public as $$
begin
 delete from messages m using application_settings s where m.channel_id=s.channel_id and (m.expires_at<now() or m.sent_at<now()-make_interval(days=>s.retention_days));
 delete from viewer_profiles v using application_settings s where v.channel_id=s.channel_id and v.last_activity<now()-make_interval(days=>s.retention_days);
 -- Review/action records omit original message text; retain audit metadata for 90 days.
 delete from moderation_reviews where created_at<now()-interval '90 days';
 delete from moderation_actions where created_at<now()-interval '90 days';
 delete from webhook_events where received_at<now()-interval '7 days';
 delete from usage_reservations where created_at<now()-interval '7 days';
 delete from app_sessions where expires_at<now();delete from request_limits where window_start<now()-interval '1 day';
end $$;
-- Mutating RPCs are service-role only. PostgreSQL functions otherwise default to PUBLIC execute.
revoke all on function public.ingest_chat(text,uuid,jsonb),public.claim_jobs(uuid,integer),public.reserve_usage(uuid,numeric),public.complete_classification(uuid,uuid,jsonb,jsonb,text),public.record_review(uuid,uuid,uuid,text,text),public.check_rate(text,integer,integer),public.retention_cleanup() from public,anon,authenticated;
grant execute on function public.ingest_chat(text,uuid,jsonb),public.claim_jobs(uuid,integer),public.reserve_usage(uuid,numeric),public.complete_classification(uuid,uuid,jsonb,jsonb,text),public.record_review(uuid,uuid,uuid,text,text),public.check_rate(text,integer,integer),public.retention_cleanup() to service_role;
revoke all on function public.can_access_channel(uuid) from public,anon;
grant execute on function public.can_access_channel(uuid) to authenticated;
commit;
