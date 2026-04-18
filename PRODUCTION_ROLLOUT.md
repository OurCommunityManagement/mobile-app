# Production Rollout

Use this order to move the web portal and mobile app onto the same secure backend
path without breaking the live system.

## 1. Confirm the hardened portal build is the live one

Before any database lockdown, make sure the deployed web portal is the latest
`community_management.html` / `index.html` version that already uses:

- `platform-auth-login`
- `platform-auth-verify-totp`
- `community-auth-login`
- `community-bootstrap`
- `platform-bootstrap`
- `community-kv-write`
- `platform-admin-write`
- `razorpay-create-order`

## 2. Create the auth/session support tables

Run this file in Supabase SQL Editor:

- `/Users/jamir_laptop/Desktop/Cloud_Projects:Coomunity_App:/Community_App/supabase-auth-hardening.sql`

It creates:

- `platform_sessions`
- `community_sessions`
- security event tables
- password reset tables

These are deny-by-default service-role tables for Edge Functions only.

## 3. Set required Edge Function secrets

Store these in Supabase Edge Function secrets before deploy:

- `SUPABASE_SERVICE_ROLE_KEY`
- `PLATFORM_PASSWORD_SALT`
- `COMMUNITY_PASSWORD_SALT`
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- any existing reset / OTP / email secrets your live functions already use

Recommended CLI flow:

```bash
supabase login
supabase link --project-ref <YOUR_PROJECT_REF>
supabase secrets set --env-file .env.functions
```

## 4. Deploy the Edge Functions

From `/Users/jamir_laptop/Desktop/Cloud_Projects:Coomunity_App:/Community_App`, deploy:

- `platform-auth-login`
- `platform-auth-verify-totp`
- `community-auth-login`
- `community-auth-verify-totp`
- `platform-bootstrap`
- `community-bootstrap`
- `platform-admin-write`
- `community-kv-write`
- `platform-auth-request-reset`
- `platform-auth-reset-password`
- `community-auth-request-reset`
- `community-auth-reset-password`
- `platform-self-change-password`
- `community-self-change-password`
- `razorpay-create-order`
- `razorpay-webhook`

Example:

```bash
supabase functions deploy platform-auth-login
supabase functions deploy platform-auth-verify-totp
supabase functions deploy community-auth-login
supabase functions deploy community-auth-verify-totp
supabase functions deploy platform-bootstrap
supabase functions deploy community-bootstrap
supabase functions deploy platform-admin-write
supabase functions deploy community-kv-write
supabase functions deploy platform-auth-request-reset
supabase functions deploy platform-auth-reset-password
supabase functions deploy community-auth-request-reset
supabase functions deploy community-auth-reset-password
supabase functions deploy platform-self-change-password
supabase functions deploy community-self-change-password
supabase functions deploy razorpay-create-order
supabase functions deploy razorpay-webhook --no-verify-jwt
```

## 5. Smoke test before lockdown

From `/Users/jamir_laptop/Desktop/Cloud_Projects:Coomunity_App:/Community_App`, use:

- `tools/smoke_test.py`
- `tools/smoke_test_config.example.json`

Recommended checks:

- platform login
- platform TOTP verify
- platform bootstrap
- community admin login
- owner login
- community bootstrap
- optional Razorpay order creation

## 6. Lock down direct database access

Only after the smoke test passes, run:

- `/Users/jamir_laptop/Desktop/Cloud_Projects:Coomunity_App:/Community_App/supabase-security.sql`

This removes the old direct `anon` / `authenticated` access path from:

- `platform_kv`
- `community_kv`

## 7. Rotate exposed credentials

After lockdown:

- rotate the legacy Supabase anon / publishable key if the old site was ever live
- rotate the Razorpay secret if it was exposed anywhere outside secure server-side config
- rotate platform admin and community admin passwords if needed

## 8. Final verification

After lockdown, verify:

- latest web portal login works
- platform 2FA works
- platform community creation works
- admin mobile login works
- owner mobile login works
- owner Razorpay order creation works from native build

## Important notes

- Razorpay mobile checkout will not work in Expo Go. Use a development build or
  release build for payment testing.
- The mobile app now follows the web portal's two-step platform auth flow, so
  platform sign-in must complete authenticator verification before protected
  platform actions will work.
