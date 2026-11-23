-- Supabase security advisor fixes.
-- is_public_status uses only built-in functions, so pinning its search_path is
-- safe and removes the "role mutable search_path" warning.
alter function app_private.is_public_status(text) set search_path = '';
