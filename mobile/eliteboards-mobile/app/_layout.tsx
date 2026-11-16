import { Stack, useRouter, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { useState, useMemo } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { View, Text, Pressable, StyleSheet, Image, LogBox } from 'react-native';
import AuthProvider, { useAuth } from '../src/providers/AuthProvider';
import RealtimeProvider from '../src/realtime/RealtimeProvider';
import OfflineProvider from '../src/offline/OfflineProvider';
import { ThemeProvider, useTheme } from '../src/theme/ThemeContext';
import { ThemedDialogProvider } from '../src/components/ThemedDialog';
import Loading from './loading';
import * as Updates from 'expo-updates';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import * as SplashScreen from 'expo-splash-screen';
import SidebarDrawer from '../src/components/SidebarDrawer';

LogBox.ignoreLogs(['expo-notifications: Android Push notifications']);

const isExpoGo = Constants.appOwnership === 'expo';

if (!isExpoGo) {
  SplashScreen.setOptions({
    duration: 0,
    fade: false,
  });
}

// Keep native splash as plain handoff, switch to custom loader
SplashScreen.preventAutoHideAsync();

function getRouteMetadata(pathname: string) {
  if (pathname === '/' || pathname === '') {
    return { isHome: true, title: 'EliteBoards', subtitle: 'PREMIUM RANKINGS' };
  }
  if (pathname.startsWith('/profile')) {
    return { isHome: false, title: 'Profile', subtitle: 'COMPETITOR ACCOUNT' };
  }
  if (pathname.startsWith('/settings')) {
    return { isHome: false, title: 'Settings', subtitle: 'DEVICE & PREFERENCES' };
  }
  if (pathname.startsWith('/about')) {
    return { isHome: false, title: 'About', subtitle: 'PLATFORM OVERVIEW' };
  }
  if (pathname.startsWith('/notifications')) {
    return { isHome: false, title: 'Notifications', subtitle: 'ACTIVITY ALERTS' };
  }
  if (pathname.startsWith('/admin')) {
    return { isHome: false, title: 'Admin Console', subtitle: 'MANAGEMENT HUB' };
  }
  if (pathname.startsWith('/feedback')) {
    return { isHome: false, title: 'Feedback', subtitle: 'REPORTS & REQUESTS' };
  }
  if (pathname.startsWith('/login')) {
    return { isHome: false, title: 'Sign In', subtitle: 'STUDENT ACCESS' };
  }
  if (pathname.startsWith('/lb/')) {
    return { isHome: false, title: 'Leaderboard', subtitle: 'LIVE RANKINGS' };
  }
  return { isHome: false, title: 'EliteBoards', subtitle: 'NAVIGATION' };
}

/* ─── Unified Dynamic Navbar ─── */
function Navbar({ unreadCount }: { unreadCount: number }) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { colors, isDark } = useTheme();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const routeMeta = useMemo(() => getRouteMetadata(pathname), [pathname]);

  return (
    <>
      <View 
        style={[
          styles.nav, 
          { 
            paddingTop: insets.top + 6,
            backgroundColor: colors.surface,
            borderBottomColor: colors.border,
          }
        ]}
      >
        {/* Left: Hamburger + Logo (Home) OR Back button + Dynamic Page Title (Subpages) */}
        <View style={styles.navLeft}>
          {routeMeta.isHome ? (
            <>
              <Pressable 
                style={[
                  styles.navActionBtn, 
                  { 
                    backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                    borderColor: colors.border,
                  }
                ]} 
                onPress={() => setDrawerOpen(true)}
                hitSlop={10}
                accessibilityLabel="Open navigation drawer"
              >
                <Ionicons name="menu" size={22} color={colors.text} />
              </Pressable>

              <Pressable style={styles.logoWrap} onPress={() => router.replace('/')}>
                <Image 
                  source={require('../assets/logo.png')} 
                  style={styles.logoImageSmall} 
                  resizeMode="contain"
                />
                <View>
                  <Text style={[styles.logoText, { color: colors.text }]}>EliteBoards</Text>
                  <Text style={styles.logoSub}>PREMIUM RANKINGS</Text>
                </View>
              </Pressable>
            </>
          ) : (
            <>
              <Pressable 
                style={[
                  styles.navActionBtn, 
                  { 
                    backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                    borderColor: colors.border,
                  }
                ]} 
                onPress={() => {
                  if (router.canGoBack()) {
                    router.back();
                  } else {
                    router.replace('/');
                  }
                }}
                hitSlop={10}
                accessibilityLabel="Go back"
              >
                <Ionicons name="arrow-back" size={20} color={colors.text} />
              </Pressable>

              <View style={styles.dynamicHeaderWrap}>
                <Text style={[styles.dynamicHeaderTitle, { color: colors.text }]} numberOfLines={1}>
                  {routeMeta.title}
                </Text>
                <Text style={styles.dynamicHeaderSub} numberOfLines={1}>
                  {routeMeta.subtitle}
                </Text>
              </View>
            </>
          )}
        </View>

        {/* Right side: Notifications bell (No profile avatar here; profile is in the sidebar) */}
        <View style={styles.navRight}>
          {user ? (
            pathname !== '/notifications' && (
              <Pressable 
                style={[
                  styles.notifBtn, 
                  { 
                    backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                    borderColor: colors.border,
                  }
                ]} 
                onPress={() => router.push('/notifications')}
                accessibilityLabel="Notifications"
              >
                <Ionicons 
                  name={unreadCount > 0 ? "notifications" : "notifications-outline"} 
                  size={20} 
                  color={unreadCount > 0 ? colors.primaryLight : colors.textSecondary} 
                />
                {unreadCount > 0 && (
                  <View style={styles.notifBadge}>
                    <Text style={styles.notifBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                  </View>
                )}
              </Pressable>
            )
          ) : (
            pathname !== '/login' && (
              <Pressable
                style={styles.loginBtn}
                onPress={() => router.push('/login')}
              >
                <Text style={styles.loginBtnText}>Login</Text>
              </Pressable>
            )
          )}
        </View>
      </View>

      {/* Slide-out Sidebar Drawer */}
      <SidebarDrawer 
        visible={drawerOpen} 
        onClose={() => setDrawerOpen(false)} 
      />
    </>
  );
}

function AppContent() {
  const { loading, unreadCount } = useAuth();
  const { colors, isDark } = useTheme();
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);

  // Immediate splash hide to reveal custom animation
  React.useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  // Instant update checker
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

  if (loading) {
    return (
      <>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <Loading />
      </>
    );
  }

  return (
    <View style={[styles.rootContainer, { backgroundColor: colors.bg }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Navbar unreadCount={unreadCount} />
      <Stack 
        screenOptions={{ 
          headerShown: false, 
          contentStyle: { backgroundColor: colors.bg } 
        }} 
      />

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
    </View>
  );
}

export default function RootLayout() {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <ThemedDialogProvider>
              <AuthProvider>
                <OfflineProvider>
                  <RealtimeProvider>
                    <AppContent />
                  </RealtimeProvider>
                </OfflineProvider>
              </AuthProvider>
            </ThemedDialogProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
  },
  nav: {
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingBottom: 10,
    zIndex: 50,
  },
  navLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  navActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
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
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  logoSub: {
    color: 'rgba(99, 102, 241, 0.6)',
    fontSize: 7,
    fontWeight: '800',
    letterSpacing: 3,
    marginTop: -1,
  },
  dynamicHeaderWrap: {
    justifyContent: 'center',
    flexShrink: 1,
  },
  dynamicHeaderTitle: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  dynamicHeaderSub: {
    color: 'rgba(99, 102, 241, 0.6)',
    fontSize: 7,
    fontWeight: '800',
    letterSpacing: 2,
    marginTop: 1,
  },
  navRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  notifBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    position: 'relative',
  },
  notifBadge: {
    position: 'absolute',
    top: 3,
    right: 3,
    backgroundColor: '#4f46e5',
    minWidth: 14,
    height: 14,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifBadgeText: {
    color: 'white',
    fontSize: 7,
    fontWeight: '900',
  },
  loginBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#4f46e5',
  },
  loginBtnText: {
    color: 'white',
    fontWeight: '800',
    fontSize: 13,
  },

  /* Update Notification */
  updateBannerContainer: {
    position: 'absolute',
    bottom: 100,
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
