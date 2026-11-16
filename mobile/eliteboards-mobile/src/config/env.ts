import { Platform } from 'react-native';
import Constants from 'expo-constants';

export const PROD_API_URL = 'https://leaderboard-backend-3pek.onrender.com';

/**
 * Standardized API URL resolution for the whole app.
 * Automatically maps localhost / 127.0.0.1 to 10.0.2.2 on Android emulator
 * so network requests never fail or time out if adb reverse drops.
 *
 * In production (!__DEV__), ensures we never connect to localhost or
 * emulator IPs even if a local .env file was bundled during build or OTA export.
 */
function resolveApiUrl() {
  const configured = 
    process.env.EXPO_PUBLIC_API_URL || 
    Constants.expoConfig?.extra?.API_URL || 
    PROD_API_URL;

  // In production (!__DEV__), NEVER use localhost, 127.0.0.1, or 10.0.2.2
  if (!__DEV__) {
    if (!configured || configured.includes('localhost') || configured.includes('127.0.0.1') || configured.includes('10.0.2.2')) {
      return PROD_API_URL;
    }
    return configured;
  }

  // Development mode: map localhost to 10.0.2.2 for Android emulator
  if (Platform.OS === 'android') {
    if (configured.includes('localhost')) {
      return configured.replace('localhost', '10.0.2.2');
    }
    if (configured.includes('127.0.0.1')) {
      return configured.replace('127.0.0.1', '10.0.2.2');
    }
  }
  return configured;
}

export const API_URL = resolveApiUrl();
