-- DEV ONLY. Destroys all application data. Never run against a shared/production database.
DROP SCHEMA IF EXISTS order_schema CASCADE;
DROP SCHEMA IF EXISTS catalog_pricing_schema CASCADE;
DROP SCHEMA IF EXISTS auth_schema CASCADE;
