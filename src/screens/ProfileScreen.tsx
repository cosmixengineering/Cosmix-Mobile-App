import { LanguageSwitch } from '../components/LanguageSwitch';
import { ProfilePhoto } from '../components/ProfilePhoto';
import { t } from '../i18n/language';
import { useLanguage } from '../i18n/preference';
import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useServices, useSession } from '../app/AppProvider';
import { Screen } from '../components/Controls';
import { AccessRecovery } from '../components/AccessRecovery';
import { ServiceRecords } from '../components/ServiceRecords';
import { canOpenService } from '../constants/services';
import { colors } from '../theme/theme';

export function ProfileScreen(): React.JSX.Element {
  useLanguage();
  const auth = useSession();
  const { session } = useServices();
  const [busy, setBusy] = useState(false);

  const displayName = auth.account?.displayName || t('My Account');
  const initials =
    displayName
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map(w => w[0])
      .join('')
      .toUpperCase() || 'CO';

  const onSignOut = () => {
    Alert.alert(
      t('Sign out?'),
      t('You will need an SMS verification code to sign in again.'),
      [
        { text: t('Cancel'), style: 'cancel' },
        {
          text: t('Sign out'),
          style: 'destructive',
          onPress: () => {
            setBusy(true);
            session
              .signOut()
              .catch(() => undefined)
              .finally(() => setBusy(false));
          },
        },
      ],
    );
  };

  const header = (
    <>
      <View style={styles.headerCard}>
        <View style={styles.userRow}>
          {auth.sessionId && canOpenService('profile', auth) ? (
            <ProfilePhoto initials={initials} size={56} />
          ) : (
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
          )}
          <View style={styles.userInfo}>
            <Text style={styles.userName} numberOfLines={1}>
              {displayName}
            </Text>
            <View style={styles.sessionBadge}>
              <View style={styles.sessionDot} />
              <Text style={styles.sessionText}>
                {t('Active Session · Cosmix ERP')}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.actionRow}>
          <Text style={styles.workspaceLabel}>
            {t('Authorized Mobile Workspace')}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('Sign out')}
            disabled={busy}
            onPress={onSignOut}
            style={({ pressed }) => [
              styles.signOutBtn,
              pressed && styles.signOutPressed,
              busy && styles.signOutDisabled,
            ]}
          >
            <Text style={styles.signOutText}>
              {busy ? t('Signing out…') : t('Sign out')}
            </Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.prefCard}>
        <View style={styles.prefRow}>
          <View style={styles.prefInfo}>
            <Text style={styles.prefTitle}>{t('Language')}</Text>
            <Text style={styles.prefSubtitle}>
              {t('Display language / ترجیحی زبان')}
            </Text>
          </View>
          <LanguageSwitch />
        </View>
      </View>
    </>
  );

  if (!canOpenService('profile', auth)) {
    return (
      <Screen>
        {header}
        <AccessRecovery service={t('Employment profile')} />
      </Screen>
    );
  }

  return <ServiceRecords service="profile" header={header} readOnly />;
}

const styles = StyleSheet.create({
  headerCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.line,
    gap: 12,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#DFEBF8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#123D70',
  },
  userInfo: {
    flex: 1,
    gap: 4,
  },
  userName: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.navy,
    letterSpacing: -0.3,
  },
  sessionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E6F4EA',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    alignSelf: 'flex-start',
    gap: 5,
  },
  sessionDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#137333',
  },
  sessionText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#137333',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#E9EEF4',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  workspaceLabel: {
    fontSize: 12,
    color: colors.muted,
  },
  signOutBtn: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FEE2E2',
    backgroundColor: '#FEF2F2',
  },
  signOutPressed: {
    opacity: 0.75,
  },
  signOutDisabled: {
    opacity: 0.5,
  },
  signOutText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#DC2626',
  },
  prefCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.line,
  },
  prefRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  prefInfo: {
    flex: 1,
    gap: 2,
  },
  prefTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.navy,
  },
  prefSubtitle: {
    fontSize: 11,
    color: colors.muted,
  },
});
