begin;
create function public.retry_message(p_channel uuid,p_actor uuid,p_message uuid) returns boolean language plpgsql security definer set search_path=public as $$
begin
 if not exists(select 1 from channel_members where channel_id=p_channel and user_id=p_actor and role='owner') then raise exception 'Forbidden';end if;
 update classification_jobs set status='pending',attempts=0,available_at=now(),error=null,lease_until=null where channel_id=p_channel and message_id=p_message and status in ('failed','paused');
 if not found then return false;end if;
 update messages set processing='pending',error=null where channel_id=p_channel and id=p_message;
 insert into moderation_actions(request_id,channel_id,message_id,moderator_id,kind,result,note) values(gen_random_uuid()::text,p_channel,p_message,p_actor,'classification_retry','recorded','Human requested another classification attempt.');
 return true;
end $$;
revoke all on function public.retry_message(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.retry_message(uuid,uuid,uuid) to service_role;
commit;
