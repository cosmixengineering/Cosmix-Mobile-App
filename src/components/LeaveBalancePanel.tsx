import { LoadingSkeleton } from './ui/LoadingSkeleton';
import { t } from '../i18n/language';
import { useLanguage } from '../i18n/preference';
import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { Notice } from './Controls';
import { ChoiceField, DateField, InfoRow } from './ServiceControls';
import { useSource } from '../hooks/useSource';
import type { DataRecord } from '../types/selfService';
import {
  businessToday,
  fraction,
  numeric,
  record,
  records,
  status,
  text,
} from '../utils/serviceValues';
import { isGuid } from '../utils/validation';
import { layout } from '../theme/theme';

/** Read-only balance selection needs leave access, independently of applying or reading a roster. */
export function LeaveBalancePanel(): React.JSX.Element {
  useLanguage();
  const [type, setType] = useState('');
  const [policy, setPolicy] = useState('');
  const [date, setDate] = useState(businessToday);
  const types = useSource<DataRecord[]>('/api/v1/leaves/mine/types');
  const options = useSource<DataRecord>(
    isGuid(type)
      ? `/api/v1/leaves/mine/policies?leaveTypeId=${type}&from=${date}&to=${date}`
      : null,
  );
  const candidates = options.value ? records(options.value.policies) : [];
  const balance = useSource<DataRecord>(
    isGuid(type) && isGuid(policy)
      ? `/api/v1/leaves/mine/balance?leaveTypeId=${type}&policyVersionId=${policy}&asOf=${date}`
      : null,
  );
  const annual = balance.value?.annualBalance
    ? record(balance.value.annualBalance)
    : null;
  const quota = balance.value?.typeBalance
    ? record(balance.value.typeBalance)
    : null;
  return (
    <View style={layout.card}>
      <Text style={layout.heading}>{t('Your exact leave balance')}</Text>
      <Text style={layout.muted}>
        {t(
          'Choose a leave type and applicable company policy. The date selects its fiscal year; approved usage includes recorded future approved leave.',
        )}
      </Text>
      <ChoiceField
        loading={types.loading}
        label={t('Leave type')}
        value={type}
        onChange={value => {
          setType(value);
          setPolicy('');
        }}
        choices={
          types.value
            ? records(types.value)
                .filter(row => row.isActive === true)
                .map(row => ({
                  value: text(row.id, ''),
                  label: text(row.name),
                }))
            : []
        }
      />
      <DateField
        label={t('Balance reference date')}
        value={date}
        onChange={value => {
          setDate(value);
          setPolicy('');
        }}
      />
      {options.value ? (
        <InfoRow
          label={t('Policy availability')}
          value={status(options.value.status)}
        />
      ) : null}
      <ChoiceField
        loading={options.loading}
        label={t('Applicable policy')}
        value={policy}
        onChange={setPolicy}
        choices={candidates.map(row => ({
          value: text(row.versionId, ''),
          label: `${text(row.name)} · ${text(row.effectiveFrom)}`,
        }))}
      />
      {balance.loading ? (
        <LoadingSkeleton label={t('Loading current company records…')} />
      ) : null}
      {types.error || options.error || balance.error ? (
        <Notice message={types.error || options.error || balance.error} />
      ) : null}
      {balance.value ? (
        <>
          <InfoRow
            label={t('Balance status')}
            value={status(balance.value.status)}
          />
          <InfoRow
            label={t('Fiscal year')}
            value={t(
              '{0} → {1} (end exclusive)',
              text(balance.value.fiscalYearStart),
              text(balance.value.fiscalYearEndExclusive),
            )}
          />
          <InfoRow
            label={t('Annual remaining')}
            value={annual ? fraction(annual.remainingDays) : t('Unavailable')}
          />
          <InfoRow
            label={t('Annual used')}
            value={annual ? fraction(annual.usedDays) : t('Unavailable')}
          />
          {annual ? (
            <InfoRow
              label={t('Annual limit')}
              value={
                numeric(annual.limitDays) !== null
                  ? t('{0} days', annual.limitDays)
                  : t('Unavailable')
              }
            />
          ) : null}
          <InfoRow
            label={t('Type remaining')}
            value={
              quota
                ? fraction(quota.remainingDays)
                : t('No confirmed type quota supplied')
            }
          />
          <InfoRow
            label={t('Eligible service')}
            value={
              balance.value.serviceEligible === true
                ? t('Eligible')
                : balance.value.serviceEligible === false
                ? t('Not eligible under this policy')
                : t('Unavailable')
            }
          />
          <Notice
            tone="info"
            message={t(
              "These are the backend's exact recorded balances. A balance view does not approve a new leave request or reserve leave.",
            )}
          />
        </>
      ) : null}
    </View>
  );
}
