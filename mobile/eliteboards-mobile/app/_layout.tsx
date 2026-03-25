import { Stack, useRouter, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { View, Text, Pressable, StyleSheet, Image } from 'react-native';
import AuthProvider, { useAuth } from '../src/providers/AuthProvider';
import RealtimeProvider from '../src/realtime/RealtimeProvider';
import OfflineProvider from '../src/offline/OfflineProvider';
import Loading from './loading'; // Import the custom loading screen

/* ─── Premium Navbar ─── */
function Navbar() {
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
                router.push('/feedback');
              }}
            >
              <Text style={styles.menuItemText}>💬  Send Feedback</Text>
            </Pressable>
            <Pressable
              style={styles.menuItem}
              onPress={() => {
                setMenuOpen(false);
                logout();
                router.replace('/login');
              }}
            >
              <Text style={[styles.menuItemText, { color: '#f87171' }]}>🚪  Logout</Text>
            </Pressable>
          </View>
        </Pressable>
      )}
    </>
  );
}

function AppContent() {
  const { loading } = useAuth();

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
      <Navbar />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#020617' } }} />
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
    gap: 10,
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
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  menuItemText: {
    color: '#cbd5e1',
    fontWeight: '700',
    fontSize: 13,
  },
});
