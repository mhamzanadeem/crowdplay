begin;
create function public.configure_channel(p_channel uuid,p_actor uuid,p_rules jsonb default null,p_settings jsonb default null) returns void language plpgsql security definer set search_path=public as $$
begin
 if not exists(select 1 from channel_members where channel_id=p_channel and user_id=p_actor and role='owner') then raise exception 'Forbidden';end if;
 if p_rules is not null then insert into channel_rules(channel_id,rules) values(p_channel,p_rules) on conflict(channel_id) do update set rules=excluded.rules,updated_at=now();end if;
 if p_settings is not null then update application_settings set retention_days=(p_settings->>'retentionDays')::integer,hourly_cap=(p_settings->>'hourlyCap')::numeric,classification_enabled=(p_settings->>'classificationEnabled')::boolean,third_party_consent=(p_settings->>'thirdPartyConsent')::boolean,batch_size=(p_settings->>'batchSize')::integer where channel_id=p_channel;
  update classification_jobs set status='pending',available_at=now(),attempts=0 where channel_id=p_channel and status='paused';
 end if;
 insert into moderation_actions(request_id,channel_id,moderator_id,kind,result,note) values(gen_random_uuid()::text,p_channel,p_actor,case when p_rules is not null then 'rules_changed' else 'settings_changed' end,'recorded','Channel configuration updated.');
end $$;
create function public.record_twitch_deletion(p_event text,p_channel uuid,p_twitch_message text) returns void language plpgsql security definer set search_path=public as $$
declare mid uuid;
begin
 insert into webhook_events(id,channel_id,event_type) values(p_event,p_channel,'channel.chat.message_delete') on conflict do nothing;if not found then return;end if;
 update messages set review_status='action_taken' where channel_id=p_channel and twitch_id=p_twitch_message returning id into mid;
 insert into moderation_actions(request_id,channel_id,message_id,kind,result,note) values(p_event,p_channel,mid,'twitch_message_deleted','recorded','Deletion observed through Twitch EventSub; moderator identity is not inferred.');
end $$;
create function public.recover_jobs(p_channel uuid) returns void language plpgsql security definer set search_path=public as $$
begin
 update classification_jobs set status='failed',error='Retry limit reached after a worker interruption.' where channel_id=p_channel and attempts>=5 and status='leased' and lease_until<now();
 update messages m set processing='failed',error=j.error from classification_jobs j where j.message_id=m.id and j.channel_id=p_channel and j.status='failed' and m.processing<>'failed';
 update classification_jobs j set status='pending',available_at=now() from application_settings s where j.channel_id=p_channel and s.channel_id=j.channel_id and j.status='paused' and j.error like 'Hourly estimated budget%' and s.classification_enabled and s.third_party_consent and not exists(select 1 from usage_reservations u where u.channel_id=j.channel_id and u.created_at>now()-interval '1 hour' group by u.channel_id having sum(coalesce(u.actual_usd,u.reserved_usd))>=s.hourly_cap);
end $$;
revoke all on function public.configure_channel(uuid,uuid,jsonb,jsonb),public.record_twitch_deletion(text,uuid,text),public.recover_jobs(uuid) from public,anon,authenticated;
grant execute on function public.configure_channel(uuid,uuid,jsonb,jsonb),public.record_twitch_deletion(text,uuid,text),public.recover_jobs(uuid) to service_role;
commit;
