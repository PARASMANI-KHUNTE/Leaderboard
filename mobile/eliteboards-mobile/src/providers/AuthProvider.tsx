import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { io } from 'socket.io-client';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { API_URL } from '../config/env';

const isExpoGo = typeof Constants !== 'undefined' && Constants.appOwnership === 'expo';
let Notifications: any;
if (!isExpoGo) {
  try {
    Notifications = require('expo-notifications');
  } catch (e) {
    // silently ignore push notification absence in dev
  }
}

type User = {
  id: string;
  name: string;
  email?: string;
  picture?: string;
  isAdmin: boolean;
  isBanned: boolean;
  stats?: {
    heartsEarned: number;
    totalSubmissions: number;
  };
};

type AuthContextValue = {
  user: User | null;
  token: string | null;
  loading: boolean;
  notifications: any[];
  unreadCount: number;
  clearUnread: () => void;
  exchangeCodeAndSignIn: (code: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const TOKEN_KEY = 'eliteboards_token';
const NOTIFS_KEY = 'eliteboards_notifs';
const UNREAD_KEY = 'eliteboards_unread';

export function useAuth() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [expoPushToken, setExpoPushToken] = useState('');

  // Configure Notifications behavior
  if (Notifications) {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  }

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
      stats: res.data.stats,
    });
  }, []);

  // Persistence: Load notifications from SecureStore
  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      try {
        const saved = await SecureStore.getItemAsync(`${NOTIFS_KEY}_${user.id}`);
        const unread = await SecureStore.getItemAsync(`${UNREAD_KEY}_${user.id}`);
        if (saved) setNotifications(JSON.parse(saved));
        if (unread) setUnreadCount(parseInt(unread));
      } catch (e) {}
    })();
  }, [user?.id]);

  // Persistence: Save notifications to SecureStore
  useEffect(() => {
    if (!user?.id) return;
    SecureStore.setItemAsync(`${NOTIFS_KEY}_${user.id}`, JSON.stringify(notifications)).catch(() => {});
    SecureStore.setItemAsync(`${UNREAD_KEY}_${user.id}`, unreadCount.toString()).catch(() => {});
  }, [notifications, unreadCount, user?.id]);

  // Socket Listener for Notifications
  useEffect(() => {
    if (!user?.id) return;

    const socket = io(API_URL, {
      auth: token ? { token } : {},
    });
    
    socket.on('connect', () => {
      socket.emit('joinUser', user.id);
      if (user.isAdmin) {
        socket.emit('joinAdmin');
      }
    });

    socket.on('connect_error', (err) => {
      // optional: Handle connection error silently or track metrics
    });

    socket.on('globalNotification', (notif: any) => {
      const newNotif = {
        id: Date.now(),
        ...notif,
        timestamp: new Date().toISOString(),
      };
      setNotifications(prev => [newNotif, ...prev].slice(0, 30));
      setUnreadCount(prev => prev + 1);

      // Trigger a local banner
      if (Notifications) {
        Notifications.scheduleNotificationAsync({
          content: {
            title: 'EliteBoards Update',
            body: notif.message,
            data: { url: notif.url },
          },
          trigger: null, // show immediately
        }).catch(() => {});
      }
    });

    return () => { socket.disconnect(); };
  }, [token, user?.id]);

  // Request Permissions & Register Push
  useEffect(() => {
    if (!user?.id) return;

    if (Notifications) {
      registerForPushNotificationsAsync().then(token => {
        if (token) {
          setExpoPushToken(token);
        }
      });

      const responseListener = Notifications.addNotificationResponseReceivedListener((response: any) => {
        // Handle deep linking from notification click here if needed
      });

      return () => {
        responseListener.remove();
      };
    }
  }, [user?.id]);

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
    setNotifications([]);
    setUnreadCount(0);
  }, []);

  const clearUnread = useCallback(() => {
    setUnreadCount(0);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, token, loading, notifications, unreadCount, clearUnread, exchangeCodeAndSignIn, logout }),
    [user, token, loading, notifications, unreadCount, clearUnread, exchangeCodeAndSignIn, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

async function registerForPushNotificationsAsync() {
  if (!Notifications) return null;
  
  let token;
  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      console.warn('Failed to get push token for push notification!');
      return;
    }
    // Learn more about projectId here: https://docs.expo.dev/push-notifications/push-notifications-setup/#configure-projectid
    // This is the project ID from your app.json
    try {
      const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
      token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    } catch (e) {
      console.error('[Push] Error getting token:', e);
    }
  } else {
    console.log('Must use physical device for Push Notifications');
  }

  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  return token;
}
