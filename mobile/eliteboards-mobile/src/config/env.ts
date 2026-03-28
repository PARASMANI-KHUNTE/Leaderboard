import Constants from 'expo-constants';

/**
 * Standardized API URL resolution for the whole app.
 * Prioritizes process.env.EXPO_PUBLIC_API_URL, then eas.json extra, then fallback.
 */
export const API_URL = 
  process.env.EXPO_PUBLIC_API_URL || 
  Constants.expoConfig?.extra?.API_URL || 
  'https://leaderboard-backend-3pek.onrender.com';
