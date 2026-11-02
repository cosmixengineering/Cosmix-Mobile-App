import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSource } from '../../hooks/useSource';
import type { DataRecord } from '../../types/selfService';
import { fraction, numeric, text } from '../../utils/serviceValues';
import { isGuid, isRecord } from '../../utils/validation';
import { layout } from '../../theme/theme';
import { Button, Notice } from '../Controls';
import { ChoiceField, InfoRow } from '../ServiceControls';

export function LeaveEntitlementCard({
  typeId,
  from,
  to,
  disabled,
  validRange,
}: {
  typeId: string;
  from: string;
  to: string;
  disabled: boolean;
  validRange: boolean;
}) {
  const [details, setDetails] = useState(false);
  const [choice, setChoice] = useState('');
  const policies = useSource<DataRecord>(
    isGuid(typeId) && validRange
      ? `/api/v1/leaves/mine/policies?leaveTypeId=${typeId}&from=${from}&to=${to}`
      : null,
  );
  const options =
    policies.value?.status === 'available' &&
    Array.isArray(policies.value.policies)
      ? policies.value.policies
          .filter(isRecord)
          .filter(p => isGuid(p.versionId))
      : [];
  const policyId =
    options.length === 1
      ? text(options[0].versionId, '')
      : options.some(p => p.versionId === choice)
      ? choice
      : '';
  const balance = useSource<DataRecord>(
    policyId
      ? `/api/v1/leaves/mine/balance?leaveTypeId=${typeId}&policyVersionId=${policyId}&asOf=${from}`
      : null,
  );
  const annual = isRecord(balance.value?.annualBalance)
    ? balance.value.annualBalance
    : null;
  const quota = isRecord(balance.value?.typeBalance)
    ? balance.value.typeBalance
    : null;
  const limit = numeric(annual?.limitDays);
  const usage = isRecord(annual?.usedDays) ? annual.usedDays : null;
  const ratio =
    usage && limit && limit > 0
      ? Number(usage.numerator) / Number(usage.denominator) / limit
      : NaN;
  return (
    <View style={styles.card}>
      <View style={layout.row}>
        <Text style={styles.heading}>Leave Entitlement</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: details, disabled }}
          disabled={disabled}
          onPress={() => setDetails(!details)}
          hitSlop={8}
        >
          <Text style={styles.link}>
            {details ? 'Hide details' : 'View details'} ›
          </Text>
        </Pressable>
      </View>
      {options.length > 1 && (
        <ChoiceField
          label="Applicable policy"
          disabled={disabled}
          value={policyId}
          onChange={setChoice}
          choices={options.map(p => ({
            value: text(p.versionId, ''),
            label: text(p.name),
          }))}
        />
      )}
      {policies.error || balance.error ? (
        <>
          <Notice message={policies.error || balance.error} />
          <Button
            title="Retry entitlement"
            secondary
            disabled={disabled}
            onPress={policies.error ? policies.reload : balance.reload}
          />
        </>
      ) : !balance.value ? (
        <Text style={layout.muted}>
          {policies.loading || balance.loading
            ? 'Loading your entitlement…'
            : !typeId
            ? 'Choose a leave type to see your entitlement.'
            : !validRange
            ? 'Choose a valid date range.'
            : options.length > 1
            ? 'Choose a policy to see your balance.'
            : 'No confirmed entitlement for these dates.'}
        </Text>
      ) : (
        <>
          {Number.isFinite(ratio) && (
            <View style={styles.track}>
              <View
                style={[
                  styles.fill,
                  { width: `${Math.min(100, Math.max(0, ratio * 100))}%` },
                ]}
              />
            </View>
          )}
          <View style={styles.metrics}>
            <Metric
              label="Annual left"
              value={fraction(annual?.remainingDays)}
              color="#E7F6ED"
            />
            <Metric
              label="Annual used"
              value={fraction(annual?.usedDays)}
              color="#FDEEEF"
            />
            <Metric
              label="Type left"
              value={fraction(quota?.remainingDays)}
              color="#E8F2FE"
            />
          </View>
          {details && (
            <View style={layout.stack6}>
              <InfoRow
                label="Balance status"
                value={text(balance.value.status)}
              />
              <InfoRow
                label="Annual limit"
                value={limit === null ? 'Unavailable' : limit + ' days'}
              />
              <InfoRow
                label="Fiscal year"
                value={
                  text(balance.value.fiscalYearStart) +
                  ' – ' +
                  text(balance.value.fiscalYearEndExclusive) +
                  ' (end exclusive)'
                }
              />
            </View>
          )}
        </>
      )}
      {details && (
        <Text style={layout.muted}>
          Balances use your published policy and include approved future leave
          in the fiscal year.
        </Text>
      )}
    </View>
  );
}
function Metric({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <View style={[styles.metric, { backgroundColor: color }]}>
      <Text style={styles.amount}>
        {value === 'Unavailable' ? '—' : value.replace(/ days$/, '')}
      </Text>
      <Text style={styles.caption}>{label}</Text>
    </View>
  );
}
const styles = StyleSheet.create({
  card: {
    backgroundColor: 'white',
    borderColor: '#E0E6ED',
    borderWidth: 1,
    borderRadius: 12,
    padding: 11,
    gap: 8,
  },
  heading: { fontSize: 15, color: '#162340', fontWeight: '700' },
  link: { color: '#445774', fontSize: 14 },
  track: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E5EBF0',
    overflow: 'hidden',
  },
  fill: { height: 8, backgroundColor: '#42A574' },
  metrics: { flexDirection: 'row', gap: 7, flexWrap: 'wrap' },
  metric: {
    flexGrow: 1,
    flexBasis: 68,
    alignItems: 'center',
    padding: 8,
    borderRadius: 10,
    gap: 4,
  },
  amount: { fontSize: 18, fontWeight: '700', color: '#132C48' },
  caption: { fontSize: 13, color: '#263B54' },
});
