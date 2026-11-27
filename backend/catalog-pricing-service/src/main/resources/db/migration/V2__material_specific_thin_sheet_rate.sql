-- Owner clarification (2026-11-27): the 5,000,000 VND/m2 thin-sheet rate applies to metals only.
-- Mica / decal must be priced with their own per-material rate, which is not known yet.
-- Make the per-material rate optional and clear the inherited placeholder for non-metal materials.
-- Until the workshop enters a real rate (Admin > Materials), quoting a non-metal material is
-- refused with a clear message instead of silently using the metal rate.
ALTER TABLE catalog_pricing_schema.materials ALTER COLUMN thin_sheet_rate_per_m2 DROP NOT NULL;
ALTER TABLE catalog_pricing_schema.materials ALTER COLUMN thin_sheet_rate_per_m2 DROP DEFAULT;
UPDATE catalog_pricing_schema.materials SET thin_sheet_rate_per_m2 = NULL WHERE is_metal = FALSE;
