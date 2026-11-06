import { displayLocale, t } from '../i18n/language';
import { useLanguage } from '../i18n/preference';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  BackHandler,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import Svg, {
  Circle,
  Path,
  Defs,
  LinearGradient,
  Stop,
} from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NavigationIcon } from '../components/NavigationIcon';
import { LoadingSkeleton } from '../components/ui/LoadingSkeleton';
import { useFocusEffect } from '@react-navigation/native';
import { useServices, useSession } from '../app/AppProvider';
import { Button, Notice } from '../components/Controls';
import { useAttendanceData } from '../hooks/useAttendanceData';
import { useWorkspaceLock } from '../navigation/WorkspaceInteraction';
import { colors, layout } from '../theme/theme';
import type {
  AttendanceStep,
  PendingPunch,
  PunchReceipt,
} from '../types/contracts';
import { describeError, errorCode } from '../utils/errors';
import { localTime, receiptMessage } from '../utils/presentation';
import { isAcceptedReceipt } from '../utils/validation';
import { checkInBlockReason } from '../utils/checkInBlockReason';
import { useLocationConsentCheck } from './consent/LocationConsentGate';

const steps: Record<AttendanceStep, string> = {
  preparing: 'Checking attendance availability…',
  camera: 'Take a clear front-camera photo',
  uploading: 'Sending your photo securely…',
  verifying: 'Checking face and liveness…',
  location: 'Getting your current location…',
  submitting: 'Confirming with the company server…',
};

function attendanceError(failure: unknown) {
  return {
    message: describeError(failure),
    isFaceRejection: errorCode(failure) === 'face_verification_failed',
  };
}

