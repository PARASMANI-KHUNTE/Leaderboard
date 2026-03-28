import axios from 'axios';
import Constants from 'expo-constants';

import { API_URL } from '../config/env';

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

