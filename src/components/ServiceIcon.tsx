import React from 'react';
import Svg, { Path } from 'react-native-svg';
import type { ServiceKey } from '../types/selfService';
import { colors } from '../theme/theme';

type Symbol =
  | ServiceKey
  | 'lock'
  | 'search'
  | 'clear'
  | 'refresh'
  | 'inboxTray'
  | 'info';
const calendar =
  'M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z M8 2v4m8-4v4M4 9h16';
const receipt = 'M4 3h15v17l-3-2-3 2-3-2-3 2-3-2z M7 8h8M7 11h5';
const art: Record<Symbol, [string, string?]> = {
  punches: ['M2 10l3 3 3-3M5 12a8 8 0 1 1 2.4 5.7M13 7v5l3.5 2'],
  leaves: [
    'M13 21H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v5M8 2v4m8-4v4M4 9h16',
    'M14 21l7-7m-5 0h5v5',
  ],
  corrections: [
    'M8 4H6a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h6M16 4h2a2 2 0 0 1 2 2v3M9 3h2a1 1 0 0 1 2 0h2v3H9z M8 10h7m-7 4h4',
    'M14 18l6-6 2 2-6 6-3 1z',
  ],
  calendar: [calendar, 'M8 13h.4m3.6 0h.4m3.6 0h.4M8 17h.4m3.6 0h.4m3.6 0h.4'],
  shift: [
    'M13 19H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h15a2 2 0 0 1 2 2v3M8 5V3h7v2M2 12h11',
    'M22 17a5 5 0 1 1-10 0 5 5 0 0 1 10 0ZM17 14.5V17l2 1',
  ],
  overtime: [
    'M13 21a8 8 0 1 1 7-10M11 2h4m-2 0v3m0 4v4l2 1',
    'M22 18a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM18 16v4m-2-2h4',
  ],
  loans: [
    'M19 9V7H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12l2-1M4 7l12-5 1 5',
    'M15 14h6m-3-3 3 3-3 3',
  ],
  allowances: [receipt, 'M15 14q4-3 7 0-3 3-7 0Zm0 3q4 3 7 0m-7 3q4 3 7 0'],
  vehicles: [
    'M3 21V4a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v17M2 21h14M4 10h9M15 11h1q2 0 2 3v3q0 3 2 3t2-3V9l-4-4',
    'M6 13h5v5H6z',
  ],
  resignation: [
    'M13 21H5V2h10l4 4v3M14 2v5h5M8 10h5M8 13h3',
    'M12 16h10m-4-4 4 4-4 4',
  ],
  finances: [receipt],
  payroll: [receipt],
  payments: [receipt],
  encashment: [calendar],
  profile: ['M16 8a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM4 21a8 8 0 0 1 16 0'],
  requests: [receipt],
  notifications: [
    'M4 17h16c-2-2-2-3-2-7a6 6 0 0 0-12 0c0 4 0 5-2 7Zm6 3q2 3 4 0',
  ],
  lock: ['M7 9V7a5 5 0 0 1 10 0v2M6 10h12a1 1 0 0 1 1 1v9H5v-9a1 1 0 0 1 1-1z'],
  search: ['M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0Zm-2 5 6 6'],
  refresh: ['M20 4v6h-6M20 10a8 8 0 1 0 .2 5'],
  inboxTray: ['M3 13l4-8h10l4 8v6H3zM3 13h5l2 3h4l2-3h5'],
  info: ['M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM12 11v6m0-10v.5'],
  clear: ['M6 6l12 12M18 6 6 18'],
};
export function ServiceIcon({
  name,
  size = 34,
  light = false,
}: {
  name: Symbol;
  size?: number;
  light?: boolean;
}) {
  const [base, accent] = art[name];
  return (
    <Svg
      accessible={false}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      strokeWidth={1.8}
      strokeLinejoin="round"
      strokeLinecap="round"
    >
      <Path d={base} stroke={light ? colors.white : colors.primary} />
      {accent && <Path d={accent} stroke={light ? colors.white : '#009E9B'} />}
    </Svg>
  );
}
