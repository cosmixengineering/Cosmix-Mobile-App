import React, { useCallback, useLayoutEffect } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParams } from '../navigation/types';
import { displayLocale, t } from '../i18n/language';
import { useLanguage } from '../i18n/preference';
import type { DataRecord } from '../types/selfService';
import { numeric } from '../utils/serviceValues';
import { colors, layout } from '../theme/theme';
import { Notice, Screen } from './Controls';
import { ServiceIcon } from './ServiceIcon';
import { LoadingSkeleton } from './ui/LoadingSkeleton';

const categories = [
  ['Leave', 'leaves', 'pendingLeaveRequestsCount'],
  ['Advance / loan', 'loans', 'pendingAdvanceLoanRequestsCount'],
  ['Allowances', 'allowances', 'pendingAllowanceClaimsCount'],
  ['Fuel', 'vehicles', 'pendingFuelClaimsCount'],
  [
    'Attendance corrections',
    'corrections',
    'pendingAttendanceCorrectionRequestsCount',
  ],
] as const;

export function RequestOverview({
  root,
  loading,
  error,
  reload,
}: {
  root?: DataRecord;
  loading: boolean;
  error: string;
  reload: () => Promise<void>;
}) {
  const language = useLanguage();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParams>>();
  const refreshButton = useCallback(
    () => (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('Refresh records')}
        accessibilityState={{ disabled: loading, busy: loading }}
        disabled={loading}
        onPress={reload}
        style={styles.refresh}
      >
        {loading ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <ServiceIcon name="refresh" size={23} />
        )}
      </Pressable>
    ),
    [loading, reload],
  );
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: refreshButton,
      title: t('Request overview'),
    });
  }, [navigation, refreshButton, language]);
  const count = (value: unknown) =>
    numeric(value)?.toLocaleString(displayLocale()) ?? '—';
  return (
    <Screen>
      {loading && (
        <View style={layout.card}>
          <LoadingSkeleton kind="list" rows={5} />
        </View>
      )}
      {!!error && <Notice message={error} />}
      {root && (
        <>
          <View style={styles.card}>
            <View style={styles.contents}>
              <View style={styles.hero}>
                <View style={styles.copy}>
                  <Text accessibilityRole="header" style={styles.title}>
                    {t('Pending with your company')}
                  </Text>
                  <Text style={styles.caption}>
                    {t('Across the five categories below')}
                  </Text>
                </View>
                <View style={styles.total}>
                  <Text style={styles.totalNumber}>
                    {count(root.totalPendingRequestsCount)}
                  </Text>
                  <Text style={styles.totalLabel}>{t('total')}</Text>
                </View>
              </View>
              {categories.map(([label, icon, field]) => (
                <View key={field} accessible style={styles.row}>
                  <View style={styles.tile}>
                    <ServiceIcon name={icon} size={31} />
                  </View>
                  <Text style={styles.label}>{t(label)}</Text>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{count(root[field])}</Text>
                  </View>
                </View>
              ))}
            </View>
            {root.totalPendingRequestsCount === 0 && (
              <View style={styles.empty}>
                <ServiceIcon name="inboxTray" size={21} />
                <Text style={[styles.caption, styles.copy]}>
                  {t('No pending requests in these categories.')}
                </Text>
              </View>
            )}
          </View>
          <View style={styles.note}>
            <ServiceIcon name="info" size={20} />
            <Text style={[styles.caption, styles.copy]}>
              {t(
                'Resignation, overtime and encashment have their own request lists.',
              )}
            </Text>
          </View>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  refresh: {
    height: 44,
    width: 44,
    borderRadius: 22,
    backgroundColor: '#EFF2F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    marginTop: 10,
    backgroundColor: colors.white,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: '#D5DEE9',
    overflow: 'hidden',
  },
  contents: { paddingHorizontal: 16 },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 16,
  },
  copy: { flex: 1 },
  title: { fontSize: 19, fontWeight: '700', color: colors.navy },
  caption: { fontSize: 14, lineHeight: 20, color: colors.muted },
  total: {
    minWidth: 58,
    paddingHorizontal: 8,
    minHeight: 60,
    borderRadius: 10,
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  totalNumber: { fontSize: 28, fontWeight: '700', color: colors.white },
  totalLabel: { fontSize: 13, color: colors.white },
  row: {
    minHeight: 64,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: '#CDD8E4',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  tile: {
    width: 50,
    height: 46,
    borderRadius: 11,
    backgroundColor: '#EAF5FA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { flex: 1, color: colors.navy, fontWeight: '700', fontSize: 16 },
  badge: {
    borderRadius: 7,
    minWidth: 37,
    backgroundColor: '#EFF2F5',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  badgeText: { fontSize: 16, fontWeight: '600', color: colors.navy },
  empty: {
    padding: 16,
    backgroundColor: '#F3F6F9',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  note: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 5,
    paddingTop: 14,
    gap: 12,
  },
});
