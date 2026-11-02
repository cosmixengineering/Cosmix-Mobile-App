import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
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
import { colors, layout } from '../theme/theme';

export function HistoryScreen({
  route,
  navigation,
}: WorkspaceScreenProps<'History'>): React.JSX.Element {
  const auth = useSession();
  const selected = resolveHistoryCategory(route.params?.category, auth);
  const [choosing, setChoosing] = useState(false);
  const categories = historyCategories.filter(item =>
    canOpenService(item.key, auth),
  );
  const header = (
    <View style={layout.stack8}>
      <View style={styles.heading}>
        <View style={styles.mark}>
          <NavigationIcon name="history" color={colors.teal} />
        </View>
        <View style={styles.headingText}>
          <Text style={layout.title}>My history</Text>
          <Text style={layout.muted}>Your records, all in one place.</Text>
        </View>
      </View>
      {!!categories.length && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Choose record category"
          accessibilityState={{ expanded: choosing }}
          onPress={() => setChoosing(!choosing)}
          style={styles.selector}
        >
          <Text style={layout.label}>
            {categories.find(item => item.key === selected)?.title ??
              'Record category'}
          </Text>
          <Text style={styles.categoryText}>
            {choosing ? 'Close' : 'Change'} ›
          </Text>
        </Pressable>
      )}
      {choosing && (
        <View style={styles.categories}>
          {categories.map(item => (
            <Pressable
              key={item.key}
              accessibilityRole="button"
              accessibilityLabel={`${item.title} history`}
              accessibilityState={{ selected: selected === item.key }}
              onPress={() => {
                navigation.setParams({ category: item.key });
                setChoosing(false);
              }}
              style={({ pressed }) => [
                styles.category,
                selected === item.key && styles.active,
                pressed && styles.pressed,
              ]}
            >
              <Text
                style={[
                  styles.categoryText,
                  selected === item.key && styles.activeText,
                ]}
              >
                {item.title}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
      {selected === 'payroll' ? <PayslipHistory /> : null}
    </View>
  );
  if (!selected)
    return (
      <Screen>
        {header}
        <AccessRecovery service="Record history" />
      </Screen>
    );
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
  heading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 7,
  },
  headingText: { flex: 1, gap: 4 },
  mark: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: colors.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
    borderRadius: 10,
    paddingHorizontal: 12,
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderWidth: 1,
    gap: 8,
  },
  categories: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  category: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 10,
    backgroundColor: colors.white,
  },
  active: { backgroundColor: colors.navy, borderColor: colors.navy },
  categoryText: { color: colors.text, fontSize: 13, fontWeight: '600' },
  activeText: { color: colors.white },
  pressed: { opacity: 0.7 },
});
