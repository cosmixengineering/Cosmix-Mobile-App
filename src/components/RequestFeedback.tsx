import { t } from '../i18n/language';
import { useLanguage } from '../i18n/preference';
import React from 'react';
import { Text, View } from 'react-native';
import { Button, Notice } from './Controls';
import { layout } from '../theme/theme';
import type { DataRecord, RequestDraft } from '../types/selfService';
import { records, status, text } from '../utils/serviceValues';

export function RequestFeedback({
  error,
  receipt,
  pending,
  busy,
  onRetry,
}: {
  error: string;
  receipt: DataRecord | null;
  pending: RequestDraft | null;
  busy: boolean;
  onRetry(): Promise<unknown>;
}): React.JSX.Element {
  useLanguage();
  return (
    <>
      {error ? <Notice message={error} /> : null}
      {receipt ? (
        <View style={layout.card}>
          <Text style={layout.heading}>{t('Server response received')}</Text>
          {Array.isArray(receipt.cancellations) &&
          receipt.cancellations.length > 0 ? (
            <Text style={layout.body}>
              {t('Original leave status:')} {status(receipt.state)}
              {t('. Cancellation request statuses:')}{' '}
              {records(receipt.cancellations)
                .map(row => status(row.state))
                .join(', ')}
              {t('. A cancellation needs a separate company decision.')}
            </Text>
          ) : (
            <Text style={layout.body}>
              {t('Request status:')}{' '}
              {status(receipt.state ?? receipt.approvalState)}
              {t(
                '. Submission is separate from approval, payment or a change to your employment.',
              )}
            </Text>
          )}
          <Text selectable style={layout.muted}>
            {t('Reference:')} {text(receipt.id)}
          </Text>
        </View>
      ) : null}
      {pending ? (
        <View style={layout.card}>
          <Text style={layout.heading}>{t('Confirm previous request')}</Text>
          <Text style={layout.body}>
            {pending.label}{' '}
            {t(
              'may already be recorded. Confirm the same submission before starting another request.',
            )}
          </Text>
          <Text selectable style={layout.muted}>
            {t('Reference:')} {pending.key}
          </Text>
          <Button
            title={t('Confirm previous request')}
            busy={busy}
            onPress={() => onRetry().catch(() => undefined)}
          />
        </View>
      ) : null}
    </>
  );
}
