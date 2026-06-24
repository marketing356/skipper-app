-- ============================================================
-- Migration 013 — Boater RLS: Supabase Auth OTP
-- Skipper App | 2026-06-24
-- OPERATION-SKIPPER.md — Boater auth via Supabase Auth OTP
-- ============================================================
--
-- Context:
--   Before this migration, boater auth used custom UUIDs with no real Supabase
--   Auth session. auth.uid() was always NULL on the client.
--   After this migration: boaters have real Supabase Auth sessions via OTP.
--   auth.uid() returns their real UUID = contacts.auth_user_id.
--
-- Existing policy state:
--   Both contacts and marina_assets already have "authenticated_access" (ALL, qual=true).
--   These new policies are ADDITIVE — they document the intended boater-scoped access
--   pattern and do not break existing marina-staff access.
--
-- auth_user_id column type: UUID in contacts table.
-- marina_assets links to contacts via tenant_id (UUID FK).
-- ============================================================

-- ── contacts: boater read (all own rows — national-pool + marina-scoped) ────
-- Boater needs to read ALL their contacts rows to find contact IDs used as
-- tenant_id in marina_assets.
DROP POLICY IF EXISTS "boater_read_own_contact" ON public.contacts;
CREATE POLICY "boater_read_own_contact"
  ON public.contacts
  FOR SELECT
  TO authenticated
  USING (auth.uid() = auth_user_id);

-- ── contacts: boater update (national-pool row only) ─────────────────────────
-- Boater profile updates write to the national-pool row only.
-- Marina-scoped rows are updated by Helm/OPS (not by the boater directly).
DROP POLICY IF EXISTS "boater_update_own_contact" ON public.contacts;
CREATE POLICY "boater_update_own_contact"
  ON public.contacts
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = auth_user_id AND marina_id IS NULL)
  WITH CHECK (auth.uid() = auth_user_id AND marina_id IS NULL);

-- ── marina_assets: boater SELECT (own vessels) ───────────────────────────────
-- Vessel belongs to boater. Boater can read all their assets across all marinas.
DROP POLICY IF EXISTS "boater_select_own_asset" ON public.marina_assets;
CREATE POLICY "boater_select_own_asset"
  ON public.marina_assets
  FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT id FROM public.contacts
      WHERE auth_user_id = auth.uid()
    )
  );

-- ── marina_assets: boater INSERT (new vessels) ───────────────────────────────
-- Boater can add their own vessels (tenant_id must be one of their contact IDs).
DROP POLICY IF EXISTS "boater_insert_own_asset" ON public.marina_assets;
CREATE POLICY "boater_insert_own_asset"
  ON public.marina_assets
  FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT id FROM public.contacts
      WHERE auth_user_id = auth.uid()
    )
  );

-- ── marina_assets: boater UPDATE (own vessels) ───────────────────────────────
DROP POLICY IF EXISTS "boater_update_own_asset" ON public.marina_assets;
CREATE POLICY "boater_update_own_asset"
  ON public.marina_assets
  FOR UPDATE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT id FROM public.contacts
      WHERE auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT id FROM public.contacts
      WHERE auth_user_id = auth.uid()
    )
  );

-- ── marina_assets: boater DELETE (own vessels) ───────────────────────────────
DROP POLICY IF EXISTS "boater_delete_own_asset" ON public.marina_assets;
CREATE POLICY "boater_delete_own_asset"
  ON public.marina_assets
  FOR DELETE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT id FROM public.contacts
      WHERE auth_user_id = auth.uid()
    )
  );

-- ============================================================
-- END Migration 013
-- Verify: after OTP auth, check auth.uid() != null client-side,
-- then test vessel INSERT, contacts UPDATE — should succeed.
-- ============================================================
