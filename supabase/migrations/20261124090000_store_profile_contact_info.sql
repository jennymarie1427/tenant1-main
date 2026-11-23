-- Store Profile -> Contact Information: save the store's phone and email
-- (store.store_contact_num, store.store_email). Previously these fields were
-- shown but never saved.
do $$
declare v_def text;
begin
  v_def := pg_get_functiondef('public.update_my_store_profile(bigint, jsonb)'::regprocedure);

  -- Validate before saving. Only checked when the keys are sent.
  v_def := replace(v_def,
    $old$    raise exception 'Store name is required.' using errcode = '22023';
  end if;
$old$,
    $new$    raise exception 'Store name is required.' using errcode = '22023';
  end if;
  if p_profile ? 'store_contact_num' and nullif(btrim(p_profile->>'store_contact_num'), '') is not null
     and btrim(p_profile->>'store_contact_num') !~ '^\+?[0-9][0-9 ()-]{5,18}$' then
    raise exception 'Enter a valid phone number (digits, spaces, dashes; up to 20 characters).' using errcode = '22023';
  end if;
  if p_profile ? 'store_email' and nullif(btrim(p_profile->>'store_email'), '') is not null
     and (length(btrim(p_profile->>'store_email')) > 100
          or btrim(p_profile->>'store_email') !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$') then
    raise exception 'Enter a valid email address.' using errcode = '22023';
  end if;
$new$);

  v_def := replace(v_def,
    $old$    store_updated_at = now()
  where store_id = p_store;$old$,
    $new$    store_contact_num = case when p_profile ? 'store_contact_num'
      then nullif(btrim(p_profile->>'store_contact_num'), '') else store_contact_num end,
    store_email = case when p_profile ? 'store_email'
      then nullif(lower(btrim(p_profile->>'store_email')), '') else store_email end,
    store_updated_at = now()
  where store_id = p_store;$new$);

  if v_def not like '%store_contact_num = case%' or v_def not like '%Enter a valid email address%' then
    raise exception 'update_my_store_profile did not match the expected text';
  end if;
  execute v_def;
end $$;
