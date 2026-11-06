import { NativeModules } from 'react-native';

// Public client configuration, never an API key or credential.
// adb reverse forwards the debug API to the laptop while preserving its localhost-only host guard.
const nativeConfig = NativeModules.CosmixReleaseConfiguration;
// A bundled debug APK runs optimized JS (__DEV__ is false). Its native
// build type still selects the local HTTPS endpoint used by the emulator.
const debugClient = __DEV__ || nativeConfig?.isDebugBuild === true;
const releaseUrl: unknown = nativeConfig?.apiBaseUrl;
const wifiUat =
  nativeConfig?.wifiUat === true && nativeConfig?.isDebugBuild === true;
if (
  !debugClient &&
  (typeof releaseUrl !== 'string' ||
    !/^https:\/\/[a-z0-9.-]+$/.test(releaseUrl))
) {
  throw new Error('Approved production API configuration is missing.');
}
export const environment = {
  apiBaseUrl:
    debugClient && !wifiUat ? 'https://localhost:7241' : (releaseUrl as string),
  wifiUat,
  companyName: 'Cosmix',
  secureStoragePrefix: 'com.cosmix.mobile.v1',
} as const;
