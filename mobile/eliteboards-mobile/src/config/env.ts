import { Platform } from 'react-native';
import Constants from 'expo-constants';

/**
 * Standardized API URL resolution for the whole app.
 * Automatically maps localhost / 127.0.0.1 to 10.0.2.2 on Android emulator
 * so network requests never fail or time out if adb reverse drops.
 */
function resolveApiUrl() {
  const configured = 
    process.env.EXPO_PUBLIC_API_URL || 
    Constants.expoConfig?.extra?.API_URL || 
    'https://leaderboard-backend-3pek.onrender.com';

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
