import { LoadingSkeleton } from '../components/ui/LoadingSkeleton';
import { t } from '../i18n/language';
import { restoreLanguage, useLanguage } from '../i18n/preference';
import React, { useEffect, useState } from 'react';
import { AppState, StatusBar, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppProvider } from './AppProvider';
import { RootNavigator } from '../navigation/RootNavigator';
import { colors } from '../theme/theme';

export default function App(): React.JSX.Element {
  const language = useLanguage();
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let mounted = true;
    restoreLanguage()
      .catch(() => undefined)
      .finally(() => {
        if (mounted) setReady(true);
      });
    return () => {
      mounted = false;
    };
  }, []);
  const [visible, setVisible] = useState(AppState.currentState === 'active');
  useEffect(() => {
    const subscription = AppState.addEventListener('change', next =>
      setVisible(next === 'active'),
    );
    return () => subscription.remove();
  }, []);
  return (
    <SafeAreaProvider
      style={[styles.app, language === 'ur' ? styles.rtl : styles.ltr]}
    >
      <AppProvider>
        <StatusBar barStyle="dark-content" />
        {ready ? (
          <RootNavigator />
        ) : (
          <View style={styles.startup}>
            <LoadingSkeleton kind="card" />
          </View>
        )}
        {!visible ? (
          <View style={styles.privacy} accessibilityViewIsModal>
            <Text style={styles.brand}>COSMIX</Text>
            <Text style={styles.message}>
              {t('Your workspace is private.')}
            </Text>
          </View>
        ) : null}
      </AppProvider>
    </SafeAreaProvider>
  );
}
const styles = StyleSheet.create({
  app: { flex: 1 },
  startup: { paddingHorizontal: 24, paddingTop: 72 },
  rtl: { direction: 'rtl' },
  ltr: { direction: 'ltr' },
  privacy: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    gap: 12,
  },
  brand: {
    fontSize: 28,
    color: colors.navy,
    fontWeight: '800',
    letterSpacing: 3,
  },
  message: { fontSize: 15, color: colors.muted },
});
