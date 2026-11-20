BEGIN;

ALTER TABLE public.promotion ADD COLUMN IF NOT EXISTS promotion_image bytea;
ALTER TABLE public.promotion ADD COLUMN IF NOT EXISTS promotion_image_path text;

CREATE TABLE IF NOT EXISTS public.store_amenity (
  store_amenity_id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  store_id bigint NOT NULL,
  store_amenity_type text NOT NULL CHECK (store_amenity_type IN ('service', 'facility', 'note')),
  store_amenity_name text NOT NULL,
  store_amenity_note_type text NULL CHECK (store_amenity_note_type IN ('warn', 'ok', 'no')),
  store_amenity_created_at timestamptz NOT NULL DEFAULT now(),
  store_amenity_updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT store_amenity_pkey PRIMARY KEY (store_amenity_id),
  CONSTRAINT fk_store_amenity_store_id FOREIGN KEY (store_id) REFERENCES public.store(store_id) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS ix_store_amenity_store_id ON public.store_amenity(store_id);

CREATE OR REPLACE FUNCTION public.get_my_promotions(p_store bigint)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE result jsonb;
BEGIN
  IF p_store IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.tenant_account a
    JOIN public.tenant t USING (tenant_id)
    JOIN public.store s USING (store_id)
    WHERE a.auth_user_id = auth.uid() AND a.is_active AND t.store_id = p_store
      AND lower(t.tenant_status) = 'active'
      AND lower(s.store_status) NOT IN ('inactive', 'deleted', 'removed')
  ) THEN RAISE EXCEPTION 'Store access denied.' USING ERRCODE='42501'; END IF;
  SELECT COALESCE(jsonb_agg(to_jsonb(row_data) ORDER BY row_data.promotion_start_date DESC, row_data.promotion_id DESC), '[]'::jsonb)
  INTO result
  FROM (
    SELECT p.*, CASE WHEN p.promotion_image IS NULL THEN NULL ELSE encode(p.promotion_image, 'base64') END AS promotion_image_base64
    FROM public.promotion p WHERE p.store_id = p_store
  ) row_data;
  RETURN result;
END $$;

CREATE OR REPLACE FUNCTION public.create_my_promotion(p_store bigint, p_promotion jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE new_id bigint;
BEGIN
  IF p_store IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.tenant_account a JOIN public.tenant t USING (tenant_id) JOIN public.store s USING (store_id)
    WHERE a.auth_user_id = auth.uid() AND a.is_active AND t.store_id = p_store
      AND lower(t.tenant_status) = 'active' AND lower(s.store_status) NOT IN ('inactive', 'deleted', 'removed')
  ) THEN RAISE EXCEPTION 'Store access denied.' USING ERRCODE='42501'; END IF;
  IF NULLIF(btrim(p_promotion->>'title'), '') IS NULL OR NULLIF(p_promotion->>'start', '') IS NULL OR NULLIF(p_promotion->>'end', '') IS NULL
    THEN RAISE EXCEPTION 'Promotion title and dates are required.' USING ERRCODE='22023'; END IF;
  INSERT INTO public.promotion (
    promotion_title, promotion_description, promotion_type, promotion_start_date, promotion_end_date,
    promotion_status, promotion_created_at, promotion_updated_at, store_id, promotion_image, promotion_image_path
  ) VALUES (
    btrim(p_promotion->>'title'), p_promotion->>'description', 'store',
    (p_promotion->>'start')::date, (p_promotion->>'end')::date, COALESCE(NULLIF(p_promotion->>'status', ''), 'active'),
    now(), now(), p_store,
    CASE WHEN p_promotion->>'image_data_url' LIKE 'data:image/%;base64,%' THEN decode(split_part(p_promotion->>'image_data_url', ',', 2), 'base64') END,
    NULLIF(p_promotion->>'image_path', '')
  ) RETURNING promotion_id INTO new_id;
  RETURN jsonb_build_object('promotion_id', new_id);
END $$;

