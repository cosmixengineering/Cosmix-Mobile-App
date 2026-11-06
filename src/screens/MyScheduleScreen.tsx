import { LoadingSkeleton } from '../components/ui/LoadingSkeleton';
import { t } from '../i18n/language';
import { useLanguage } from '../i18n/preference';
import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Svg, { Path } from 'react-native-svg';
import { useSession } from '../app/AppProvider';
import { AccessRecovery } from '../components/AccessRecovery';
import { Screen } from '../components/Controls';
import { canOpenService } from '../constants/services';
import { businessToday } from '../utils/serviceValues';
import {
  dateLabel,
  periodDays,
  shiftDate,
  shiftTime,
  useSchedule,
  type ScheduleDay,
} from '../services/schedule/mySchedule';

const tabs = ['This Week', 'This Month', 'Shift Plan'] as const;
type Tab = (typeof tabs)[number];
const palette = {
  ink: '#121936',
  muted: '#626C80',
  navy: '#104676',
  green: '#198547',
  mint: '#E6F7E9',
  line: '#E6EAF0',
};

function Glyph({
  kind,
  color = palette.navy,
}: {
  kind: 'shift' | 'pin';
  color?: string;
}) {
  const paths = {
    shift: 'M4 7h16v13H4z M8 7V4h8v3 M4 12h16 M10 12v2h4v-2',
    pin: 'M19 10c0 5-7 12-7 12S5 15 5 10a7 7 0 1 1 14 0 M14 10a2 2 0 1 1-4 0 2 2 0 1 1 4 0',
  };
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" accessible={false}>
      <Path
        d={paths[kind]}
        fill="none"
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function dayTitle(day: ScheduleDay) {
  switch (day.status) {
    case 'scheduled':
      return day.location ? day.location + t(' shift') : t('Assigned shift');
    case 'rest_day':
      return t('Rest day');
    case 'unassigned':
      return t('No shift assigned');
    case 'site_not_assigned':
      return t('No site assigned');
    default:
      return day.status.replace(/_/g, ' ');
  }
}
function interval(day: ScheduleDay) {
  const start = shiftTime(day),
    end = shiftTime(day, true);
  if (start && end) return start + ' – ' + end;
  if (start) return t('Starts ') + start;
  if (end) return t('Ends ') + end;
  return day.status === 'scheduled' ? t('Times unavailable') : null;
}
function DayDetail({ day, plan }: { day: ScheduleDay; plan: boolean }) {
  useLanguage();
  const start = shiftTime(day);
  const times = interval(day);
  return (
    <>
      <View style={s.timeline}>
        {start && <Text style={s.time}>{start}</Text>}
        <View style={s.rail}>
          <View style={[s.dot, day.status === 'scheduled' && s.greenDot]} />
        </View>
        <View style={s.icon}>
          <Glyph kind="shift" color={palette.green} />
        </View>
        <View style={s.grow}>
          <Text style={s.itemTitle}>{dayTitle(day)}</Text>
          {times && <Text style={s.body}>{times}</Text>}
          {day.location && (
            <View style={s.inline}>
              <Glyph kind="pin" />
              <Text style={s.caption}>{day.location} assignment</Text>
            </View>
          )}
        </View>
      </View>
      {plan && day.status === 'scheduled' && (
        <View style={s.plan}>
          <Text style={s.itemTitle}>{t('Shift details')}</Text>
          {(
            [
              [t('Scheduled time'), day.scheduledMinutes],
              [t('Paid break'), day.paidBreak],
              [t('Unpaid break'), day.unpaidBreak],
            ] as const
          ).map(([label, value]) => (
            <View key={label} style={s.between}>
              <Text style={s.body}>{label}</Text>
              <Text style={s.itemTitle}>
                {value === null ? t('Unavailable') : value + t(' min')}
              </Text>
            </View>
          ))}
          <View style={s.between}>
            <Text style={s.body}>{t('Time zone')}</Text>
            <Text style={s.itemTitle}>{day.zone}</Text>
          </View>
        </View>
      )}
    </>
  );
}
export function MyScheduleScreen(): React.JSX.Element {
  useLanguage();
  const auth = useSession();
  if (!auth.account || !canOpenService('shift', auth))
    return (
      <Screen>
        <AccessRecovery service={t('My schedule')} />
      </Screen>
    );
  return (
    <Schedule
      key={auth.sessionId + ':' + auth.account.employeeId}
      employee={auth.account.employeeId}
      calendarAccess={auth.permissions.some(
        grant => grant.permission === 'attendance.summaries.self',
      )}
    />
  );
}
function Schedule({
  employee,
  calendarAccess,
}: {
  employee: string;
  calendarAccess: boolean;
}) {
  useLanguage();
  const [tab, setTab] = useState<Tab>('This Week');
  const [today, setToday] = useState(businessToday);
  useFocusEffect(
    useCallback(() => {
      setToday(businessToday());
    }, []),
  );
  const [picked, pick] = useState<string | null>(null);
  const date = picked ?? today;
  const month = tab === 'This Month';
  const days = periodDays(date, month);
  const data = useSchedule(employee, days, date, calendarAccess);
  const cells: (string | null)[] = [
    ...Array<null>(
      month ? new Date(days[0] + 'T12:00:00Z').getUTCDay() : 0,
    ).fill(null),
    ...days,
  ];
  while (cells.length % 7) cells.push(null);
  const move = (step: number) => {
    if (!month) pick(shiftDate(date, step * 7));
    else {
      const d = new Date(date + 'T12:00:00Z');
      d.setUTCMonth(d.getUTCMonth() + step, 1);
      pick(d.toISOString().slice(0, 10));
    }
  };
  const knownDay = (key: string) =>
    key === date && data.selected
      ? data.selected
      : data.days.find(day => day.date === key);
  return (
    <Screen>
      <View style={s.tabs} accessibilityRole="tablist">
        {tabs.map(name => (
          <Pressable
            key={t(name)}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === name }}
            onPress={() => setTab(name)}
            style={[s.tab, name === tab && s.activeTab]}
          >
            <Text style={[s.tabText, name === tab && s.activeTabText]}>
              {name}
            </Text>
          </Pressable>
        ))}
      </View>
      <View style={s.card}>
        <View style={s.between}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              month ? t('Previous month') : t('Previous week')
            }
            onPress={() => move(-1)}
            style={s.arrow}
          >
            <Text style={s.chevron}>‹</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('Return to today')}
            onPress={() => {
              setToday(businessToday());
              pick(null);
            }}
          >
            <Text style={s.itemTitle}>
              {month
                ? dateLabel(date, { month: 'long', year: 'numeric' })
                : dateLabel(days[0], { day: 'numeric', month: 'short' }) +
                  ' – ' +
                  dateLabel(days[6], {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={month ? t('Next month') : t('Next week')}
            onPress={() => move(1)}
            style={s.arrow}
          >
            <Text style={s.chevron}>›</Text>
          </Pressable>
        </View>
        <View style={s.week}>
          {[
            t('Sun'),
            t('Mon'),
            t('Tue'),
            t('Wed'),
            t('Thu'),
            t('Fri'),
            t('Sat'),
          ].map(day => (
            <Text key={day} style={s.weekday}>
              {day}
            </Text>
          ))}
        </View>
        {Array.from({ length: cells.length / 7 }, (_, row) => (
          <View key={row} style={s.week}>
            {cells.slice(row * 7, row * 7 + 7).map((key, column) => {
              if (!key) return <View key={column} style={s.cell} />;
              const roster = knownDay(key);
              return (
                <Pressable
                  key={key}
                  accessibilityRole="button"
                  accessibilityLabel={
                    dateLabel(key, { dateStyle: 'full' }) +
                    (roster ? ', ' + dayTitle(roster) : '')
                  }
                  accessibilityState={{ selected: date === key }}
                  onPress={() => pick(key)}
                  style={[s.cell, key === date && s.chosen]}
                >
                  <Text style={[s.dayNumber, key === today && s.today]}>
                    {key.slice(-2)}
                  </Text>
                  {roster && (
                    <View
                      style={[
                        s.marker,
                        roster.status === 'scheduled' && s.greenDot,
                      ]}
                    />
                  )}
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>
      <View style={s.card}>
        <View style={s.between}>
          <Text style={s.heading}>
            {date === today ? t('Today, ') : ''}
            {dateLabel(date, {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </Text>
          {data.selected?.status === 'scheduled' && (
            <Text style={s.badge}>{t('Working day')}</Text>
          )}
        </View>
        {data.loading && <LoadingSkeleton label={t('Loading schedule')} />}
        {data.dayError && (
          <Text accessibilityRole="alert" style={s.body}>
            {data.dayError}
          </Text>
        )}
        {data.selected && (
          <DayDetail day={data.selected} plan={tab === 'Shift Plan'} />
        )}
      </View>
      <View style={s.card}>
        <View style={s.between}>
          <Text style={s.heading}>
            {month
              ? t('Month schedule')
              : tab === 'Shift Plan'
              ? t('Week at a glance')
              : t('Week schedule')}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => setTab(month ? 'This Week' : 'This Month')}
          >
            <Text style={s.link}>
              {month ? t('View week') : t('View month')} ›
            </Text>
          </Pressable>
        </View>
        {data.rangeError && (
          <Text accessibilityRole="alert" style={s.body}>
            {data.rangeError}
          </Text>
        )}
        {(!calendarAccess || data.rangeError) && (
          <Text style={s.caption}>
            {t('Select a date to load its individual roster.')}
          </Text>
        )}
        {data.rangeLoading ? (
          <LoadingSkeleton kind="list" />
        ) : (
          days.map(key => {
            const day = knownDay(key);
            return (
              <Pressable
                key={key}
                onPress={() => pick(key)}
                accessibilityRole="button"
                accessibilityState={{ selected: key === date }}
                style={[s.agenda, key === date && s.selectedRow]}
              >
                <View style={s.stamp}>
                  <Text style={s.itemTitle}>
                    {dateLabel(key, { weekday: 'short' })}
                  </Text>
                  <Text style={s.caption}>
                    {dateLabel(key, { day: 'numeric', month: 'short' })}
                  </Text>
                </View>
                <View
                  style={[s.dot, day?.status === 'scheduled' && s.greenDot]}
                />
                <View style={s.grow}>
                  <Text style={s.itemTitle}>
                    {day ? dayTitle(day) : t('View day')}
                  </Text>
                  {day && interval(day) && (
                    <Text style={s.caption}>{interval(day)}</Text>
                  )}
                </View>
                <Text style={s.chevron}>›</Text>
              </Pressable>
            );
          })
        )}
      </View>
      <Pressable
        accessibilityRole="button"
        onPress={data.retry}
        style={s.refresh}
      >
        <Text style={s.link}>{t('Refresh schedule')}</Text>
      </Pressable>
    </Screen>
  );
}
const s = StyleSheet.create({
  tabs: { flexDirection: 'row', gap: 6 },
  tab: {
    flex: 1,
    borderRadius: 10,
    backgroundColor: '#EAF0F4',
    minHeight: 44,
    justifyContent: 'center',
    paddingVertical: 8,
    alignItems: 'center',
  },
  activeTab: { backgroundColor: palette.navy },
  tabText: { color: palette.ink, fontWeight: '600', fontSize: 13 },
  activeTabText: { color: 'white' },
  card: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: 12,
    padding: 11,
    gap: 8,
  },
  heading: {
    color: palette.ink,
    fontWeight: '700',
    fontSize: 15,
    flexShrink: 1,
  },
  itemTitle: { color: palette.ink, fontSize: 14, fontWeight: '600' },
  body: { color: palette.muted, fontSize: 13, lineHeight: 19 },
  caption: { color: palette.muted, fontSize: 12, lineHeight: 18 },
  link: { color: palette.navy, fontWeight: '600', paddingVertical: 6 },
  between: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  arrow: {
    minWidth: 40,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevron: { fontSize: 22, color: palette.muted },
  week: { flexDirection: 'row' },
  weekday: { flex: 1, textAlign: 'center', color: palette.muted, fontSize: 12 },
  cell: {
    flex: 1,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  chosen: { borderRadius: 10, backgroundColor: palette.mint },
  dayNumber: { fontSize: 15, fontWeight: '600', color: palette.ink },
  today: { color: palette.green },
  marker: { height: 5, width: 5, borderRadius: 3, backgroundColor: '#8D97A2' },
  dot: { height: 8, width: 8, borderRadius: 4, backgroundColor: '#B8C1CB' },
  greenDot: { backgroundColor: '#27A45D' },
  badge: {
    backgroundColor: palette.mint,
    color: '#186236',
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 12,
  },
  grow: { flex: 1, gap: 4 },
  timeline: {
    borderTopWidth: 1,
    borderColor: palette.line,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rail: { width: 10, alignItems: 'center' },
  time: { color: palette.ink, fontSize: 12, fontWeight: '600' },
  icon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.mint,
  },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  plan: {
    gap: 9,
    borderTopWidth: 1,
    borderColor: palette.line,
    paddingTop: 10,
  },
  agenda: {
    borderTopWidth: 1,
    borderColor: palette.line,
    paddingHorizontal: 6,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  selectedRow: { backgroundColor: '#F2F9F6' },
  stamp: { width: 49, gap: 3 },
  refresh: { alignItems: 'center', paddingBottom: 10 },
});
