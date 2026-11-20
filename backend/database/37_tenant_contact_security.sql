BEGIN;
-- Narrow RPC: identity comes from Auth, never a client-supplied user UUID.
CREATE OR REPLACE FUNCTION public.update_my_tenant_contact(p_tenant bigint,p_name text,p_phone text,p_email text,p_account_name text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE normalized_phone text:=regexp_replace(coalesce(p_phone,''),'[[:space:]-]','','g');
BEGIN
 IF auth.uid() IS NULL OR NOT EXISTS(SELECT 1 FROM auth.users WHERE id=auth.uid() AND email_confirmed_at IS NOT NULL AND deleted_at IS NULL AND (banned_until IS NULL OR banned_until<now())) THEN
  RAISE EXCEPTION 'Authentication required.' USING ERRCODE='42501'; END IF;
 -- Lock membership and resource so revocation cannot race this write.
 PERFORM 1 FROM public.tenant_account a JOIN public.tenant t USING(tenant_id) JOIN public.store s USING(store_id)
 WHERE a.auth_user_id=auth.uid() AND a.tenant_id=p_tenant AND a.is_active
 AND lower(t.tenant_status)='active' AND lower(s.store_status) NOT IN ('inactive','deleted','removed')
 FOR SHARE OF a,s FOR UPDATE OF t;
 IF NOT FOUND THEN RAISE EXCEPTION 'Tenant access denied.' USING ERRCODE='42501'; END IF;
 IF p_account_name IS NOT NULL AND (length(btrim(p_account_name)) NOT BETWEEN 1 AND 50 OR p_account_name ~ '[[:cntrl:]]') THEN RAISE EXCEPTION 'Invalid account name.' USING ERRCODE='22023'; END IF;
 IF p_name IS NULL OR length(btrim(p_name)) NOT BETWEEN 1 AND 50 OR p_name ~ '[[:cntrl:]]'
 OR p_email IS NULL OR length(p_email)>50 OR p_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
 OR normalized_phone !~ '^\+639[0-9]{9}$' THEN RAISE EXCEPTION 'Invalid contact details.' USING ERRCODE='22023'; END IF;
 UPDATE public.tenant SET tenant_name=coalesce(btrim(p_account_name),tenant_name),tenant_contact_person=btrim(p_name),tenant_contact_num=normalized_phone,
 tenant_email=lower(btrim(p_email)),tenant_updated_at=now() WHERE tenant_id=p_tenant;
END $$;
REVOKE ALL ON FUNCTION public.update_my_tenant_contact(bigint,text,text,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.update_my_tenant_contact(bigint,text,text,text,text) TO authenticated;
-- Username resolution is internal to the rate-limited backend login endpoint.
DO $$ BEGIN
 IF to_regprocedure('public.get_admin_email_for_identifier(character varying)') IS NOT NULL THEN
  REVOKE ALL ON FUNCTION public.get_admin_email_for_identifier(varchar) FROM PUBLIC,anon,authenticated;
  GRANT EXECUTE ON FUNCTION public.get_admin_email_for_identifier(varchar) TO service_role;
 END IF;
END $$;

CREATE OR REPLACE FUNCTION public.get_my_tenant_records(p_kind text,p_store bigint DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE answer jsonb;
BEGIN
 IF auth.uid() IS NULL OR NOT EXISTS(SELECT 1 FROM auth.users WHERE id=auth.uid() AND email_confirmed_at IS NOT NULL AND deleted_at IS NULL AND (banned_until IS NULL OR banned_until<now())) THEN
  RAISE EXCEPTION 'Authentication required.' USING ERRCODE='42501'; END IF;
 IF p_kind IS NULL OR p_kind NOT IN ('tenant','store','promotion') THEN RAISE EXCEPTION 'Unknown resource.' USING ERRCODE='22023'; END IF;
 IF p_store IS NOT NULL AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(public.get_my_tenant_access()) a WHERE (a->>'store_id')::bigint=p_store) THEN
  RAISE EXCEPTION 'Store access denied.' USING ERRCODE='42501'; END IF;
 IF p_kind='tenant' THEN
  SELECT coalesce(jsonb_agg(to_jsonb(rows)),'[]'::jsonb) INTO answer FROM (
   SELECT t.* FROM public.tenant t WHERE EXISTS(SELECT 1 FROM jsonb_array_elements(public.get_my_tenant_access()) a WHERE (a->>'tenant_id')::bigint=t.tenant_id)
   AND (p_store IS NULL OR t.store_id=p_store) ORDER BY t.tenant_id LIMIT 1000) rows;
 ELSIF p_kind='store' THEN
  SELECT coalesce(jsonb_agg(to_jsonb(rows)),'[]'::jsonb) INTO answer FROM (
   SELECT s.* FROM public.store s WHERE EXISTS(SELECT 1 FROM jsonb_array_elements(public.get_my_tenant_access()) a WHERE (a->>'store_id')::bigint=s.store_id)
   AND (p_store IS NULL OR s.store_id=p_store) ORDER BY s.store_id LIMIT 1000) rows;
 ELSE
  SELECT coalesce(jsonb_agg(to_jsonb(rows)),'[]'::jsonb) INTO answer FROM (
   SELECT p.* FROM public.promotion p WHERE EXISTS(SELECT 1 FROM jsonb_array_elements(public.get_my_tenant_access()) a WHERE (a->>'store_id')::bigint=p.store_id)
   AND (p_store IS NULL OR p.store_id=p_store) ORDER BY p.promotion_start_date DESC,p.promotion_id DESC LIMIT 1000) rows;
 END IF;
 RETURN answer;
END $$;
REVOKE ALL ON FUNCTION public.get_my_tenant_records(text,bigint) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_my_tenant_records(text,bigint) TO authenticated;
NOTIFY pgrst, 'reload schema';
COMMIT;
