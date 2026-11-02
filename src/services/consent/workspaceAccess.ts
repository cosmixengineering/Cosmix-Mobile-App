// Only grants for known services that do not collect device location may skip
// the workspace notice. Unknown grants and failed/empty permission reads keep it.
const nonLocationGrants = new Set([
  'auth.self.read',
  'attendance.leaves.self',
  'attendance.rosters.self',
  'attendance.summaries.self',
  'attendance.history.self',
  'attendance.corrections.self',
  'attendance.overtime.self',
  'attendance.allowances.self',
  'attendance.advancesloans.self',
  'attendance.vehicle.self',
  'ess.profile.read',
  'ess.attendance.read',
  'ess.leaves.read',
  'ess.finances.read',
  'ess.requests.read',
  'ess.resignation.self',
]);

export function nonLocationWorkspace(
  grants: readonly { permission: string }[],
) {
  return (
    grants.length > 0 &&
    grants.every(grant => nonLocationGrants.has(grant.permission))
  );
}
