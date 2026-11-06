import React, { useState } from 'react';
import {
  Alert,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { t } from '../i18n/language';
import { useLanguage } from '../i18n/preference';
import { useSession } from '../app/AppProvider';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Screen } from '../components/Controls';
import { ServiceIcon } from '../components/ServiceIcon';
import { canOpenService, employeeServices } from '../constants/services';
import type { WorkspaceScreenProps } from '../navigation/types';
import type { ServiceKey } from '../types/selfService';
import { colors } from '../theme/theme';

const sections: { title: string; keys: ServiceKey[] }[] = [
  {
    title: 'Time & attendance',
    keys: ['punches', 'leaves', 'corrections', 'calendar', 'shift', 'overtime'],
  },
  { title: 'Pay & claims', keys: ['loans', 'allowances', 'vehicles'] },
  { title: 'Employment', keys: ['resignation'] },
  {
    title: 'More services',
    keys: [
      'finances',
      'payroll',
      'payments',
      'encashment',
      'profile',
      'requests',
      'notifications',
    ],
  },
];
export function ServicesScreen({
  navigation,
}: WorkspaceScreenProps<'Services'>): React.JSX.Element {
  useLanguage();
  const auth = useSession();
  const [search, setSearch] = useState('');
  const query = search.trim().toLocaleLowerCase();
  const groups = sections
    .map(section => ({
      ...section,
      items: section.keys.flatMap(key =>
        employeeServices.filter(
          item =>
            item.key === key && item.title.toLocaleLowerCase().includes(query),
        ),
      ),
    }))
    .filter(section => section.items.length);
  function open(key: ServiceKey) {
    Keyboard.dismiss();
    if (!canOpenService(key, auth)) {
      Alert.alert(
        t('Restricted access'),
        t(
          'Your company controls access to each service. Contact HR if a service you need is unavailable.',
        ),
      );
      return;
    }
    switch (key) {
      case 'punches':
      case 'calendar':
      case 'payroll':
      case 'payments':
        navigation.navigate('History', { category: key });
        break;
      case 'shift':
        navigation.navigate('Dashboard', {
          screen: 'MySchedule',
          initial: false,
        });
        break;
      case 'profile':
        navigation.navigate('Profile');
        break;
      default:
        navigation.navigate('ServiceDetail', { service: key });
    }
  }
  return (
    <SafeAreaView edges={['top']} style={s.page}>
      <View style={s.header}>
        <Text accessibilityRole="header" style={s.headerText}>
          {t('Services')}
        </Text>
      </View>
      <Screen>
        <View style={s.search}>
          <ServiceIcon name="search" size={22} />
          <TextInput
            accessibilityLabel={t('Search services')}
            placeholder={t('Search services')}
            placeholderTextColor={colors.muted}
            style={s.input}
            value={search}
            onChangeText={setSearch}
            autoCorrect={false}
            returnKeyType="search"
          />
          {!!search && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('Clear search')}
              hitSlop={7}
              onPress={() => setSearch('')}
              style={s.clear}
            >
              <ServiceIcon name="clear" size={17} />
            </Pressable>
          )}
        </View>
        {groups.map(({ title, items }) => (
          <View key={title} style={s.section}>
            <Text accessibilityRole="header" style={s.heading}>
              {t(title)}
            </Text>
            <View style={s.card}>
              {items.map(service => {
                const allowed = canOpenService(service.key, auth);
                const wide = service.key === 'resignation';
                return (
                  <Pressable
                    key={service.key}
                    accessibilityRole="button"
                    accessibilityLabel={
                      allowed
                        ? service.title
                        : t('{0}, restricted access', service.title)
                    }
                    onPress={() => open(service.key)}
                    style={({ pressed }) => [
                      wide ? s.row : s.tile,
                      pressed && s.pressed,
                    ]}
                  >
                    <View
                      style={[
                        s.icon,
                        allowed && s.activeIcon,
                        wide && s.rowIcon,
                      ]}
                    >
                      <ServiceIcon name={service.key} light={allowed} />
                      {!allowed && !wide && (
                        <View style={s.badge}>
                          <ServiceIcon name="lock" size={14} />
                        </View>
                      )}
                    </View>
                    {wide ? (
                      <View style={s.copy}>
                        <Text style={s.title}>{service.title}</Text>
                        <Text style={s.note}>
                          {t('Submit and track your request')}
                        </Text>
                      </View>
                    ) : (
                      <Text style={[s.title, s.center]}>
                        {service.title}
                        {allowed ? ' ›' : ''}
                      </Text>
                    )}
                    {wide &&
                      (!allowed ? (
                        <ServiceIcon name="lock" size={18} />
                      ) : (
                        <Text style={s.title}>›</Text>
                      ))}
                  </Pressable>
                );
              })}
            </View>
            {title === 'Employment' &&
              groups.some(group =>
                group.items.some(service => !canOpenService(service.key, auth)),
              ) && (
                <View style={s.legend}>
                  <ServiceIcon name="lock" size={16} />
                  <Text style={s.note}>{t('Restricted access')}</Text>
                </View>
              )}
          </View>
        ))}
        {!groups.length && (
          <Text accessibilityLiveRegion="polite" style={s.note}>
            {t('No services found')}
          </Text>
        )}
      </Screen>
    </SafeAreaView>
  );
}
const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.white },
  header: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    backgroundColor: colors.white,
  },
  headerText: { color: colors.navy, fontWeight: '700', fontSize: 24 },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E7EDF3',
    borderRadius: 12,
    paddingHorizontal: 13,
    minHeight: 44,
    gap: 10,
  },
  input: { flex: 1, paddingVertical: 9, fontSize: 15, color: colors.navy },
  clear: { padding: 5 },
  section: { gap: 9, marginTop: 6 },
  heading: {
    fontSize: 17,
    fontWeight: '700',
    color: '#344158',
    marginStart: 2,
  },
  card: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: colors.white,
    borderRadius: 15,
    paddingVertical: 4,
  },
  tile: {
    width: '33.3333%',
    minHeight: 101,
    paddingHorizontal: 4,
    paddingVertical: 10,
    alignItems: 'center',
    gap: 7,
  },
  icon: {
    width: 55,
    height: 55,
    borderRadius: 13,
    backgroundColor: '#E3F1F8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeIcon: { backgroundColor: '#10487C' },
  badge: {
    position: 'absolute',
    bottom: -2,
    end: -3,
    width: 20,
    height: 20,
    borderRadius: 10,
    elevation: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
  },
  title: {
    fontWeight: '700',
    fontSize: 14,
    lineHeight: 17,
    color: colors.navy,
  },
  center: { textAlign: 'center', maxWidth: 104 },
  pressed: { opacity: 0.65 },
  row: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 7,
    paddingHorizontal: 14,
  },
  rowIcon: { width: 46, height: 46 },
  copy: { flex: 1, gap: 3 },
  note: { fontSize: 13, color: colors.muted },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingVertical: 7,
  },
});
