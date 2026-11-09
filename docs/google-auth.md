# Google login (backend)

Requires Node.js 22+ and PostgreSQL. Existing password login, refresh and logout remain available.

## Setup

1. Install backend dependencies with `npm ci`.
2. Create a Google OAuth **Web application** client with authorized redirect URI
   `http://localhost:3000/api/auth/google/callback`. Keep the client secret on the backend.
3. Set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` and
   `FRONTEND_URL=http://localhost:3001` in the backend `.env` (ignored by Git).
4. Run `npm run db:setup` to apply the additive schema changes, then `npm run dev`.
   Existing password hashes and user/message records are preserved. New Google-only users have NULL password_hash.

## Frontend contract

Navigate the **top-level browser** to `GET http://localhost:3000/api/auth/google`;
do not call it with fetch or submit identity data. Google returns to
`GET /api/auth/google/callback`. Success sets the existing HttpOnly access/refresh
cookies and redirects to `FRONTEND_URL/`. The frontend then calls `/api/auth/me`
with `credentials: "include"`. Both login/register pages include the Google button;
the login page maps the fixed error codes below to Arabic messages.
`NEXT_PUBLIC_API_URL` sets the Google button's backend origin (defaults to localhost:3000).
Existing password/message API URLs are unchanged and must also be configured before deployment.

Failure redirects to `FRONTEND_URL/login?error=<code>`:

| Code | Meaning |
| --- | --- |
| google_cancelled | User cancelled Google consent. |
| google_invalid_request | Missing, invalid, expired, reused or wrong-browser login attempt. Restart login. |
| google_account_exists | Email belongs to an account that is not linked to this Google identity. Sign in with its existing method. Explicit linking is not implemented by this change. |
| google_failed | Provider/identity verification or server failure. Retry. |

Missing/invalid Google environment settings return 503 and do not disable password login.
Both Google routes share an IP limit of 60 requests/minute (same in-memory process limitations as existing limits).

## Security and storage

- Google subject (`sub`) identifies the account; matching email alone never links accounts.
- Google library verifies ID-token signature, issuer, audience and expiry. Nonce and verified email are checked too.
- Random state, PKCE S256 and a separate browser cookie bind the authorization request to this browser.
- Attempts expire after five minutes. Atomic DELETE RETURNING prevents concurrent callback replay;
  expired rows are removed when a new login starts. State and browser secrets are stored as SHA-256 digests.
- The temporary browser cookie uses HttpOnly, SameSite=Lax, a restricted path and Secure in production.
  Existing session cookie rules remain unchanged.
- The previous browser session is captured when Google login starts, because Strict cookies are absent
  from the cross-site callback. It is revoked only after successful Google login; cancellation preserves it.
- Google access/refresh/ID tokens are neither persisted nor returned to the frontend. Callback errors do not log credentials.
- Only fixed frontend destinations are allowed; caller-supplied return URLs are ignored.

## Deployment

Register the deployed backend callback URI in Google and set the production Google environment variables.
Set `FRONTEND_URL` to the exact HTTPS frontend origin (no path). Use Node.js 22+.
Configure the existing CORS allowlist, cookie SameSite policy for the actual frontend/backend domains,
and Express proxy trust as appropriate before deploying; this change does not change those existing policies.
Use a database migration account for `db:setup`, and an appropriately limited runtime database role.

## Verification

Run `npm run test:google` against a local development database. Tests create uniquely named test accounts
and remove them afterward. They stub Google's HTTP boundary; the token suite verifies real RSA signatures
with a local test certificate and rejects wrong signatures, issuer, audience, expiry and nonce.
The HTTP/database suite checks state/browser binding, replay/expiry, cancellation, identity rejection,
concurrent account creation, email conflict, Google-only password rejection and existing refresh/logout.

A complete Google consent/login with a real account still requires an interactive browser test.
