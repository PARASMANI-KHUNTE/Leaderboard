import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';

type User = {
  id: string;
  name: string;
  email?: string;
  picture?: string;
  isAdmin: boolean;
  isBanned: boolean;
};

type AuthContextValue = {
  user: User | null;
  token: string | null;
  loading: boolean;
  exchangeCodeAndSignIn: (code: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const TOKEN_KEY = 'eliteboards_token';

const API_URL = Constants.expoConfig?.extra?.API_URL ?? 'http://localhost:5000';

export function useAuth() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (jwtToken: string) => {
    const res = await axios.get(`${API_URL}/auth/profile`, {
      headers: { 
        Authorization: `Bearer ${jwtToken}`,
        'ngrok-skip-browser-warning': 'true'
      },
      timeout: 10000,
    });

    setUser({
      id: res.data.id,
      name: res.data.name,
      email: res.data.email,
      picture: res.data.picture,
      isAdmin: res.data.isAdmin,
      isBanned: res.data.isBanned,
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stored = await SecureStore.getItemAsync(TOKEN_KEY);
        if (!stored) {
          setToken(null);
          setUser(null);
          return;
        }
        if (cancelled) return;
        setToken(stored);
        await fetchProfile(stored);
      } catch {
        // If stored token is invalid/banned, clear it and allow user to re-login.
        await SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => {});
        if (!cancelled) {
          setToken(null);
          setUser(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [fetchProfile]);

  const exchangingRef = React.useRef(false);

  const exchangeCodeAndSignIn = useCallback(
    async (code: string) => {
      if (exchangingRef.current) {
        console.log('[Auth] Exchange already in progress, ignoring duplicate call');
        return;
      }
      exchangingRef.current = true;

      try {
        console.log('[Auth] Exchanging code at:', `${API_URL}/api/auth/exchange`);
        console.log('[Auth] Code length:', code.length);
        const res = await axios.post(
          `${API_URL}/api/auth/exchange`,
          { code },
          { 
            timeout: 10000,
            headers: { 'ngrok-skip-browser-warning': 'true' }
          }
        );

        const nextToken = res.data?.token;
        if (!nextToken || typeof nextToken !== 'string') {
          throw new Error('Exchange did not return a token');
        }

        console.log('[Auth] Token received, storing...');
        await SecureStore.setItemAsync(TOKEN_KEY, nextToken);
        setToken(nextToken);
        await fetchProfile(nextToken);
        console.log('[Auth] Login complete');
      } finally {
        // We delay resetting the flag slightly to catch immediate subsequent deep links
        setTimeout(() => {
          exchangingRef.current = false;
        }, 2000);
      }
    },
    [fetchProfile]
  );

  const logout = useCallback(async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => {});
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, token, loading, exchangeCodeAndSignIn, logout }),
    [user, token, loading, exchangeCodeAndSignIn, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

