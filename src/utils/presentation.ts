import { displayLocale, t } from '../i18n/language';
import type { PunchReceipt } from '../types/contracts';
import { AppError } from './errors';

export function historyWindow(
  serverTime: string,
  timeZone: string,
): { from: string; to: string } {
  try {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date(serverTime));
    const part = (name: string) =>
      Number(parts.find(value => value.type === name)?.value);
    const calendar = Date.UTC(part('year'), part('month') - 1, part('day'));
    return {
      from: new Date(calendar - 6 * 86400000).toISOString().slice(0, 10),
      to: new Date(calendar + 86400000).toISOString().slice(0, 10),
    };
  } catch {
    throw new AppError('invalid_server_response');
  }
}

export function localTime(value: string, timeZone?: string): string {
  try {
    return new Intl.DateTimeFormat(displayLocale(), {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      timeZone,
    }).format(new Date(value));
  } catch {
    return t('Time unavailable');
  }
}

export function outcomeLabel(outcome: string): string {
  return (
    (
      {
        Accepted: t('Accepted'),
        AcceptedWithException: t('Accepted with exception'),
        QueuedForReview: t('Awaiting review'),
        Rejected: t('Not accepted'),
        Unverified: t('Not verified'),
      } as Record<string, string>
    )[outcome] ?? t('Status unavailable')
  );
}

export function fullLocalTime(
  value: string,
  timeZone = 'Asia/Karachi',
): string {
  try {
    return new Intl.DateTimeFormat(displayLocale(), {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
      timeZone,
    }).format(new Date(value));
  } catch {
    return t('Time unavailable');
  }
}

export function receiptMessage(receipt: PunchReceipt): string {
  const action = receipt.action === 'CheckIn' ? t('Check In') : t('Check Out');
  if (receipt.outcome === 'Accepted') {
    return t('{0} accepted by the company server.', action);
  }
  if (receipt.outcome === 'AcceptedWithException') {
    return t(
      '{0} recorded with an exception. Contact your supervisor for details.',
      action,
    );
  }
  if (receipt.outcome === 'QueuedForReview') {
    return t(
      '{0} received for review. Attendance has not been confirmed as accepted.',
      action,
    );
  }
  return t(
    '{0} was not accepted. Contact your supervisor before trying again.',
    action,
  );
}
