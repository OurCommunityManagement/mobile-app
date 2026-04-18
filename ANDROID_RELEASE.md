# Android Release Build

This mobile app is prepared for Android release builds through EAS.

## Current release settings

- App version: `1.2.0`
- Android version code: `12`
- Android package: `com.community.app`
- EAS profiles:
  - `development`
  - `preview`
  - `production`

## Important notes

- Razorpay mobile checkout requires a native build. It will not work in Expo Go.
- `production` builds create an Android App Bundle (`.aab`) for Play Store upload.
- `preview` and `development` builds create an `.apk` for internal testing.

## One-time setup

1. Install EAS CLI:

   ```bash
   npm install -g eas-cli
   ```

2. Log in:

   ```bash
   eas login
   ```

3. Configure the project if prompted:

   ```bash
   eas build:configure
   ```

## Internal Android test build

Use this first to test native modules such as Razorpay:

```bash
cd "/Users/jamir_laptop/Desktop/Cloud_Projects:Coomunity_App:/Community_App_Mobile_App"
eas build --platform android --profile preview
```

## Production Android build

When internal testing is complete:

```bash
cd "/Users/jamir_laptop/Desktop/Cloud_Projects:Coomunity_App:/Community_App_Mobile_App"
eas build --platform android --profile production
```

This will generate a Play Store ready Android App Bundle.

## Recommended pre-release checks

Before the production build:

- verify web portal login works
- verify mobile owner login works
- verify mobile admin login works
- verify TOTP login works
- verify Razorpay order creation works in a native Android build
- verify logo, app name, and footer version show correctly

## Store readiness reminders

Before Play Store submission, you should still review:

- final app icon and adaptive icon
- splash / launch branding
- Play Store listing text and screenshots
- privacy policy URL
- support email
