import React, { useState } from 'react';
import {
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type {
  HomeStackParams,
  WorkspaceScreenProps,
} from '../navigation/types';
import { useSession } from '../app/AppProvider';
import {
  HomeIcon,
  HeroBackdrop,
  type HomeSymbol,
} from '../components/HomeArtwork';
import { useAttendanceData } from '../hooks/useAttendanceData';
import { useHomeDetails } from '../hooks/useHomeDetails';
import { canOpenService } from '../constants/services';
import { isRecord } from '../utils/validation';
import { localTime, outcomeLabel } from '../utils/presentation';
import { numeric, text, status } from '../utils/serviceValues';

const ink = '#10152E',
  muted = '#626B83';
type Props = CompositeScreenProps<
  NativeStackScreenProps<HomeStackParams, 'HomeOverview'>,
  WorkspaceScreenProps<'Dashboard'>
>;
const time = (stamp: unknown, zone: string) =>
  typeof stamp === 'string' && Number.isFinite(Date.parse(stamp))
    ? new Intl.DateTimeFormat('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        timeZone: zone,
      }).format(new Date(stamp))
    : '—';
function Section({
  title,
  onOpen,
  children,
}: {
  title: string;
  onOpen?: () => void;
  children: React.ReactNode;
}) {
  return (
    <View style={s.section}>
      <View style={s.headingRow}>
        <Text style={s.heading}>{title}</Text>
        {onOpen && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={'View all ' + title}
            hitSlop={8}
            onPress={onOpen}
          >
            <Text style={s.more}>View all ›</Text>
          </Pressable>
        )}
      </View>
      {children}
    </View>
  );
}
function Tile({
  label,
  icon,
  color,
  bg,
  onPress,
  enabled = true,
}: {
  label: string;
  icon: HomeSymbol;
  color: string;
  bg: string;
  onPress: () => void;
  enabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !enabled }}
      disabled={!enabled}
      onPress={onPress}
      style={({ pressed }) => [
        s.tile,
        { backgroundColor: bg, opacity: !enabled ? 0.5 : pressed ? 0.8 : 1 },
      ]}
    >
      <HomeIcon name={icon} color={color} />
      <Text style={s.tileText}>{label}</Text>
    </Pressable>
  );
}
export function DashboardScreen({ navigation }: Props) {
  const [showMonth, setShowMonth] = useState(false);
  const auth = useSession(),
    data = useAttendanceData(),
    home = useHomeDetails();
  const now = new Date(data.state?.serverTimeUtc ?? Date.now()),
    zone = data.state?.timeZone || 'Asia/Karachi';
  const hour = Number(
    new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      hourCycle: 'h23',
      timeZone: zone,
    }).format(now),
  );
  const displayName = auth.account?.displayName || 'Employee';
  const assignment = home.details?.profile.value;
  const location = text(assignment?.siteName, text(assignment?.branchName, ''));
  const title = text(assignment?.designationTitle, 'Employee');
  const rows = home.details?.calendar.value;
  const day = Array.isArray(rows?.days)
    ? rows.days.find(
        (r: unknown) => isRecord(r) && r.businessDate === home.today,
      )
    : null;
  const late =
    isRecord(day) && isRecord(day.policy)
      ? numeric(day.policy.lateMinutes)
      : null;
  const assessment =
    isRecord(day) && isRecord(day.policy) ? day.policy.dayStatus : null;
  const knownStatus =
    typeof assessment === 'string'
      ? assessment.toLowerCase()
      : typeof assessment === 'number'
      ? [
          '',
          'unverified',
          'present',
          'absent',
          'halfday',
          'hourly',
          'leave',
          'holiday',
          'restday',
          'incomplete',
        ][assessment] ?? ''
      : '';
  const classified = [
    'present',
    'absent',
    'leave',
    'holiday',
    'restday',
  ].includes(knownStatus);
  const dailyCounts: Record<string, number | null> = {
    presentDays: classified ? Number(knownStatus === 'present') : null,
    absentDays: classified ? Number(knownStatus === 'absent') : null,
    leaveDays: classified ? Number(knownStatus === 'leave') : null,
    lateDays: late === null ? null : Number(late > 0),
  };
  const receipt = data.history.find(
    r =>
      r.businessDate === home.today &&
      ['Accepted', 'AcceptedWithException'].includes(r.outcome),
  );
  const checkedIn = data.state?.state === 'checked_in';
  const stamp =
    data.state?.activeSession?.startsAtUtc ?? receipt?.receivedAtUtc;
  const state = data.loading
    ? 'Loading…'
    : !data.state
    ? 'Unavailable'
    : checkedIn
    ? 'Checked in'
    : data.state.state === 'conflict'
    ? 'Needs review'
    : receipt
    ? 'Checked out'
    : 'No active session';
  const ring =
    late !== null &&
    (receipt || data.state?.activeSession?.businessDate === home.today)
      ? late > 0
        ? 'Late'
        : 'On time'
      : checkedIn
      ? 'On duty'
      : receipt
      ? 'Recorded'
      : '—';
  const shift = home.details?.shift.value;
  const openHistory = () =>
    navigation.navigate('History', { category: 'punches' });
  const openCalendar = () =>
    navigation.navigate('History', { category: 'calendar' });
  const openSchedule = () => navigation.navigate('MySchedule');
  const canLeave = canOpenService('leaves', auth) && home.shiftAllowed;
  const clearRefresh = () => {
    data.refresh();
    home.refresh();
  };
  const summaryTiles: readonly [string, string, HomeSymbol, string, string][] =
    [
      ['Present', 'presentDays', 'present', '#288E56', '#EFF8E9'],
      ['Leave', 'leaveDays', 'leave', '#DE6831', '#FFF4E9'],
      ['Late', 'lateDays', 'late', '#D85E34', '#FFF2EE'],
      ['Absent', 'absentDays', 'absent', '#BF4554', '#FDF0F1'],
    ];
  return (
    <SafeAreaView style={s.screen} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={s.content}
        refreshControl={
          <RefreshControl
            refreshing={data.loading || home.loading}
            onRefresh={clearRefresh}
          />
        }
      >
        <View style={s.headingRow}>
          <Image
            source={require('../assets/images/cosmix-logo-hd.png')}
            resizeMode="contain"
            accessibilityLabel="Cosmix Engineering"
            style={s.logo}
          />
          <View style={s.headerActions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open notifications"
              onPress={() =>
                navigation.navigate('ServiceDetail', {
                  service: 'notifications',
                })
              }
              style={s.round}
            >
              <HomeIcon name="bell" color={ink} />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="My profile"
              onPress={() => navigation.navigate('Profile')}
              style={[s.round, s.avatar]}
            >
              <Text style={s.initials}>
                {displayName
                  .split(/\s+/)
                  .slice(0, 2)
                  .map(word => word[0])
                  .join('')
                  .toUpperCase()}
              </Text>
            </Pressable>
          </View>
        </View>
        <View style={s.welcome}>
          <View style={s.flex}>
            <Text style={s.greeting}>
              Good {hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening'}
              !
            </Text>
            <Text style={s.name}>{displayName}</Text>
            <Text style={s.muted}>
              {[title, location].filter(Boolean).join('  •  ')}
            </Text>
          </View>
          <View style={s.date}>
            <HomeIcon name="schedule" size={15} color="#16396D" />
            <Text style={s.dateText}>
              {new Intl.DateTimeFormat('en-GB', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                timeZone: zone,
              }).format(now)}
            </Text>
          </View>
        </View>
        <View style={s.hero}>
          <HeroBackdrop />
          <View style={s.flex}>
            <Text style={s.heroLabel}>Today’s Attendance</Text>
            <Text style={s.heroTime}>{time(stamp, zone)}</Text>
            {!!location && <Text style={s.heroLabel}>{location}</Text>}
            <View style={[s.badge, checkedIn && s.active]}>
              <Text style={s.badgeText}>{state}</Text>
            </View>
          </View>
          <View style={[s.ring, ring === 'Late' && s.lateRing]}>
            <Text style={s.ringText}>{ring}</Text>
          </View>
        </View>
        {data.error ? (
          <Text accessibilityRole="alert" style={s.muted}>
            {data.error}
          </Text>
        ) : null}
        <View style={s.tiles}>
          <Tile
            label={'Mark\nAttendance'}
            icon="punch"
            color="#099774"
            bg="#E1F9ED"
            enabled={data.permitted}
            onPress={() => navigation.navigate('Attendance')}
          />
          <Tile
            label={'Apply\nLeave'}
            icon="leave"
            color="#D75B24"
            bg="#FFF0E6"
            enabled={canLeave}
            onPress={() => navigation.navigate('ApplyLeave')}
          />
          <Tile
            label={'My\nSchedule'}
            icon="schedule"
            color="#2354AB"
            bg="#E8F4FF"
            enabled={home.shiftAllowed}
            onPress={openSchedule}
          />
          <Tile
            label="Request"
            icon="request"
            color="#7047B2"
            bg="#F1EAFD"
            onPress={() => navigation.navigate('Services')}
          />
        </View>
        <Section
          title={showMonth ? 'Monthly summary' : 'Today’s summary'}
          onOpen={home.calendarAllowed ? openCalendar : undefined}
        >
          <Pressable
            accessibilityRole="button"
            onPress={() => setShowMonth(!showMonth)}
            hitSlop={6}
          >
            <Text style={s.month}>
              {showMonth ? 'Show today' : 'Show month to date'} ›
            </Text>
          </Pressable>
          <View style={s.tiles}>
            {summaryTiles.map(([label, key, icon, color, bg]) => (
              <View key={key} style={[s.stat, { backgroundColor: bg }]}>
                <HomeIcon name={icon} color={color} size={21} />
                <Text style={s.count}>
                  {(showMonth ? numeric(rows?.[key]) : dailyCounts[key]) ?? '—'}
                </Text>
                <Text style={s.caption}>{label}</Text>
              </View>
            ))}
          </View>
          {(!home.calendarAllowed || home.details?.calendar.error) && (
            <Text style={s.muted}>
              {home.details?.calendar.error ||
                'Monthly attendance access is unavailable.'}
            </Text>
          )}
        </Section>
        <Section
          title="Upcoming schedule"
          onOpen={home.shiftAllowed ? openSchedule : undefined}
        >
          <View style={s.row}>
            <View style={[s.smallIcon, s.blue]}>
              <HomeIcon name="site" size={20} color="#2354AB" />
            </View>
            <View style={s.flex}>
              <Text style={s.rowTitle}>
                {shift?.status === 'scheduled'
                  ? 'Scheduled shift'
                  : shift
                  ? status(shift.status)
                  : home.loading
                  ? 'Loading schedule…'
                  : 'Schedule unavailable'}
              </Text>
              <Text style={s.muted}>
                {shift
                  ? [
                      text(shift.businessDate),
                      shift.startsAt && shift.endsAt
                        ? time(shift.startsAt, text(shift.timeZone, zone)) +
                          ' – ' +
                          time(shift.endsAt, text(shift.timeZone, zone))
                        : null,
                    ]
                      .filter(Boolean)
                      .join('   •   ')
                  : home.details?.shift.error ||
                    'Your assigned schedule appears here.'}
              </Text>
            </View>
          </View>
        </Section>
        <Section
          title="Recent activity"
          onOpen={data.permitted ? openHistory : undefined}
        >
          {data.history.slice(0, 3).map(r => (
            <View key={r.id} style={s.row}>
              <View style={[s.smallIcon, s.green]}>
                <HomeIcon name="punch" size={20} color="#16825E" />
              </View>
              <View style={s.flex}>
                <Text style={s.rowTitle}>
                  {r.action === 'CheckIn' ? 'Check in' : 'Check out'} ·{' '}
                  {outcomeLabel(r.outcome)}
                </Text>
                <Text style={s.muted}>{localTime(r.receivedAtUtc, zone)}</Text>
              </View>
            </View>
          ))}
          {!data.history.length && (
            <Text style={s.muted}>
              {data.loading
                ? 'Loading attendance…'
                : data.state
                ? 'No attendance submissions in the last seven days.'
                : 'Attendance history unavailable.'}
            </Text>
          )}
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F7F9FC' },
  content: {
    width: '100%',
    maxWidth: 680,
    alignSelf: 'center',
    padding: 14,
    gap: 10,
  },
  headingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  logo: { width: 119, height: 44 },
  headerActions: { flexDirection: 'row', gap: 8 },
  round: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: { backgroundColor: '#DFEBF8' },
  initials: { color: '#204676', fontWeight: '700' },
  welcome: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  flex: { flex: 1, minWidth: 0 },
  greeting: { color: ink, fontSize: 14 },
  name: { color: ink, fontSize: 21, fontWeight: '700', letterSpacing: -0.6 },
  muted: { color: muted, fontSize: 12, lineHeight: 18 },
  date: {
    backgroundColor: '#E0F3FF',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    padding: 8,
    borderRadius: 12,
  },
  dateText: { color: '#123461', fontSize: 11, fontWeight: '600' },
  hero: {
    minHeight: 108,
    borderRadius: 14,
    overflow: 'hidden',
    padding: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#163766',
  },
  heroLabel: { fontSize: 14, color: '#FFF' },
  heroTime: {
    fontSize: 28,
    color: '#FFF',
    fontWeight: '700',
    marginVertical: 3,
  },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 16,
    backgroundColor: '#385D80',
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginTop: 6,
  },
  active: { backgroundColor: '#177C4F' },
  badgeText: { fontSize: 12, color: 'white', fontWeight: '600' },
  ring: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 6,
    borderColor: '#92D986',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#153C60',
  },
  lateRing: { borderColor: '#FFC474' },
  ringText: {
    fontSize: 15,
    color: 'white',
    fontWeight: '700',
    textAlign: 'center',
  },
  tiles: { flexDirection: 'row', gap: 7 },
  tile: {
    flex: 1,
    minHeight: 67,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
    gap: 5,
  },
  tileText: {
    color: ink,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  section: { backgroundColor: 'white', borderRadius: 12, padding: 11, gap: 7 },
  heading: { color: ink, fontSize: 16, fontWeight: '700' },
  more: { color: muted, fontSize: 12 },
  month: { color: muted, fontSize: 11 },
  stat: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    borderRadius: 11,
    gap: 3,
  },
  count: { fontSize: 18, color: ink, fontWeight: '700' },
  caption: { fontSize: 12, color: ink },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 5,
  },
  rowTitle: { fontSize: 14, color: ink, fontWeight: '600' },
  smallIcon: {
    width: 36,
    height: 36,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  green: { backgroundColor: '#E5F7EF' },
  blue: { backgroundColor: '#EAF1FF' },
});
