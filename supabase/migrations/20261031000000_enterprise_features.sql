-- -----------------------------------------------------------------------------
-- Migration: 20261031000000_enterprise_features.sql
-- Description: Adds template support and biometric selfie photo + GPS geo-location
-- -----------------------------------------------------------------------------

ALTER TABLE documents 
  ADD COLUMN IF NOT EXISTS is_template boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS template_name text;

ALTER TABLE signatures 
  ADD COLUMN IF NOT EXISTS photo_storage_path text,
  ADD COLUMN IF NOT EXISTS geo_lat numeric(9, 6),
  ADD COLUMN IF NOT EXISTS geo_lng numeric(9, 6),
  ADD COLUMN IF NOT EXISTS geo_accuracy numeric(8, 2);

CREATE INDEX IF NOT EXISTS idx_documents_is_template ON documents(organization_id, is_template);
