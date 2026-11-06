import { LoadingSkeleton } from '../ui/LoadingSkeleton';
import { t } from '../../i18n/language';
import { useLanguage } from '../../i18n/preference';
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useServices } from '../../app/AppProvider';
import { Button, Field, Notice } from '../Controls';
import { ChoiceField } from '../ServiceControls';
import {
  LeaveBanner,
  LeaveDateField,
  LeaveTypeField,
} from './LeaveFormPresentation';
import { LeaveEntitlementCard } from './LeaveEntitlementCard';
import { SubmissionFrame } from './SubmissionFrame';
import { EvidencePicker } from '../../services/documents/EvidencePicker';
import type { DataRecord, SelectedEvidence } from '../../types/selfService';
import { layout } from '../../theme/theme';
import { AppError, describeError } from '../../utils/errors';
import {
  businessToday,
  companyInstant,
  dateRange,
  reason,
  record,
  records,
  text,
} from '../../utils/serviceValues';
import { isGuid, isTimestamp } from '../../utils/validation';
import { localTime } from '../../utils/presentation';

const evidenceKinds = [
  {
    value: '1',
    get label() {
      return t('Medical');
    },
  },
  {
    value: '2',
    get label() {
      return t('Admit card');
    },
  },
  {
    value: '3',
    get label() {
      return t('Date sheet');
    },
  },
  {
    value: '4',
    get label() {
      return t('Emergency');
    },
  },
  {
    value: '5',
    get label() {
      return t('Injury medical');
    },
  },
  {
    value: '6',
    get label() {
      return t('Other');
    },
  },
];

