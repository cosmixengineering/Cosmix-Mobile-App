import {
  AttendanceHistoryHeader,
  EmptyAttendanceHistory,
} from './AttendanceHistoryHeader';
import { LoadingSkeleton } from './ui/LoadingSkeleton';
import { t } from '../i18n/language';
import { useLanguage } from '../i18n/preference';
import React, { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useServices, useSession } from '../app/AppProvider';
import { Button, Field, Notice, Screen } from './Controls';
import { DateField, InfoRow, ReasonSheet, RecordCard } from './ServiceControls';
import { RequestOverview } from './RequestOverview';
import { ServiceSummary } from './ServiceSummary';
import { LeaveBalancePanel } from './LeaveBalancePanel';
import { RequestFeedback } from './RequestFeedback';
import { PaymentHistoryCard } from './PaymentHistoryCard';
import { useServiceResource } from '../hooks/useServiceResource';
import { useServiceMutation } from '../hooks/useServiceMutation';
import { allowanceTitle, serviceTitle } from '../constants/services';
import type { DataRecord, RequestKind, ServiceKey } from '../types/selfService';
import { AppError, describeError } from '../utils/errors';
import {
  amount,
  businessToday,
  isPending,
  numeric,
  reason,
  record,
  records,
  requireDate,
  status,
  text,
} from '../utils/serviceValues';
import { isGuid } from '../utils/validation';
import { fullLocalTime, localTime, outcomeLabel } from '../utils/presentation';
import { colors, layout } from '../theme/theme';

const actions: Partial<
  Record<ServiceKey, { kind: RequestKind; title: string }[]>
> = {
  leaves: [
    {
      kind: 'leave',
      get title() {
        return t('Apply for leave');
      },
    },
  ],
  loans: [
    {
      kind: 'advance',
      get title() {
        return t('Salary advance');
      },
    },
    {
      kind: 'loan',
      get title() {
        return t('Loan request');
      },
    },
  ],
  resignation: [
    {
      kind: 'resignation',
      get title() {
        return t('Request resignation');
      },
    },
  ],
  allowances: [
    {
      kind: 'allowance',
      get title() {
        return t('New allowance claim');
      },
    },
  ],
  vehicles: [
    {
      kind: 'trip',
      get title() {
        return t('Record work trip');
      },
    },
    {
      kind: 'fuel',
      get title() {
        return t('Claim fuel');
      },
    },
    {
      kind: 'maintenance',
      get title() {
        return t('Maintenance claim');
      },
    },
    {
      kind: 'incident',
      get title() {
        return t('Report incident');
      },
    },
  ],
  corrections: [
    {
      kind: 'correction',
      get title() {
        return t('Request attendance review');
      },
    },
  ],
  overtime: [
    {
      kind: 'overtime',
      get title() {
        return t('Request overtime');
      },
    },
  ],
  encashment: [
    {
      kind: 'encashment',
      get title() {
        return t('Request encashment');
      },
    },
  ],
};
const ranged = new Set<ServiceKey>([
  'leaves',
  'allowances',
  'corrections',
  'overtime',
  'punches',
]);
const paged = new Set<ServiceKey>([
  'leaves',
  'loans',
  'resignation',
  'allowances',
  'vehicles',
  'corrections',
  'overtime',
  'notifications',
  'punches',
  'payroll',
  'payments',
]);
type Cancellation = { row: DataRecord; route: string; versionName?: string };

