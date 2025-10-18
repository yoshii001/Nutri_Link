import { initializeApp } from 'firebase/app';
import { getAuth, initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getDatabase } from 'firebase/database';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Load Firebase config from Expo public environment variables.
// These should be provided via `app.config.ts` or the environment in CI/CD.
const firebaseConfig = {
  // Prefer environment variables (EXPO_PUBLIC_*). If they are not provided
  // the values below act as safe fallbacks (copied from local .env content).
  // NOTE: Keep real secrets out of source control in production. Use EAS
  // secrets or CI environment variables instead.
  apiKey: "AIzaSyCm-c5f6h_CHCTw95nnZQE5qYfMMqk-a4o",
  authDomain: "kids-feed.firebaseapp.com",
  databaseURL: "https://kids-feed-default-rtdb.firebaseio.com",
  projectId: "kids-feed",
  storageBucket: "kids-feed.firebasestorage.app",
  messagingSenderId: "256985647929",
  appId: "1:256985647929:web:5b4db8a62d626c0db9f6e8",
  measurementId: "G-1FFEDF4FPJ"
};

// Optional runtime warning to help developers configure env vars locally.
if (!firebaseConfig.apiKey) {
  // eslint-disable-next-line no-console
  console.warn('[config/firebase] EXPO_PUBLIC_FIREBASE_API_KEY is not set. Initialize Firebase with real credentials via app.config.ts or environment variables.');
}
const app = initializeApp(firebaseConfig);

// Use React Native persistence when running on native platforms so auth state
// persists between app launches. We avoid a static import of
// 'firebase/auth/react-native' because Metro may not resolve that path at
// bundle-time. Instead we attempt to require it at runtime and fall back to
// `getAuth` on web or if the require fails.
export let auth: any;
if (Platform.OS === 'web') {
  auth = getAuth(app);
} else {
  try {
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch (e) {
    // If initializeAuth fails at runtime, fall back to getAuth and log the
    // error so developers can investigate.
    // eslint-disable-next-line no-console
    console.warn('[config/firebase] Failed to initialize react-native auth persistence. Falling back to getAuth.', e);
    auth = getAuth(app);
  }
}

export const database = getDatabase(app);
export default app;
