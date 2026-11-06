import { LoadingSkeleton } from '../ui/LoadingSkeleton';
import { t } from '../../i18n/language';
import { useLanguage } from '../../i18n/preference';
import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { useServices } from '../../app/AppProvider';
import { Button, Field, Notice } from '../Controls';
import { DateField, InfoRow } from '../ServiceControls';
import { SubmissionFrame } from './SubmissionFrame';
import { layout } from '../../theme/theme';
import type { DataRecord } from '../../types/selfService';
import { AppError, describeError } from '../../utils/errors';
import {
  businessToday,
  companyInstant,
  reason,
  record,
  text,
} from '../../utils/serviceValues';

export function ResignationForm(): React.JSX.Element {
  useLanguage();
  const { session } = useServices();
  const [source, setSource] = useState<DataRecord | null>(null);
  const [error, setError] = useState('');
  const [date, setDate] = useState(businessToday);
  const [time, setTime] = useState('17:00');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const load = async () => {
    setLoading(true);
    setError('');
    setSource(null);
    try {
      setSource(
        record(
          await session.request('/api/v1/me/resignation?page=1&pageSize=20'),
        ),
      );
    } catch (failure) {
      setError(describeError(failure));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    let active = true;
    session
      .request('/api/v1/me/resignation?page=1&pageSize=20')
      .then(value => {
        if (active) {
          setSource(record(value));
        }
      })
      .catch(failure => {
        if (active) {
          setError(describeError(failure));
        }
      });
    return () => {
      active = false;
    };
  }, [session]);
  return (
    <SubmissionFrame
      service="resignation"
      title={t('Resignation request')}
      route="/api/v1/me/resignation"
      ready={source?.canSubmit === true}
      description={t(
        'Propose your requested effective date and explain your decision. HR reviews the request independently; your employment remains unchanged until the normal company process completes.',
      )}
      revision={JSON.stringify([date, time, note, source?.employeeVersion])}
      build={async () => {
        if (
          source?.canSubmit !== true ||
          source.timeZone !== 'Asia/Karachi' ||
          typeof source.employeeVersion !== 'string'
        ) {
          throw new AppError('request_source_changed');
        }
        const requestedEffectiveAt = companyInstant(date, time);
        if (
          Date.parse(requestedEffectiveAt) <=
          Date.parse(text(source.serverTimeUtc, ''))
        ) {
          throw new AppError('resignation_effective_time_must_be_future');
        }
        const cleanReason = reason(note);
        return {
          body: {
            expectedVersion: source.employeeVersion,
            requestedEffectiveAt,
            reason: cleanReason,
          },
          summary: [
            t('Requested effective date: {0} {1} (company time)', date, time),
            cleanReason,
            t('HR approval is required.'),
          ],
        };
      }}
    >
      {disabled => (
        <View style={layout.card}>
          {error ? <Notice message={error} /> : null}
          {!source && !error && <LoadingSkeleton kind="field" />}
          {source ? (
            <InfoRow
              label={t('Current employment')}
              value={text(source.currentStatus)}
            />
          ) : null}
          {source && source.canSubmit !== true ? (
            <Notice
              tone="info"
              message={
                source.blockedReason ===
                'protected_owner_requires_separate_handover'
                  ? t(
                      'This account requires a separate owner handover process. Contact HR.',
                    )
                  : t(
                      'An employment request, scheduled change or employment restriction needs HR review before another resignation can be submitted.',
                    )
              }
            />
          ) : null}
          <DateField
            label={t('Requested effective date')}
            value={date}
            onChange={setDate}
            disabled={disabled}
          />
          <Field
            label={t('Requested time · company time (HH:mm)')}
            value={time}
            onChangeText={setTime}
            maxLength={5}
            editable={!disabled}
          />
          <Text style={layout.muted}>
            {t(
              'Company time is Asia/Karachi. Choose a future time; your company applies its notice and approval requirements.',
            )}
          </Text>
          <Field
            label={t('Reason for resignation')}
            value={note}
            onChangeText={setNote}
            multiline
            maxLength={1000}
            editable={!disabled}
          />
          <Button
            title={t('Refresh availability')}
            secondary
            busy={loading}
            disabled={disabled}
            onPress={() => load()}
          />
        </View>
      )}
    </SubmissionFrame>
  );
}
