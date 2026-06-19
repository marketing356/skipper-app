-- ============================================================
-- SKIPPER FIELD PARITY MIGRATION — 2026-06-19
-- Full parity: Skipper app ↔ Helm contacts + boat fields
-- Run in Supabase SQL Editor BEFORE deploying app code
-- ============================================================

-- 1. Mobile phone field on boater_profiles
ALTER TABLE boater_profiles
  ADD COLUMN IF NOT EXISTS mobile TEXT;

-- 2. Vessel doc / flag fields on boater_vessels
ALTER TABLE boater_vessels
  ADD COLUMN IF NOT EXISTS doc_registration    BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS doc_insurance_cert  BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS doc_signed_contract BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS doc_photo_id        BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS liveaboard          BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS pet_on_board        BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS parking_permit      TEXT;

-- Done. Deploy app code after running this.
