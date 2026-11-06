import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { displayLocale, t } from '../i18n/language';
import { useLanguage } from '../i18n/preference';
import { colors, layout } from '../theme/theme';
import { describeError } from '../utils/errors';
import { businessToday, dateRange } from '../utils/serviceValues';
import { DateField } from './ServiceControls';
import { NavigationIcon } from './NavigationIcon';
import { Notice } from './Controls';

type Range = { from: string; to: string };
type Preset = 'This week' | 'This month' | 'Custom';
const presets: Preset[] = ['This week', 'This month', 'Custom'];

function presetRange(preset: Exclude<Preset, 'Custom'>): Range {
  const to = businessToday();
  const start = new Date(to + 'T00:00:00Z');
  if (preset === 'This month') start.setUTCDate(1);
  else start.setUTCDate(start.getUTCDate() - ((start.getUTCDay() + 6) % 7));
  return { from: start.toISOString().slice(0, 10), to };
}

function dateLabel(value: string, year = true) {
  return new Intl.DateTimeFormat(displayLocale(), {
    day: '2-digit',
    month: 'short',
    year: year ? 'numeric' : undefined,
    timeZone: 'UTC',
  }).format(new Date(value + 'T00:00:00Z'));
}

export function AttendanceHistoryHeader({
  range,
  count,
  busy,
  onApply,
  onRefresh,
  categories,
}: {
  range: Range;
  count: number | null;
  busy: boolean;
  onApply(value: Range): void;
  onRefresh(): void;
  categories?: React.ReactNode;
}) {
  const language = useLanguage();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [appliedPreset, setAppliedPreset] = useState<Preset>('This month');
  const [preset, setPreset] = useState<Preset>(appliedPreset);
  const [draft, setDraft] = useState(range);
  const [error, setError] = useState('');
  const choose = (next: Preset) => {
    setPreset(next);
    setError('');
    if (next !== 'Custom') setDraft(presetRange(next));
  };
  function apply() {
    try {
      dateRange(draft.from, draft.to);
    } catch (failure) {
      setError(describeError(failure));
      return;
    }
    setAppliedPreset(preset);
    setOpen(false);
    onApply(draft);
  }
  return (
    <>
      <View style={s.top}>
        <Text accessibilityRole="header" style={s.title}>
          {t('History')}
        </Text>
        <Pressable
          accessibilityRole="button"
          style={s.filter}
          onPress={() => {
            setDraft(range);
            setPreset(appliedPreset);
            setError('');
            setOpen(true);
          }}
        >
          <Svg
            width={19}
            height={19}
            viewBox="0 0 24 24"
            fill="none"
            stroke={colors.navy}
            strokeWidth={1.8}
            strokeLinecap="round"
          >
            <Path d="M3 5h18M3 12h18M3 19h18" />
            <Circle cx={9} cy={5} r={2.3} fill="white" />
            <Circle cx={15} cy={12} r={2.3} fill="white" />
            <Circle cx={8} cy={19} r={2.3} fill="white" />
          </Svg>
          <Text style={s.label}>{t('Filter')}</Text>
        </Pressable>
      </View>
      <View style={s.band}>
        <NavigationIcon name="history" size={25} color={colors.navy} />
        <View style={s.flex}>
          <Text style={s.range}>
            {dateLabel(
              range.from,
              range.from.slice(0, 4) !== range.to.slice(0, 4),
            )}{' '}
            – {dateLabel(range.to)}
          </Text>
          <Text style={layout.muted}>{t('Attendance records')}</Text>
        </View>
        <Text style={s.zone}>Asia/Karachi</Text>
      </View>
      <View style={s.section}>
        <Text style={s.heading}>{t('Check in / out')}</Text>
        {count !== null && (
          <View style={s.badge}>
            <Text style={s.label}>{count}</Text>
          </View>
        )}
        <View style={s.flex} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('Refresh records')}
          disabled={busy}
          accessibilityState={{ disabled: busy }}
          onPress={onRefresh}
          style={s.iconButton}
        >
          <Svg
            width={24}
            height={24}
            viewBox="0 0 24 24"
            fill="none"
            stroke={colors.navy}
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <Path d="M21 4v6h-6M3 20v-6h6M4.5 8a8 8 0 0 1 13-3L21 9M3 15l3.5 4A8 8 0 0 0 20 16" />
          </Svg>
        </Pressable>
      </View>
      <Modal
        visible={open}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setOpen(false)}
      >
        <View style={[s.overlay, language === 'ur' ? s.rtl : s.ltr]}>
          <Pressable
            accessible={false}
            style={StyleSheet.absoluteFill}
            onPress={() => setOpen(false)}
          />
          <View
            accessibilityViewIsModal
            style={[s.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}
          >
            <View style={s.handle} />
            <ScrollView bounces={false} contentContainerStyle={s.sheetBody}>
              <View style={layout.row}>
                <Text style={s.sheetTitle}>{t('Filter history')}</Text>
                <Pressable
                  accessibilityLabel={t('Close')}
                  accessibilityRole="button"
                  onPress={() => setOpen(false)}
                  style={s.close}
                >
                  <Text style={s.cross}>×</Text>
                </Pressable>
              </View>
              <Text style={layout.muted}>{t('Choose a date range')}</Text>
              {categories}
              <View style={s.row}>
                {presets.map(p => (
                  <Pressable
                    key={p}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: p === preset }}
                    onPress={() => choose(p)}
                    style={[s.chip, p === preset && s.active]}
                  >
                    <Text style={s.label}>{t(p)}</Text>
                  </Pressable>
                ))}
              </View>
              <View style={s.row}>
                {(['from', 'to'] as const).map(key => (
                  <View key={key} style={s.flex}>
                    <DateField
                      dialogTitle={t(
                        key === 'from'
                          ? 'Select start date'
                          : 'Select end date',
                      )}
                      compactLabel={dateLabel(draft[key])}
                      label={t(key === 'from' ? 'From' : 'To')}
                      value={draft[key]}
                      onChange={v => {
                        choose('Custom');
                        setDraft(prev => ({ ...prev, [key]: v }));
                      }}
                    />
                  </View>
                ))}
              </View>
              <Text style={layout.muted}>{t('End date is included.')}</Text>
              {error ? <Notice message={error} /> : null}
              <View style={s.footer}>
                <Pressable
                  style={s.reset}
                  accessibilityRole="button"
                  onPress={() => choose('This month')}
                >
                  <Text style={s.label}>{t('Reset')}</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  onPress={apply}
                  style={s.apply}
                >
                  <Text style={s.applyText}>{t('Apply')}</Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

