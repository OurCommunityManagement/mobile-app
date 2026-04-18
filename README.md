# Community App Mobile

This workspace now includes an Expo + React Native mobile app that targets iOS and reuses the same Supabase backend model as the existing HTML portal.

## What is included

- Role-aware sign in for platform admin, community admin/staff, and owners
- Password reset flow that mirrors the current OTP-preview behavior in `community_management.html`
- Platform community list screen
- Admin mobile views for summary, owners, invoices, and profile
- Owner mobile views for dues, payments, and profile
- Shared Supabase repository layer that reads from `platform_kv` and `community_kv`

## Project structure

- `App.tsx` app entry
- `src/context/AppContext.tsx` boot, auth, session, and refresh state
- `src/services/repository.ts` Supabase reads and writes
- `src/screens/` mobile screens for each role
- `.env.example` required mobile environment variables

## iOS setup

1. Copy `.env.example` to `.env`.
2. Fill in:
   - `EXPO_PUBLIC_SUPABASE_URL`
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY`
3. Install dependencies:

```bash
npm install
```

4. Start Expo:

```bash
npm run start
```

5. Run on the iOS simulator:

```bash
npm run ios
```

## Important backend note

This mobile app intentionally matches the current web prototype’s storage shape:

- `platform_kv`
  - `admin`
  - `communities`
  - `otp_store`
- `community_kv`
  - `admin`
  - `staffList`
  - `owners`
  - `invoices`
  - `payments`

That means it can sit beside the HTML portal without forcing a schema rewrite first.

## Recommended next steps

1. Add create/edit flows for communities, owners, and invoices.
2. Move from custom password hashing to Supabase Auth when you are ready for production hardening.
3. Add remaining modules from the web app:
   - staff
   - amenities
   - visitors
   - vehicles
   - gate management
