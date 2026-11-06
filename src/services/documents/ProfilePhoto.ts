import ImageResizer from '@bam.tech/react-native-image-resizer';
import ReactNativeBlobUtil from 'react-native-blob-util';
import { launchImageLibrary } from 'react-native-image-picker';
import { AppError } from '../../utils/errors';

export async function pickProfilePhoto(): Promise<string | null> {
  const chosen = await launchImageLibrary({
    mediaType: 'photo',
    selectionLimit: 1,
    includeExtra: false,
    maxWidth: 768,
    maxHeight: 768,
  });
  if (chosen.didCancel) return null;
  const source = chosen.assets?.[0]?.uri;
  if (!source || chosen.errorCode) throw new AppError('invalid_profile_photo');
  const thumbnail = await ImageResizer.createResizedImage(
    source,
    384,
    384,
    'JPEG',
    80,
    0,
    undefined,
    false,
    { mode: 'contain', onlyScaleDown: true },
  );
  try {
    if (thumbnail.size <= 0 || thumbnail.size > 262144)
      throw new AppError('invalid_profile_photo');
    return await ReactNativeBlobUtil.fs.readFile(thumbnail.path, 'base64');
  } finally {
    await ReactNativeBlobUtil.fs.unlink(thumbnail.path).catch(() => undefined);
  }
}