export function EmptyAttendanceHistory() {
  return (
    <View style={s.empty}>
      <Svg
        width={80}
        height={80}
        viewBox="0 0 80 80"
        fill="none"
        stroke="#8795A5"
        strokeWidth={3.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <Rect x={6} y={12} width={57} height={53} rx={7} />
        <Path d="M6 27h57M20 5v14M49 5v14" />
        {[20, 33].map(x =>
          [39, 51].map(y => (
            <Circle
              key={x + '-' + y}
              cx={x}
              cy={y}
              r={2.4}
              fill="#8795A5"
              stroke="none"
            />
          )),
        )}
        <Circle cx={58} cy={56} r={17} fill="white" />
        <Path d="M58 48v8l6 4" stroke="#CCE83C" />
      </Svg>
      <Text style={s.emptyTitle}>{t('No attendance records')}</Text>
      <Text style={s.emptyText}>
        {t('No check-ins or check-outs for this period.')}
        {'\n'}
        {t('Try a different date range.')}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  rtl: { direction: 'rtl' },
  ltr: { direction: 'ltr' },
  flex: { flex: 1 },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderColor: colors.line,
    paddingBottom: 12,
  },
  title: { fontSize: 25, color: colors.navy, fontWeight: '700' },
  filter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 13,
    minHeight: 40,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 9,
  },
  label: { fontWeight: '600', color: colors.navy, fontSize: 14 },
  band: {
    marginHorizontal: -14,
    paddingHorizontal: 17,
    paddingVertical: 13,
    backgroundColor: '#F5F7F9',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  range: { fontWeight: '700', fontSize: 15, color: colors.navy },
  zone: { color: colors.muted, fontSize: 12 },
  section: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderBottomWidth: 1,
    borderColor: colors.line,
    paddingBottom: 4,
  },
  heading: { color: colors.navy, fontSize: 17, fontWeight: '700' },
  badge: {
    paddingHorizontal: 9,
    paddingVertical: 2,
    borderRadius: 14,
    backgroundColor: '#EBEEF1',
  },
  iconButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  empty: {
    flexGrow: 1,
    minHeight: 180,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 45,
    gap: 10,
  },
  emptyTitle: {
    color: colors.navy,
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 15,
    lineHeight: 21,
    color: colors.muted,
    textAlign: 'center',
  },
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(16,28,49,0.49)',
  },
  sheet: {
    maxHeight: '88%',
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  handle: {
    alignSelf: 'center',
    width: 44,
    height: 4,
    borderRadius: 4,
    marginTop: 9,
    backgroundColor: '#C8CED8',
  },
  sheetBody: { padding: 20, gap: 12 },
  sheetTitle: { fontSize: 21, fontWeight: '700', color: colors.navy },
  close: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F0F1F4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cross: { fontSize: 23, color: colors.muted },
  row: { flexDirection: 'row', gap: 6 },
  chip: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#C9D1DD',
    borderRadius: 7,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  active: { backgroundColor: '#DEE8F5', borderColor: colors.navy },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderColor: colors.line,
    paddingTop: 15,
    marginTop: 8,
  },
  reset: { minHeight: 44, justifyContent: 'center' },
  apply: {
    backgroundColor: colors.navy,
    borderRadius: 8,
    paddingHorizontal: 24,
    minHeight: 44,
    justifyContent: 'center',
  },
  applyText: { fontWeight: '700', color: 'white', fontSize: 15 },
});
