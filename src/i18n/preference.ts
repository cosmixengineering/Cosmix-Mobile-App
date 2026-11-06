import { useSyncExternalStore } from 'react';
import * as Keychain from 'react-native-keychain';
import {
  currentLanguage,
  subscribeLanguage,
  applyLanguage,
  type Language,
} from './language';

const options = {
  service: 'com.cosmix.mobile.preference.language',
  accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};
let pending: Promise<void> | undefined;
export const useLanguage = () =>
  useSyncExternalStore(subscribeLanguage, currentLanguage);
export async function restoreLanguage() {
  const stored = await Keychain.getGenericPassword(options);
  if (stored && (stored.password === 'ur' || stored.password === 'en'))
    applyLanguage(stored.password);
}
export function selectLanguage(next: Language) {
  if (pending) return pending;
  pending = (async () => {
    if (!(await Keychain.setGenericPassword('language', next, options)))
      throw new Error('language_storage');
    applyLanguage(next);
  })().finally(() => {
    pending = undefined;
  });
  return pending;
}
