# Cosmix Mobile

Architecture-only React Native + TypeScript project for Android and iOS.

- Desktop folder: `cosmix_mobile`
- Native project name: `CosmixMobile`
- npm package: `cosmix-mobile`
- Development application identifier: `com.cosmix.mobile` (confirm before distribution)
- React Native: `0.87.1`, matching the existing mobile reference stack

There are **no mock screens, sample dashboards, role-specific folders or business implementations**. The app entry intentionally returns `null` and renders no application UI. This is a project foundation, not a finished mobile app.

## Folder guide

```text
src/
  app/
    App.tsx           application entry; no screen mounted
    providers/        future shared providers
  assets/
    fonts/
    icons/
    images/
  auth/               future sign-in/session integration
  components/
    feedback/         shared loading/error components
    forms/            reusable form controls
    layout/           shared layout building blocks
    ui/               reusable basic controls
  config/             application configuration
  constants/          shared constants
  hooks/              reusable React hooks
  navigation/         future navigation configuration
  screens/            future approved application screens
  services/
    api/              backend communication
    storage/          device storage adapters
  theme/              design tokens and shared styling
  types/              shared TypeScript contracts
  utils/              pure reusable helpers
android/              native Android project
ios/                  native iOS project
```

Empty folders contain `.gitkeep` so Git retains them. Screens belong in `screens`, shared controls in `components`, and backend calls in `services/api`. Do not create separate employee/customer copies of the application. Roles and permissions should control approved access at runtime, with enforcement in .NET.

There is no navigation library, state-management framework, HTTP wrapper or device SDK implementation yet. Add only what an approved feature needs.

## Repository

- Repository: [Cosmix-Mobile-App](https://github.com/cosmixengineering/Cosmix-Mobile-App)
- Foundation branch: `codex/mobile-foundation`
- Keep dependencies, generated output, local environment files and production signing keys out of Git.

## Development

Use Node.js 24 with npm.

```powershell
npm ci
npm run verify
npm start
```

In a second terminal, after Android Studio, the supported JDK/SDK and an emulator or device are configured:

```powershell
npm run android
```

For iOS, use macOS with Xcode and CocoaPods. Install Ruby/CocoaPods dependencies with `bundle install` at the project root, then `bundle exec pod install` inside `ios`; run `npm run ios` from the root. Native build commands require the platform toolchains. TypeScript/lint success does not verify a native build.

See the official [React Native environment setup](https://reactnative.dev/docs/set-up-your-environment) and [CLI setup guide](https://reactnative.dev/docs/getting-started-without-a-framework).

## Verification

Verified on 2026-10-05:

- `npm run verify` passed: ESLint, Prettier and TypeScript.
- React Native CLI resolves both native projects and the Android application identifier correctly.
- Application JSON and modified native XML configuration parse successfully.
- No role-specific directories, mock screens, template test files or artifacts directory are present.
- Android/iOS native builds, installation on a device and actual runtime behavior were not exercised. No Metro server was left running.
- Dependency audit is not clean; see the advisory below.

## Dependency advisory

Checked on 2026-10-05: `npm audit` reports 20 high-severity dependency entries tracing to the same unpatched `braces` advisory, [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm). The installed/latest `braces` version is 3.0.3; the advisory lists no patched version. The dependency is used through CLI/Metro file-pattern tooling. App-runtime exploitability has not been assessed.

The suggested forced fix downgrades React Native/CLI to older incompatible versions, so it was not applied. Do not accept untrusted glob patterns or expose Metro publicly. Recheck upstream fixes and review the dependency risk before production. Successful source checks do not resolve this advisory.

## Boundaries

- No demo data, authentication bypass, device permissions or attendance workflows are implemented.
- Keep credentials, signing keys, real employee information and face data out of source control. Device bundles cannot protect embedded API secrets.
- Tokens require an approved OS-protected storage solution; ordinary storage is not a credential vault.
- Camera, location, face verification, background tasks, notification permissions and offline behavior require separate approved implementation.
- The bundled Android debug keystore is the public development-only template key. Release signing is not configured. iOS signing and production app identifiers also need approval.
- No test suite, screenshot/artifact folder or running preview server is part of this foundation. GitHub publishing was authorized separately by the project manager.
- The web/frontend, backend and original mobile mockup were not modified.
