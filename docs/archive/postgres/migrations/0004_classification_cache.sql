begin;
create table public.classification_cache(channel_id uuid references public.channels on delete cascade,request_hash text not null,results jsonb not null,expires_at timestamptz not null,primary key(channel_id,request_hash));
alter table public.classification_cache enable row level security;
create index classification_cache_expiry on public.classification_cache(expires_at);
alter table public.usage_reservations add column input_tokens bigint;
alter table public.usage_reservations add column output_tokens bigint;
alter table public.usage_reservations add column latency_ms integer;
create or replace function public.retention_cleanup() returns void language plpgsql security definer set search_path=public as $$
begin
 delete from messages m using application_settings s where m.channel_id=s.channel_id and (m.expires_at<now() or m.sent_at<now()-make_interval(days=>s.retention_days));
 delete from viewer_profiles v using application_settings s where v.channel_id=s.channel_id and v.last_activity<now()-make_interval(days=>s.retention_days);
 delete from moderation_reviews r using application_settings s where r.channel_id=s.channel_id and r.created_at<now()-make_interval(days=>s.retention_days);
 delete from moderation_actions a using application_settings s where a.channel_id=s.channel_id and a.created_at<now()-make_interval(days=>s.retention_days);
 delete from classification_cache where expires_at<now();
 delete from webhook_events where received_at<now()-interval '7 days';
 delete from usage_reservations where created_at<now()-interval '7 days';
 delete from app_sessions where expires_at<now();delete from request_limits where window_start<now()-interval '1 day';
end $$;
revoke all on function public.retention_cleanup() from public,anon,authenticated;
grant execute on function public.retention_cleanup() to service_role;
commit;
