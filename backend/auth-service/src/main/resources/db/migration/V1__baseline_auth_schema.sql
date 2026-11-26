-- V1 baseline for auth_schema (replaces auth part of infra/postgres/init.sql)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
-- SCHEMA 1: auth_schema
-- ============================================================================
CREATE SCHEMA IF NOT EXISTS auth_schema;

CREATE TABLE auth_schema.users (
                                   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                                   email VARCHAR(255) UNIQUE NOT NULL,
                                   password_hash VARCHAR(255) NOT NULL,
                                   full_name VARCHAR(150) NOT NULL,
                                   phone VARCHAR(20) NOT NULL,
                                   default_address TEXT,
                                   role VARCHAR(20) NOT NULL CHECK (role IN ('ADMIN', 'CUSTOMER')),
                                   is_active BOOLEAN NOT NULL DEFAULT TRUE,
                                   created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                                   updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE auth_schema.customer_vat_profiles (
                                                   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                                                   user_id UUID NOT NULL REFERENCES auth_schema.users(id) ON DELETE CASCADE,
                                                   company_name VARCHAR(255) NOT NULL,
                                                   tax_code VARCHAR(50) NOT NULL,
                                                   company_address TEXT NOT NULL,
                                                   is_default BOOLEAN NOT NULL DEFAULT TRUE,
                                                   created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON auth_schema.users(email);
CREATE INDEX idx_vat_profiles_user_id ON auth_schema.customer_vat_profiles(user_id);

