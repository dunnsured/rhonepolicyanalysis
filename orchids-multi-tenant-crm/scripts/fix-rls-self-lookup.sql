-- Fix: Allow authenticated users to read their own record
-- This breaks the chicken-and-egg problem where getCRMUserAccess()
-- needs to query the users table before auth.tenant_id() can work.
--
-- Run this in the Supabase Dashboard SQL Editor.

-- CRM users: allow reading own record by auth_user_id
CREATE POLICY "users_read_own" ON users
  FOR SELECT TO authenticated
  USING (auth_user_id = auth.uid());

-- Partner portal users: allow reading own record by auth_user_id
CREATE POLICY "partner_users_read_own" ON partner_users
  FOR SELECT TO authenticated
  USING (auth_user_id = auth.uid());

-- Client portal users: allow reading own record by auth_user_id
CREATE POLICY "client_users_read_own" ON client_users
  FOR SELECT TO authenticated
  USING (auth_user_id = auth.uid());
