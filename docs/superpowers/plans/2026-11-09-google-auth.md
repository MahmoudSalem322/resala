# Google backend authentication implementation plan

**Goal:** Implement the approved Google authorization-code login flow on the existing Express backend.

**Architecture:** Google code exchange and ID-token verification use google-auth-library. PostgreSQL stores single-use, five-minute login attempts bound to an HttpOnly SameSite=Lax browser cookie, PKCE and nonce. A separate oauth_accounts table associates Google sub with users. Existing session issuance, refresh and logout are reused. Matching email alone never links accounts.

**Scope:** Backend only. Success returns to FRONTEND_URL + `/`; failure to `/login?error=<fixed-code>`. No arbitrary return URL, Google tokens persisted, frontend edits or automatic account linking. Missing Google credentials disable only Google login. Local credentials remain ignored by Git.

- [x] Write and run failing OAuth HTTP/security/database tests using a stub only at the Google network boundary.
- [x] Add dependency, migration, Google adapter, attempt/account repositories, controllers and routes; safely reject password login for Google-only users.
- [x] Apply schema; run OAuth tests and existing session/auth tests; review diffs and verify the live backend.
- [x] Document setup, endpoints, errors, deployment and actual verification limits.

## Verification record

- Initial HTTP test failed as expected with 404 before implementation.
- Google token suite uses real Google-library signature/issuer/audience/expiry checks with local RSA keys and HTTP stubs.
- HTTP/PostgreSQL suite passed; existing refresh-session and message-auth suites passed.
- Independent review found Strict session cookies absent on Google callbacks. A regression test failed as expected
  (old session returned 200 instead of 401), then passed after capturing the previous session id at initiation.
- Live backend `/api/auth/google` returns 302 to Google with S256 and the configured callback.
- Real-account consent remains an interactive check; no real Google account was signed in by automated tests.

Review focus: wrong/missing/replayed state; expired or wrong-browser callbacks; invalid/unverified identities; simultaneous first logins and email conflicts; Google-only password rejection and session refresh/logout compatibility.