CREATE OR REPLACE FUNCTION public.update_my_promotion(p_store bigint, p_promotion_id bigint, p_promotion jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  IF p_store IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.tenant_account a JOIN public.tenant t USING (tenant_id) JOIN public.store s USING (store_id)
    WHERE a.auth_user_id = auth.uid() AND a.is_active AND t.store_id = p_store
      AND lower(t.tenant_status) = 'active' AND lower(s.store_status) NOT IN ('inactive', 'deleted', 'removed')
  ) THEN RAISE EXCEPTION 'Store access denied.' USING ERRCODE='42501'; END IF;
  UPDATE public.promotion SET promotion_title = btrim(p_promotion->>'title'),
    promotion_description = p_promotion->>'description', promotion_start_date = (p_promotion->>'start')::date,
    promotion_end_date = (p_promotion->>'end')::date, promotion_status = COALESCE(NULLIF(p_promotion->>'status', ''), promotion_status),
    promotion_updated_at = now(),
    promotion_image = CASE WHEN p_promotion ? 'image_data_url' AND p_promotion->>'image_data_url' LIKE 'data:image/%;base64,%'
      THEN decode(split_part(p_promotion->>'image_data_url', ',', 2), 'base64') ELSE promotion_image END
  WHERE promotion_id = p_promotion_id AND store_id = p_store;
  IF NOT FOUND THEN RAISE EXCEPTION 'Promotion not found.' USING ERRCODE='P0002'; END IF;
  RETURN jsonb_build_object('updated', true);
END $$;

CREATE OR REPLACE FUNCTION public.delete_my_promotion(p_store bigint, p_promotion_id bigint)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  IF p_store IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.tenant_account a JOIN public.tenant t USING (tenant_id) JOIN public.store s USING (store_id)
    WHERE a.auth_user_id = auth.uid() AND a.is_active AND t.store_id = p_store
      AND lower(t.tenant_status) = 'active' AND lower(s.store_status) NOT IN ('inactive', 'deleted', 'removed')
  ) THEN RAISE EXCEPTION 'Store access denied.' USING ERRCODE='42501'; END IF;
  DELETE FROM public.promotion WHERE promotion_id = p_promotion_id AND store_id = p_store;
  IF NOT FOUND THEN RAISE EXCEPTION 'Promotion not found.' USING ERRCODE='P0002'; END IF;
  RETURN jsonb_build_object('deleted', true);
END $$;

REVOKE ALL ON FUNCTION public.get_my_promotions(bigint), public.create_my_promotion(bigint, jsonb), public.update_my_promotion(bigint, bigint, jsonb), public.delete_my_promotion(bigint, bigint) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_promotions(bigint), public.create_my_promotion(bigint, jsonb), public.update_my_promotion(bigint, bigint, jsonb), public.delete_my_promotion(bigint, bigint) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_my_store_profile(p_store bigint)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE result jsonb;
BEGIN
  IF p_store IS NULL OR p_store < 1 OR auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM auth.users u
    WHERE u.id = auth.uid() AND u.email_confirmed_at IS NOT NULL
      AND u.deleted_at IS NULL AND (u.banned_until IS NULL OR u.banned_until < now())
  ) OR NOT EXISTS (
    SELECT 1 FROM public.tenant_account a
    JOIN public.tenant t USING (tenant_id)
    JOIN public.store s USING (store_id)
    WHERE a.auth_user_id = auth.uid() AND a.is_active AND t.store_id = p_store
      AND lower(t.tenant_status) = 'active'
      AND lower(s.store_status) NOT IN ('inactive', 'deleted', 'removed')
  ) THEN RAISE EXCEPTION 'Store access denied.' USING ERRCODE='42501'; END IF;

  SELECT jsonb_build_object(
    'brand', (SELECT to_jsonb(b) || jsonb_build_object(
      'brand_logo_base64', CASE WHEN b.brand_logo IS NULL THEN NULL ELSE encode(b.brand_logo, 'base64') END
    ) FROM public.brand b JOIN public.store s ON s.brand_id = b.brand_id WHERE s.store_id = p_store),
    'store', (SELECT to_jsonb(s) FROM public.store s WHERE s.store_id = p_store),
    'floor', (SELECT to_jsonb(f) FROM public.floor f WHERE f.floor_id = COALESCE(
      (SELECT s.onboarding_floor_id FROM public.store s WHERE s.store_id = p_store),
      (SELECT u.floor_id FROM public.unit u WHERE u.store_id = p_store ORDER BY u.unit_id LIMIT 1)
    )),
    'unit', (SELECT to_jsonb(u) FROM public.unit u WHERE u.store_id = p_store ORDER BY u.unit_id LIMIT 1),
    'operating_hours', COALESCE((SELECT jsonb_agg(to_jsonb(h) ORDER BY h.opthrs_id) FROM public.operating_hours h WHERE h.store_id = p_store AND h.opthrs_is_store IS DISTINCT FROM false), '[]'::jsonb),
    'payment_methods', COALESCE((SELECT jsonb_agg(to_jsonb(p) ORDER BY p.store_pm_id) FROM public.store_payment_method p WHERE p.store_id = p_store), '[]'::jsonb),
    'amenities', COALESCE((SELECT jsonb_agg(to_jsonb(a) ORDER BY a.store_amenity_id) FROM public.store_amenity a WHERE a.store_id = p_store), '[]'::jsonb)
  ) INTO result;
  RETURN result;
