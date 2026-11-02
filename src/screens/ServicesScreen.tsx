import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSession } from '../app/AppProvider';
import { Screen } from '../components/Controls';
import { canOpenService, employeeServices } from '../constants/services';
import type { WorkspaceScreenProps } from '../navigation/types';
import { colors, layout } from '../theme/theme';

export function ServicesScreen({
  navigation,
}: WorkspaceScreenProps<'Services'>): React.JSX.Element {
  const auth = useSession();
  return (
    <Screen>
      <View style={styles.hero}>
        <Text style={styles.heroTitle}>Employee services</Text>
        <Text style={styles.heroText}>
          Requests, work records and company updates
        </Text>
      </View>
      <View style={styles.grid}>
        {employeeServices.map(service => {
          const permitted = canOpenService(service.key, auth);
          return (
            <Pressable
              key={service.key}
              accessibilityRole="button"
              accessibilityState={{ disabled: !permitted }}
              disabled={!permitted}
              onPress={() =>
                ['punches', 'calendar', 'payroll', 'payments'].includes(
                  service.key,
                )
                  ? navigation.navigate('History', { category: service.key })
                  : service.key === 'shift'
                  ? navigation.navigate('Dashboard', {
                      screen: 'MySchedule',
                      initial: false,
                    })
                  : service.key === 'profile'
                  ? navigation.navigate('Profile')
                  : navigation.navigate('ServiceDetail', {
                      service: service.key,
                    })
              }
              style={({ pressed }) => [
                styles.tile,
                !permitted && styles.locked,
                pressed && styles.pressed,
              ]}
            >
              <View style={styles.mark}>
                <Text style={styles.markText}>{service.mark}</Text>
              </View>
              <View style={styles.copy}>
                <Text style={styles.title}>{service.title}</Text>
                <Text style={styles.description}>{service.description}</Text>
              </View>
              <Text style={permitted ? styles.link : styles.lockedText}>
                {permitted ? '›' : 'Restricted'}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={layout.muted}>
        Your company controls access to each service. Contact HR if a service
        you need is unavailable.
      </Text>
    </Screen>
  );
}
const styles = StyleSheet.create({
  hero: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: colors.primary,
    gap: 4,
  },
  heroTitle: { fontSize: 18, fontWeight: '700', color: colors.white },
  heroText: { fontSize: 13, lineHeight: 18, color: '#E5EDFA' },
  grid: { gap: 6 },
  tile: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
    gap: 10,
    minHeight: 52,
  },
  mark: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: colors.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markText: { fontSize: 13, fontWeight: '800', color: colors.teal },
  copy: { flex: 1, gap: 2 },
  title: { fontSize: 14, fontWeight: '700', color: colors.navy },
  description: { fontSize: 12, lineHeight: 17, color: colors.muted },
  link: { fontSize: 21, color: colors.primary },
  locked: { opacity: 0.6 },
  lockedText: { color: colors.muted, fontSize: 11 },
  pressed: { opacity: 0.8 },
});
