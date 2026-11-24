-- Promotion results stop when the promotion ends.
--   * Opened and Visits from email only count activity up to the end of the
--     promotion's end date (Philippine time). A visit still has to be within
--     7 days of the email.
--   * Opens after the end date are no longer recorded.
--   * A promotion whose end date has passed can't be emailed.

create or replace function app_private.promotion_email_metrics(p_promotion_id bigint)
 returns table(emailed bigint, opened bigint, email_visits bigint)
 language sql
 stable security definer
 set search_path to ''
as $function$
  with sent as (
    select lower(btrim(e.email_log_to_email)) as email, min(e.email_log_sent_at) as sent_at
    from public.email_log e
    where e.email_log_type = 'promotion' and e.email_log_status = 'sent'
      and e.email_log_source_type = 'promotion' and e.email_log_source_id = p_promotion_id::text
    group by 1
  ),
  promo as (
    select store_id,
           coalesce(((promotion_end_date + 1)::timestamp at time zone 'Asia/Manila'), 'infinity'::timestamptz) as ends_at
    from public.promotion where promotion_id = p_promotion_id
  )
  select
    (select count(*) from sent),
    (select count(*) from public.promotion_interaction pi, promo
      where pi.promotion_id = p_promotion_id and pi.interaction_source = 'email' and pi.interaction_type = 'view'
        and pi.interaction_timestamp < promo.ends_at),
    (select count(distinct au.user_id)
       from sent s
       join public.app_user au on lower(btrim(au.user_email)) = s.email
       where exists (
         select 1 from public.navigation_session ns, promo
         where ns.user_id = au.user_id and ns.store_id = promo.store_id
           and ns.navsesh_start_time >= s.sent_at
           and ns.navsesh_start_time < least(s.sent_at + interval '7 days', promo.ends_at)
       ))
$function$;

create or replace function public.record_promotion_email_open(p_promotion_id bigint, p_token uuid)
 returns boolean
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare v_user bigint; v_email text;
begin
  if p_promotion_id is null or p_token is null then return false; end if;
  -- Ended promotions no longer collect opens.
  if exists (
    select 1 from public.promotion p
    where p.promotion_id = p_promotion_id
      and p.promotion_end_date < (now() at time zone 'Asia/Manila')::date
  ) then
    return false;
  end if;
  select t.user_id, lower(btrim(au.user_email)) into v_user, v_email
  from app_private.email_unsubscribe_token t
  join public.app_user au on au.user_id = t.user_id
  where t.token = p_token;
  if v_user is null or not exists (
    select 1 from public.email_log e
    where e.email_log_type = 'promotion' and e.email_log_status = 'sent'
      and e.email_log_source_type = 'promotion' and e.email_log_source_id = p_promotion_id::text
      and lower(btrim(e.email_log_to_email)) = v_email
  ) then
    return false;
  end if;
  insert into public.promotion_interaction (interaction_timestamp, promotion_id, user_id, interaction_type, interaction_source)
  values (now(), p_promotion_id, v_user, 'view', 'email')
  on conflict do nothing;
  return found;
end $function$;

create or replace function public.claim_promotion_email_blast(p_promotion_id bigint, p_auth_user uuid)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v_promo public.promotion%rowtype;
  v_store public.store%rowtype;
  v_mall_name text;
  v_recipients jsonb;
  v_count integer;
  v_blast_id bigint;
begin
  select * into v_promo from public.promotion where promotion_id = p_promotion_id;
  if v_promo.promotion_id is null then
    raise exception 'Promotion not found.' using errcode = 'P0002';
  end if;
  select * into v_store from public.store where store_id = v_promo.store_id;

  if p_auth_user is null or not exists (
    select 1 from public.tenant_account a join public.tenant t using (tenant_id)
    where a.auth_user_id = p_auth_user and a.is_active and t.store_id = v_store.store_id
      and lower(t.tenant_status) = 'active'
      and lower(v_store.store_status) not in ('inactive', 'deleted', 'removed')
  ) then
    raise exception 'Store access denied.' using errcode = '42501';
  end if;

  if lower(coalesce(v_promo.promotion_status, '')) <> 'active' then
    raise exception 'Only active promotions can be emailed.' using errcode = '22023';
  end if;
  if v_promo.promotion_end_date < (now() at time zone 'Asia/Manila')::date then
    raise exception 'This promotion has already ended, so it can''t be emailed.' using errcode = '22023';
  end if;
  if v_store.mall_id is null then
    raise exception 'This store is not linked to a mall.' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(7311, v_store.store_id::integer);

  if exists (select 1 from public.promotion_email_blast where promotion_id = p_promotion_id) then
    raise exception 'Visitors were already emailed about this promotion.' using errcode = '23505';
  end if;

  select mall_name into v_mall_name from public.mall where mall_id = v_store.mall_id;

  insert into app_private.email_unsubscribe_token (user_id)
  select r.user_id from app_private.promotion_email_recipients(v_store.mall_id, 150) r
  on conflict (user_id) do nothing;

  select jsonb_agg(jsonb_build_object('user_id', r.user_id, 'email', r.email,
           'name', r.user_name, 'unsubscribe_token', t.token) order by r.user_id),
         count(*)
  into v_recipients, v_count
  from app_private.promotion_email_recipients(v_store.mall_id, 150) r
  join app_private.email_unsubscribe_token t on t.user_id = r.user_id;

  if coalesce(v_count, 0) = 0 then
    return jsonb_build_object('blast_id', null, 'recipients', '[]'::jsonb,
      'mall_name', v_mall_name, 'store_name', v_store.store_name);
  end if;

  insert into public.promotion_email_blast (promotion_id, store_id, mall_id, requested_by, recipient_count)
  values (p_promotion_id, v_store.store_id, v_store.mall_id, p_auth_user, v_count)
  returning blast_id into v_blast_id;

  return jsonb_build_object(
    'blast_id', v_blast_id,
    'store_name', v_store.store_name,
    'mall_id', v_store.mall_id,
    'mall_name', v_mall_name,
    'location', (
      select jsonb_build_object('unit_label', u.unit_label, 'floor_label', f.floor_label, 'floor_num', f.floor_num)
      from (select 1) one
      left join lateral (select unit_label, floor_id from public.unit where store_id = v_store.store_id order by unit_id limit 1) u on true
      left join public.floor f on f.floor_id = coalesce(v_store.onboarding_floor_id, u.floor_id)
    ),
    'promotion', jsonb_build_object(
      'title', v_promo.promotion_title,
      'description', v_promo.promotion_description,
      'start', v_promo.promotion_start_date,
      'end', v_promo.promotion_end_date,
      'image_base64', case when v_promo.promotion_image is null then null
                           else encode(v_promo.promotion_image, 'base64') end
    ),
    'recipients', v_recipients
  );
end $function$;