END $$;

CREATE OR REPLACE FUNCTION public.update_my_store_profile(p_store bigint, p_profile jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE row_data jsonb; item jsonb; current_store public.store%ROWTYPE;
BEGIN
  IF p_store IS NULL OR p_store < 1 OR auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM auth.users u
    WHERE u.id = auth.uid() AND u.email_confirmed_at IS NOT NULL
      AND u.deleted_at IS NULL AND (u.banned_until IS NULL OR u.banned_until < now())
  ) OR NOT EXISTS (
    SELECT 1 FROM public.tenant_account a
    JOIN public.tenant t USING (tenant_id)
    JOIN public.store s USING (store_id)
    WHERE a.auth_user_id = auth.uid() AND a.is_active AND t.store_id = p_store
      AND lower(t.tenant_status) = 'active'
      AND lower(s.store_status) NOT IN ('inactive', 'deleted', 'removed')
  ) THEN RAISE EXCEPTION 'Store access denied.' USING ERRCODE='42501'; END IF;

  SELECT * INTO current_store FROM public.store WHERE store_id = p_store FOR UPDATE;
  IF current_store.store_id IS NULL THEN
    RAISE EXCEPTION 'Store access denied.' USING ERRCODE='42501';
  END IF;
  IF p_profile->>'store_name' IS NULL OR length(btrim(p_profile->>'store_name')) NOT BETWEEN 1 AND 100 THEN
    RAISE EXCEPTION 'Store name is required.' USING ERRCODE='22023';
  END IF;

  UPDATE public.brand SET
    brand_category = COALESCE(NULLIF(btrim(p_profile->>'brand_category'), ''), brand_category),
    brand_description = p_profile->>'brand_description',
    brand_logo = CASE WHEN p_profile->>'brand_logo_data_url' LIKE 'data:image/%;base64,%'
      THEN decode(split_part(p_profile->>'brand_logo_data_url', ',', 2), 'base64') ELSE brand_logo END,
    brand_logo_path = NULLIF(p_profile->>'brand_logo_path', ''),
    brand_updated_at = now()
  WHERE brand_id = current_store.brand_id;

  UPDATE public.store SET store_name = btrim(p_profile->>'store_name'),
    store_description = p_profile->>'store_description',
    store_has_cr = COALESCE((p_profile->>'store_has_cr')::boolean, store_has_cr),
    store_updated_at = now()
  WHERE store_id = p_store;

  UPDATE public.unit SET unit_label = btrim(p_profile->>'unit_label'), unit_updated_at = now()
  WHERE store_id = p_store AND NULLIF(btrim(p_profile->>'unit_label'), '') IS NOT NULL;

  DELETE FROM public.operating_hours WHERE store_id = p_store;
  FOR item IN SELECT * FROM jsonb_array_elements(COALESCE(p_profile->'operating_hours', '[]'::jsonb)) LOOP
    INSERT INTO public.operating_hours (opthrs_day_of_week, opthrs_open_time, opthrs_close_time, opthrs_is_closed, store_id, opthrs_is_store, opthrs_is_mall, opthrs_is_inquiry)
    VALUES (item->>'day', NULLIF(item->>'open_time', '')::time, NULLIF(item->>'close_time', '')::time, COALESCE((item->>'is_closed')::boolean, false), p_store, true, false, false);
  END LOOP;

  DELETE FROM public.store_payment_method WHERE store_id = p_store;
  FOR item IN SELECT * FROM jsonb_array_elements(COALESCE(p_profile->'payment_methods', '[]'::jsonb)) LOOP
    INSERT INTO public.store_payment_method (store_pm_name, store_pm_created_at, store_pm_updated_at, store_id)
    VALUES (btrim(item->>'name'), now(), now(), p_store);
  END LOOP;

  DELETE FROM public.store_amenity WHERE store_id = p_store;
  FOR item IN SELECT * FROM jsonb_array_elements(COALESCE(p_profile->'amenities', '[]'::jsonb)) LOOP
    INSERT INTO public.store_amenity (store_id, store_amenity_type, store_amenity_name, store_amenity_note_type)
    VALUES (p_store, item->>'type', btrim(item->>'name'), NULLIF(item->>'note_type', ''));
  END LOOP;

  SELECT jsonb_build_object('saved', true) INTO row_data;
  RETURN row_data;
