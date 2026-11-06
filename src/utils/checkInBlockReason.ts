import type { AttendanceState } from '../types/contracts';

const faceReasons: Readonly<Record<string, string>> = {
  face_enrollment_required:
    'Your face has not been registered for attendance. Ask HR to enroll your face in Biometric Registration, then refresh this screen.',
  face_enrollment_provider_mismatch:
    'Your face enrollment needs to be updated. Ask HR to register your face again, then refresh this screen.',
  face_policy_not_confirmed:
    'The face verification policy is not active. Ask your attendance administrator to activate it.',
  face_provider_not_configured:
    'The face verification service is not configured. Contact your attendance administrator.',
  face_template_storage_unavailable:
    'Face verification storage is unavailable. Contact your attendance administrator.',
};

export function checkInBlockReason(
  state: AttendanceState | null,
  historyAllowed: boolean,
  captureAllowed: boolean,
  faceAllowed: boolean,
): string | null {
  if (!historyAllowed)
    return 'Your account does not have access to its attendance status. Ask your administrator to enable it.';
  if (!state || (state.state === 'checked_in' && state.checkOutEnabled))
    return null;
  if (
    !captureAllowed ||
    state.nextAction === 'mobile_attendance_access_required'
  )
    return 'Your account does not have mobile attendance access. Ask your administrator to enable it.';
  if (state.nextAction === 'request_correction')
    return state.state === 'conflict'
      ? 'More than one attendance session is open. Ask HR to correct your attendance record.'
      : 'This attendance period is locked. Contact HR to request a correction.';
  if (state.nextAction === 'view_shift')
    return 'No assigned shift is open for check-in right now. Check My shift for your hours, or ask your supervisor to check your roster.';
  if (
    state.limitations.includes(
      'Approved capture validation policy is unavailable; contact attendance support.',
    )
  )
    return 'No approved attendance capture policy is available. Ask your attendance administrator to publish one.';
  if (state.state === 'checked_in')
    return state.nextAction === 'contact_attendance_support'
      ? 'Your assigned workplace could not be confirmed. Ask your supervisor to check your office assignment and its location settings.'
      : 'Refresh this screen to check whether you can check out. If the problem continues, contact HR.';
  if (!faceAllowed)
    return 'Your account does not have permission to verify your face for check-in. Ask your administrator to enable it.';
  if (state.checkInEnabled) return null;
  if (state.nextAction === 'contact_attendance_support') {
    if (Object.prototype.hasOwnProperty.call(faceReasons, state.faceStatus))
      return faceReasons[state.faceStatus];
    if (
      state.faceStatus === 'ready' &&
      state.limitations.includes('Configured capture validation is available.')
    )
      return 'Your assigned workplace could not be confirmed. Ask your supervisor to check your office assignment and its location settings.';
  }
  return 'The server has not provided a specific reason. Refresh this screen. If check-in stays unavailable, contact HR.';
}
