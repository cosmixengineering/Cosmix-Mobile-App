import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton';
import { LanguageSwitch } from '../../components/LanguageSwitch';
import { t } from '../../i18n/language';
import { useLanguage } from '../../i18n/preference';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { AppState, StyleSheet, Text, View } from 'react-native';
import { useServices, useSession } from '../../app/AppProvider';
import { nonLocationWorkspace } from '../../services/consent/workspaceAccess';
import { Button, Notice, Screen } from '../../components/Controls';
import {
  LocationConsentService,
  type LocationConsentStatus,
} from '../../services/consent/locationConsentService';
import { layout } from '../../theme/theme';
import { LocationConsentScreen } from './LocationConsentScreen';

const ConsentContext = createContext<(() => Promise<boolean>) | null>(null);
export function useLocationConsentCheck() {
  const check = useContext(ConsentContext);
  if (!check) throw new Error('LocationConsentGate is required');
  return check;
}

// Mounted with a session key: no previous employee's policy result survives login.
export function LocationConsentGate({
  children,
}: React.PropsWithChildren): React.JSX.Element {
  const session = useSession();
  if (
    session.status === 'authenticated' &&
    nonLocationWorkspace(session.permissions)
  ) {
    return (
      <ConsentContext.Provider value={denyLocation}>
        {children}
      </ConsentContext.Provider>
    );
  }
  return <RequiredLocationConsent>{children}</RequiredLocationConsent>;
}

const denyLocation = async () => false;

function RequiredLocationConsent({
  children,
}: React.PropsWithChildren): React.JSX.Element {
  useLanguage();
  const { session } = useServices();
  const [service] = useState(() => new LocationConsentService(session));
  const [status, setStatus] = useState<LocationConsentStatus | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const sequence = useRef(0);
  const refresh = useCallback(async () => {
    const request = ++sequence.current;
    setLoading(true);
    try {
      const value = await service.getConsentStatus();
      if (request !== sequence.current) return false;
      setStatus(value);
      setError('');
      return value.hasActivePolicy && value.status === 'Consented';
    } catch {
      if (request === sequence.current) {
        setStatus(null);
        setError(
          t(
            'The company location policy could not be checked. Retry before continuing, or sign out.',
          ),
        );
      }
      return false;
    } finally {
      if (request === sequence.current) setLoading(false);
    }
  }, [service]);
  const invalidate = useCallback(() => {
    sequence.current++;
  }, []);
  useEffect(() => {
    refresh();
    const listener = AppState.addEventListener('change', next => {
      if (next === 'active') refresh();
    });
    return () => {
      invalidate();
      listener.remove();
    };
  }, [refresh, invalidate]);
  const signOut = () => {
    session
      .signOut()
      .catch(() => setError(t('Sign out could not finish. Please retry.')));
  };
  if (status?.status === 'PendingConsent') {
    return (
      <LocationConsentScreen
        key={status.activePolicyVersion}
        status={status}
        service={service}
        onConsentAccepted={refresh}
        onSignOut={signOut}
        onPolicyChanged={refresh}
      />
    );
  }
  if (status && !status.hasActivePolicy) {
    return (
      <Screen includeTopInset>
        <LanguageSwitch />
        <View style={layout.card}>
          <Text style={layout.title}>{t('Location Tracking Notice')}</Text>
          <Notice
            message={t(
              'Location collection policy has not been configured by HR. Attendance location tracking is unavailable.',
            )}
            tone="info"
          />
          <Text style={[layout.body, styles.policyExplanation]}>
            {t(
              'Your company has not published an active location notice. Native location tracking cannot begin until HR configures and publishes the required policy.',
            )}
          </Text>
          <Button
            title={t('Refresh policy status')}
            onPress={() => {
              refresh();
            }}
            busy={loading}
          />
          <Button title={t('Sign out')} secondary onPress={signOut} />
        </View>
      </Screen>
    );
  }
  if (!status || error) {
    return (
      <Screen includeTopInset>
        <LanguageSwitch />
        <View style={layout.card}>
          <Text style={layout.title}>{t('Location policy')}</Text>
          {error ? (
            <Notice message={error} tone="error" />
          ) : (
            <LoadingSkeleton
              label={t('Checking the current company location policy…')}
            />
          )}
          <Button
            title={t('Retry policy check')}
            onPress={() => {
              refresh();
            }}
            busy={loading}
          />
          <Button title={t('Sign out')} secondary onPress={signOut} />
        </View>
      </Screen>
    );
  }
  return (
    <ConsentContext.Provider value={refresh}>
      {children}
    </ConsentContext.Provider>
  );
}

const styles = StyleSheet.create({
  policyExplanation: { marginTop: 12 },
});
