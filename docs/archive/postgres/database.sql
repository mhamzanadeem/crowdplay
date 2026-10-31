-- Run only against a disposable Supabase project after all migrations.
-- Entire test rolls back. No Twitch or Jev calls.
begin;
insert into public.app_users(id,twitch_id,login,display_name) values
 ('a0000000-0000-4000-8000-000000000001','test-user-a','test_a','Test A'),
 ('a0000000-0000-4000-8000-000000000002','test-user-b','test_b','Test B');
insert into public.channels(id,twitch_id,login,display_name) values
 ('b0000000-0000-4000-8000-000000000001','test-channel-a','test_a','Test A'),
 ('b0000000-0000-4000-8000-000000000002','test-channel-b','test_b','Test B');
insert into public.channel_members(channel_id,user_id,role) values
 ('b0000000-0000-4000-8000-000000000001','a0000000-0000-4000-8000-000000000001','owner'),
 ('b0000000-0000-4000-8000-000000000002','a0000000-0000-4000-8000-000000000002','owner');
insert into public.application_settings(channel_id,classification_enabled,third_party_consent) values('b0000000-0000-4000-8000-000000000001',true,true);
do $$ declare accepted boolean; r1 uuid; r2 uuid; begin
 accepted:=public.ingest_chat('test-event-a','b0000000-0000-4000-8000-000000000001','{"twitchId":"test-message-a","userId":"test-viewer","username":"test","text":"synthetic","at":"2026-10-31T12:00:00Z","signals":[]}');
 if not accepted then raise exception 'First event rejected';end if;
 accepted:=public.ingest_chat('test-event-a','b0000000-0000-4000-8000-000000000001','{"twitchId":"test-message-a"}');
 if accepted then raise exception 'Duplicate event accepted';end if;
 if (select count(*) from public.messages where twitch_id='test-message-a')<>1 then raise exception 'Message idempotency failed';end if;
 r1:=public.reserve_usage('b0000000-0000-4000-8000-000000000001',.3);r2:=public.reserve_usage('b0000000-0000-4000-8000-000000000001',.3);
 if r1 is null or r2 is not null then raise exception 'Budget reservation failed';end if;
end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub','a0000000-0000-4000-8000-000000000001',true);
do $$ begin
 if (select count(*) from public.channels)<>1 then raise exception 'Cross-channel isolation failed';end if;
 if exists(select 1 from public.channels where id='b0000000-0000-4000-8000-000000000002') then raise exception 'Other channel visible';end if;
 if exists(select 1 from public.oauth_tokens) then raise exception 'OAuth token exposure';end if;
 if has_function_privilege('authenticated','public.ingest_chat(text,uuid,jsonb)','execute') then raise exception 'Browser can invoke ingestion';end if;
 if has_function_privilege('authenticated','public.reserve_usage(uuid,numeric)','execute') then raise exception 'Browser can reserve budget';end if;
end $$;
reset role;
rollback;