const iconPaths = {
  refresh: 'M20 7v-5m0 5h-5M20 7a9 9 0 1 0 1 7',
  location:
    'M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0ZM15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',
  exit: 'M13 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6M2 12h12m-5-5 5 5-5 5',
  camera:
    'M3 7h4l2-3h6l2 3h4a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1ZM16 13a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',
};
function Icon({
  name,
  color = colors.muted,
  size = 20,
}: {
  name: keyof typeof iconPaths;
  color?: string;
  size?: number;
}) {
  return (
    <Svg
      accessible={false}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Path d={iconPaths[name]} />
    </Svg>
  );
}
export function AttendanceScreen(): React.JSX.Element {
  useLanguage();
  const { width, height } = useWindowDimensions();
  const diameter = Math.max(160, Math.min(266, width * 0.64, height * 0.3));
  const { attendance } = useServices();
  const auth = useSession();
  const data = useAttendanceData();
  const [step, setStep] = useState<AttendanceStep | null>(null);
  const [error, setError] = useState<ReturnType<typeof attendanceError> | null>(
    null,
  );
  const [receipt, setReceipt] = useState<PunchReceipt | null>(null);
  const [pending, setPending] = useState<PendingPunch | null>(null);
  const [pendingReady, setPendingReady] = useState(false);
  const flight = useRef(false);
  const mounted = useRef(true);
  const busy = step !== null;
  useWorkspaceLock(busy);
  const captureAllowed = auth.permissions.some(
    grant => grant.permission === 'attendance.punches.self',
  );
  const faceAllowed = auth.permissions.some(
    grant => grant.permission === 'attendance.face.self',
  );

  const checkLocationConsent = useLocationConsentCheck();

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    if (!busy) {
      return;
    }
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => true,
    );
    return () => subscription.remove();
  }, [busy]);
  useFocusEffect(
    useCallback(() => {
      let active = true;
      setPendingReady(false);
      attendance
        .getPending()
        .then(value => {
          if (active) {
            setPending(value);
            setPendingReady(true);
          }
        })
        .catch(failure => {
          if (active) {
            setError(attendanceError(failure));
          }
        });
      return () => {
        active = false;
      };
    }, [attendance]),
  );

  const submit = async (action: 'check-in' | 'check-out' | 'retry') => {
    if (flight.current) {
      return;
    }
    flight.current = true;
    setStep('preparing');
    setError(null);
    setReceipt(null);
    const progress = (value: AttendanceStep) => {
      if (mounted.current) {
        setStep(value);
      }
    };
    try {
      if (!(await checkLocationConsent())) return;
      const result =
        action === 'retry'
          ? await attendance.retryPending(progress)
          : action === 'check-in'
          ? await attendance.checkIn(progress)
          : await attendance.checkOut(progress);
      if (mounted.current) {
        setReceipt(result);
      }
    } catch (failure) {
      if (mounted.current) {
        setError(attendanceError(failure));
      }
    } finally {
      if (mounted.current) {
        try {
          setPending(await attendance.getPending());
          setPendingReady(true);
        } catch (failure) {
          setPendingReady(false);
          setError(attendanceError(failure));
        }
        if (mounted.current) {
          setStep(null);
          data.refresh();
        }
      }
      flight.current = false;
    }
  };

  const pageError =
    error && !error.isFaceRejection ? error.message : data.error;
  const isCheckedIn = data.state?.state === 'checked_in';
  const isCheckedOut = data.state?.state === 'checked_out';
  const statusLabel = isCheckedIn
    ? t('Checked in')
    : isCheckedOut
    ? t('Checked out')
    : data.state?.state === 'conflict'
    ? t('Needs review')
    : t('Unavailable');
  const blocked = busy || !!pending || !pendingReady || !captureAllowed;
  const inDisabled = blocked || !faceAllowed || !data.state?.checkInEnabled;
  const outDisabled = blocked || !data.state?.checkOutEnabled;
  const blockReason =
    !busy && !data.loading && !pending && !pageError
      ? checkInBlockReason(
          data.state,
          data.permitted,
          captureAllowed,
          faceAllowed,
        )
      : null;
  const date = new Intl.DateTimeFormat(displayLocale(), {
    weekday: 'short',
    day: '2-digit',
    month: 'long',
    timeZone: data.state?.timeZone || 'Asia/Karachi',
  }).format(new Date(data.state?.serverTimeUtc ?? Date.now()));
  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.screen}>
      <View style={styles.header}>
        <Text accessibilityRole="header" style={styles.headerTitle}>
          {t('Attendance')}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('Refresh attendance')}
          accessibilityState={{ disabled: busy || data.loading }}
          disabled={busy || data.loading}
          onPress={data.refresh}
          style={styles.refresh}
        >
          <Icon name="refresh" size={23} color={colors.navy} />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.statusRow}>
          <Text style={styles.date}>{date}</Text>
          {data.loading ? (
            <LoadingSkeleton kind="badge" />
          ) : (
            <View style={[styles.badge, isCheckedIn && styles.activeBadge]}>
              <View style={[styles.dot, isCheckedIn && styles.green]} />
              <Text style={styles.badgeText}>{statusLabel}</Text>
            </View>
          )}
        </View>
        {data.state?.activeSession ? (
          <Text style={styles.caption}>
            {t('Active Shift Started:')}{' '}
            {localTime(
              data.state.activeSession.startsAtUtc,
              data.state.timeZone,
            )}
          </Text>
        ) : null}
        {receipt ? (
          <Notice
            message={receiptMessage(receipt)}
            tone={isAcceptedReceipt(receipt) ? 'success' : 'info'}
          />
        ) : null}
        {receipt ? (
          <Text selectable style={layout.muted}>
            {t('Receipt:')} {receipt.id}
          </Text>
        ) : null}
        {pageError ? <Notice message={pageError} /> : null}
        {blockReason ? (
          <View accessibilityLiveRegion="polite" style={layout.card}>
            <Text style={layout.heading}>
              {isCheckedIn
                ? t('Check-out unavailable')
                : t('Check-in unavailable')}
            </Text>
            <Text style={layout.body}>{t(blockReason)}</Text>
          </View>
        ) : null}

        {pending ? (
          <View style={layout.card}>
            <Text style={layout.heading}>
              {t('Submission needs confirmation')}
            </Text>
            <Text style={layout.body}>
              {t('Your last')}{' '}
              {pending.endpoint === 'check-in' ? t('Check In') : t('Check Out')}{' '}
              {t(
                'may already be recorded. Retry to retrieve its result before starting another submission.',
              )}
            </Text>
            <Button
              title={t('Confirm previous submission')}
              onPress={() => submit('retry')}
              busy={busy}
            />
          </View>
        ) : null}

        {error?.isFaceRejection ? <Notice message={error.message} /> : null}
        {step ? <Notice tone="info" message={t(steps[step])} /> : null}
        <View style={styles.center}>
          <View style={styles.intro}>
            <Text style={styles.title}>{t('Mark your attendance')}</Text>
            <Text style={styles.sub}>
              {isCheckedIn
                ? t('Finish your workday with a location check.')
                : t('Verify your face to start your workday.')}
            </Text>
          </View>
          <View style={styles.hero}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('Verify face & check in')}
              accessibilityState={{ disabled: inDisabled, busy }}
              disabled={inDisabled}
              onPress={() => submit('check-in')}
              style={({ pressed }) => [
                styles.scan,
                { width: diameter, height: diameter },
                pressed && styles.pressed,
              ]}
            >
              <View style={StyleSheet.absoluteFill} pointerEvents="none">
                <Svg
                  accessible={false}
                  width="100%"
                  height="100%"
                  viewBox="0 0 240 240"
                >
                  <Defs>
                    <LinearGradient id="scanFill" x1="0" y1="0" x2="1" y2="1">
                      <Stop offset="0" stopColor="#182F50" />
                      <Stop offset="1" stopColor="#10213C" />
                    </LinearGradient>
                  </Defs>
                  <Circle
                    cx={120}
                    cy={120}
                    r={117}
                    stroke="#DAE4F2"
                    strokeWidth={2.5}
                    fill="white"
                  />
                  <Path
                    d="M132 3.6A117 117 0 0 1 207 42"
                    fill="none"
                    stroke="#DAFA36"
                    strokeWidth={5}
                    strokeLinecap="round"
                  />
                  <Circle cx={120} cy={120} r={107.5} fill="url(#scanFill)" />
                </Svg>
              </View>
              <NavigationIcon
                name="attendance"
                color="#FFFFFF"
                size={diameter * 0.33}
              />
              <Text style={styles.scanTitle}>{t('Check in')}</Text>
              <Text style={styles.scanHint}>
                {isCheckedIn
                  ? t('Checked in')
                  : inDisabled && !data.loading
                  ? t('Unavailable')
                  : t('Tap to scan')}
              </Text>
            </Pressable>
            <View style={styles.features}>
              <View style={styles.inline}>
                <NavigationIcon
                  name="attendance"
                  size={21}
                  color={colors.muted}
                />
                <Text style={styles.caption}>{t('Face verification')}</Text>
              </View>
              <Text style={styles.caption}>•</Text>
              <View style={styles.inline}>
                <Icon name="location" />
                <Text style={styles.caption}>{t('Location check')}</Text>
              </View>
            </View>
          </View>
          <View style={styles.checkoutBlock}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('Check out')}
              accessibilityState={{ disabled: outDisabled }}
              disabled={outDisabled}
              onPress={() => submit('check-out')}
              style={({ pressed }) => [
                styles.checkout,
                outDisabled && styles.disabledCheckout,
                pressed && styles.pressed,
              ]}
            >
              <Icon
                name="exit"
                size={22}
                color={outDisabled ? '#8996A7' : '#FFFFFF'}
              />
              <Text
                style={[
                  styles.checkoutText,
                  outDisabled && styles.disabledText,
                ]}
              >
                {t('Check out')}
              </Text>
            </Pressable>
            <Text style={styles.gps}>{t('GPS only')}</Text>
            <Text style={styles.caption}>
              {isCheckedIn
                ? t('End current session')
                : t('Available after check-in')}
            </Text>
          </View>
          <View style={styles.inline}>
            <Icon name="camera" />
            <Text style={styles.tip}>
              {t('Use good lighting and keep your face visible.')}
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: 'white' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 19,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderColor: colors.line,
  },
  headerTitle: { fontSize: 25, fontWeight: '800', color: '#102441' },
  refresh: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF2F6',
  },
  content: {
    flexGrow: 1,
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 14,
    gap: 8,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  date: { flexShrink: 1, fontWeight: '500', color: colors.muted, fontSize: 15 },
  badge: {
    backgroundColor: '#EFF2F6',
    borderRadius: 20,
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  activeBadge: { backgroundColor: '#E6F4EA' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#8797AD' },
  green: { backgroundColor: '#28784D' },
  badgeText: { fontSize: 14, fontWeight: '600', color: colors.navy },
  center: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'space-evenly',
    paddingVertical: 8,
    gap: 14,
  },
  intro: { alignItems: 'center', gap: 5 },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#102441',
    textAlign: 'center',
  },
  sub: { fontSize: 16, color: colors.muted, textAlign: 'center' },
  hero: { alignItems: 'center', gap: 12 },
  scan: { alignItems: 'center', justifyContent: 'center', gap: 2 },
  scanTitle: { fontSize: 28, fontWeight: '700', color: 'white' },
  scanHint: { fontSize: 16, fontWeight: '500', color: '#BDD0EA' },
  features: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 10,
  },
  inline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  caption: { fontSize: 14, color: colors.muted, textAlign: 'center' },
  checkoutBlock: { alignItems: 'center', gap: 7 },
  checkout: {
    minWidth: 208,
    minHeight: 49,
    borderRadius: 15,
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  disabledCheckout: { borderColor: '#CAD1DB', backgroundColor: '#F7F8FA' },
  checkoutText: { fontSize: 19, fontWeight: '700', color: 'white' },
  disabledText: { color: '#8B98A9' },
  gps: {
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#EFF2F6',
    paddingVertical: 3,
    paddingHorizontal: 10,
    fontSize: 13,
    fontWeight: '600',
    color: colors.muted,
  },
  tip: { color: colors.muted, fontSize: 13, flexShrink: 1 },
  pressed: { opacity: 0.8 },
});
