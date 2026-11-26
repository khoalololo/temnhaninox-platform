-- Google sign-in + password reset (Phase B)
ALTER TABLE auth_schema.users
    ADD COLUMN auth_provider VARCHAR(20) NOT NULL DEFAULT 'LOCAL' CHECK (auth_provider IN ('LOCAL', 'GOOGLE')),
    ADD COLUMN google_id VARCHAR(100);
ALTER TABLE auth_schema.users ALTER COLUMN password_hash DROP NOT NULL;   -- Google-only accounts have no password
ALTER TABLE auth_schema.users ALTER COLUMN phone DROP NOT NULL;           -- Google does not provide a phone number
CREATE UNIQUE INDEX uq_users_google_id ON auth_schema.users(google_id) WHERE google_id IS NOT NULL;

-- Only a SHA-256 hash of the emailed token is stored, so a DB leak does not leak usable reset links.
CREATE TABLE auth_schema.password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth_schema.users(id) ON DELETE CASCADE,
    token_hash VARCHAR(64) NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_password_reset_user ON auth_schema.password_reset_tokens(user_id);