export function ServiceRecords({
  service,
  header,
  readOnly = false,
  attendanceHistory = false,
  onRequest,
  onHistory,
}: {
  service: ServiceKey;
  header?: React.ReactNode;
  readOnly?: boolean;
  attendanceHistory?: boolean;
  onRequest?(kind: RequestKind, previousRequestId?: string): void;
  onHistory?(service: ServiceKey): void;
}): React.JSX.Element {
  useLanguage();
  const { session, selfService } = useServices();
  const today = businessToday();
  const auth = useSession();
  const leaveScheduleAccess = auth.permissions.some(
    grant => grant.permission === 'attendance.rosters.self',
  );
  const [from, setFrom] = useState(today.slice(0, 8) + '01');
  const [to, setTo] = useState(today);
  const [date, setDate] = useState(today);
  const [year, setYear] = useState(today.slice(0, 4));
  const [month, setMonth] = useState(today.slice(5, 7));
  const [query, setQuery] = useState({
    from,
    to,
    date,
    year: Number(year),
    month: Number(month),
    page: 1,
    cursor: undefined as string | undefined,
  });
  const data = useServiceResource(service, query);
  const refresh = async () => {
    clearDetails();
    await data.reload();
  };
  const mutation = useServiceMutation(refresh);
  const [cancel, setCancel] = useState<Cancellation | null>(null);
  const [error, setError] = useState('');
  const [reading, setReading] = useState('');
  const [expanded, setExpanded] = useState<DataRecord | null>(null);
  const [detailBusy, setDetailBusy] = useState(false);
  const [showBalance, setShowBalance] = useState(false);
  const detailEpoch = useRef(0);
  const clearDetails = useCallback(() => {
    detailEpoch.current++;
    setExpanded(null);
    setDetailBusy(false);
  }, []);
  useFocusEffect(useCallback(() => clearDetails, [clearDetails]));
  const root = data.data?.root;
  const rows = data.data?.rows ?? [];
  const filter = () => {
    try {
      requireDate(from);
      requireDate(to);
      requireDate(date);
      if (
        from > to ||
        Date.parse(to) - Date.parse(from) > 365 * 86400000 ||
        !/^\d{4}$/.test(year) ||
        Number(year) < 1900 ||
        Number(year) > 9999 ||
        !/^\d{1,2}$/.test(month) ||
        Number(month) < 1 ||
        Number(month) > 12
      ) {
        throw new AppError('invalid_date_range');
      }
      setError('');
      clearDetails();
      setQuery({
        from,
        to,
        date,
        year: Number(year),
        month: Number(month),
        page: 1,
        cursor: undefined,
      });
    } catch (failure) {
      setError(describeError(failure));
    }
  };
  const cancellation = (row: DataRecord): Cancellation | null => {
    if (!isGuid(row.id)) {
      return null;
    }
    if (service === 'leaves' && (row.state === 1 || row.state === 'Approved')) {
      if (
        Array.isArray(row.cancellations) &&
        records(row.cancellations).some(item => isPending(item.state))
      ) {
        return null;
      }
      return {
        row,
        route: `/api/v1/leaves/mine/${row.id}/cancellations`,
        versionName: 'expectedApprovalVersion',
      };
    }
    if (!isPending(row.state)) {
      return null;
    }
    if (service === 'resignation' && row.requestedStatus !== 'Resigned') {
      return null;
    }
    if (service === 'loans') {
      return {
        row,
        route: `/api/v1/me/advances-loans/requests/${row.id}/cancel`,
      };
    }
    const base = {
      resignation: '/api/v1/me/resignation',
      allowances: '/api/v1/me/allowances/claims',
      corrections: '/api/v1/me/attendance/corrections',
      overtime: '/api/v1/me/overtime/requests',
    }[service as 'resignation' | 'allowances' | 'corrections' | 'overtime'];
    return base
      ? {
          row,
          route: `${base}/${row.id}/cancel`,
          versionName: 'expectedVersion',
        }
      : null;
  };
  const confirm = async (value: string) => {
    if (!cancel) {
      return;
    }
    const body: DataRecord = { reason: reason(value) };
    if (cancel.versionName) {
      const version = cancel.row.version ?? cancel.row.approvalVersion;
      if (typeof version !== 'string') {
        throw new AppError('invalid_server_response');
      }
      body[cancel.versionName] = version;
    }
    await mutation.submit(
      service,
      service === 'leaves'
        ? t('Leave cancellation request')
        : t('Cancel own request'),
      cancel.route,
      body,
    );
  };
  const markRead = async (row: DataRecord) => {
    if (reading) {
      return;
    }
    setReading(text(row.id, ''));
    setError('');
    try {
      await selfService.readNotification(
        text(row.id, ''),
        text(row.version, ''),
      );
      await data.reload();
    } catch (failure) {
      setError(describeError(failure));
    } finally {
      setReading('');
    }
  };
  const agreement = async (id: unknown) => {
    if (!isGuid(id) || detailBusy) return;
    setDetailBusy(true);
    setError('');
    const current = ++detailEpoch.current;
    try {
      const value = record(
        await session.request(`/api/v1/me/advances-loans/agreements/${id}`),
      );
      if (current === detailEpoch.current) setExpanded(value);
    } catch (failure) {
      if (current === detailEpoch.current) setError(describeError(failure));
    } finally {
      if (current === detailEpoch.current) setDetailBusy(false);
    }
  };
  const detail = async (row: DataRecord) => {
    if (!isGuid(row.id) || detailBusy) return;
    const bases: Partial<Record<ServiceKey, string>> = {
      leaves: '/api/v1/leaves/mine',
      corrections: '/api/v1/me/attendance/corrections',
      allowances: '/api/v1/me/allowances/claims',
      overtime: '/api/v1/me/overtime/requests',
    };
    const base = bases[service];
    if (!base) return;
    setDetailBusy(true);
    setError('');
    const current = ++detailEpoch.current;
    try {
      const value = record(await session.request(`${base}/${row.id}`));
      if (current === detailEpoch.current) setExpanded(value);
    } catch (failure) {
      if (current === detailEpoch.current) setError(describeError(failure));
    } finally {
      if (current === detailEpoch.current) setDetailBusy(false);
    }
  };
  const more = () => {
    if (!root) {
      return false;
    }
    if (service === 'overtime') {
      return typeof root.nextCursor === 'string' && root.nextCursor.length > 0;
    }
    if (service === 'vehicles') {
      return ['trips', 'fuelClaims', 'maintenance', 'incidents'].some(
        key => root[key] && record(root[key]).hasMore === true,
      );
    }
    if (service === 'loans') {
      return ['requestHistory', 'agreementHistory'].some(
        key => root[key] && record(root[key]).hasMore === true,
      );
    }
    const page =
      service === 'resignation' && root.requests ? record(root.requests) : root;
    return (
      page.hasMore === true ||
      (numeric(page.totalCount) !== null &&
        query.page * 20 < Number(page.totalCount))
    );
  };
  const title = (row: DataRecord) =>
    service === 'leaves'
      ? text(row.typeName, t('Leave request'))
      : service === 'vehicles'
      ? text(row.title)
      : service === 'notifications'
      ? text(row.title)
      : service === 'calendar'
      ? text(row.date ?? row.businessDate)
      : service === 'payroll'
      ? text(row.batchReference, t('Payroll summary'))
      : service === 'punches'
      ? row.action === 'CheckIn'
        ? t('Check In')
        : row.action === 'CheckOut'
        ? t('Check Out')
        : t('Attendance receipt')
      : service === 'loans'
      ? row.recordKind === 'agreement'
        ? row.kind === 1
          ? t('Advance agreement')
          : t('Loan agreement')
        : row.kind === 1
        ? t('Salary advance')
        : t('Loan request')
      : service === 'resignation'
      ? t('{0} employment request', status(row.requestedStatus))
      : service === 'encashment'
      ? t('Leave encashment')
      : service === 'overtime'
      ? t('Overtime request')
      : service === 'corrections'
      ? status(row.kind)
      : allowanceTitle(row.kind);
  if (service === 'requests') {
    return (
      <RequestOverview
        root={root}
        loading={data.loading}
        error={data.error}
        reload={data.reload}
      />
    );
  }
  return (
    <Screen white={attendanceHistory} includeTopInset={attendanceHistory}>
      {attendanceHistory ? (
        <AttendanceHistoryHeader
          range={query}
          categories={header}
          busy={data.loading}
          count={root ? numeric(root.totalCount) ?? rows.length : null}
          onRefresh={refresh}
          onApply={range => {
            clearDetails();
            setQuery(current => ({ ...current, ...range, page: 1 }));
          }}
        />
      ) : (
        header
      )}
      {!attendanceHistory && !header && service !== 'profile' ? (
        <View style={styles.serviceHeaderCard}>
          <View style={styles.serviceHeaderRow}>
            <View style={styles.serviceHeaderIcon}>
              <Text style={styles.serviceHeaderIconText}>
                {service === 'notifications'
                  ? '🔔'
                  : service === 'leaves'
                  ? '🌴'
                  : service === 'loans'
                  ? '💰'
                  : service === 'allowances'
                  ? '🏷️'
                  : service === 'overtime'
                  ? '⏱️'
                  : service === 'corrections'
                  ? '📝'
                  : service === 'vehicles'
                  ? '🚗'
                  : service === 'shift'
                  ? '📅'
                  : '📋'}
              </Text>
            </View>
            <View style={styles.serviceHeaderTextWrap}>
              <Text style={styles.serviceHeaderTitle}>
                {serviceTitle(service)}
              </Text>
              <Text style={styles.serviceHeaderSubtext}>
                {service === 'notifications'
                  ? t('Updates, approvals, and company announcements.')
                  : service === 'payments'
                  ? t('Salary payments and compensation disbursement records.')
                  : service === 'leaves'
                  ? t('Leave applications, balances, and scheduled days.')
                  : service === 'loans'
                  ? t('Salary advances and active loan repayment agreements.')
                  : service === 'allowances'
                  ? t('Meal, travel, and outstation claims.')
                  : service === 'overtime'
                  ? t('Logged overtime duty and approval status.')
                  : service === 'corrections'
                  ? t('Attendance punch reviews and adjustment requests.')
                  : service === 'vehicles'
                  ? t('Vehicle custody, mileage trips, and fuel claims.')
                  : service === 'punches'
                  ? t('Check In and Check Out receipts recorded by server.')
                  : t('Verified company records and activity history.')}
              </Text>
            </View>
          </View>
        </View>
      ) : !attendanceHistory && header && service !== 'profile' ? (
        <>
          <Text style={layout.heading}>{serviceTitle(service)}</Text>
          <Text style={layout.muted}>
            {service === 'payments'
              ? t(
                  'Your salary payments by payroll period. Only confirmed payments count as paid. Turn the page for earlier periods.',
                )
              : readOnly
              ? service === 'punches'
                ? t(
                    'Check In and Check Out times show when the server recorded each receipt, in Asia/Karachi. Change the dates to view older records.',
                  )
                : t(
                    'Your own company records. Select a date range or turn the page to see older records.',
                  )
              : t(
                  'Your company records. Only actions available to your account can be submitted.',
                )}
          </Text>
        </>
      ) : null}
      {!attendanceHistory &&
      (ranged.has(service) || service === 'shift' || service === 'calendar') ? (
        <View style={styles.filterCard}>
          <View style={styles.filterHeader}>
            <Text style={styles.filterTitle}>{t('Date filter')}</Text>
          </View>
          {ranged.has(service) ? (
            <View style={styles.dateRangeRow}>
              <View style={styles.dateRangeCol}>
                <DateField label={t('From')} value={from} onChange={setFrom} />
              </View>
              <View style={styles.dateRangeCol}>
                <DateField
                  label={t('To · inclusive')}
                  value={to}
                  onChange={setTo}
                />
              </View>
            </View>
          ) : service === 'shift' ? (
            <DateField
              label={t('Business date')}
              value={date}
              onChange={setDate}
            />
          ) : (
            <View style={styles.dateRangeRow}>
              <View style={styles.dateRangeCol}>
                <Field
                  label={t('Year')}
                  value={year}
                  onChangeText={setYear}
                  keyboardType="number-pad"
                  maxLength={4}
                />
              </View>
              <View style={styles.dateRangeCol}>
                <Field
                  label={t('Month · 1 to 12')}
                  value={month}
                  onChangeText={setMonth}
                  keyboardType="number-pad"
                  maxLength={2}
                />
              </View>
            </View>
          )}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('Apply filter')}
            disabled={mutation.busy || data.loading}
            onPress={filter}
            style={({ pressed }) => [
              styles.applyFilterBtn,
              pressed && styles.applyFilterPressed,
              (mutation.busy || data.loading) && styles.applyFilterDisabled,
            ]}
          >
            <Text style={styles.applyFilterText}>
              {mutation.busy || data.loading
                ? t('Filtering…')
                : t('Apply filter')}
            </Text>
          </Pressable>
        </View>
      ) : null}
      {service === 'leaves' && !leaveScheduleAccess ? (
        <Notice
          tone="info"
          message={t(
            'Your leave history is available. Ask HR to enable your own roster access before applying through the app.',
          )}
        />
      ) : null}
      {!readOnly &&
        actions[service]?.map(action => (
          <Button
            key={action.kind}
            title={action.title}
            disabled={
              mutation.busy ||
              !!mutation.pending ||
              (action.kind === 'leave' && !leaveScheduleAccess)
            }
            onPress={() => onRequest?.(action.kind)}
          />
        ))}
      {readOnly ? (
        error ? (
          <Notice message={error} />
        ) : null
      ) : (
        <RequestFeedback
          error={mutation.error || error}
          receipt={mutation.receipt}
          pending={mutation.pending}
          busy={mutation.busy}
          onRetry={mutation.retry}
        />
      )}
      {data.error ? <Notice message={data.error} /> : null}
      {data.loading ? (
        <View style={layout.card}>
          <LoadingSkeleton
            kind={
              service === 'profile' ||
              service === 'finances' ||
              service === 'shift'
                ? 'card'
                : 'list'
            }
          />
        </View>
      ) : null}
      {root ? <ServiceSummary service={service} root={root} /> : null}
      {service === 'leaves' ? (
        <>
          <Button
            title={
              showBalance
                ? t('Hide detailed balance')
                : t('View detailed leave balance')
            }
            secondary
            onPress={() => setShowBalance(value => !value)}
          />
          {showBalance ? <LeaveBalancePanel /> : null}
        </>
      ) : null}
      {service === 'finances' && onHistory ? (
        <Button
          title={t('View full payroll history')}
          secondary
          onPress={() => onHistory?.('payroll')}
        />
      ) : null}
      {service === 'payroll' ? (
        <Notice
          tone="info"
          message={t(
            "These are your company's recorded payroll handoff summaries. A payable amount or prepared batch does not confirm payment. Contact Accounts for payment confirmation.",
          )}
        />
      ) : null}
      {service === 'loans' && root && Array.isArray(root.activeAgreements) ? (
        <View style={layout.card}>
          <Text style={layout.heading}>{t('Repayment agreements')}</Text>
          {records(root.activeAgreements).map((row, index) => (
            <View key={index} style={layout.stack8}>
              <InfoRow
                label={t('Agreement balance')}
                value={amount(
                  row.outstandingBalance ?? row.remainingBalance,
                  row.currency,
                )}
              />
              <Button
                title={t('View repayment schedule & ledger')}
                secondary
                busy={detailBusy}
                onPress={() => agreement(row.id ?? row.agreementId)}
              />
            </View>
          ))}
          {!records(root.activeAgreements).length ? (
            <Text style={layout.muted}>{t('No active agreements.')}</Text>
          ) : null}
        </View>
      ) : null}
      {detailBusy ? (
        <View style={layout.card}>
          <LoadingSkeleton />
        </View>
      ) : expanded ? (
        <DetailPanel
          service={service}
          detail={expanded}
          onClose={() => clearDetails()}
        />
      ) : null}
      {service === 'loans' && rows.length > 0 ? (
        <Text style={layout.heading}>{t('Request & agreement history')}</Text>
      ) : null}
      {rows.map((row, index) => {
        if (service === 'payments') {
          return <PaymentHistoryCard key={text(row.batchId)} initial={row} />;
        }
        const action = readOnly ? null : cancellation(row);
        const displayRow =
          service === 'calendar'
            ? { ...row, status: row.factualStatus }
            : service === 'punches'
            ? { ...row, state: outcomeLabel(text(row.outcome, '')) }
            : service === 'notifications'
            ? { ...row, state: row.readAt ? t('Read') : t('Unread') }
            : row;
        return (
          <RecordCard
            key={text(row.id ?? row.date ?? row.businessDate, String(index))}
            row={displayRow}
            title={title(row)}
          >
            {service === 'notifications' ? (
              <>
                <Text style={layout.body}>{text(row.body)}</Text>
                <InfoRow label={t('Received')} value={text(row.createdAt)} />
                {row.readAt ? (
                  <InfoRow label={t('Read')} value={text(row.readAt)} />
                ) : (
                  <Button
                    title={t('Mark as read')}
                    secondary
                    disabled={!!reading}
                    busy={reading === row.id}
                    onPress={() => markRead(row)}
                  />
                )}
              </>
            ) : (
              <>
                {service === 'leaves' ? (
                  <>
                    <InfoRow
                      label={t('Dates')}
                      value={`${text(row.startDate)} – ${text(row.endDate)}`}
                    />
                    <InfoRow
                      label={t('Requested minutes')}
                      value={String(
                        numeric(row.requestedMinutes) ?? t('Unavailable'),
                      )}
                    />
                  </>
                ) : null}
                {service === 'payroll' ? (
                  <>
                    <InfoRow
                      label={t('Period')}
                      value={`${text(row.periodStart)} – ${text(
                        row.periodEnd,
                      )}`}
                    />
                    <InfoRow
                      label={t('Recorded earnings')}
                      value={amount(row.totalEarnings, row.currency)}
                    />
                    <InfoRow
                      label={t('Recorded deductions')}
                      value={amount(row.totalDeductions, row.currency)}
                    />
                    <InfoRow
                      label={t('Net payable')}
                      value={amount(row.netPayable, row.currency)}
                    />
                    <InfoRow
                      label={t('Prepared · Asia/Karachi')}
                      value={localTime(
                        text(row.preparedAt, ''),
                        'Asia/Karachi',
                      )}
                    />
                  </>
                ) : null}
                {service === 'punches' ? (
                  <>
                    <InfoRow
                      label={t('Business date')}
                      value={text(row.businessDate)}
                    />
                    <InfoRow
                      label={t('Recorded · Asia/Karachi')}
                      value={fullLocalTime(
                        text(row.receivedAtUtc, ''),
                        'Asia/Karachi',
                      )}
                    />
                    <InfoRow
                      label={t('Server result')}
                      value={outcomeLabel(text(row.outcome, ''))}
                    />
                    {row.outcome !== 'Accepted' ? (
                      <Text style={layout.muted}>
                        {t(
                          'This receipt does not confirm ordinary accepted attendance. Contact your supervisor if review is needed.',
                        )}
                      </Text>
                    ) : null}
                  </>
                ) : null}
                {service === 'loans' ? (
                  <>
                    <InfoRow
                      label={
                        row.recordKind === 'agreement'
                          ? t('Approved principal')
                          : t('Requested amount')
                      }
                      value={amount(
                        row.recordKind === 'agreement'
                          ? row.approvedPrincipal
                          : row.requestedAmount,
                        row.currency,
                      )}
                    />
                    <InfoRow
                      label={
                        row.recordKind === 'agreement'
                          ? t('Effective on')
                          : t('Requested on')
                      }
                      value={text(row.requestedOn ?? row.effectiveOn)}
                    />
                    {row.recordKind === 'agreement' ? (
                      <>
                        <InfoRow
                          label={t('Recorded repayments')}
                          value={amount(row.totalRepaid, row.currency)}
                        />
                        <InfoRow
                          label={t('Outstanding balance')}
                          value={amount(row.outstandingBalance, row.currency)}
                        />
                        <Button
                          title={t('View agreement schedule & ledger')}
                          secondary
                          busy={detailBusy}
                          onPress={() => agreement(row.id)}
                        />
                      </>
                    ) : null}
                    {isGuid(row.agreementId) ? (
                      <Button
                        title={t('View repayment details')}
                        secondary
                        busy={detailBusy}
                        onPress={() => agreement(row.agreementId)}
                      />
                    ) : null}
                  </>
                ) : null}
                {service === 'resignation' ? (
                  <InfoRow
                    label={t('Requested effective time')}
                    value={text(row.requestedEffectiveAt)}
                  />
                ) : null}
                {['allowances', 'encashment'].includes(service) ? (
                  <>
                    {service === 'allowances' ? (
                      <InfoRow
                        label={t('Payable date')}
                        value={text(row.payableDate)}
                      />
                    ) : (
                      <InfoRow
                        label={t('Requested minutes')}
                        value={String(
                          numeric(row.requestedMinutes) ?? t('Unavailable'),
                        )}
                      />
                    )}
                    <InfoRow
                      label={
                        service === 'encashment'
                          ? t('Proposed valuation')
                          : t('Claimed amount')
                      }
                      value={amount(
                        row.claimedAmount ?? row.proposedAmount,
                        row.currency,
                      )}
                    />
                    {row.settlementState ? (
                      <InfoRow
                        label={t('Settlement')}
                        value={status(row.settlementState)}
                      />
                    ) : null}
                  </>
                ) : null}
                {service === 'vehicles' ? (
                  <>
                    <InfoRow label={t('Recorded')} value={text(row.atUtc)} />
                    {row.registrationNumber ? (
                      <InfoRow
                        label={t('Vehicle')}
                        value={text(row.registrationNumber)}
                      />
                    ) : null}
                    {row.amount !== null && row.amount !== undefined ? (
                      <InfoRow
                        label={t('Claimed')}
                        value={amount(row.amount, row.currency)}
                      />
                    ) : null}
                  </>
                ) : null}
                {service === 'overtime' ? (
                  <>
                    <InfoRow
                      label={t('Duty date')}
                      value={text(row.businessDate)}
                    />
                    <InfoRow
                      label={t('Requested minutes')}
                      value={String(
                        numeric(row.requestedMinutes) ?? t('Unavailable'),
                      )}
                    />
                    <InfoRow
                      label={t('Approved minutes')}
                      value={String(
                        numeric(row.approvedMinutes) ?? t('Awaiting decision'),
                      )}
                    />
                    <InfoRow
                      label={t('Financial evaluation')}
                      value={status(row.financialState)}
                    />
                  </>
                ) : null}
                {service === 'corrections' ? (
                  <>
                    <InfoRow
                      label={t('Duty date')}
                      value={text(row.businessDate)}
                    />
                    <InfoRow
                      label={t('Attendance effect')}
                      value={
                        row.changesAttendance === true
                          ? t('Approved revision applied')
                          : t('No applied attendance change')
                      }
                    />
                  </>
                ) : null}
                {service === 'calendar' ? (
                  <>
                    <InfoRow
                      label={t('Factual status')}
                      value={status(row.factualStatus)}
                    />
                    <InfoRow
                      label={t('Worked minutes')}
                      value={String(
                        numeric(
                          row.facts ? record(row.facts).workedMinutes : null,
                        ) ?? t('Unavailable'),
                      )}
                    />
                    <InfoRow
                      label={t('Company assessment')}
                      value={
                        row.policy
                          ? attendanceDay(record(row.policy).dayStatus)
                          : t('Unavailable')
                      }
                    />
                  </>
                ) : null}
                {typeof row.reason === 'string' ? (
                  <Text style={layout.body}>{row.reason}</Text>
                ) : null}
                {['leaves', 'corrections', 'allowances', 'overtime'].includes(
                  service,
                ) ? (
                  <Button
                    title={t('View request details')}
                    secondary
                    busy={detailBusy}
                    onPress={() => detail(row)}
                  />
                ) : null}
                {!readOnly &&
                service === 'leaves' &&
                (row.state === 2 || row.state === 'Returned') &&
                !row.supersededByRequestId ? (
                  <Button
                    title={t('Revise & resubmit')}
                    secondary
                    disabled={
                      mutation.busy ||
                      !!mutation.pending ||
                      !leaveScheduleAccess
                    }
                    onPress={() => onRequest?.('leave', text(row.id, ''))}
                  />
                ) : null}
                {action ? (
                  <Button
                    title={
                      service === 'leaves'
                        ? t('Request cancellation')
                        : t('Cancel pending request')
                    }
                    secondary
                    disabled={mutation.busy || !!mutation.pending}
                    onPress={() => setCancel(action)}
                  />
                ) : null}
              </>
            )}
          </RecordCard>
        );
      })}
      {data.data &&
      rows.length === 0 &&
      !['profile', 'finances', 'requests', 'shift'].includes(service) ? (
        attendanceHistory ? (
          <EmptyAttendanceHistory />
        ) : (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconCircle}>
              <Text style={styles.emptyIconText}>
                {service === 'notifications' ? '🔔' : '📋'}
              </Text>
            </View>
            <Text style={styles.emptyTitle}>
              {service === 'notifications'
                ? t('Inbox is clear')
                : t('No records found')}
            </Text>
            <Text style={styles.emptySubtitle}>
              {service === 'notifications'
                ? t(
                    "You're all caught up! New alerts, company notices, and approvals will appear here.",
                  )
                : ranged.has(service)
                ? t(
                    'No entries recorded for the selected date range. Try adjusting your dates or check back later.',
                  )
                : t(
                    'No recorded entries are currently available for this section.',
                  )}
            </Text>
          </View>
        )
      ) : null}
      {paged.has(service) &&
      root &&
      rows.length > 0 &&
      (query.page > 1 || more()) ? (
        <View style={styles.paginationCard}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('Previous page')}
            disabled={query.page === 1 || data.loading || mutation.busy}
            onPress={() => {
              clearDetails();
              setQuery(current => ({
                ...current,
                page: service === 'overtime' ? 1 : current.page - 1,
                cursor: undefined,
              }));
            }}
            style={({ pressed }) => [
              styles.pageBtn,
              query.page === 1 && styles.pageBtnDisabled,
              pressed && styles.pageBtnPressed,
            ]}
          >
            <Text
              style={[
                styles.pageBtnText,
                query.page === 1 && styles.pageBtnTextDisabled,
              ]}
            >
              ‹ {service === 'overtime' ? t('First page') : t('Previous')}
            </Text>
          </Pressable>
          <View style={styles.pageBadge}>
            <Text style={styles.pageBadgeText}>
              {t('Page')} {query.page}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('Next page')}
            disabled={!more() || data.loading || mutation.busy}
            onPress={() => {
              clearDetails();
              setQuery(current => ({
                ...current,
                page: current.page + 1,
                cursor:
                  service === 'overtime'
                    ? text(root.nextCursor, '')
                    : undefined,
              }));
            }}
            style={({ pressed }) => [
              styles.pageBtn,
              !more() && styles.pageBtnDisabled,
              pressed && styles.pageBtnPressed,
            ]}
          >
            <Text
              style={[
                styles.pageBtnText,
                !more() && styles.pageBtnTextDisabled,
              ]}
            >
              {t('Next')} ›
            </Text>
          </Pressable>
        </View>
      ) : null}
      {!attendanceHistory && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('Refresh records')}
          disabled={data.loading || mutation.busy}
          onPress={refresh}
          style={({ pressed }) => [
            styles.refreshBtn,
            pressed && styles.refreshBtnPressed,
            (data.loading || mutation.busy) && styles.refreshBtnDisabled,
          ]}
        >
          {data.loading ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Text style={styles.refreshBtnText}>↻ {t('Refresh records')}</Text>
          )}
        </Pressable>
      )}
      <ReasonSheet
        title={
          service === 'leaves'
            ? t('Request leave cancellation')
            : t('Cancel your pending request')
        }
        visible={!!cancel}
        busy={mutation.busy}
        onClose={() => setCancel(null)}
        onConfirm={confirm}
      />
    </Screen>
  );
}

