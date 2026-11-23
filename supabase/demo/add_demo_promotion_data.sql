-- SAMPLE DATA for presentations (Vista Apparel, store 12). NOT real activity.
-- Adds 6 demo shoppers who were "emailed" Vista Apparel promotions, some of
-- whom "opened" the email and then "navigated" to the store, so the
-- Emailed / Opened / Visits from email metrics have numbers to show.
--
-- Everything is tagged so remove_demo_promotion_data.sql deletes it all:
--   * emails end in @navar-demo.test (a reserved, undeliverable domain)
--   * sign-in accounts have raw_user_meta_data.navar_demo = true (no password,
--     they can't sign in)
--   * email_log rows have email_log_metadata.demo = true
-- Demo shoppers have promotion alerts turned OFF, so real promotion emails are
-- never sent to them.

begin;

-- 1. Demo shoppers (sign-in identity + app_user profile).
create temp table demo_people (n int, name text, gender text, dob date) on commit drop;
insert into demo_people values
  (1, 'Demo Shopper Ana',     'Female', '2001-03-14'),
  (2, 'Demo Shopper Ben',     'Male',   '1998-07-02'),
  (3, 'Demo Shopper Carla',   'Female', '1995-11-23'),
  (4, 'Demo Shopper Dan',     'Male',   '2003-01-30'),
  (5, 'Demo Shopper Elle',    'Female', '1989-05-09'),
  (6, 'Demo Shopper Francis', 'Male',   '1999-09-17');

create temp table demo_ids (n int, auth_id uuid, user_id bigint, email text) on commit drop;

insert into demo_ids (n, auth_id, email)
select n, gen_random_uuid(), format('demo.shopper%s@navar-demo.test', n) from demo_people;

insert into auth.users (instance_id, id, aud, role, email, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change)
select '00000000-0000-0000-0000-000000000000', d.auth_id, 'authenticated', 'authenticated', d.email, now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  jsonb_build_object('navar_demo', true, 'name', p.name),
  now(), now(), '', '', '', ''
from demo_ids d join demo_people p using (n);

with inserted as (
  insert into public.app_user (user_role, user_name, user_email, user_gender, user_dob, user_auth_user_id)
  select 'user', p.name, d.email, p.gender, p.dob, d.auth_id
  from demo_ids d join demo_people p using (n)
  returning user_id, user_auth_user_id
)
update demo_ids d set user_id = i.user_id from inserted i where i.user_auth_user_id = d.auth_id;

-- Never send real emails to demo shoppers.
insert into public.notif_preference (user_id, notifpref_prom_alerts)
select user_id, false from demo_ids
on conflict (user_id) do update set notifpref_prom_alerts = false;

-- 2. Emails "sent" (Denim Days to all 6, Black Friday Weekend to 5),
--    a few minutes after each promotion's real email blast.
-- visit_at: when the visit happens, as a fraction of the time between the email
-- and now (so visits always come after the email and are never in the future).
create temp table demo_plan (promo_title text, n int, opened boolean, visit_at numeric) on commit drop;
insert into demo_plan values
  ('Denim Days', 1, true,  0.30),
  ('Denim Days', 2, true,  0.55),
  ('Denim Days', 3, true,  0.80),
  ('Denim Days', 4, true,  null),
  ('Denim Days', 5, false, null),
  ('Denim Days', 6, false, null),
  ('Black Friday Weekend', 1, true,  0.45),
  ('Black Friday Weekend', 4, true,  0.70),
  ('Black Friday Weekend', 5, true,  null),
  ('Black Friday Weekend', 2, false, null),
  ('Black Friday Weekend', 6, false, null);

create temp table demo_sends on commit drop as
select p.promotion_id, p.store_id, s.mall_id, d.user_id, d.email, pl.opened, pl.visit_at,
       coalesce(b.created_at, p.promotion_created_at) + interval '2 minutes' as sent_at
from demo_plan pl
join public.promotion p on p.store_id = 12 and p.promotion_title = pl.promo_title
join public.store s on s.store_id = p.store_id
join demo_ids d on d.n = pl.n
left join public.promotion_email_blast b on b.promotion_id = p.promotion_id;

insert into public.email_log (email_log_type, email_log_to_email, email_log_subject, email_log_body,
  email_log_status, email_log_sent_at, mall_id, email_log_source_type, email_log_source_id, email_log_metadata)
select 'promotion', ds.email, 'Vista Apparel promotion (demo sample)', 'Demo sample data for presentations.',
  'sent', ds.sent_at, ds.mall_id, 'promotion', ds.promotion_id::text, '{"demo": true}'::jsonb
from demo_sends ds;

-- 3. Opens (once per person per promotion).
insert into public.promotion_interaction (interaction_timestamp, promotion_id, user_id, interaction_type, interaction_source)
select least(ds.sent_at + interval '20 minutes', now()), ds.promotion_id, ds.user_id, 'view', 'email'
from demo_sends ds where ds.opened
on conflict do nothing;

-- 4. Navigation to Vista Apparel after the email.
insert into public.navigation_session (navsesh_start_time, navsesh_arrived_time, navsesh_date,
  navsesh_is_completed, navsesh_is_emergency, user_id, mall_id, store_id)
select t.start_at, t.start_at + interval '6 minutes', (t.start_at at time zone 'Asia/Manila')::date,
  true, false, ds.user_id, ds.mall_id, ds.store_id
from demo_sends ds
cross join lateral (select ds.sent_at + (now() - interval '1 minute' - ds.sent_at) * ds.visit_at as start_at) t
where ds.visit_at is not null and ds.sent_at < now() - interval '2 minutes';

select (select count(*) from demo_ids) as demo_shoppers,
       (select count(*) from demo_sends) as demo_emails,
       (select count(*) from demo_sends where opened) as demo_opens,
       (select count(*) from demo_sends where visit_at is not null) as demo_visits;

commit;
