import { displayLocale, t } from '../i18n/language';
import { useLanguage } from '../i18n/preference';
import React, { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { InfoRow, StatusBadge } from './ServiceControls';
import { Notice } from './Controls';
import type { DataRecord, ServiceKey } from '../types/selfService';
import {
  amount,
  fraction,
  numeric,
  record,
  records,
  status,
  text,
} from '../utils/serviceValues';
import { colors, layout } from '../theme/theme';

function ProfileRow({
  label,
  value,
  children,
  isLast = false,
}: {
  label: string;
  value?: string | number | null;
  children?: React.ReactNode;
  isLast?: boolean;
}): React.JSX.Element {
  useLanguage();
  return (
    <View style={[styles.profileRow, isLast && styles.noBorder]}>
      <Text style={styles.profileLabel}>{label}</Text>
      <View style={styles.profileValueWrap}>
        {children ?? (
          <Text selectable style={styles.profileValue}>
            {value ?? t('Unavailable')}
          </Text>
        )}
      </View>
    </View>
  );
}

const list = (value: unknown) => (Array.isArray(value) ? records(value) : []);
const number = (value: unknown) =>
  numeric(value)?.toLocaleString(displayLocale('en-PK')) ?? t('Unavailable');
export function ServiceSummary({
  service,
  root,
}: {
  service: ServiceKey;
  root: DataRecord;
}): React.JSX.Element | null {
  useLanguage();
  const [reveal, setReveal] = useState(false);
  if (service === 'loans') {
    return (
      <View style={layout.card}>
        <Text style={layout.heading}>{t('Your borrowing summary')}</Text>
        <InfoRow
          label={t('Outstanding balance')}
          value={amount(root.currentOutstandingBalance, root.currency)}
        />
        <InfoRow
          label={t('Recorded repayments')}
          value={amount(root.totalRepaidAmount, root.currency)}
        />
        <InfoRow
          label={t('Active agreements')}
          value={number(root.activeAgreementsCount)}
        />
        <Notice
          tone="info"
          message={t(
            'Requests need company approval. Repayment records and balances are shown separately from request status.',
          )}
        />
      </View>
    );
  }
  if (service === 'resignation') {
    return (
      <View style={layout.card}>
        <InfoRow
          label={t('Current employment status')}
          value={text(root.currentStatus)}
        />
        <Text style={layout.body}>
          {root.canSubmit === true
            ? t(
                'You can submit a resignation request for independent HR review.',
              )
            : t(
                'A new resignation request is currently unavailable. Contact HR about your employment record or an outstanding request.',
              )}
        </Text>
      </View>
    );
  }
  if (service === 'shift') {
    return (
      <View style={layout.card}>
        <Text style={layout.heading}>{t('Your dated shift')}</Text>
        <InfoRow label={t('Schedule')} value={status(root.status)} />
        <InfoRow label={t('Business date')} value={text(root.businessDate)} />
        <InfoRow label={t('Time zone')} value={text(root.timeZone)} />
        <InfoRow label={t('Starts')} value={text(root.startsAt)} />
        <InfoRow label={t('Ends')} value={text(root.endsAt)} />
        <InfoRow
          label={t('Scheduled minutes')}
          value={number(root.configuredScheduledMinutes)}
        />
        {root.holiday ? (
          <InfoRow
            label={t('Holiday')}
            value={text(record(root.holiday).name)}
          />
        ) : null}
      </View>
    );
  }
  if (service === 'calendar') {
    return (
      <View style={layout.card}>
        <Text style={layout.heading}>{t('Monthly assessment')}</Text>
        <InfoRow label={t('Calculation status')} value={status(root.status)} />
        {[
          [t('Present'), 'presentDays'],
          [t('Absent'), 'absentDays'],
          [t('Leave'), 'leaveDays'],
          [t('Holidays'), 'holidayDays'],
          [t('Rest days'), 'restDays'],
          [t('Late'), 'lateDays'],
          [t('Worked minutes'), 'totalWorkedMinutes'],
          [t('Overtime minutes'), 'totalOvertimeMinutes'],
        ].map(([label, key]) => (
          <InfoRow key={key} label={label} value={number(root[key])} />
        ))}
        <Text style={layout.muted}>
          {t(
            'Unavailable values have not been supplied or calculated. Attendance assessments are separate from payroll settlement.',
          )}
        </Text>
      </View>
    );
  }
  if (service === 'leaves') {
    const overview = root.overview ? record(root.overview) : null;
    return (
      <View style={layout.card}>
        <Text style={layout.heading}>{t('Leave balances')}</Text>
        {!overview ? (
          <Text style={layout.muted}>
            {t(
              'The summary is unavailable or needs additional company access. Check an exact policy balance in the application form.',
            )}
          </Text>
        ) : (
          <>
            <InfoRow label={t('As of')} value={text(overview.asOf)} />
            {list(overview.balances).map((row, index) => {
              const balance = row.balance ? record(row.balance) : null;
              return (
                <View key={index} style={layout.stack6}>
                  <Text style={layout.label}>{text(row.leaveTypeName)}</Text>
                  <StatusBadge value={row.status} />
                  {balance ? (
                    <>
                      <InfoRow
                        label={t('Annual remaining')}
                        value={
                          balance.annualBalance
                            ? fraction(
                                record(balance.annualBalance).remainingDays,
                              )
                            : t('Unavailable')
                        }
                      />
                      <InfoRow
                        label={t('Type remaining')}
                        value={
                          balance.typeBalance
                            ? fraction(
                                record(balance.typeBalance).remainingDays,
                              )
                            : t('Not specified by this policy')
                        }
                      />
                    </>
                  ) : (
                    <Text style={layout.muted}>
                      {t('No confirmed numeric balance supplied.')}
                    </Text>
                  )}
                </View>
              );
            })}
          </>
        )}
      </View>
    );
  }
  if (service === 'profile') {
    const assignment = root.activeAssignment
      ? record(root.activeAssignment)
      : null;
    const identity = text(root.identityDocumentNumber, '');
    const mask = identity ? `•••• ${identity.slice(-4)}` : t('Unavailable');
    const isAvailable =
      String(root.assignmentStatus ?? '').toLowerCase() === 'available';

    const assignmentRows: readonly [string, string][] = [
      [t('Department'), 'departmentName'],
      [t('Designation'), 'designationTitle'],
      [t('Staff Category'), 'staffCategoryName'],
      [t('Employment Type'), 'employmentTypeName'],
      [t('Branch Office'), 'branchName'],
      [t('Work Site'), 'siteName'],
      [t('Reporting Manager'), 'reportingManagerName'],
    ];

    const documentsList = list(root.documents);
    const assetsList = list(root.assignedAssets);
    const simsList = list(root.assignedSims);

    return (
      <>
        {/* Card 1: Employment Details */}
        <View style={layout.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={layout.heading}>{t('Employment Details')}</Text>
            <View
              style={[
                styles.statusBadge,
                isAvailable
                  ? styles.statusBadgeActive
                  : styles.statusBadgeNeutral,
              ]}
            >
              <View
                style={[
                  styles.dot,
                  isAvailable ? styles.dotActive : styles.dotNeutral,
                ]}
              />
              <Text
                style={[
                  styles.statusBadgeText,
                  isAvailable
                    ? styles.statusBadgeTextActive
                    : styles.statusBadgeTextNeutral,
                ]}
              >
                {t(text(root.assignmentStatus, 'unavailable'))}
              </Text>
            </View>
          </View>

          <ProfileRow label={t('Employee ID')}>
            <View style={styles.idChip}>
              <Text style={styles.idChipText}>
                #{number(root.employeeNumber)}
              </Text>
            </View>
          </ProfileRow>

          <ProfileRow label={t('Joined Date')} value={text(root.joinedOn)} />

          <ProfileRow label={t('National Identity')}>
            <View style={styles.identityInline}>
              <Text selectable style={styles.profileValue}>
                {reveal ? identity || t('Unavailable') : mask}
              </Text>
              {identity ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={
                    reveal
                      ? t('Hide identity number')
                      : t('Show identity number')
                  }
                  onPress={() => setReveal(prev => !prev)}
                  style={styles.revealBtn}
                >
                  <Text style={styles.revealBtnText}>
                    {reveal ? t('Hide') : t('Show')}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          </ProfileRow>

          {text(root.fullLegalName) &&
          text(root.fullLegalName) !== text(root.preferredName) ? (
            <ProfileRow
              label={t('Legal Name')}
              value={text(root.fullLegalName)}
              isLast
            />
          ) : null}
        </View>

        {/* Card 2: Organization & Position */}
        {assignment ? (
          <View style={layout.card}>
            <Text style={layout.heading}>{t('Organization & Position')}</Text>
            {assignmentRows.map(([label, key], index) => {
              const val = text(assignment[key], '');
              return (
                <ProfileRow
                  key={key}
                  label={label}
                  value={val || t('Not assigned')}
                  isLast={index === assignmentRows.length - 1}
                />
              );
            })}
          </View>
        ) : null}

        {/* Card 3: Work Contact */}
        <View style={layout.card}>
          <Text style={layout.heading}>{t('Work Contact')}</Text>
          <ProfileRow
            label={t('Official Email')}
            value={text(root.officialEmail, t('Unavailable'))}
          />
          <ProfileRow
            label={t('Company Phone')}
            value={text(root.companyPhone, t('Unavailable'))}
            isLast
          />
        </View>

        {/* Card 4: Documents */}
        <View style={layout.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={layout.heading}>{t('Documents & KYC')}</Text>
            {documentsList.length > 0 ? (
              <Text style={styles.badgeCount}>{documentsList.length}</Text>
            ) : null}
          </View>
          {documentsList.length === 0 ? (
            <Text style={layout.muted}>{t('No documents on file.')}</Text>
          ) : (
            documentsList.map((row, index) => (
              <View
                key={index}
                style={[
                  styles.itemCard,
                  index === documentsList.length - 1 && styles.noBorder,
                ]}
              >
                <View style={styles.itemHeader}>
                  <Text style={styles.itemTitle} numberOfLines={1}>
                    {text(row.originalFileName, t('Document'))}
                  </Text>
                  <StatusBadge value={row.verificationStatus} />
                </View>
                <View style={styles.itemMeta}>
                  <Text style={styles.metaText}>
                    {t('Scan:')} {status(row.scanStatus)}
                  </Text>
                  <Text style={styles.metaDivider}>•</Text>
                  <Text style={styles.metaText}>
                    {t('Expires:')} {text(row.expiresOn, t('No expiry'))}
                  </Text>
                </View>
              </View>
            ))
          )}
          <Text style={styles.cardHelpText}>
            {t('Contact HR administration for updates or official copies.')}
          </Text>
        </View>

        {/* Card 5: Assigned Assets & SIMs */}
        <View style={layout.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={layout.heading}>{t('Assigned Assets & SIMs')}</Text>
            {assetsList.length + simsList.length > 0 ? (
              <Text style={styles.badgeCount}>
                {assetsList.length + simsList.length}
              </Text>
            ) : null}
          </View>
          {assetsList.map((row, index) => (
            <View
              key={`asset-${index}`}
              style={[
                styles.itemCard,
                index === assetsList.length - 1 &&
                  simsList.length === 0 &&
                  styles.noBorder,
              ]}
            >
              <View style={styles.itemHeader}>
                <Text style={styles.itemTitle}>
                  {text(row.assetReference, t('Asset'))}
                </Text>
                <View
                  style={[
                    styles.statusBadge,
                    row.isActive === true
                      ? styles.statusBadgeActive
                      : styles.statusBadgeNeutral,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusBadgeText,
                      row.isActive === true
                        ? styles.statusBadgeTextActive
                        : styles.statusBadgeTextNeutral,
                    ]}
                  >
                    {row.isActive === true ? t('Assigned') : t('Returned')}
                  </Text>
                </View>
              </View>
              <Text style={styles.metaText}>
                {t('Issued:')} {text(row.issuedAt, '—')}
              </Text>
            </View>
          ))}
          {simsList.map((row, index) => (
            <View
              key={`sim-${index}`}
              style={[
                styles.itemCard,
                index === simsList.length - 1 && styles.noBorder,
              ]}
            >
              <View style={styles.itemHeader}>
                <Text style={styles.itemTitle}>
                  {text(row.phoneNumber, t('SIM Line'))}
                </Text>
                <StatusBadge value={row.status} />
              </View>
              <Text style={styles.metaText}>
                {t('Ref:')} {text(row.simReference, '—')}
              </Text>
            </View>
          ))}
          {!assetsList.length && !simsList.length ? (
            <Text style={layout.muted}>
              {t('No company equipment or SIM cards currently assigned.')}
            </Text>
          ) : null}
        </View>
      </>
    );
  }
  if (service === 'finances') {
    const compensation = root.currentCompensation
      ? record(root.currentCompensation)
      : null;
    return (
      <>
        <View style={layout.card}>
          <Text style={layout.heading}>{t('Current compensation')}</Text>
          {compensation ? (
            <>
              <InfoRow
                label={t('Base')}
                value={amount(compensation.baseAmount, compensation.currency)}
              />
              <InfoRow
                label={t('Gross')}
                value={amount(compensation.grossAmount, compensation.currency)}
              />
              <InfoRow
                label={t('Wage basis')}
                value={status(compensation.wageBasis)}
              />
              <InfoRow
                label={t('Effective from')}
                value={text(compensation.effectiveFrom)}
              />
            </>
          ) : (
            <Text style={layout.muted}>
              {t('No compensation record available.')}
            </Text>
          )}
        </View>
        <View style={layout.card}>
          <Text style={layout.heading}>{t('Active agreements')}</Text>
          {list(root.activeAgreements).map((row, index) => (
            <View key={index} style={layout.stack6}>
              <Text style={layout.label}>{text(row.agreementNumber)}</Text>
              <InfoRow
                label={t('Balance')}
                value={amount(row.remainingBalance, row.currency)}
              />
              <InfoRow label={t('Next due')} value={text(row.nextDueDate)} />
            </View>
          ))}
          {!list(root.activeAgreements).length ? (
            <Text style={layout.muted}>
              {t('No active agreements available.')}
            </Text>
          ) : null}
        </View>
        <View style={layout.card}>
          <Text style={layout.heading}>{t('Recent repayments')}</Text>
          {list(root.recentRepayments).map((row, index) => (
            <InfoRow
              key={index}
              label={`${text(row.entryDate)} · ${text(row.agreementNumber)}`}
              value={amount(row.amount, row.currency)}
            />
          ))}
          {!list(root.recentRepayments).length ? (
            <Text style={layout.muted}>{t('No recorded repayments.')}</Text>
          ) : null}
        </View>
        <View style={layout.card}>
          <Text style={layout.heading}>{t('Payroll summaries')}</Text>
          {list(root.recentPayrollSummaries).map((row, index) => (
            <View key={index} style={layout.stack6}>
              <Text style={layout.label}>{text(row.batchReference)}</Text>
              <InfoRow
                label={t('Period')}
                value={`${text(row.periodStart)} – ${text(row.periodEnd)}`}
              />
              <InfoRow
                label={t('Net payable')}
                value={amount(row.netPayable, row.currency)}
              />
            </View>
          ))}
          {!list(root.recentPayrollSummaries).length ? (
            <Text style={layout.muted}>
              {t('No payroll summary available.')}
            </Text>
          ) : null}
          <Notice
            tone="info"
            message={t(
              'A payroll summary or handoff is not proof of payment. Contact Accounts for settlement confirmation.',
            )}
          />
        </View>
      </>
    );
  }
  if (service === 'vehicles') {
    return (
      <View style={layout.card}>
        <Text style={layout.heading}>{t('Your assigned vehicles')}</Text>
        {list(root.custody).map((row, index) => (
          <InfoRow
            key={index}
            label={text(row.registrationNumber)}
            value={`${
              row.isActive === true ? 'Current assignment' : 'Returned'
            } · ${text(row.issuedAt)}`}
          />
        ))}
        {!list(root.custody).length ? (
          <Text style={layout.muted}>
            {t('No vehicle assignments available.')}
          </Text>
        ) : null}
      </View>
    );
  }
  return null;
}

const styles = StyleSheet.create({
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 4,
  },
  badgeCount: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.muted,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    overflow: 'hidden',
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 9,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E9EEF4',
  },
  noBorder: {
    borderBottomWidth: 0,
  },
  profileLabel: {
    fontSize: 13,
    color: colors.muted,
    flex: 1,
    paddingRight: 8,
  },
  profileValueWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    flexShrink: 1,
  },
  profileValue: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.navy,
    textAlign: 'right',
  },
  idChip: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  idChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.navy,
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
  },
  identityInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  revealBtn: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#D0D7DE',
  },
  revealBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 5,
  },
  statusBadgeActive: {
    backgroundColor: '#E6F4EA',
  },
  statusBadgeNeutral: {
    backgroundColor: '#F1F3F5',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    backgroundColor: '#137333',
  },
  dotNeutral: {
    backgroundColor: '#6C757D',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  statusBadgeTextActive: {
    color: '#137333',
  },
  statusBadgeTextNeutral: {
    color: '#495057',
  },
  itemCard: {
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E9EEF4',
    gap: 4,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  itemTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.navy,
    flex: 1,
  },
  itemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 12,
    color: colors.muted,
  },
  metaDivider: {
    fontSize: 12,
    color: colors.line,
  },
  cardHelpText: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 4,
  },
});
