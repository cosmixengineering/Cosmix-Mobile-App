import { ProfileAvatar } from '../components/ProfilePhoto';
import { LoadingSkeleton } from '../components/ui/LoadingSkeleton';
import { displayLocale, t } from '../i18n/language';
import { useLanguage } from '../i18n/preference';
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
    ? new Intl.DateTimeFormat(displayLocale('en-US'), {
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
  useLanguage();
  return (
    <View style={s.section}>
      <View style={s.headingRow}>
        <Text style={s.heading}>{title}</Text>
        {onOpen && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('View all ') + title}
            hitSlop={8}
            onPress={onOpen}
          >
            <Text style={s.more}>{t('View all ›')}</Text>
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
  useLanguage();
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
  const displayName = auth.account?.displayName || t('Employee');
  const assignment = home.details?.profile.value;
  const location = text(assignment?.siteName, text(assignment?.branchName, ''));
  const title = text(assignment?.designationTitle, t('Employee'));
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
  const state = !data.state
    ? t('Unavailable')
    : checkedIn
    ? t('Checked in')
    : data.state.state === 'conflict'
    ? t('Needs review')
    : receipt
    ? t('Checked out')
    : t('No active session');
  const ring =
    late !== null &&
    (receipt || data.state?.activeSession?.businessDate === home.today)
      ? late > 0
        ? t('Late')
        : t('On time')
      : checkedIn
      ? t('On duty')
      : receipt
      ? t('Recorded')
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
      [t('Present'), 'presentDays', 'present', '#009654', '#E6F8EF'],
      [t('Leave'), 'leaveDays', 'leave', '#477BCC', '#EDF3FF'],
      [t('Late'), 'lateDays', 'late', '#E68906', '#FFF5E1'],
      [t('Absent'), 'absentDays', 'absent', '#CB424C', '#FDECEF'],
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
              accessibilityLabel={t('Open notifications')}
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
              accessibilityLabel={t('My profile')}
              onPress={() => navigation.navigate('Profile')}
              style={s.round}
            >
              <ProfileAvatar
                size={42}
                initials={
                  displayName
                    .trim()
                    .split(/\s+/)
                    .slice(0, 2)
                    .map(word => word[0])
                    .join('')
                    .toUpperCase() || 'CO'
                }
              />
            </Pressable>
          </View>
        </View>
        <View style={s.welcome}>
          <View style={s.flex}>
            <Text style={s.greeting}>
              {t(
                hour < 12
                  ? 'Good morning!'
                  : hour < 18
                  ? 'Good afternoon!'
                  : 'Good evening!',
              )}
            </Text>
            <Text style={s.name}>{displayName}</Text>
            <Text style={s.muted}>
              {[title, location].filter(Boolean).join('  •  ')}
            </Text>
          </View>
          <View style={s.date}>
            <HomeIcon name="schedule" size={15} color="#16396D" />
            <Text style={s.dateText}>
              {new Intl.DateTimeFormat(displayLocale(), {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                timeZone: zone,
              }).format(now)}
            </Text>
          </View>
        </View>
        {data.loading && !data.state ? (
          <View style={s.loadingHero}>
            <LoadingSkeleton />
          </View>
        ) : (
          <View style={s.hero}>
            <HeroBackdrop />
            <View style={s.flex}>
              <Text style={s.heroLabel}>{t('Today’s Attendance')}</Text>
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
        )}
        {data.error ? (
          <Text accessibilityRole="alert" style={s.muted}>
            {data.error}
          </Text>
        ) : null}
        <View style={s.tiles}>
          <Tile
            label={t('Mark\nAttendance')}
            icon="faceScan"
            color="#099774"
            bg="#E1F9ED"
            enabled={data.permitted}
            onPress={() => navigation.navigate('Attendance')}
          />
          <Tile
            label={t('Apply\nLeave')}
            icon="applyLeave"
            color="#D75B24"
            bg="#FFF0E6"
            enabled={canLeave}
            onPress={() => navigation.navigate('ApplyLeave')}
          />
          <Tile
            label={t('My\nSchedule')}
            icon="shiftClock"
            color="#2354AB"
            bg="#E8F4FF"
            enabled={home.shiftAllowed}
            onPress={openSchedule}
          />
          <Tile
            label={t('Request')}
            icon="editRequest"
            color="#7047B2"
            bg="#F1EAFD"
            onPress={() => navigation.navigate('Services')}
          />
        </View>
        <View style={[s.section, s.summaryCard]}>
          <View style={s.summaryHeader}>
            <Text accessibilityRole="header" style={s.heading}>
              {showMonth ? t('Monthly summary') : t('Today’s summary')}
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => setShowMonth(current => !current)}
              hitSlop={6}
            >
              <Text style={s.more}>
                {showMonth ? t('Show today') : t('Show month to date')} ›
              </Text>
            </Pressable>
          </View>
          {home.loading && !home.details ? (
            <LoadingSkeleton kind="summary" />
          ) : (
            <View style={s.stats}>
              {summaryTiles.map(([label, key, icon, color, bg], index) => (
                <View
                  accessible
                  key={key}
                  style={[s.stat, index > 0 && s.divider]}
                >
                  <View style={[s.statIcon, { backgroundColor: bg }]}>
                    <HomeIcon name={icon} color={color} size={21} />
                  </View>
                  <Text style={s.count}>
                    {(showMonth ? numeric(rows?.[key]) : dailyCounts[key]) ??
                      '—'}
                  </Text>
                  <Text style={s.caption}>{label}</Text>
                </View>
              ))}
            </View>
          )}
          {(!home.calendarAllowed || home.details?.calendar.error) && (
            <Text style={s.muted}>
              {home.details?.calendar.error ||
                t('Monthly attendance access is unavailable.')}
            </Text>
          )}
          {home.calendarAllowed && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('Attendance calendar')}
              onPress={openCalendar}
              hitSlop={6}
              style={s.calendarLink}
            >
              <Text style={s.more}>{t('Attendance calendar')} ›</Text>
            </Pressable>
          )}
        </View>
        <Section
          title={t('Upcoming schedule')}
          onOpen={home.shiftAllowed ? openSchedule : undefined}
        >
          {home.loading && !home.details ? (
            <LoadingSkeleton kind="list" rows={1} />
          ) : (
            <View style={s.row}>
              <View style={[s.smallIcon, s.blue]}>
                <HomeIcon name="site" size={20} color="#2354AB" />
              </View>
              <View style={s.flex}>
                <Text style={s.rowTitle}>
                  {shift?.status === 'scheduled'
                    ? t('Scheduled shift')
                    : shift
                    ? status(shift.status)
                    : home.loading
                    ? t('Loading schedule…')
                    : t('Schedule unavailable')}
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
                      t('Your assigned schedule appears here.')}
                </Text>
              </View>
            </View>
          )}
        </Section>
        <Section
          title={t('Recent activity')}
          onOpen={data.permitted ? openHistory : undefined}
        >
          {data.history.slice(0, 3).map(r => (
            <View key={r.id} style={s.row}>
              <View style={[s.smallIcon, s.green]}>
                <HomeIcon name="punch" size={20} color="#16825E" />
              </View>
              <View style={s.flex}>
                <Text style={s.rowTitle}>
                  {r.action === 'CheckIn' ? t('Check in') : t('Check out')} ·{' '}
                  {outcomeLabel(r.outcome)}
                </Text>
                <Text style={s.muted}>{localTime(r.receivedAtUtc, zone)}</Text>
              </View>
            </View>
          ))}
          {!data.history.length &&
            (data.loading ? (
              <LoadingSkeleton kind="list" rows={2} />
            ) : (
              <Text style={s.muted}>
                {data.state
                  ? t('No attendance submissions in the last seven days.')
                  : t('Attendance history unavailable.')}
              </Text>
            ))}
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}
const s = StyleSheet.create({
  loadingHero: {
    padding: 20,
    borderRadius: 18,
    backgroundColor: '#fff',
    minHeight: 120,
    justifyContent: 'center',
  },
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
  summaryCard: {
    borderColor: '#E3E9F0',
    borderWidth: StyleSheet.hairlineWidth,
    gap: 12,
    paddingVertical: 13,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 5,
  },
  stats: { flexDirection: 'row', paddingVertical: 2 },
  stat: { flex: 1, minWidth: 0, alignItems: 'center', gap: 3 },
  divider: {
    borderStartWidth: StyleSheet.hairlineWidth,
    borderColor: '#CFD7E2',
  },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  count: {
    fontSize: 20,
    fontWeight: '700',
    color: '#48546D',
    fontVariant: ['tabular-nums'],
  },
  caption: { fontSize: 13, color: muted, textAlign: 'center' },
  calendarLink: { alignSelf: 'flex-end' },
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
