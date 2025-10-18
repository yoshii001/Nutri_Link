declare module 'firebase/auth/react-native' {
  // Minimal declarations used in this project to satisfy TypeScript.
  import { Auth } from 'firebase/auth';

  export function initializeAuth(app: any, options?: any): Auth;
  export function getReactNativePersistence(storage: any): any;
}
