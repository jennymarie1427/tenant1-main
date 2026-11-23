-- Removes everything added by add_demo_promotion_data.sql (demo shoppers and
-- their emails, opens, navigation sessions, mall visits and preferences).
-- Real data is untouched: only rows tied to @navar-demo.test accounts or
-- tagged email_log_metadata.demo = true are deleted.
-- Run in Supabase dashboard -> SQL Editor.

begin;

create temp table demo_users on commit drop as
select u.user_id, u.user_auth_user_id as auth_id
from public.app_user u
join auth.users au on au.id = u.user_auth_user_id
where lower(u.user_email) like '%@navar-demo.test'
  and coalesce((au.raw_user_meta_data->>'navar_demo')::boolean, false);

delete from public.promotion_interaction where user_id in (select user_id from demo_users);
delete from public.navigation_session    where user_id in (select user_id from demo_users);
delete from public.user_mall_visit       where user_id in (select user_id from demo_users);
delete from public.notif_preference      where user_id in (select user_id from demo_users);
delete from public.email_log
  where coalesce((email_log_metadata->>'demo')::boolean, false)
    and lower(email_log_to_email) like '%@navar-demo.test';
delete from public.app_user  where user_id in (select user_id from demo_users);   -- unsubscribe tokens cascade
delete from auth.users       where id in (select auth_id from demo_users);

select (select count(*) from demo_users) as demo_shoppers_removed;

commit;
