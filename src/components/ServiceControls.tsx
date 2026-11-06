import { NavigationIcon } from './NavigationIcon';
import { LoadingSkeleton } from './ui/LoadingSkeleton';
import { displayLocale, t } from '../i18n/language';
import { useLanguage } from '../i18n/preference';
import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Button, Field, Notice } from './Controls';
import { describeError } from '../utils/errors';
import { colors, layout } from '../theme/theme';
import type { Choice, DataRecord } from '../types/selfService';
import { status } from '../utils/serviceValues';

export function ChoiceField({
  label,
  value,
  choices,
  loading = false,
  onChange,
  disabled = false,
}: {
  label: string;
  value: string;
  choices: readonly Choice[];
  loading?: boolean;
  onChange(value: string): void;
  disabled?: boolean;
}): React.JSX.Element {
  useLanguage();
  return (
    <View style={styles.group}>
      <Text style={layout.label}>{label}</Text>
      {loading ? (
        <LoadingSkeleton kind="field" label={label} />
      ) : (
        <View style={styles.choices}>
          {choices.map(choice => (
            <Pressable
              key={choice.value}
              accessibilityRole="radio"
              accessibilityState={{
                selected: value === choice.value,
                disabled,
              }}
              disabled={disabled}
              onPress={() => onChange(choice.value)}
              style={[styles.choice, value === choice.value && styles.selected]}
            >
              <Text
                style={[
                  styles.choiceText,
                  value === choice.value && styles.selectedText,
                ]}
              >
                {choice.label}
              </Text>
            </Pressable>
          ))}
          {choices.length === 0 ? (
            <Text style={layout.muted}>
              {t('No available options. Refresh or contact HR.')}
            </Text>
          ) : null}
        </View>
      )}
    </View>
  );
}

