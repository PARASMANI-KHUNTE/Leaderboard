import axios from 'axios';
import Constants from 'expo-constants';

export const API_URL = Constants.expoConfig?.extra?.API_URL ?? 'http://localhost:5000';

export function createHttpClient(token?: string | null) {
  return axios.create({
    baseURL: API_URL,
    timeout: 10000,
    headers: {
      'ngrok-skip-browser-warning': 'true',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
}

