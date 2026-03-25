import React from 'react';
import { View, Text, StyleSheet, Pressable, Alert, Image } from 'react-native';
import * as Linking from 'expo-linking';
import Constants from 'expo-constants';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const API_URL = Constants.expoConfig?.extra?.API_URL ?? 'http://localhost:5000';

export default function LoginScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[s.screen, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={s.hero}>
        <View style={s.logoIcon}><Text style={s.logoEmoji}>⭐</Text></View>
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
          style={s.googleBtn}
          onPress={async () => {
            try {
              await Linking.openURL(`${API_URL}/auth/google?platform=mobile`);
            } catch (e: any) {
              Alert.alert('Login Failed', 'Could not open Google authentication.');
            }
          }}
        >
          <View style={s.googleIconWrap}>
            <Text style={s.googleIcon}>G</Text>
          </View>
          <Text style={s.googleBtnText}>Continue with Google</Text>
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
  screen: { flex: 1, backgroundColor: '#0b1020', justifyContent: 'space-between', padding: 20 },
  hero: { alignItems: 'center', marginTop: 40 },
  logoIcon: {
    width: 64, height: 64, borderRadius: 20, backgroundColor: '#4f46e5',
    alignItems: 'center', justifyContent: 'center', elevation: 8, marginBottom: 20,
  },
  logoEmoji: { fontSize: 32 },
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
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'white',
    paddingVertical: 14, paddingHorizontal: 16, borderRadius: 16, elevation: 2,
  },
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
