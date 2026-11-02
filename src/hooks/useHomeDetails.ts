import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useServices, useSession } from '../app/AppProvider';
import { canOpenService } from '../constants/services';
import { businessToday, record } from '../utils/serviceValues';
import { describeError } from '../utils/errors';
import type { DataRecord } from '../types/selfService';

type Section = { value?: DataRecord; error?: string };
type HomeDetails = { calendar: Section; shift: Section; profile: Section };
async function read(load: () => Promise<unknown>): Promise<Section> {
  try {
    return { value: record(await load()) };
  } catch (error) {
    return { error: describeError(error) };
  }
}
export function useHomeDetails() {
  const { session } = useServices();
  const auth = useSession();
  const id = auth.account?.employeeId;
  const today = businessToday();
  const calendarAllowed = canOpenService('calendar', auth);
  const shiftAllowed = canOpenService('shift', auth);
  const profileAllowed = canOpenService('profile', auth);
  const [details, setDetails] = useState<HomeDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const generation = useRef(0);
  const refresh = useCallback(async () => {
    const turn = ++generation.current;
    setLoading(true);
    setDetails(null);
    const [year, month] = today.split('-').map(Number);
    const tomorrow = new Date(Date.parse(today + 'T00:00:00Z') + 86400000)
      .toISOString()
      .slice(0, 10);
    const [calendar, shift, profile] = await Promise.all([
      calendarAllowed
        ? read(() =>
            session.request(
              '/api/v1/self-service/attendance?year=' +
                year +
                '&month=' +
                month,
            ),
          )
        : {},
      shiftAllowed
        ? read(async () => {
            const get = async (date: string) => {
              const roster = record(
                await session.request('/api/v1/me/shift?businessDate=' + date),
              );
              if (roster.employeeId !== id || roster.businessDate !== date)
                throw new Error('Unexpected roster');
              return roster;
            };
            const current = await get(today);
            if (
              current.status === 'scheduled' &&
              typeof current.endsAt === 'string' &&
              Date.parse(current.endsAt) > Date.now()
            )
              return current;
            return get(tomorrow);
          })
        : {},
      profileAllowed
        ? read(async () => {
            const employee = record(
              await session.request('/api/v1/self-service/profile'),
            );
            if (employee.employeeId !== id)
              throw new Error('Unexpected profile');
            return employee.activeAssignment ?? {};
          })
        : {},
    ]);
    if (turn === generation.current) {
      setDetails({ calendar, shift, profile });
      setLoading(false);
    }
  }, [calendarAllowed, shiftAllowed, profileAllowed, session, id, today]);
  useFocusEffect(
    useCallback(() => {
      refresh();
      return () => {
        generation.current++;
      };
    }, [refresh]),
  );
  return { details, refresh, loading, today, calendarAllowed, shiftAllowed };
}
