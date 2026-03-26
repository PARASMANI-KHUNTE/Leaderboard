import { Stack, useRouter, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { View, Text, Pressable, StyleSheet, Image, LogBox } from 'react-native';
import AuthProvider, { useAuth } from '../src/providers/AuthProvider';
import RealtimeProvider from '../src/realtime/RealtimeProvider';
import OfflineProvider from '../src/offline/OfflineProvider';
import Loading from './loading'; // Import the custom loading screen
import * as Updates from 'expo-updates';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { io } from 'socket.io-client';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import * as SplashScreen from 'expo-splash-screen';

LogBox.ignoreLogs(['expo-notifications: Android Push notifications']);

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

const API_URL = process.env.EXPO_PUBLIC_API_URL || Constants.expoConfig?.extra?.API_URL || 'https://leaderboard-backend-3pek.onrender.com';

/* ─── Premium Navbar ─── */
function Navbar({ unreadCount }: { unreadCount: number }) {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const isHome = pathname === '/' || pathname === '';

  return (
    <>
      <View style={[styles.nav, { paddingTop: insets.top + 6 }]}>
        {/* Logo */}
        <Pressable style={styles.logoWrap} onPress={() => router.replace('/')}>
          <Image 
            source={require('../assets/logo.png')} 
            style={styles.logoImageSmall} 
            resizeMode="contain"
          />
          <View>
            <Text style={styles.logoText}>EliteBoards</Text>
            <Text style={styles.logoSub}>PREMIUM RANKINGS</Text>
          </View>
        </Pressable>

        {/* Right side */}
        <View style={styles.navRight}>
          {user && (
            <Pressable 
              style={styles.notifBtn} 
              onPress={() => router.push('/notifications')}
            >
              <Ionicons 
                name={unreadCount > 0 ? "notifications" : "notifications-outline"} 
                size={22} 
                color={unreadCount > 0 ? "#818cf8" : "#94a3b8"} 
              />
              {unreadCount > 0 && (
                <View style={styles.notifBadge}>
                  <Text style={styles.notifBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                </View>
              )}
            </Pressable>
          )}

          {user ? (
            <>
              {user.isAdmin && (
                <Pressable
                  style={styles.adminBtn}
                  onPress={() => router.push('/admin')}
                >
                  <Text style={styles.adminBtnText}>⚙ ADMIN</Text>
                </Pressable>
              )}
              <Pressable
                style={styles.avatarWrap}
                onPress={() => setMenuOpen(!menuOpen)}
              >
                {user.picture ? (
                  <Image
                    source={{ uri: user.picture }}
                    style={styles.avatar}
                  />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarPlaceholderText}>
                      {user.name?.charAt(0)?.toUpperCase() ?? '?'}
                    </Text>
                  </View>
                )}
              </Pressable>
            </>
          ) : (
            <Pressable
              style={styles.loginBtn}
              onPress={() => router.push('/login')}
            >
              <Text style={styles.loginBtnText}>Login</Text>
            </Pressable>
          )}
        </View>
      </View>

      {/* User dropdown menu */}
      {menuOpen && user && (
        <Pressable style={styles.menuOverlay} onPress={() => setMenuOpen(false)}>
          <View style={[styles.menuDropdown, { top: insets.top + 56 }]}>
            <View style={styles.menuHeader}>
              <Text style={styles.menuName}>{user.name}</Text>
              <Text style={styles.menuEmail}>{user.email}</Text>
            </View>
            <View style={styles.menuDivider} />
            <Pressable
              style={styles.menuItem}
              onPress={() => {
                setMenuOpen(false);
                router.push('/profile');
              }}
            >
              <Ionicons name="person-outline" size={18} color="#818cf8" />
              <Text style={styles.menuItemText}>View Profile</Text>
            </Pressable>
            <Pressable
              style={styles.menuItem}
              onPress={() => {
                setMenuOpen(false);
                router.push('/feedback');
              }}
            >
              <Ionicons name="chatbubble-ellipses-outline" size={18} color="#94a3b8" />
              <Text style={styles.menuItemText}>Send Feedback</Text>
            </Pressable>
          </View>
        </Pressable>
      )}
    </>
  );
}

function AppContent() {
  const { user, loading, unreadCount } = useAuth();
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);

  // Immediate splash hide to reveal custom animation
  React.useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  // Instant update checker (already here)
  React.useEffect(() => {
    if (__DEV__) return;
    async function onFetchUpdateAsync() {
      try {
        const update = await Updates.checkForUpdateAsync();
        if (update.isAvailable) {
          await Updates.fetchUpdateAsync();
          setIsUpdateAvailable(true);
        }
      } catch (error) {}
    }
    onFetchUpdateAsync();
  }, []);

  // If auth is loading, show the full-screen animated Loading component
  if (loading) {
    return (
      <>
        <StatusBar style="light" />
        <Loading />
      </>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <Navbar unreadCount={unreadCount} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#020617' } }} />

      {/* Floating Update Notification */}
      {isUpdateAvailable && (
        <View style={styles.updateBannerContainer}>
          <Pressable 
            style={styles.updateBanner} 
            onPress={() => Updates.reloadAsync()}
          >
            <Text style={styles.updateBannerText}>New update available 🚀 Restart to apply</Text>
          </Pressable>
        </View>
      )}
    </>
  );
}

export default function RootLayout() {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#020617' }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <OfflineProvider>
              <RealtimeProvider>
                <AppContent />
              </RealtimeProvider>
            </OfflineProvider>
          </AuthProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  nav: {
    backgroundColor: 'rgba(2, 6, 23, 0.95)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingBottom: 10,
  },
  logoWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoImageSmall: {
    width: 32,
    height: 32,
  },
  logoText: {
    color: '#c7d2fe',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  logoSub: {
    color: 'rgba(99, 102, 241, 0.5)',
    fontSize: 7,
    fontWeight: '800',
    letterSpacing: 3,
    marginTop: -1,
  },
  navRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  notifBtn: {
    padding: 6,
    position: 'relative',
  },
  notifIcon: {
    fontSize: 18,
  },
  notifBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#4f46e5',
    minWidth: 14,
    height: 14,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#020617',
  },
  notifBadgeText: {
    color: 'white',
    fontSize: 7,
    fontWeight: '900',
  },
  adminBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(79, 70, 229, 0.15)',
  },
  adminBtnText: {
    color: '#a5b4fc',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  avatarWrap: {},
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  avatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarPlaceholderText: {
    color: '#94a3b8',
    fontWeight: '800',
    fontSize: 14,
  },
  loginBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#4f46e5',
  },
  loginBtnText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 13,
  },

  /* Dropdown menu */
  menuOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    zIndex: 100,
  },
  menuDropdown: {
    position: 'absolute',
    right: 14,
    width: 220,
    backgroundColor: '#111a33',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1f2a4d',
    overflow: 'hidden',
    elevation: 10,
    zIndex: 101,
  },
  menuHeader: {
    padding: 14,
  },
  menuName: {
    color: '#e5e7eb',
    fontWeight: '800',
    fontSize: 14,
  },
  menuEmail: {
    color: '#64748b',
    fontSize: 11,
    marginTop: 2,
  },
  menuDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
  },
  menuItemText: {
    color: '#cbd5e1',
    fontWeight: '700',
    fontSize: 13,
  },

  /* Update Notification */
  updateBannerContainer: {
    position: 'absolute',
    bottom: 100, // Above the create button/fab
    left: 20,
    right: 20,
    zIndex: 9999,
  },
  updateBanner: {
    backgroundColor: '#4f46e5',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  updateBannerText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '900',
    textAlign: 'center',
  },
});
