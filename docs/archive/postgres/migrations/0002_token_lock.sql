alter table public.oauth_tokens add column refresh_lock_until timestamptz not null default '1970-01-01';
