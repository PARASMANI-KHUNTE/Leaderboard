import axios from 'axios';
import Constants from 'expo-constants';

import { API_URL } from '../config/env';

export function createHttpClient(token?: string | null) {
  const instance = axios.create({
    baseURL: API_URL,
    timeout: 10000,
    headers: {
      'ngrok-skip-browser-warning': 'true',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  instance.interceptors.response.use(
    (response) => response,
    (error) => {
      console.warn(`[HTTP Error] ${error.config?.method?.toUpperCase()} ${error.config?.url}:`, error.message);
      return Promise.reject(error);
    }
  );

  return instance;
}

