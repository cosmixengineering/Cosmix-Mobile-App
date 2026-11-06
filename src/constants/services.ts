import { t } from '../i18n/language';
import type { SessionState } from '../types/contracts';
import type { ServiceKey } from '../types/selfService';

type ServiceDefinition = {
  key: ServiceKey;
  title: string;
  description: string;
  mark: string;
  permissions: string[][];
};
export const employeeServices: readonly ServiceDefinition[] = [
  {
    key: 'leaves',
    get title() {
      return t('Leave');
    },
    get description() {
      return t('Apply, view balances and follow requests');
    },
    mark: 'LV',
    permissions: [['attendance.leaves.self']],
  },
  {
    key: 'loans',
    get title() {
      return t('Advances & loans');
    },
    get description() {
      return t('Requests, repayment plans and balances');
    },
    mark: 'AL',
    permissions: [['attendance.advancesloans.self']],
  },
  {
    key: 'resignation',
    get title() {
      return t('Resignation');
    },
    get description() {
      return t('Submit and follow your employment request');
    },
    mark: 'ER',
    permissions: [['ess.resignation.self']],
  },
  {
    key: 'allowances',
    get title() {
      return t('Allowances');
    },
    get description() {
      return t('Check eligibility and claim work allowances');
    },
    mark: 'AC',
    permissions: [['attendance.allowances.self']],
  },
  {
    key: 'vehicles',
    get title() {
      return t('Vehicle & fuel');
    },
    get description() {
      return t('Assigned vehicles, trips and fuel claims');
    },
    mark: 'VF',
    permissions: [['attendance.vehicle.self']],
  },
  {
    key: 'corrections',
    get title() {
      return t('Attendance requests');
    },
    get description() {
      return t('Request a correction and track its review');
    },
    mark: 'AR',
    permissions: [['attendance.corrections.self']],
  },
  {
    key: 'overtime',
    get title() {
      return t('Overtime');
    },
    get description() {
      return t('View eligible duty and submit overtime requests');
    },
    mark: 'OT',
    permissions: [['attendance.overtime.self']],
  },
  {
    key: 'calendar',
    get title() {
      return t('Attendance calendar');
    },
    get description() {
      return t('Monthly facts and company assessments');
    },
    mark: 'CA',
    permissions: [
      ['attendance.summaries.self'],
      ['ess.attendance.read', 'auth.self.read'],
    ],
  },
  {
    key: 'punches',
    get title() {
      return t('Attendance history');
    },
    get description() {
      return t('All Check In / Check Out receipts and their server results');
    },
    mark: 'AH',
    permissions: [['attendance.history.self']],
  },
  {
    key: 'shift',
    get title() {
      return t('My shift');
    },
    get description() {
      return t('Your dated site or office schedule');
    },
    mark: 'SH',
    permissions: [['attendance.rosters.self']],
  },
  {
    key: 'finances',
    get title() {
      return t('My finances');
    },
    get description() {
      return t('Compensation and recorded financial history');
    },
    mark: 'FN',
    permissions: [['ess.finances.read']],
  },
  {
    key: 'payroll',
    get title() {
      return t('Payroll history');
    },
    get description() {
      return t('Your recorded payroll periods and handoff summaries');
    },
    mark: 'PR',
    permissions: [['ess.finances.read']],
  },
  {
    key: 'payments',
    get title() {
      return t('Payment history');
    },
    get description() {
      return t('Salary entitlement, recorded payments and remaining balance');
    },
    mark: 'PM',
    permissions: [['ess.finances.read']],
  },
  {
    key: 'encashment',
    get title() {
      return t('Leave encashment');
    },
    get description() {
      return t('Request and track leave valuation');
    },
    mark: 'LE',
    permissions: [['attendance.leaves.self']],
  },
  {
    key: 'profile',
    get title() {
      return t('My profile');
    },
    get description() {
      return t('Employment, documents and assigned items');
    },
    mark: 'ME',
    permissions: [['ess.profile.read', 'auth.self.read']],
  },
  {
    key: 'requests',
    get title() {
      return t('Request overview');
    },
    get description() {
      return t('Pending requests across your workspace');
    },
    mark: 'RQ',
    permissions: [['ess.requests.read', 'auth.self.read']],
  },
  {
    key: 'notifications',
    get title() {
      return t('Inbox');
    },
    get description() {
      return t('Company notifications and reminders');
    },
    mark: 'IN',
    permissions: [],
  },
];

export function canOpenService(key: ServiceKey, state: SessionState): boolean {
  const definition = employeeServices.find(item => item.key === key);
  return (
    state.status === 'authenticated' &&
    !!definition &&
    definition.permissions.every(group =>
      group.some(permission =>
        state.permissions.some(grant => grant.permission === permission),
      ),
    )
  );
}

export function serviceTitle(key: ServiceKey): string {
  return (
    employeeServices.find(item => item.key === key)?.title ??
    t('Employee service')
  );
}

export const historyCategories: readonly { key: ServiceKey; title: string }[] =
  [
    {
      key: 'punches',
      get title() {
        return t('Check In / Out');
      },
    },
    {
      key: 'leaves',
      get title() {
        return t('Leave');
      },
    },
    {
      key: 'loans',
      get title() {
        return t('Advances & loans');
      },
    },
    {
      key: 'allowances',
      get title() {
        return t('Allowances');
      },
    },
    {
      key: 'overtime',
      get title() {
        return t('Overtime');
      },
    },
    {
      key: 'corrections',
      get title() {
        return t('Attendance requests');
      },
    },
    {
      key: 'calendar',
      get title() {
        return t('Monthly attendance');
      },
    },
    {
      key: 'payroll',
      get title() {
        return t('Payroll');
      },
    },
    {
      key: 'payments',
      get title() {
        return t('Payments');
      },
    },
    {
      key: 'encashment',
      get title() {
        return t('Leave encashment');
      },
    },
    {
      key: 'vehicles',
      get title() {
        return t('Vehicle & fuel');
      },
    },
    {
      key: 'resignation',
      get title() {
        return t('Resignation');
      },
    },
  ];

export function resolveHistoryCategory(
  requested: ServiceKey | undefined,
  state: SessionState,
): ServiceKey | null {
  const available = historyCategories.filter(item =>
    canOpenService(item.key, state),
  );
  return (
    available.find(item => item.key === requested)?.key ??
    available[0]?.key ??
    null
  );
}

export function allowanceTitle(value: unknown): string {
  const names = [
    '',
    t('Office meal'),
    t('Site dinner'),
    t('Site breakfast'),
    t('Site lunch'),
    t('Outstation daily'),
    t('Work travel'),
  ];
  return typeof value === 'number' &&
    Number.isInteger(value) &&
    value > 0 &&
    value < names.length
    ? names[value]
    : t('Allowance claim');
}