function DetailPanel({
  service,
  detail,
  onClose,
}: {
  service: ServiceKey;
  detail: DataRecord;
  onClose(): void;
}): React.JSX.Element {
  useLanguage();
  const row = detail.request
    ? record(detail.request)
    : detail.claim
    ? record(detail.claim)
    : detail;
  return (
    <View style={layout.card}>
      <Text style={layout.heading}>{t('Record details')}</Text>
      {typeof row.reason === 'string' ? (
        <InfoRow label={t('Reason')} value={row.reason} />
      ) : null}
      {typeof detail.writtenEvidence === 'string' ? (
        <InfoRow label={t('Written evidence')} value={detail.writtenEvidence} />
      ) : null}
      {service === 'loans' ? (
        <>
          <InfoRow
            label={t('Approved principal')}
            value={amount(detail.approvedPrincipal, detail.currency)}
          />
          <InfoRow
            label={t('Outstanding balance')}
            value={amount(detail.outstandingBalance, detail.currency)}
          />
          <Text style={layout.label}>{t('Repayment schedule')}</Text>
          {Array.isArray(detail.schedule)
            ? records(detail.schedule).map((entry, index) => (
                <InfoRow
                  key={index}
                  label={`${text(entry.dueDate)} · ${
                    entry.isSettled === true ? 'Settled' : 'Unsettled'
                  }`}
                  value={t(
                    '{0} · recorded paid {1}',
                    amount(entry.totalDue, entry.currency),
                    amount(entry.paidAmount, entry.currency),
                  )}
                />
              ))
            : null}
          <Text style={layout.label}>{t('Ledger')}</Text>
          {Array.isArray(detail.ledger)
            ? records(detail.ledger).map((entry, index) => (
                <InfoRow
                  key={index}
                  label={text(entry.valueDate)}
                  value={amount(entry.amount, entry.currency)}
                />
              ))
            : null}
        </>
      ) : null}
      {service === 'leaves' ? (
        <>
          <InfoRow
            label={t('Leave treatment')}
            value={
              row.treatment === 1
                ? t('Paid')
                : row.treatment === 2
                ? t('Unpaid')
                : row.treatment === 3
                ? t('Does not reduce regular leave')
                : t('Awaiting company decision')
            }
          />
          {Array.isArray(row.days)
            ? records(row.days).map((entry, index) => (
                <InfoRow
                  key={index}
                  label={text(entry.date)}
                  value={`${text(entry.startsAtUtc)} → ${text(
                    entry.endsAtUtc,
                  )}`}
                />
              ))
            : null}
          {Array.isArray(row.cancellations)
            ? records(row.cancellations).map((entry, index) => (
                <InfoRow
                  key={index}
                  label={t('Cancellation request')}
                  value={`${status(entry.state)} · ${text(entry.reason)}`}
                />
              ))
            : null}
        </>
      ) : null}
      {service === 'overtime' ? (
        <InfoRow
          label={t('Requested interval')}
          value={`${text(row.startsAtUtc)} → ${text(row.endsAtUtc)}`}
        />
      ) : null}
      {service === 'corrections' ? (
        <>
          <InfoRow
            label={t('Requested time')}
            value={text(row.requestedTimeUtc)}
          />
          <InfoRow
            label={t('Requested end')}
            value={text(row.requestedEndUtc, t('Not requested'))}
          />
        </>
      ) : null}
      {Array.isArray(row.decisions)
        ? records(row.decisions).map((entry, index) => (
            <InfoRow
              key={index}
              label={status(entry.decision ?? entry.state)}
              value={text(entry.reason)}
            />
          ))
        : null}
      <Button title={t('Close details')} secondary onPress={onClose} />
    </View>
  );
}

