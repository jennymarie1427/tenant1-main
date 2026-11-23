-- Remove the one-promotion-email-per-store-per-day limit. Each promotion is
-- still emailed at most once. Note: all stores share one Gmail account, which
-- can send to about 500 recipients a day in total.
do $$
declare v_def text;
begin
  v_def := pg_get_functiondef('public.claim_promotion_email_blast(bigint, uuid)'::regprocedure);
  v_def := replace(v_def,
    $old$  if exists (
    select 1 from public.promotion_email_blast
    where store_id = v_store.store_id
      and (created_at at time zone 'Asia/Manila')::date = (now() at time zone 'Asia/Manila')::date
      and not (status = 'failed' and sent_count = 0)
  ) then
    raise exception 'Your store already sent a promotion email today. You can send another tomorrow.'
      using errcode = 'P0001';
  end if;
$old$, '');
  if v_def like '%already sent a promotion email today%' then
    raise exception 'claim_promotion_email_blast did not match the expected text';
  end if;
  execute v_def;
end $$;
