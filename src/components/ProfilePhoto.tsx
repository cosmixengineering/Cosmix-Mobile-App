import { LoadingSkeleton } from './ui/LoadingSkeleton';
import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useServices } from '../app/AppProvider';
import { t } from '../i18n/language';
import { useLanguage } from '../i18n/preference';
import { pickProfilePhoto } from '../services/documents/ProfilePhoto';
import { colors } from '../theme/theme';
import { AppError, describeError } from '../utils/errors';

const route = '/api/v1/self-service/profile/photo';
type Photo = { photo: string | null };

type PhotoState = {
  photo: string | null;
  reading: boolean;
  busy: boolean;
  error: string;
  choose: () => Promise<void>;
};
const PhotoContext = createContext<PhotoState | null>(null);

function useProfilePhoto() {
  const state = useContext(PhotoContext);
  if (!state) throw new Error('ProfilePhotoProvider is required');
  return state;
}

export function ProfilePhotoProvider({
  sessionId,
  children,
}: React.PropsWithChildren<{ sessionId: string | null }>) {
  const { session } = useServices();
  const [reading, setReading] = useState(Boolean(sessionId));
  const [photo, setPhoto] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const revision = useRef(0);
  const uploading = useRef(false);
  useEffect(() => {
    if (!sessionId) return;
    const current = ++revision.current;
    session
      .request<Photo>(route)
      .then(result => {
        if (current === revision.current) setPhoto(result.photo);
      })
      .catch(failure => {
        if (current === revision.current) setError(describeError(failure));
      })
      .finally(() => {
        if (current === revision.current) setReading(false);
      });
    return () => {
      revision.current = current + 1;
    };
  }, [session, sessionId]);
  const choose = async () => {
    if (!sessionId || uploading.current) return;
    uploading.current = true;
    const current = revision.current;
    setBusy(true);
    setError('');
    try {
      const selected = await pickProfilePhoto();
      if (
        !selected ||
        current !== revision.current ||
        session.getSnapshot().sessionId !== sessionId
      )
        return;
      const saved = await session.request<Photo>(route, {
        method: 'POST',
        body: { photo: selected },
      });
      if (!saved.photo) throw new AppError('invalid_server_response');
      if (current === revision.current) {
        revision.current++;
        setPhoto(saved.photo);
        setError('');
      }
    } catch (failure) {
      if (current === revision.current) setError(describeError(failure));
    } finally {
      uploading.current = false;
      if (session.getSnapshot().sessionId === sessionId) setBusy(false);
    }
  };
  return (
    <PhotoContext.Provider value={{ photo, reading, busy, error, choose }}>
      {children}
    </PhotoContext.Provider>
  );
}

export function ProfileAvatar({
  initials,
  size,
}: {
  initials: string;
  size: number;
}) {
  const { photo, reading } = useProfilePhoto();
  const shape = { width: size, height: size, borderRadius: size / 2 };
  return (
    <View style={[styles.avatar, shape]}>
      {reading ? (
        <LoadingSkeleton kind="avatar" />
      ) : photo ? (
        <Image
          source={{ uri: 'data:image/jpeg;base64,' + photo }}
          style={shape}
        />
      ) : (
        <Text style={styles.initials}>{initials}</Text>
      )}
    </View>
  );
}

export function ProfilePhoto({
  initials,
  size = 56,
}: {
  initials: string;
  size?: number;
}) {
  useLanguage();
  const { busy, reading, photo, error, choose } = useProfilePhoto();
  return (
    <View style={styles.group}>
      <Pressable
        disabled={busy || reading}
        accessibilityRole="button"
        accessibilityLabel={t(photo ? 'Change photo' : 'Add photo')}
        accessibilityState={{ busy }}
        onPress={choose}
        style={styles.avatarButton}
      >
        <ProfileAvatar initials={initials} size={size} />
        <View style={styles.cameraBadge}>
          <Text style={styles.cameraIcon}>📷</Text>
        </View>
      </Pressable>
      {busy ? <Text style={styles.busyText}>{t('Saving…')}</Text> : null}
      {error ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { alignItems: 'center' },
  avatarButton: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.navy,
    borderWidth: 2,
    borderColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraIcon: {
    fontSize: 10,
  },
  busyText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
  },
  avatar: {
    backgroundColor: '#DFEBF8',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  initials: { fontWeight: '700', color: colors.navy, fontSize: 18 },
  error: {
    color: colors.danger,
    fontSize: 11,
    marginTop: 4,
    textAlign: 'center',
  },
});