function attendanceDay(value: unknown): string {
  const names = [
    '',
    t('Unverified'),
    t('Present'),
    t('Absent'),
    t('Half day'),
    t('Hourly'),
    t('Leave'),
    t('Holiday'),
    t('Rest day'),
    t('Incomplete'),
  ];
  return typeof value === 'number' &&
    Number.isInteger(value) &&
    value > 0 &&
    value < names.length
    ? names[value]
    : t('Unavailable');
}

const styles = StyleSheet.create({
  serviceHeaderCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 14,
    marginBottom: 2,
  },
  serviceHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  serviceHeaderIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#DFEBF8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  serviceHeaderIconText: {
    fontSize: 20,
  },
  serviceHeaderTextWrap: {
    flex: 1,
    gap: 3,
  },
  serviceHeaderTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.navy,
    letterSpacing: -0.3,
  },
  serviceHeaderSubtext: {
    fontSize: 12,
    color: colors.muted,
    lineHeight: 16,
  },
  filterCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 12,
    gap: 10,
  },
  filterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  filterTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.navy,
  },
  dateRangeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  dateRangeCol: {
    flex: 1,
  },
  applyFilterBtn: {
    height: 38,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyFilterPressed: {
    opacity: 0.85,
  },
  applyFilterDisabled: {
    opacity: 0.5,
  },
  applyFilterText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '600',
  },
  emptyCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    paddingVertical: 32,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIconText: {
    fontSize: 20,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.navy,
  },
  emptySubtitle: {
    fontSize: 12,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 280,
  },
  paginationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 6,
    gap: 8,
  },
  pageBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  pageBtnPressed: {
    opacity: 0.7,
  },
  pageBtnDisabled: {
    opacity: 0.4,
  },
  pageBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.navy,
  },
  pageBtnTextDisabled: {
    color: colors.muted,
  },
  pageBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
  },
  pageBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.navy,
  },
  refreshBtn: {
    height: 38,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  refreshBtnPressed: {
    backgroundColor: '#F8FAFC',
    opacity: 0.8,
  },
  refreshBtnDisabled: {
    opacity: 0.5,
  },
  refreshBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
});
