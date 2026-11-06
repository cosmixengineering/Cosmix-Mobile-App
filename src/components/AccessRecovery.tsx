import { t } from '../i18n/language';
import { useLanguage } from '../i18n/preference';
import React, { useEffect, useRef, useState } from 'react';
import { useServices } from '../app/AppProvider';
import { Button, Notice } from './Controls';
import { describeError } from '../utils/errors';

export function AccessRecovery({
  service,
}: {
  service: string;
}): React.JSX.Element {
  useLanguage();
  const { session } = useServices();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  return (
    <>
      <Notice
        tone="info"
        message={t(
          '{0} access is currently unavailable. Refresh to check your access. Contact HR if the service remains unavailable.',
          service,
        )}
      />
      {error ? <Notice message={error} /> : null}
      <Button
        title={t('Refresh access')}
        secondary
        busy={busy}
        onPress={async () => {
          if (busy) return;
          setBusy(true);
          setError('');
          try {
            await session.revalidate();
          } catch (failure) {
            if (mounted.current) setError(describeError(failure));
          } finally {
            if (mounted.current) setBusy(false);
          }
        }}
      />
    </>
  );
}
