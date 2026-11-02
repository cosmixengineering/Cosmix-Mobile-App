import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Path,
  Rect,
  Stop,
} from 'react-native-svg';
import type { Choice } from '../../types/selfService';
import { layout } from '../../theme/theme';
import { businessToday } from '../../utils/serviceValues';

export function LeaveBanner() {
  return (
    <View style={styles.banner}>
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <Svg
          width="100%"
          height="100%"
          preserveAspectRatio="none"
          viewBox="0 0 350 104"
          accessible={false}
        >
          <Defs>
            <LinearGradient id="sky" x1="0" y1="1" x2="1" y2="0">
              <Stop offset="0" stopColor="#182962" />
              <Stop offset="1" stopColor="#226B9C" />
            </LinearGradient>
          </Defs>
          <Rect width="350" height="104" fill="url(#sky)" />
          <Circle cx="309" cy="55" r="68" fill="#438CB0" opacity=".36" />
        </Svg>
      </View>
      <View style={styles.bannerCopy}>
        <Text style={styles.bannerTitle}>Apply for Leave</Text>
        <Text style={styles.bannerText}>
          Submit your leave request and track its status.
        </Text>
      </View>
      <Svg width={68} height={70} viewBox="0 0 68 70" accessible={false}>
        <Rect x="5" y="13" width="49" height="46" rx="7" fill="#F8FBFF" />
        <Path d="M5 20q0-7 7-7h35q7 0 7 7v4H5z" fill="#FFCA65" />
        <Path
          d="M17 9v9m24-9v9"
          stroke="#FFF0CB"
          strokeWidth="5"
          strokeLinecap="round"
        />
        {[16, 29, 42].map(x => (
          <React.Fragment key={x}>
            <Rect x={x - 4} y="30" width="8" height="6" rx="2" fill="#BCD6E8" />
            <Rect x={x - 4} y="42" width="8" height="6" rx="2" fill="#D1E3F0" />
          </React.Fragment>
        ))}
        <Circle cx="51" cy="55" r="13" fill="#56B68B" />
        <Path
          d="m45 55 4 4 8-9"
          fill="none"
          stroke="white"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </Svg>
    </View>
  );
}

export function LeaveTypeField({
  value,
  choices,
  onChange,
  disabled,
}: {
  value: string;
  choices: Choice[];
  onChange(value: string): void;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <View style={layout.stack6}>
      <Text style={layout.label}>Leave Type</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open, disabled }}
        disabled={disabled}
        accessibilityLabel={
          'Leave type, ' +
          (choices.find(c => c.value === value)?.label ?? 'Choose leave type')
        }
        style={styles.input}
        onPress={() => setOpen(!open)}
      >
        <Text style={styles.value}>
          {choices.find(c => c.value === value)?.label ?? 'Choose leave type'}
        </Text>
        <Text style={styles.arrow}>{open ? '⌃' : '⌄'}</Text>
      </Pressable>
      {open && (
        <View style={styles.options}>
          {choices.map(choice => (
            <Pressable
              key={choice.value}
              accessibilityRole="radio"
              accessibilityState={{
                selected: choice.value === value,
                disabled,
              }}
              disabled={disabled}
              style={styles.option}
              onPress={() => {
                onChange(choice.value);
                setOpen(false);
              }}
            >
              <Text style={styles.value}>{choice.label}</Text>
              {choice.value === value && <Text style={styles.arrow}>✓</Text>}
            </Pressable>
          ))}
          {!choices.length && (
            <Text style={layout.muted}>No active leave types available.</Text>
          )}
        </View>
      )}
    </View>
  );
}

