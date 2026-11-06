import { t } from '../i18n/language';
import { useLanguage } from '../i18n/preference';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSession } from '../app/AppProvider';
import { Screen } from '../components/Controls';
import { AccessRecovery } from '../components/AccessRecovery';
import { NavigationIcon } from '../components/NavigationIcon';
import { ServiceRecords } from '../components/ServiceRecords';
import { PayslipHistory } from '../components/PayslipHistory';
import {
  canOpenService,
  historyCategories,
  resolveHistoryCategory,
} from '../constants/services';
import type { WorkspaceScreenProps } from '../navigation/types';
import { colors } from '../theme/theme';

export function HistoryScreen({
  route,
  navigation,
}: WorkspaceScreenProps<'History'>): React.JSX.Element {
  useLanguage();
  const auth = useSession();
  const selected = resolveHistoryCategory(route.params?.category, auth);
  const categories = historyCategories.filter(item =>
    canOpenService(item.key, auth),
  );

  const tabs = categories.length > 0 && (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.categoryScroll}
      style={styles.categoryScrollView}
    >
      {categories.map(item => {
        const active = selected === item.key;
        return (
          <Pressable
            key={item.key}
            accessibilityRole="tab"
            accessibilityLabel={t('{0} history', item.title)}
            accessibilityState={{ selected: active }}
            onPress={() => navigation.setParams({ category: item.key })}
            style={({ pressed }) => [
              styles.tabPill,
              active ? styles.tabPillActive : styles.tabPillInactive,
              pressed && styles.tabPillPressed,
            ]}
          >
            <Text
              style={[
                styles.tabText,
                active ? styles.tabTextActive : styles.tabTextInactive,
              ]}
            >
              {item.title}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
  if (selected === 'punches')
    return (
      <ServiceRecords
        key={selected}
        service={selected}
        readOnly
        attendanceHistory
        header={categories.length > 1 ? tabs : undefined}
      />
    );
  const header = (
    <View style={styles.headerCard}>
      <View style={styles.headerTop}>
        <View style={styles.mark}>
          <NavigationIcon name="history" color="#123D70" />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>{t('Record History')}</Text>
          <Text style={styles.headerSubtitle}>
            {t('All your verified employment and activity logs.')}
          </Text>
        </View>
      </View>

      {tabs}

      {selected === 'payroll' ? <PayslipHistory /> : null}
    </View>
  );

  if (!selected) {
    return (
      <Screen>
        {header}
        <AccessRecovery service={t('Record history')} />
      </Screen>
    );
  }

  return (
    <ServiceRecords
      key={selected}
      service={selected}
      header={header}
      readOnly
    />
  );
}

const styles = StyleSheet.create({
  headerCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 12,
    gap: 12,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  mark: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#DFEBF8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.navy,
    letterSpacing: -0.2,
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.muted,
    lineHeight: 16,
  },
  categoryScrollView: {
    marginHorizontal: -4,
  },
  categoryScroll: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  tabPill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabPillActive: {
    backgroundColor: colors.navy,
    borderColor: colors.navy,
  },
  tabPillInactive: {
    backgroundColor: '#F8FAFC',
    borderColor: colors.line,
  },
  tabPillPressed: {
    opacity: 0.75,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
  },
  tabTextActive: {
    color: colors.white,
  },
  tabTextInactive: {
    color: colors.text,
  },
});
