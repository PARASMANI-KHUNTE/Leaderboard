import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Alert, ActivityIndicator, Image } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import Constants from 'expo-constants';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../src/providers/AuthProvider';

import { API_URL } from '../src/config/env';

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { exchangeCodeAndSignIn } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);

      // createURL gives the correct scheme for both Expo Go (exp://) and standalone (eliteboards://)
      const redirectUrl = Linking.createURL('login-success');
      console.log('[Login] deep link redirect URL:', redirectUrl);

      const authUrl = `${API_URL}/auth/google?platform=mobile&redirect=${encodeURIComponent(redirectUrl)}`;

      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUrl);
      console.log('[Login] WebBrowser result type:', result.type);

      if (result.type === 'success') {
        const parsed = Linking.parse(result.url);
        const code = parsed.queryParams?.code;
        console.log('[Login] Parsed code from redirect. Length:', typeof code === 'string' ? code.length : 'N/A');

        if (!code || typeof code !== 'string') {
          Alert.alert('Login Error', 'No code was returned from the server.');
          return;
        }

        await exchangeCodeAndSignIn(code);
        // Navigation is handled by AuthProvider state update
      } else if (result.type === 'cancel') {
        console.log('[Login] User cancelled OAuth flow');
      }
    } catch (e: any) {
      console.error('[Login] OAuth error:', e);
      Alert.alert('Login Failed', e?.message || 'Could not complete Google authentication.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[s.screen, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={s.hero}>
        <Image
          source={require('../assets/logo.png')}
          style={s.logoImage}
          resizeMode="contain"
        />
        <View style={s.titleRow}>
          <Text style={s.titleElite}>Elite</Text>
          <Text style={s.titleBoards}>Boards</Text>
        </View>
        <Text style={s.tagline}>The Ultimate Student Ranking Platform</Text>
      </View>

      <View style={s.card}>
        <Text style={s.cardTitle}>Account Login</Text>
        <Text style={s.cardSub}>Sign in to create boards, submit entries, and react to peers.</Text>

        <Pressable
          style={[s.googleBtn, loading && s.googleBtnDisabled]}
          onPress={handleGoogleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#0f172a" style={{ marginRight: 12 }} />
          ) : (
            <View style={s.googleIconWrap}>
              <Text style={s.googleIcon}>G</Text>
            </View>
          )}
          <Text style={s.googleBtnText}>
            {loading ? 'Authenticating...' : 'Continue with Google'}
          </Text>
        </Pressable>

        <View style={s.dividerRow}>
          <View style={s.divider} />
          <Text style={s.dividerText}>SECURE ACCESS</Text>
          <View style={s.divider} />
        </View>

        <Text style={s.footerText}>
          By continuing, you agree to our terms of academic integrity. Fake data leads to permanent account suspension.
        </Text>
      </View>

      <View style={s.bottom}>
        <Text style={s.version}>PREMIUM_BUILD_v2.0.4</Text>
        <Text style={s.system}>REAL-TIME_SYSTEMS_ACTIVE</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#020617', justifyContent: 'space-between', padding: 20 },
  hero: { alignItems: 'center', marginTop: 40 },
  logoImage: {
    width: 100,
    height: 100,
    marginBottom: 16,
  },
  titleRow: { flexDirection: 'row', alignItems: 'baseline' },
  titleElite: { color: '#c7d2fe', fontSize: 44, fontWeight: '900', fontStyle: 'italic', letterSpacing: -1 },
  titleBoards: { color: '#6366f1', fontSize: 44, fontWeight: '900', letterSpacing: -1 },
  tagline: { color: '#64748b', fontSize: 13, fontWeight: '700', letterSpacing: 2, marginTop: 8, textAlign: 'center' },

  card: {
    backgroundColor: '#111a33', padding: 24, borderRadius: 28,
    borderWidth: 1, borderColor: '#1f2a4d', elevation: 4,
  },
  cardTitle: { color: 'white', fontSize: 24, fontWeight: '900', marginBottom: 8, textAlign: 'center' },
  cardSub: { color: '#64748b', fontSize: 14, fontWeight: '500', lineHeight: 20, textAlign: 'center', marginBottom: 28 },

  googleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: 'white',
    paddingVertical: 14, paddingHorizontal: 16, borderRadius: 16, elevation: 2,
  },
  googleBtnDisabled: { opacity: 0.7 },
  googleIconWrap: {
    width: 24, height: 24, borderRadius: 6, backgroundColor: '#ea4335',
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  googleIcon: { color: 'white', fontWeight: '900', fontSize: 14 },
  googleBtnText: { color: '#0f172a', fontWeight: '800', fontSize: 15 },

  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 24 },
  divider: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.05)' },
  dividerText: { color: '#475569', fontSize: 9, fontWeight: '900', letterSpacing: 2 },

  footerText: { color: '#475569', fontSize: 10, fontWeight: '600', lineHeight: 16, textAlign: 'center' },

  bottom: { alignItems: 'center', gap: 4, marginBottom: 10 },
  version: { color: '#1e293b', fontSize: 9, fontWeight: '900', letterSpacing: 2 },
  system: { color: '#22c55e', fontSize: 8, fontWeight: '900', letterSpacing: 3, opacity: 0.6 },
});

