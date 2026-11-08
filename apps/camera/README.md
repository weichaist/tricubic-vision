# Tricubic Vision camera app

Flutter app for a phone mounted on a forklift or other vehicle. It records the
drive in 60-second segments, uploads each segment for AI safety analysis, and
raises an alert when the accelerometer detects a sudden start, stop or turn.
The UI is in Japanese. Runs on Android 11+ and iOS 15+.

## What it does

- Sign-in with Firebase Auth (email and password). The app then loads the
  driver's profile (company, site, role) from Supabase through the
  `fetchUserFromSupabase` Cloud Function, matched by email.
- Recording with [camerawesome](https://pub.dev/packages/camerawesome): front
  camera by default, HD with sound. A new segment starts every 60 seconds; the
  screen stays on while recording.
- Each finished segment gets a thumbnail and is uploaded to Firebase Storage
  (`clips/<user uid>/`, `thumbnails/<user uid>/`); then a document is added to
  the Firestore `clips` collection, which starts the analysis. The local file is
  deleted after the upload.
- Acceleration readout in the corner of the camera screen. Above the threshold
  (default 12 m/s²; long-press the readout to change it) the app files an alert
  through `writeAlertToSupabase`.
- 前後移動検出: an experimental screen that detects forward/backward movement.

## Configure

Copy the example config and fill in your Firebase values
(Firebase console → Project settings → Your apps):

```bash
cp config/example.json config/dev.json
```

| Key | Value |
| --- | --- |
| `FIREBASE_PROJECT_ID` | Firebase project id |
| `FIREBASE_MESSAGING_SENDER_ID` | Project number (sender id) |
| `FIREBASE_STORAGE_BUCKET` | Storage bucket, e.g. `<project>.firebasestorage.app` |
| `FIREBASE_ANDROID_API_KEY`, `FIREBASE_ANDROID_APP_ID` | From the Android app (`dev.tricubic.vision`) |
| `FIREBASE_IOS_API_KEY`, `FIREBASE_IOS_APP_ID` | From the iOS app |
| `FIREBASE_IOS_BUNDLE_ID` | iOS bundle id (default `dev.tricubic.vision`) |
| `FIREBASE_FUNCTIONS_REGION` | Region of the Cloud Functions (default `asia-northeast1`) |
| `ACCELERATION_ALERT_RULE_UID` | `uid` of the rule that sensor alerts are filed under; empty to file them without a rule. The example points at the seeded rule 急発進・急停止・急旋回をしない |

`config/*.json` files other than `example.json` are git-ignored.

Alternatively, run `flutterfire configure` to generate `lib/firebase_options.dart`
with your project's values (keep that file out of version control).

Each driver needs a Firebase Auth account and a Supabase `users` row with the
same email (see the root README).

## Run

```bash
flutter pub get
flutter run --dart-define-from-file=config/dev.json
flutter build apk --dart-define-from-file=config/prod.json
```

The Android application id and iOS bundle id are `dev.tricubic.vision`; change
them (`android/app/build.gradle.kts`, the Xcode project) before publishing your
own build. iOS builds use Swift Package Manager; `video_compress` is still
CocoaPods-only, so CocoaPods is needed as well.

The launcher icon comes from `assets/icon/icon.png`; regenerate the platform
icons with `dart run flutter_launcher_icons`.

## Checks

```bash
flutter analyze
flutter test
```