END $$;

REVOKE ALL ON FUNCTION public.get_my_store_profile(bigint) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.update_my_store_profile(bigint, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_store_profile(bigint) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_my_store_profile(bigint, jsonb) TO authenticated;
NOTIFY pgrst, 'reload schema';
COMMIT;

-- Allows tenants to update the contact person's position as part of the same
-- membership-checked profile update used for the other contact fields.
CREATE OR REPLACE FUNCTION public.update_my_tenant_contact(
  p_tenant bigint,
  p_name text,
  p_phone text,
  p_email text,
  p_account_name text,
  p_type text
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE normalized_phone text := regexp_replace(coalesce(p_phone, ''), '[[:space:]-]', '', 'g');
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid() AND email_confirmed_at IS NOT NULL AND deleted_at IS NULL
      AND (banned_until IS NULL OR banned_until < now())
  ) THEN
    RAISE EXCEPTION 'Authentication required.' USING ERRCODE='42501';
  END IF;
  PERFORM 1
  FROM public.tenant_account a
  JOIN public.tenant t USING (tenant_id)
  JOIN public.store s USING (store_id)
  WHERE a.auth_user_id = auth.uid() AND a.tenant_id = p_tenant AND a.is_active
    AND lower(t.tenant_status) = 'active'
    AND lower(s.store_status) NOT IN ('inactive', 'deleted', 'removed')
  FOR SHARE OF a, s FOR UPDATE OF t;
  IF NOT FOUND THEN RAISE EXCEPTION 'Tenant access denied.' USING ERRCODE='42501'; END IF;
  IF p_account_name IS NOT NULL AND (length(btrim(p_account_name)) NOT BETWEEN 1 AND 50 OR p_account_name ~ '[[:cntrl:]]')
    OR p_type IS NOT NULL AND (length(btrim(p_type)) NOT BETWEEN 1 AND 100 OR p_type ~ '[[:cntrl:]]')
    OR p_name IS NULL OR length(btrim(p_name)) NOT BETWEEN 1 AND 50 OR p_name ~ '[[:cntrl:]]'
    OR p_email IS NULL OR length(p_email) > 50 OR p_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    OR normalized_phone !~ '^\+639[0-9]{9}$' THEN
    RAISE EXCEPTION 'Invalid contact details.' USING ERRCODE='22023';
  END IF;
  UPDATE public.tenant
  SET tenant_name = coalesce(btrim(p_account_name), tenant_name),
      tenant_contact_person = btrim(p_name),
      tenant_type = nullif(btrim(p_type), ''),
      tenant_contact_num = normalized_phone,
      tenant_email = lower(btrim(p_email)),
      tenant_updated_at = now()
  WHERE tenant_id = p_tenant;
END $$;
REVOKE ALL ON FUNCTION public.update_my_tenant_contact(bigint,text,text,text,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_my_tenant_contact(bigint,text,text,text,text,text) TO authenticated;
NOTIFY pgrst, 'reload schema';
