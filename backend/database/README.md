# Restore Tenant data loading

The hosted project is missing `public.get_my_tenant_records(text,bigint)` (confirmed by a read-only API check). Correct credentials cannot resolve a missing database function.

1. Run `37_tenant_contact_security.sql` from this folder in the shared project's Supabase SQL editor. This is the existing Mall Admin migration 37, with a schema-cache reload notification. It preserves tenant ownership checks and does not create/delete users or records.
2. Restart the Tenant backend (`npm run dev` in `backend`) and reload the Tenant website on port 5175.
3. If access is denied afterward, verify the account has an active `tenant_account` assignment and its tenant/store are active. Do not grant broad table access or use a service key in the Tenant backend.

This migration depends on the existing tenant invitation/membership schema. It has not been applied to the hosted database by this change.

## Store profile data

After applying `37_tenant_contact_security.sql`, apply `38_tenant_store_profile.sql`. It creates the store amenities table and the authenticated `get_my_store_profile` and `update_my_store_profile` functions used by the Tenant Store Profile page. The migration validates the confirmed Auth user, active `tenant_account` membership, active tenant, and active store before reading or changing brand, store, unit, operating-hours, payment-method, or amenity data. It grants only RPC execution to `authenticated`; it does not grant direct table access.

The same migration adds promotion image storage and tenant-scoped promotion RPCs. Apply it before using promotion creation, editing, deletion, or image uploads from the Tenant portal.
