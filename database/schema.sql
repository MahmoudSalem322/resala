CREATE TABLE IF NOT EXISTS messages (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique
  ON users (LOWER(email));

-- Keep existing anonymous messages; all new API messages require an owner.
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES public.users(id);
CREATE INDEX IF NOT EXISTS messages_user_id_index ON public.messages(user_id);
CREATE INDEX IF NOT EXISTS messages_user_created_index ON public.messages(user_id, created_at DESC, id DESC);

CREATE TABLE IF NOT EXISTS auth_sessions (
  id UUID PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS auth_sessions_user_index ON auth_sessions(user_id);
CREATE TABLE IF NOT EXISTS refresh_tokens (
  token_hash CHAR(64) PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES auth_sessions(id) ON DELETE CASCADE,
  used_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS refresh_tokens_session_index ON refresh_tokens(session_id);

-- Google-only users do not have a local password. Existing hashes are preserved.
ALTER TABLE public.users ALTER COLUMN password_hash DROP NOT NULL;

CREATE TABLE IF NOT EXISTS public.oauth_accounts (
  provider TEXT NOT NULL CHECK (provider = 'google'),
  provider_subject TEXT NOT NULL,
  user_id INTEGER NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (provider, provider_subject),
  UNIQUE (user_id, provider)
);

CREATE TABLE IF NOT EXISTS public.oauth_login_attempts (
  state_hash CHAR(64) PRIMARY KEY,
  browser_hash CHAR(64) NOT NULL,
  code_verifier TEXT NOT NULL,
  nonce TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS oauth_login_attempts_expiry_index ON public.oauth_login_attempts(expires_at);
ALTER TABLE public.oauth_login_attempts ADD COLUMN IF NOT EXISTS previous_session_id UUID
  REFERENCES public.auth_sessions(id) ON DELETE SET NULL;