export function LeaveRequestForm({
  previousRequestId,
}: {
  previousRequestId?: string;
}): React.JSX.Element {
  useLanguage();
  const { session } = useServices();
  const navigation = useNavigation();
  useLayoutEffect(() => {
    navigation.setOptions({
      title: t('Apply Leave'),
      headerTitleAlign: 'center',
    });
  }, [navigation]);
  const [types, setTypes] = useState<DataRecord[]>([]);
  const [typesFailure, setTypesFailure] = useState('');
  const [loadingTypes, setLoadingTypes] = useState(true);
  const [typesAttempt, retryTypes] = useState(0);
  const [typeId, setTypeId] = useState('');
  const [from, setFrom] = useState(businessToday);
  const [to, setTo] = useState(businessToday);
  const [mode, setMode] = useState('full');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [endDate, setEndDate] = useState(businessToday);
  const [note, setNote] = useState('');
  const [more, setMore] = useState(false);
  const [contact, setContact] = useState('');
  const [handover, setHandover] = useState('');
  const [files, setFiles] = useState<SelectedEvidence[]>([]);
  const filesRef = useRef(files);
  filesRef.current = files;
  const [picker] = useState(() => new EvidencePicker());
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [previousReady, setPreviousReady] = useState(!previousRequestId);
  const mounted = useRef(true);
  useEffect(() => {
    let active = true;
    setTypesFailure('');
    setLoadingTypes(true);
    session
      .request('/api/v1/leaves/mine/types')
      .then(value => {
        if (active) {
          const activeTypes = records(value).filter(
            item => item.isActive === true && isGuid(item.id),
          );
          setTypes(activeTypes);
          if (!previousRequestId && activeTypes.length === 1)
            setTypeId(text(activeTypes[0].id, ''));
        }
      })
      .catch(failure => {
        if (active) {
          setTypesFailure(
            failure instanceof AppError && failure.status === 404
              ? t(
                  'Leave types are unavailable on the connected server. Contact HR if this continues.',
                )
              : describeError(failure),
          );
        }
      })
      .finally(() => {
        if (active) setLoadingTypes(false);
      });
    return () => {
      active = false;
    };
  }, [session, previousRequestId, typesAttempt]);
  useEffect(() => {
    let active = true;
    mounted.current = true;
    if (previousRequestId) {
      session
        .request(`/api/v1/leaves/mine/${previousRequestId}`)
        .then(value => {
          const row = record(value);
          if (row.state !== 2 && row.state !== 'Returned') {
            throw new AppError('request_source_changed');
          }
          if (active) {
            setTypeId(text(row.leaveTypeId, ''));
            setFrom(text(row.startDate, businessToday()));
            setTo(text(row.endDate, businessToday()));
            setNote(text(row.reason, ''));
            setPreviousReady(true);
          }
        })
        .catch(failure => {
          if (active) {
            setError(describeError(failure));
          }
        });
    }
    return () => {
      active = false;
      mounted.current = false;
      picker.remove(filesRef.current).catch(() => undefined);
    };
  }, [session, picker, previousRequestId]);
  const selectEvidence = async () => {
    setLoading(true);
    setError('');
    try {
      const selected = await picker.select();
      if (!mounted.current) {
        await picker.remove(selected);
        return;
      }
      await picker.remove(filesRef.current);
      filesRef.current = selected;
      setFiles(selected);
    } catch (failure) {
      if (mounted.current) {
        setError(describeError(failure));
      }
    } finally {
      if (mounted.current) {
        setLoading(false);
      }
    }
  };
  const type = types.find(item => item.id === typeId);
  const lastDate = mode === 'full' ? to : from;
  let calendarDays: number | null = null;
  try {
    calendarDays = dateRange(from, lastDate).length;
  } catch {
    /* The existing review step validates the date range before submission. */
  }
  const requiredEvidence =
    type?.kind === 1
      ? [1]
      : type?.kind === 3
      ? [2, 3]
      : type?.kind === 5
      ? [5]
      : [];
  const revision = JSON.stringify([
    typeId,
    from,
    to,
    mode,
    start,
    end,
    endDate,
    note,
    contact,
    handover,
    files.map(file => [file.id, file.kind]),
    previousReady,
  ]);
  return (
    <SubmissionFrame
      service="leaves"
      title={
        previousRequestId ? t('Resubmit returned leave') : t('Apply Leave')
      }
      intro={previousRequestId ? undefined : <LeaveBanner />}
      route="/api/v1/leaves/mine"
      revision={revision}
      ready={previousReady && !!type && !loading}
      description={t(
        'Review your scheduled time before sending your request to HR.',
      )}
      onSubmitted={async () => {
        await picker.remove(filesRef.current);
        setFiles([]);
      }}
      build={async () => {
        if (!type || !isGuid(typeId) || !previousReady) {
          throw new AppError('invalid_leave_type');
        }
        const cleanReason = reason(note);
        const dates = dateRange(from, mode === 'full' ? to : from);
        const attachments = await picker.attachments(files);
        if (
          (type.requiresEvidence === true && attachments.length === 0) ||
          requiredEvidence.some(
            kind => !attachments.some(file => file.kind === kind),
          ) ||
          new Set(attachments.map(file => file.kind)).size !==
            attachments.length
        ) {
          throw new AppError('leave_evidence_required');
        }
        const days: { date: string; startsAtUtc: string; endsAtUtc: string }[] =
          [];
        const skipped: string[] = [];
        // Bounded batches avoid opening hundreds of parallel schedule requests.
        for (let offset = 0; offset < dates.length; offset += 4) {
          const batch = await Promise.all(
            dates.slice(offset, offset + 4).map(async date => ({
              date,
              shift: record(
                await session.request(`/api/v1/me/shift?businessDate=${date}`),
              ),
            })),
          );
          for (const { date, shift } of batch) {
            if (shift.timeZone !== 'Asia/Karachi') {
              throw new AppError('leave_schedule_unavailable');
            }
            if (mode === 'full' && shift.status === 'rest_day') {
              skipped.push(date);
              continue;
            }
            if (
              shift.status !== 'scheduled' ||
              !isTimestamp(shift.startsAt) ||
              !isTimestamp(shift.endsAt)
            ) {
              throw new AppError('leave_schedule_unavailable');
            }
            const startsAtUtc =
              mode === 'full' ? shift.startsAt : companyInstant(from, start);
            const endsAtUtc =
              mode === 'full' ? shift.endsAt : companyInstant(endDate, end);
            if (
              Date.parse(endsAtUtc) <= Date.parse(startsAtUtc) ||
              Date.parse(startsAtUtc) < Date.parse(shift.startsAt) ||
              Date.parse(endsAtUtc) > Date.parse(shift.endsAt)
            ) {
              throw new AppError('leave_interval_outside_shift');
            }
            days.push({ date, startsAtUtc, endsAtUtc });
          }
        }
        if (days.length === 0) {
          throw new AppError('leave_schedule_unavailable');
        }
        const body = {
          leaveTypeId: typeId,
          days,
          reason: cleanReason,
          contactDuringLeave: contact.trim() || null,
          handoverNotes: handover.trim() || null,
          attachments: attachments.length ? attachments : undefined,
          previousRequestId: previousRequestId || undefined,
        };
        return {
          body,
          summary: [
            text(type.name),
            t(
              '{0} scheduled {1} requested',
              days.length,
              days.length === 1 ? 'day' : 'days',
            ),
            ...days.map(
              day =>
                `${day.date}: ${localTime(
                  day.startsAtUtc,
                  'Asia/Karachi',
                )} – ${localTime(day.endsAtUtc, 'Asia/Karachi')}`,
            ),
            ...(skipped.length
              ? [t('Rest days excluded: {0}', skipped.join(', '))]
              : []),
            cleanReason,
            t('{0} evidence document(s)', attachments.length),
          ],
        };
      }}
    >
      {disabled => (
        <>
          <LeaveEntitlementCard
            key={JSON.stringify([typeId, from, lastDate])}
            validRange={calendarDays !== null}
            typeId={typeId}
            from={from}
            to={lastDate}
            disabled={disabled}
          />
          {typesFailure ? (
            <>
              <Notice message={typesFailure} />
              <Button
                secondary
                title={t('Retry leave types')}
                disabled={disabled}
                onPress={() => retryTypes(n => n + 1)}
              />
            </>
          ) : null}
          {!loadingTypes && !typesFailure && types.length === 0 ? (
            <Notice
              tone="info"
              message={t(
                'No active leave types are available. Ask HR which leave policy applies to you.',
              )}
            />
          ) : null}
          {error ? <Notice message={error} /> : null}
          <View style={styles.form}>
            {loadingTypes ? (
              <LoadingSkeleton kind="field" label={t('Leave type')} />
            ) : (
              <LeaveTypeField
                value={typeId}
                onChange={setTypeId}
                disabled={disabled || loading || loadingTypes || !types.length}
                choices={types.map(item => ({
                  value: text(item.id, ''),
                  label: text(item.name),
                }))}
              />
            )}
            {type?.requiresEvidence === true || requiredEvidence.length > 0 ? (
              <Notice
                tone="info"
                message={
                  requiredEvidence.length
                    ? t(
                        'Required documents: {0}.',
                        requiredEvidence
                          .map(
                            kind =>
                              evidenceKinds.find(
                                item => item.value === String(kind),
                              )?.label,
                          )
                          .join(', '),
                      )
                    : t('Supporting evidence is required for this leave type.')
                }
              />
            ) : null}
            <ChoiceField
              label={t('Leave duration')}
              value={mode}
              onChange={setMode}
              disabled={disabled}
              choices={[
                { value: 'full', label: t('Full scheduled days') },
                { value: 'hourly', label: t('Part of one shift') },
              ]}
            />
            <View style={styles.dates}>
              <LeaveDateField
                label={t('From Date')}
                value={from}
                disabled={disabled}
                onChange={value => {
                  setFrom(value);
                  if (to < value) {
                    setTo(value);
                  }
                  setEndDate(value);
                }}
              />
              {mode === 'full' ? (
                <LeaveDateField
                  label={t('To Date')}
                  value={to}
                  min={from}
                  onChange={setTo}
                  disabled={disabled}
                />
              ) : null}
            </View>
            {mode !== 'full' && (
              <>
                <Field
                  label={t('Start time · company time (HH:mm)')}
                  value={start}
                  onChangeText={setStart}
                  maxLength={5}
                  editable={!disabled}
                />
                <LeaveDateField
                  label={t('End date')}
                  value={endDate}
                  min={from}
                  onChange={setEndDate}
                  disabled={disabled}
                />
                <Field
                  label={t('End time · company time (HH:mm)')}
                  value={end}
                  onChangeText={setEnd}
                  maxLength={5}
                  editable={!disabled}
                />
              </>
            )}
            <Text style={layout.label}>{t('Total Days')}</Text>
            <Text style={styles.total} accessibilityLiveRegion="polite">
              {calendarDays === null
                ? t('Choose a valid range of up to 366 days.')
                : mode === 'full'
                ? t(
                    '{0} calendar {1}',
                    calendarDays,
                    calendarDays === 1 ? 'day' : 'days',
                  )
                : t('Part of one scheduled shift')}
            </Text>
            {mode === 'full' && (
              <Text style={styles.hint}>
                {t('Rest days are excluded during schedule review.')}
              </Text>
            )}
            <Field
              label={t('Reason')}
              value={note}
              onChangeText={setNote}
              multiline
              placeholder={t('Enter your reason for leave…')}
              maxLength={1000}
              editable={!disabled}
            />
            <Text style={styles.counter}>{note.length}/1000</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded: more, disabled }}
              disabled={disabled}
              onPress={() => setMore(!more)}
              style={styles.more}
            >
              <Text style={styles.link}>
                {more ? t('Hide') : t('Add')}{' '}
                {t('contact and handover details')}
              </Text>
            </Pressable>
            {more && (
              <>
                <Field
                  label={t('Contact during leave · optional')}
                  value={contact}
                  onChangeText={setContact}
                  maxLength={200}
                  editable={!disabled}
                />
                <Field
                  label={t('Handover notes · optional')}
                  value={handover}
                  onChangeText={setHandover}
                  multiline
                  maxLength={2000}
                  editable={!disabled}
                />
              </>
            )}
          </View>
          <View style={layout.card}>
            <Text style={layout.heading}>{t('Evidence')}</Text>
            <Text style={layout.muted}>
              {t(
                'PNG, JPEG or PDF. Up to four documents, 10 MB each and 20 MB combined. Choose a distinct purpose for each document.',
              )}
            </Text>
            {files.map(file => (
              <View key={file.id} style={layout.stack8}>
                <Text style={layout.label}>
                  {file.name} · {(file.size / 1048576).toFixed(1)}MB
                </Text>
                <ChoiceField
                  label={t('Document purpose')}
                  value={String(file.kind)}
                  disabled={disabled}
                  choices={evidenceKinds}
                  onChange={value =>
                    setFiles(current =>
                      current.map(item =>
                        item.id === file.id
                          ? { ...item, kind: Number(value) }
                          : item,
                      ),
                    )
                  }
                />
              </View>
            ))}
            <Button
              title={
                files.length ? t('Replace evidence') : t('Choose evidence')
              }
              secondary
              busy={loading}
              disabled={disabled}
              onPress={() => selectEvidence()}
            />
            {files.length ? (
              <Button
                title={t('Remove evidence')}
                secondary
                disabled={disabled || loading}
                onPress={() =>
                  picker.remove(filesRef.current).then(() => setFiles([]))
                }
              />
            ) : null}
          </View>
        </>
      )}
    </SubmissionFrame>
  );
}

const styles = StyleSheet.create({
  form: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E0E6ED',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 9,
  },
  dates: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  total: {
    fontSize: 15,
    fontWeight: '700',
    color: '#16243C',
    backgroundColor: '#FFF7E3',
    padding: 11,
    borderRadius: 10,
  },
  hint: { fontSize: 12, color: '#52647A' },
  counter: { fontSize: 12, color: '#52647A', textAlign: 'right' },
  more: { minHeight: 38, justifyContent: 'center' },
  link: { color: '#164575', fontWeight: '600' },
});
