import 'dotenv/config';
import { ExpoConfig, ConfigContext } from '@expo/config';

// app.config.ts ensures Expo has access to the public env vars at build time.
// It maps environment variables (process.env.*) to expo.extra and exposes
// public ones as EXPO_PUBLIC_* so they are available to the JS runtime.

export default ({ config }: ConfigContext): ExpoConfig => {
  const updated: ExpoConfig = {
    ...config,
    name: config.name ?? 'NutriLink',
    slug: (config.slug as string) ?? 'nutrilink',
    // IMPORTANT: merge existing extra (from app.json) so we don't drop values like extra.eas.projectId
    extra: {
      ...(config.extra as any),
      eas: {
        // Ensure EAS project id is available for eas build/linking
        projectId:
          (config as any)?.extra?.eas?.projectId ?? 'ab335c42-eca5-4775-a437-7d261d898d60',
      },
    },
    // In bare workflow, runtimeVersion must be a static string (policy not supported)
    runtimeVersion: config.version ?? '1.0.0',
    owner: config.owner,
  } as ExpoConfig;

  // Map expected environment variables into process.env at build time.
  process.env.EXPO_PUBLIC_FIREBASE_API_KEY = process.env.EXPO_PUBLIC_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY;
  process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN = process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || process.env.FIREBASE_AUTH_DOMAIN;
  process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL = process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL || process.env.FIREBASE_DATABASE_URL;
  process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;
  process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET = process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || process.env.FIREBASE_STORAGE_BUCKET;
  process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID = process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || process.env.FIREBASE_MESSAGING_SENDER_ID;
  process.env.EXPO_PUBLIC_FIREBASE_APP_ID = process.env.EXPO_PUBLIC_FIREBASE_APP_ID || process.env.FIREBASE_APP_ID;
  process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID = process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID || process.env.FIREBASE_MEASUREMENT_ID;

  return updated;
};
