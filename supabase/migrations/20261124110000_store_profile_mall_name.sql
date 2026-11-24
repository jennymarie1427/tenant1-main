-- Store profile also returns the store's mall (id, name, city) so the portal
-- sidebar can show which mall the store belongs to.
create or replace function public.get_my_store_profile(p_store bigint)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare result jsonb;
begin
  if p_store is null or p_store < 1 or auth.uid() is null or not exists (
    select 1 from auth.users u
    where u.id = auth.uid() and u.email_confirmed_at is not null
      and u.deleted_at is null and (u.banned_until is null or u.banned_until < now())
  ) or not exists (
    select 1 from public.tenant_account a
    join public.tenant t using (tenant_id)
    join public.store s using (store_id)
    where a.auth_user_id = auth.uid() and a.is_active and t.store_id = p_store
      and lower(t.tenant_status) = 'active'
      and lower(s.store_status) not in ('inactive', 'deleted', 'removed')
  ) then raise exception 'Store access denied.' using errcode = '42501'; end if;

  select jsonb_build_object(
    'brand', (select to_jsonb(b) || jsonb_build_object(
      'brand_logo_base64', case when b.brand_logo is null then null else encode(b.brand_logo, 'base64') end
    ) from public.brand b join public.store s on s.brand_id = b.brand_id where s.store_id = p_store),
    'store', (select to_jsonb(s) from public.store s where s.store_id = p_store),
    'mall', (select jsonb_build_object('mall_id', m.mall_id, 'mall_name', m.mall_name, 'mall_city', m.mall_city)
             from public.mall m join public.store s on s.mall_id = m.mall_id where s.store_id = p_store),
    'floor', (select to_jsonb(f) from public.floor f where f.floor_id = coalesce(
      (select s.onboarding_floor_id from public.store s where s.store_id = p_store),
      (select u.floor_id from public.unit u where u.store_id = p_store order by u.unit_id limit 1)
    )),
    'unit', (select to_jsonb(u) from public.unit u where u.store_id = p_store order by u.unit_id limit 1),
    'operating_hours', coalesce((select jsonb_agg(to_jsonb(h) order by h.opthrs_id) from public.operating_hours h where h.store_id = p_store and h.opthrs_is_store is distinct from false), '[]'::jsonb),
    'payment_methods', coalesce((select jsonb_agg(to_jsonb(p) order by p.store_pm_id) from public.store_payment_method p where p.store_id = p_store), '[]'::jsonb)
  ) into result;
  return result;
end $function$;
