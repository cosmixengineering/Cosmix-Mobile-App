import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useServices } from '../../app/AppProvider';
import { AppError, describeError } from '../../utils/errors';
import { dateRange } from '../../utils/serviceValues';
import { isRecord, isTimestamp } from '../../utils/validation';

export type ScheduleDay = {
  date: string;
  status: string;
  location: 'Office' | 'Site' | null;
  start: string | null;
  end: string | null;
  scheduledMinutes: number | null;
  paidBreak: number | null;
  unpaidBreak: number | null;
  zone: string;
};

export function shiftDate(date: string, by: number) {
  const value = new Date(date + 'T12:00:00Z');
  value.setUTCDate(value.getUTCDate() + by);
  return value.toISOString().slice(0, 10);
}
export function periodDays(date: string, month: boolean) {
  const value = new Date(date + 'T12:00:00Z');
  if (month) {
    value.setUTCMonth(value.getUTCMonth() + 1, 0);
    return dateRange(
      date.slice(0, 7) + '-01',
      value.toISOString().slice(0, 10),
    );
  }
  const start = shiftDate(date, -value.getUTCDay());
  return dateRange(start, shiftDate(start, 6));
}
export function dateLabel(date: string, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat('en-GB', {
    ...options,
    timeZone: 'UTC',
  }).format(new Date(date + 'T12:00:00Z'));
}
export function shiftTime(day: ScheduleDay, end = false) {
  const instant = end ? day.end : day.start;
  if (!instant) return null;
  const time = new Intl.DateTimeFormat('en-US', {
    timeZone: day.zone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(instant));
  if (!end || !day.start) return time;
  const localDate = new Intl.DateTimeFormat('en-GB', {
    timeZone: day.zone,
    day: 'numeric',
    month: 'short',
  });
  const endDate = localDate.format(new Date(instant));
  return endDate === localDate.format(new Date(day.start))
    ? time
    : time + ' · ' + endDate;
}

function minutes(value: unknown) {
  if (value == null) return null;
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0)
    throw new AppError('invalid_server_response');
  return value;
}
function readDay(value: unknown, employee: string, date: string): ScheduleDay {
  if (
    !isRecord(value) ||
    value.employeeId !== employee ||
    value.businessDate !== date ||
    typeof value.status !== 'string' ||
    typeof value.timeZone !== 'string' ||
    !value.timeZone ||
    (value.startsAt != null && !isTimestamp(value.startsAt)) ||
    (value.endsAt != null && !isTimestamp(value.endsAt))
  )
    throw new AppError('invalid_server_response');
  // Fail within the read if the server supplied a zone the device cannot display.
  new Intl.DateTimeFormat('en-GB', { timeZone: value.timeZone }).format(0);
  return {
    date,
    status: value.status,
    location: value.branchId ? 'Office' : value.siteId ? 'Site' : null,
    start: value.startsAt ?? null,
    end: value.endsAt ?? null,
    zone: value.timeZone,
    scheduledMinutes: minutes(value.configuredScheduledMinutes),
    paidBreak: minutes(value.paidBreakMinutes),
    unpaidBreak: minutes(value.unpaidBreakMinutes),
  };
}

type Result = {
  path: string;
  revision: number;
  days: ScheduleDay[];
  error?: string;
};
function useRead(
  employee: string,
  from: string,
  to: string,
  range: boolean,
  enabled: boolean,
  revision: number,
) {
  const { session } = useServices();
  const path = range
    ? `/api/v1/me/attendance/calendar?from=${from}&to=${to}`
    : `/api/v1/me/shift?businessDate=${from}`;
  const [result, setResult] = useState<Result | null>(null);
  useFocusEffect(
    useCallback(() => {
      let live = true;
      setResult(null);
      if (enabled) {
        session
          .request<unknown>(path)
          .then(raw => {
            if (!live) return;
            let days: ScheduleDay[];
            if (range) {
              if (!Array.isArray(raw) || raw.length > 31)
                throw new AppError('invalid_server_response');
              days = raw.map(row => {
                if (
                  !isRecord(row) ||
                  row.employeeId !== employee ||
                  typeof row.businessDate !== 'string' ||
                  row.businessDate < from ||
                  row.businessDate > to
                )
                  throw new AppError('invalid_server_response');
                return readDay(row.roster, employee, row.businessDate);
              });
              if (new Set(days.map(day => day.date)).size !== days.length)
                throw new AppError('invalid_server_response');
            } else days = [readDay(raw, employee, from)];
            setResult({ path, revision, days });
          })
          .catch(error => {
            if (live)
              setResult({
                path,
                revision,
                days: [],
                error: describeError(error),
              });
          });
      }
      return () => {
        live = false;
      };
    }, [employee, enabled, from, path, range, revision, session, to]),
  );
  return enabled && result?.path === path && result.revision === revision
    ? result
    : null;
}

export function useSchedule(
  employee: string,
  days: string[],
  selected: string,
  calendarAccess: boolean,
) {
  const [revision, retry] = useState(0);
  const calendar = useRead(
    employee,
    days[0],
    days[days.length - 1],
    true,
    calendarAccess,
    revision,
  );
  const known = calendar?.days.find(day => day.date === selected);
  // The roster-only API has no range operation. Read only a date the user selects,
  // including when a calendar range cannot be resolved; never fan out per date.
  const singleNeeded = !calendarAccess || (!!calendar && !known);
  const single = useRead(
    employee,
    selected,
    selected,
    false,
    singleNeeded,
    revision,
  );
  return {
    days: calendar?.days ?? [],
    selected: known ?? single?.days[0],
    dayError: single?.error,
    rangeError: calendar?.error,
    loading: singleNeeded ? !single : !calendar,
    retry: () => retry(value => value + 1),
  };
}