export function DateField({
  label,
  value,
  onChange,
  disabled = false,
  compactLabel,
  dialogTitle,
}: {
  label: string;
  value: string;
  onChange(value: string): void;
  disabled?: boolean;
  compactLabel?: string;
  dialogTitle?: string;
}): React.JSX.Element {
  const language = useLanguage();
  const weekdays =
    language === 'ur'
      ? ['پیر', 'منگل', 'بدھ', 'جمعرات', 'جمعہ', 'ہفتہ', 'اتوار']
      : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const [draft, setDraft] = useState('');
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(() => {
    const parsed = new Date(value + 'T12:00:00Z');
    return Number.isFinite(parsed.getTime()) ? parsed : new Date();
  });
  const year = month.getUTCFullYear();
  const index = month.getUTCMonth();
  const offset = (new Date(Date.UTC(year, index, 1)).getUTCDay() + 6) % 7;
  const count = new Date(Date.UTC(year, index + 1, 0)).getUTCDate();
  const move = (delta: number) => {
    const next = new Date(Date.UTC(year, index + delta, 1));
    if (next.getUTCFullYear() >= 1900 && next.getUTCFullYear() <= 9999) {
      setMonth(next);
    }
  };
  return (
    <View style={styles.group}>
      <Text style={layout.label}>{label}</Text>
      <Pressable
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={`${label}, ${value || t('Choose date')}`}
        style={styles.dateButton}
        onPress={() => {
          const parsed = new Date(value + 'T12:00:00Z');
          const initial = Number.isFinite(parsed.getTime())
            ? parsed
            : new Date();
          setMonth(initial);
          setDraft(initial.toISOString().slice(0, 10));
          setOpen(true);
        }}
      >
        <Text style={layout.body}>
          {compactLabel || value || t('Choose date')}
        </Text>
        {compactLabel ? (
          <NavigationIcon name="history" size={18} color={colors.navy} />
        ) : (
          <Text style={styles.calendarLabel}>{t('Calendar')}</Text>
        )}
      </Pressable>
      <Modal
        visible={open}
        transparent
        statusBarTranslucent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <View
          style={[
            styles.dateScrim,
            language === 'ur' ? styles.rtl : styles.ltr,
          ]}
        >
          <Pressable
            accessible={false}
            style={StyleSheet.absoluteFill}
            onPress={() => setOpen(false)}
          />
          <View style={styles.dateDialog} accessibilityViewIsModal>
            <ScrollView
              bounces={false}
              contentContainerStyle={styles.dialogContent}
            >
              <View style={styles.dialogHeader}>
                <View style={styles.headerCopy}>
                  <Text accessibilityRole="header" style={styles.dialogTitle}>
                    {dialogTitle || label}
                  </Text>
                  {draft ? (
                    <Text style={styles.dateSubtitle}>
                      {new Intl.DateTimeFormat(displayLocale(), {
                        weekday: 'short',
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        timeZone: 'UTC',
                      }).format(new Date(draft + 'T12:00:00Z'))}
                    </Text>
                  ) : null}
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('Close calendar')}
                  hitSlop={5}
                  style={styles.roundControl}
                  onPress={() => setOpen(false)}
                >
                  <Text style={styles.glyph}>×</Text>
                </Pressable>
              </View>
              <View style={styles.monthRow}>
                <Text accessibilityRole="header" style={styles.monthLabel}>
                  {new Intl.DateTimeFormat(displayLocale(), {
                    month: 'long',
                    year: 'numeric',
                    timeZone: 'UTC',
                  }).format(month)}
                </Text>
                {[-1, 1].map(delta => (
                  <Pressable
                    key={delta}
                    accessibilityRole="button"
                    accessibilityLabel={t(
                      delta === -1 ? 'Previous month' : 'Next month',
                    )}
                    onPress={() => move(delta)}
                    style={styles.roundControl}
                  >
                    <Text style={styles.glyph}>
                      {(delta === -1) !== (language === 'ur') ? '‹' : '›'}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <View>
                <View style={styles.weekRow}>
                  {weekdays.map(day => (
                    <Text key={day} style={styles.dayHeader}>
                      {day}
                    </Text>
                  ))}
                </View>
                {Array.from(
                  { length: Math.ceil((offset + count) / 7) },
                  (_, week) => (
                    <View key={week} style={styles.weekRow}>
                      {weekdays.map((weekday, col) => {
                        const day = week * 7 + col - offset + 1;
                        if (day < 1 || day > count)
                          return <View key={weekday} style={styles.dayCell} />;
                        const date = `${year}-${String(index + 1).padStart(
                          2,
                          '0',
                        )}-${String(day).padStart(2, '0')}`;
                        const selected = date === draft;
                        return (
                          <Pressable
                            key={weekday}
                            accessibilityRole="button"
                            accessibilityLabel={date}
                            accessibilityState={{ selected }}
                            style={styles.dayCell}
                            onPress={() => {
                              setDraft(date);
                              if (!dialogTitle) {
                                onChange(date);
                                setOpen(false);
                              }
                            }}
                          >
                            <View
                              style={[
                                styles.dayCircle,
                                selected && styles.selectedDay,
                              ]}
                            >
                              <Text
                                style={[
                                  styles.dayNumber,
                                  col > 4 && styles.weekend,
                                  selected && styles.selectedText,
                                ]}
                              >
                                {day}
                              </Text>
                            </View>
                          </Pressable>
                        );
                      })}
                    </View>
                  ),
                )}
              </View>
              <View style={styles.dateFooter}>
                <Pressable
                  accessibilityRole="button"
                  style={styles.cancelDate}
                  onPress={() => setOpen(false)}
                >
                  <Text style={styles.cancelText}>
                    {t(dialogTitle ? 'Cancel' : 'Close calendar')}
                  </Text>
                </Pressable>
                {dialogTitle && (
                  <Pressable
                    accessibilityRole="button"
                    style={styles.confirmDate}
                    onPress={() => {
                      onChange(draft);
                      setOpen(false);
                    }}
                  >
                    <Text style={styles.selectedText}>{t('Select date')}</Text>
                  </Pressable>
                )}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

export function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string;
}): React.JSX.Element {
  return (
    <View style={styles.info}>
      <Text style={layout.muted}>{label}</Text>
      <Text selectable style={styles.value}>
        {value}
      </Text>
    </View>
  );
}
export function StatusBadge({ value }: { value: unknown }): React.JSX.Element {
  useLanguage();
  const label = status(value);
  const positive = [
    'Approved',
    'Accepted',
    'Settled',
    'Paid',
    'Repaid',
  ].includes(value === 1 ? 'Approved' : String(value));
  return (
    <Text style={[styles.badge, positive ? styles.positive : styles.neutral]}>
      {label}
    </Text>
  );
}
export function RecordCard({
  row,
  title,
  children,
}: {
  row: DataRecord;
  title: string;
  children?: React.ReactNode;
}): React.JSX.Element {
  useLanguage();
  return (
    <View style={layout.card}>
      <View style={layout.row}>
        <Text style={styles.recordTitle}>{title}</Text>
        <StatusBadge value={row.state ?? row.approvalState ?? row.status} />
      </View>
      {children}
      {typeof row.id === 'string' ? (
        <Text selectable style={styles.reference}>
          {t('Reference')} {row.id}
        </Text>
      ) : null}
    </View>
  );
}
export function ReasonSheet({
  title,
  visible,
  busy,
  onClose,
  onConfirm,
}: {
  title: string;
  visible: boolean;
  busy: boolean;
  onClose(): void;
  onConfirm(reason: string): Promise<void>;
}): React.JSX.Element {
  useLanguage();
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    if (visible) {
      setValue('');
      setError('');
    }
  }, [visible]);
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={() => {
        if (!busy) {
          onClose();
        }
      }}
    >
      <KeyboardAvoidingView
        style={styles.scrim}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.modal}
        >
          <Text style={layout.heading}>{title}</Text>
          <Text style={layout.muted}>
            {t('Your request and its review history will be retained.')}
          </Text>
          {error ? <Notice message={error} /> : null}
          <Field
            label={t('Reason')}
            value={value}
            onChangeText={setValue}
            multiline
            maxLength={1000}
            editable={!busy}
          />
          <Button
            title={t('Confirm request')}
            busy={busy}
            disabled={!value.trim()}
            onPress={() => {
              setError('');
              onConfirm(value)
                .then(() => {
                  setValue('');
                  onClose();
                })
                .catch(failure => setError(describeError(failure)));
            }}
          />
          <Button
            title={t('Close')}
            secondary
            disabled={busy}
            onPress={onClose}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  rtl: { direction: 'rtl' },
  ltr: { direction: 'ltr' },
  group: { gap: 9 },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  choice: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: colors.white,
  },
  selected: { borderColor: colors.primary, backgroundColor: colors.primary },
  choiceText: { fontSize: 14, color: colors.navy },
  selectedText: { color: colors.white, fontWeight: '600' },
  dateButton: {
    minHeight: 40,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 8,
    backgroundColor: colors.white,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  calendarLabel: { color: colors.primary, fontSize: 13, fontWeight: '600' },
  scrim: {
    flex: 1,
    backgroundColor: '#102D4288',
    justifyContent: 'center',
    padding: 24,
  },
  modal: {
    padding: 20,
    borderRadius: 14,
    backgroundColor: colors.white,
    gap: 10,
  },
  dateScrim: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(17,41,65,0.60)',
  },
  dateDialog: {
    width: '100%',
    maxWidth: 390,
    maxHeight: '94%',
    borderRadius: 20,
    backgroundColor: colors.white,
    overflow: 'hidden',
  },
  dialogContent: { padding: 20, gap: 14 },
  dialogHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  headerCopy: { flex: 1, gap: 3 },
  dialogTitle: { fontSize: 20, fontWeight: '700', color: colors.navy },
  dateSubtitle: { fontSize: 15, color: colors.muted },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 8,
  },
  monthLabel: { flex: 1, fontSize: 17, fontWeight: '700', color: colors.navy },
  roundControl: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF2F5',
  },
  glyph: { fontSize: 24, lineHeight: 27, color: colors.navy },
  weekRow: { flexDirection: 'row', alignItems: 'center' },
  dayHeader: {
    flex: 1,
    textAlign: 'center',
    fontWeight: '600',
    fontSize: 12,
    color: colors.muted,
    paddingBottom: 6,
  },
  dayCell: {
    flex: 1,
    minHeight: 35,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayNumber: { fontSize: 15, fontWeight: '500', color: colors.navy },
  weekend: { color: colors.muted },
  dateFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderColor: colors.line,
    paddingTop: 12,
  },
  cancelDate: { minHeight: 40, justifyContent: 'center' },
  cancelText: { color: colors.primary, fontWeight: '600', fontSize: 15 },
  confirmDate: {
    backgroundColor: colors.primary,
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: 18,
    borderRadius: 8,
  },
  selectedDay: { backgroundColor: colors.primary },
  info: { gap: 4 },
  value: { fontSize: 14, lineHeight: 20, color: colors.navy },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    fontSize: 12,
    fontWeight: '600',
    overflow: 'hidden',
    maxWidth: '45%',
  },
  positive: { backgroundColor: '#E6F4EA', color: '#137333' },
  neutral: { backgroundColor: '#F1F5F9', color: '#475569' },
  recordTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: colors.navy },
  reference: { fontSize: 11, color: colors.muted },
});
