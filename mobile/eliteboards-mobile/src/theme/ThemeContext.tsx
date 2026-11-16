import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const THEME_PREF_KEY = 'eliteboards_theme_pref';

export type ThemePreference = 'dark' | 'light' | 'system';

export interface ThemeColors {
  bg: string;
  surface: string;
  surfaceElevated: string;
  card: string;
  border: string;
  borderSubtle: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  primary: string;
  primaryLight: string;
  accent: string;
  danger: string;
  dangerBg: string;
  warning: string;
  warningBg: string;
  success: string;
  successBg: string;
}

const darkColors: ThemeColors = {
  bg: '#020617',
  surface: '#0b1120',
  surfaceElevated: '#111a33',
  card: '#111a33',
  border: '#1f2a4d',
  borderSubtle: 'rgba(255, 255, 255, 0.06)',
  text: '#f8fafc',
  textSecondary: '#94a3b8',
  textMuted: '#64748b',
  primary: '#4f46e5',
  primaryLight: '#818cf8',
  accent: '#6366f1',
  danger: '#f43f5e',
  dangerBg: 'rgba(244, 63, 94, 0.12)',
  warning: '#f59e0b',
  warningBg: 'rgba(245, 158, 11, 0.12)',
  success: '#22c55e',
  successBg: 'rgba(34, 197, 94, 0.12)',
};

const lightColors: ThemeColors = {
  bg: '#f8fafc',
  surface: '#ffffff',
  surfaceElevated: '#f1f5f9',
  card: '#ffffff',
  border: '#e2e8f0',
  borderSubtle: 'rgba(0, 0, 0, 0.06)',
  text: '#0f172a',
  textSecondary: '#475569',
  textMuted: '#94a3b8',
  primary: '#4f46e5',
  primaryLight: '#6366f1',
  accent: '#4f46e5',
  danger: '#e11d48',
  dangerBg: 'rgba(225, 29, 72, 0.08)',
  warning: '#d97706',
  warningBg: 'rgba(217, 119, 6, 0.08)',
  success: '#16a34a',
  successBg: 'rgba(22, 163, 74, 0.08)',
};

interface ThemeContextValue {
  themePreference: ThemePreference;
  setThemePreference: (pref: ThemePreference) => Promise<void>;
  isDark: boolean;
  colors: ThemeColors;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [themePreference, setThemePrefState] = useState<ThemePreference>('dark');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(THEME_PREF_KEY);
        if (saved === 'dark' || saved === 'light' || saved === 'system') {
          setThemePrefState(saved);
        }
      } catch (e) {
        console.warn('Failed to load theme preference', e);
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  const setThemePreference = async (pref: ThemePreference) => {
    setThemePrefState(pref);
    try {
      await AsyncStorage.setItem(THEME_PREF_KEY, pref);
    } catch (e) {
      console.warn('Failed to persist theme preference', e);
    }
  };

  const isDark = useMemo(() => {
    if (themePreference === 'dark') return true;
    if (themePreference === 'light') return false;
    return systemScheme !== 'light';
  }, [themePreference, systemScheme]);

  const colors = useMemo(() => {
    return isDark ? darkColors : lightColors;
  }, [isDark]);

  const value = useMemo(
    () => ({
      themePreference,
      setThemePreference,
      isDark,
      colors,
    }),
    [themePreference, isDark, colors]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return ctx;
}
