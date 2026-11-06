import { t } from '../../i18n/language';
import { useLanguage } from '../../i18n/preference';
import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { Button, Field, Notice } from '../Controls';
import { ChoiceField, DateField, InfoRow } from '../ServiceControls';
import { SubmissionFrame } from './SubmissionFrame';
import { useSource } from '../../hooks/useSource';
import type { DataRecord } from '../../types/selfService';
import {
  amount,
  businessToday,
  numeric,
  reason,
  records,
  status,
  text,
} from '../../utils/serviceValues';
import { AppError } from '../../utils/errors';
import { layout } from '../../theme/theme';
import { allowanceTitle } from '../../constants/services';

export function AllowanceForm(): React.JSX.Element {
  useLanguage();
  const [date, setDate] = useState(businessToday);
  const [kind, setKind] = useState('');
  const [note, setNote] = useState('');
  const source = useSource<DataRecord>(
    `/api/v1/me/allowances/sources?businessDate=${date}`,
  );
  const kinds = source.value ? records(source.value.kinds) : [];
  const selected = kinds.find(item => String(item.kind) === kind);
  const ready =
    !!selected &&
    selected.state === 'eligible' &&
    selected.claimExists === false &&
    numeric(selected.claimedAmount) !== null &&
    typeof selected.currency === 'string' &&
    /^[A-Z]{3}$/.test(selected.currency);
  return (
    <SubmissionFrame
      service="allowances"
      title={t('Allowance claim')}
      description={t(
        "Check the company's dated eligibility before sending your claim. The server determines the amount.",
      )}
      route="/api/v1/me/allowances/claims"
      revision={JSON.stringify([date, kind, note, source.value])}
      ready={ready && !source.loading}
      build={async () => {
        if (!ready || !selected) {
          throw new AppError('source_unavailable');
        }
        const clean = reason(note);
        return {
          body: { kind: Number(kind), businessDate: date, reason: clean },
          summary: [
            allowanceTitle(Number(kind)),
            date,
            t(
              'Policy amount: {0}',
              amount(selected.claimedAmount, selected.currency),
            ),
            clean,
          ],
        };
      }}
    >
      {disabled => (
        <View style={layout.card}>
          <DateField
            label={t('Duty date')}
            value={date}
            onChange={value => {
              setDate(value);
              setKind('');
            }}
            disabled={disabled}
          />
          {source.error ? <Notice message={source.error} /> : null}
          <Button
            title={t('Refresh eligibility')}
            secondary
            busy={source.loading}
            disabled={disabled}
            onPress={() => source.reload()}
          />
          {source.value ? (
            <InfoRow
              label={t('Company policy')}
              value={status(source.value.policyState)}
            />
          ) : null}
          <ChoiceField
            loading={source.loading}
            label={t('Allowance')}
            value={kind}
            onChange={setKind}
            disabled={disabled}
            choices={kinds.map(item => ({
              value: String(item.kind),
              label: allowanceTitle(item.kind),
            }))}
          />
          {selected ? (
            <>
              <InfoRow
                label={t('Eligibility')}
                value={status(selected.state)}
              />
              <Text style={layout.body}>{text(selected.reason)}</Text>
              <InfoRow
                label={t('Policy amount')}
                value={amount(selected.claimedAmount, selected.currency)}
              />
              {selected.claimExists === true ? (
                <Notice
                  tone="info"
                  message={t('A claim already exists for this duty cycle.')}
                />
              ) : null}
            </>
          ) : null}
          <Field
            label={t('Reason')}
            value={note}
            onChangeText={setNote}
            editable={!disabled}
            multiline
            maxLength={1000}
          />
        </View>
      )}
    </SubmissionFrame>
  );
}
