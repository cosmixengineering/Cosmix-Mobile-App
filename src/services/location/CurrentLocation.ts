import { AppState, PermissionsAndroid, Platform } from 'react-native';
import Geolocation, {
  type GeolocationResponse,
} from '@react-native-community/geolocation';
import type { LocationSample } from '../../types/contracts';
import { AppError } from '../../utils/errors';
import { validateLocation } from '../../utils/validation';

const configuration = {
  skipPermissionRequests: Platform.OS === 'android',
  authorizationLevel: 'whenInUse',
  enableBackgroundLocationUpdates: false,
} as const;
Geolocation.setRNConfiguration({
  ...configuration,
  locationProvider: 'playServices',
});

function sampleFrom(position: GeolocationResponse): LocationSample {
  const sample: LocationSample = {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    accuracyMeters: position.coords.accuracy,
    capturedAtUtc: new Date(position.timestamp).toISOString(),
    mocked:
      (position as GeolocationResponse & { mocked?: boolean }).mocked === true,
  };
  validateLocation(sample, Date.now());
  if (sample.accuracyMeters <= 0) throw new AppError('location_unavailable');
  return {
    ...sample,
    latitude: Number(sample.latitude.toFixed(7)),
    longitude: Number(sample.longitude.toFixed(7)),
    accuracyMeters: Math.ceil(sample.accuracyMeters * 100) / 100,
  };
}

function locationError(code: number) {
  const errors: Record<number, string> = {
    1: 'location_permission',
    2: 'location_provider_unavailable',
    3: 'location_timeout',
  };
  return new AppError(errors[code] ?? 'location_unavailable');
}

export class CurrentLocation {
  async ensurePermission(): Promise<void> {
    if (Platform.OS === 'android') {
      const grants = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
      ]);
      if (
        grants[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION] !==
        PermissionsAndroid.RESULTS.GRANTED
      ) {
        throw new AppError('location_permission');
      }
    }
    // iOS requests permission through the bounded position read. Waiting for
    // another authorization-change callback hangs once access is determined.
  }

  async read(): Promise<LocationSample> {
    if (Platform.OS !== 'android') return this.readPosition(true, 15000);
    try {
      return await this.readPrecisePosition();
    } catch (failure) {
      if (
        !(failure instanceof AppError) ||
        !['location_timeout', 'location_provider_unavailable'].includes(
          failure.code,
        ) ||
        AppState.currentState !== 'active'
      )
        throw failure;
      // Devices without a usable fused or satellite fix may still have an OS network fix.
      Geolocation.setRNConfiguration({
        ...configuration,
        locationProvider: 'android',
      });
      try {
        return await this.readPosition(false, 10000);
      } finally {
        Geolocation.setRNConfiguration({
          ...configuration,
          locationProvider: 'playServices',
        });
      }
    }
  }

  private async readPrecisePosition(): Promise<LocationSample> {
    let watch: number | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let subscription: ReturnType<typeof AppState.addEventListener> | undefined;
    try {
      return await new Promise<LocationSample>((resolve, reject) => {
        let best: LocationSample | undefined;
        let unavailable = false;
        const recent = (fix: LocationSample) =>
          Date.now() - Date.parse(fix.capturedAtUtc) <= 20000;
        timer = setTimeout(() => {
          if (best && recent(best)) resolve(best);
          else
            reject(
              new AppError(
                unavailable
                  ? 'location_provider_unavailable'
                  : 'location_timeout',
              ),
            );
        }, 25000);
        subscription = AppState.addEventListener('change', state => {
          if (state !== 'active') reject(new AppError('location_interrupted'));
        });
        watch = Geolocation.watchPosition(
          position => {
            try {
              const fix = sampleFrom(position);
              if (!recent(fix)) return;
              if (
                !best ||
                !recent(best) ||
                fix.accuracyMeters <= best.accuracyMeters
              )
                best = fix;
              // Acquisition target only. The server applies the actual site policy.
              if (fix.accuracyMeters <= 10) resolve(fix);
            } catch (failure) {
              if (
                !(failure instanceof AppError) ||
                failure.code !== 'location_stale'
              )
                reject(failure);
            }
          },
          error => {
            if (error.code === 2) unavailable = true;
            // Fused provider may recover on its next update.
            else reject(locationError(error.code));
          },
          {
            enableHighAccuracy: true,
            interval: 1000,
            fastestInterval: 500,
            distanceFilter: 0,
            maximumAge: 3000,
          },
        );
      });
    } finally {
      if (timer !== undefined) clearTimeout(timer);
      if (watch !== undefined) Geolocation.clearWatch(watch);
      subscription?.remove();
    }
  }

  private readPosition(
    highAccuracy: boolean,
    timeout: number,
  ): Promise<LocationSample> {
    return new Promise((resolve, reject) =>
      Geolocation.getCurrentPosition(
        position => {
          try {
            resolve(sampleFrom(position));
          } catch (failure) {
            reject(failure);
          }
        },
        error => reject(locationError(error.code)),
        {
          enableHighAccuracy: highAccuracy,
          timeout,
          maximumAge: Platform.OS === 'android' ? 5000 : 0,
        },
      ),
    );
  }
}
