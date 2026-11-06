import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useLanguage, selectLanguage } from '../i18n/preference';
import { t } from '../i18n/language';
import { colors } from '../theme/theme';

export function LanguageSwitch() {
  const language = useLanguage();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  return (
    <View style={styles.container}>
      <View
        style={styles.row}
        accessibilityRole="radiogroup"
        accessibilityLabel={t('Language')}
      >
        {(['en', 'ur'] as const).map(code => (
          <Pressable
            key={code}
            accessibilityRole="radio"
            accessibilityState={{ checked: language === code, disabled: busy }}
            disabled={busy}
            onPress={async () => {
              if (busy || language === code) return;
              setBusy(true);
              setFailed(false);
              try {
                await selectLanguage(code);
              } catch {
                setFailed(true);
              } finally {
                setBusy(false);
              }
            }}
            style={[styles.choice, language === code && styles.active]}
          >
            <Text
              accessibilityLanguage={code === 'ur' ? 'ur-PK' : 'en'}
              style={[styles.text, language === code && styles.selected]}
            >
              {code === 'ur' ? 'اردو' : 'English'}
            </Text>
          </Pressable>
        ))}
      </View>
      {failed && (
        <Text accessibilityRole="alert" style={styles.error}>
          {t('Could not save language. Try again.')}
        </Text>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  container: { alignItems: 'flex-start' },
  row: {
    flexDirection: 'row',
    direction: 'ltr',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    padding: 3,
  },
  choice: {
    minHeight: 32,
    minWidth: 54,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 7,
  },
  active: { backgroundColor: colors.navy },
  text: { color: colors.navy, fontSize: 13, fontWeight: '600' },
  selected: { color: colors.white },
  error: { color: colors.danger, fontSize: 11, marginTop: 4 },
});