const shortDate = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});
const monthTitle = new Intl.DateTimeFormat('en-GB', {
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});
export function LeaveDateField({
  label,
  value,
  onChange,
  disabled,
  min,
}: {
  label: string;
  value: string;
  onChange(value: string): void;
  disabled: boolean;
  min?: string;
}) {
  const [month, setMonth] = useState<Date | null>(null);
  const selected = new Date(value + 'T12:00:00Z');
  const valid = Number.isFinite(selected.getTime());
  const first =
    month ?? (valid ? selected : new Date(businessToday() + 'T12:00:00Z'));
  const year = first.getUTCFullYear(),
    index = first.getUTCMonth();
  const offset = (new Date(Date.UTC(year, index, 1)).getUTCDay() + 6) % 7;
  const days = new Date(Date.UTC(year, index + 1, 0)).getUTCDate();
  const move = (delta: number) =>
    setMonth(new Date(Date.UTC(year, index + delta, 1)));
  return (
    <View style={styles.dateField}>
      <Text style={layout.label}>{label}</Text>
      <Pressable
        style={styles.dateInput}
        accessibilityRole="button"
        accessibilityLabel={label + ', ' + value}
        disabled={disabled}
        accessibilityState={{ disabled }}
        onPress={() => setMonth(first)}
      >
        <Svg width={17} height={18} viewBox="0 0 20 20" accessible={false}>
          <Rect
            x="2"
            y="4"
            width="16"
            height="14"
            rx="2"
            fill="none"
            stroke="#152F50"
            strokeWidth="1.6"
          />
          <Path d="M2 8h16M6 2v4m8-4v4" stroke="#152F50" strokeWidth="1.6" />
        </Svg>
        <Text style={styles.dateValue}>
          {valid ? shortDate.format(selected) : 'Choose date'}
        </Text>
      </Pressable>
      <Modal
        transparent
        visible={!!month}
        animationType="fade"
        onRequestClose={() => setMonth(null)}
      >
        <View style={styles.scrim}>
          <ScrollView
            contentContainerStyle={styles.modalContent}
            keyboardShouldPersistTaps="handled"
          >
            <View accessibilityViewIsModal style={styles.calendar}>
              <Text style={layout.label}>{label}</Text>
              <View style={layout.row}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Previous month"
                  disabled={year <= 1900 && index === 0}
                  style={styles.monthButton}
                  onPress={() => move(-1)}
                >
                  <Text style={styles.arrow}>‹</Text>
                </Pressable>
                <Text style={layout.heading}>{monthTitle.format(first)}</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Next month"
                  disabled={year >= 9999 && index === 11}
                  style={styles.monthButton}
                  onPress={() => move(1)}
                >
                  <Text style={styles.arrow}>›</Text>
                </Pressable>
              </View>
              <View style={styles.grid}>
                {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map(day => (
                  <Text key={day} style={styles.weekday}>
                    {day}
                  </Text>
                ))}
                {Array.from({ length: offset }, (_, i) => (
                  <View key={'blank' + i} style={styles.cell} />
                ))}
                {Array.from({ length: days }, (_, i) => {
                  const key = new Date(Date.UTC(year, index, i + 1))
                    .toISOString()
                    .slice(0, 10);
                  const blocked = disabled || (!!min && key < min);
                  return (
                    <Pressable
                      key={key}
                      accessibilityRole="button"
                      accessibilityLabel={key}
                      disabled={blocked}
                      accessibilityState={{
                        selected: key === value,
                        disabled: blocked,
                      }}
                      style={[styles.cell, key === value && styles.selected]}
                      onPress={() => {
                        onChange(key);
                        setMonth(null);
                      }}
                    >
                      <Text
                        style={[
                          styles.day,
                          key === value && styles.selectedText,
                          blocked && styles.blocked,
                        ]}
                      >
                        {i + 1}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              <Pressable
                accessibilityRole="button"
                onPress={() => setMonth(null)}
                style={styles.close}
              >
                <Text style={styles.value}>Close calendar</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#184675',
    borderRadius: 13,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    gap: 12,
    minHeight: 84,
  },
  bannerCopy: { flex: 1, gap: 5 },
  bannerTitle: { color: 'white', fontSize: 17, fontWeight: '700' },
  bannerText: { color: '#ECF5FF', lineHeight: 18, fontSize: 13 },
  input: {
    borderRadius: 11,
    borderWidth: 1,
    borderColor: '#D9DEE6',
    paddingHorizontal: 13,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  options: {
    borderWidth: 1,
    borderColor: '#D9DEE6',
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  option: {
    minHeight: 44,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  value: { fontSize: 14, color: '#142743', flexShrink: 1 },
  arrow: { fontSize: 22, color: '#17477D' },
  dateField: { flexGrow: 1, flexBasis: 120, gap: 6 },
  dateInput: {
    borderColor: '#D9DEE6',
    borderWidth: 1,
    borderRadius: 11,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    padding: 8,
  },
  dateValue: { fontSize: 14, color: '#142743', flexShrink: 1 },
  scrim: { flex: 1, backgroundColor: '#112A47AA' },
  modalContent: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  calendar: {
    backgroundColor: 'white',
    padding: 16,
    gap: 14,
    borderRadius: 18,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  weekday: { width: '14.2857%', color: '#52647A', textAlign: 'center' },
  cell: {
    width: '14.2857%',
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  day: { color: '#142743', fontSize: 16 },
  selected: { backgroundColor: '#17477D', borderRadius: 12 },
  selectedText: { color: 'white' },
  blocked: { color: '#9AA4AF' },
  monthButton: {
    paddingHorizontal: 14,
    minHeight: 44,
    justifyContent: 'center',
  },
  close: { alignSelf: 'center', padding: 12 },
});
