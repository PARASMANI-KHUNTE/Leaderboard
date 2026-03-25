import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '../src/providers/AuthProvider';

export default function LoginSuccessScreen() {
  const params = useLocalSearchParams<{ code?: string }>();
  const router = useRouter();
  const { user, exchangeCodeAndSignIn, loading: authLoading } = useAuth();
  const [status, setStatus] = useState<'idle' | 'exchanging' | 'done'>('idle');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;

    // If user is already authenticated (handled by login.tsx via WebBrowser),
    // just navigate home without trying to exchange the code a second time.
    if (user) {
      router.replace('/');
      return;
    }

    const code = params?.code;
    
    console.log('[LoginSuccess] params:', JSON.stringify(params));
    console.log('[LoginSuccess] code:', code);
    
    if (!code) {
      console.log('[LoginSuccess] No code found in params');
      setError('Missing login code. Deep link may not have been received.');
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        setError(null);
        setStatus('exchanging');
        console.log('[LoginSuccess] Exchanging code...');
        await exchangeCodeAndSignIn(code);
        if (cancelled) return;
        console.log('[LoginSuccess] Exchange successful, navigating to home');
        setStatus('done');
        router.replace('/');
      } catch (e: any) {
        if (cancelled) return;
        console.log('[LoginSuccess] Exchange failed:', e?.message);
        setError(e?.message ?? 'Login failed');
        setStatus('idle');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authLoading, user, exchangeCodeAndSignIn, params?.code, router]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sign in</Text>

      {params?.code ? (
        <>
          <Text style={styles.subtitle}>Received code. Exchanging securely...</Text>
          {status === 'exchanging' ? <ActivityIndicator color="#a5b4fc" /> : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </>
      ) : (
        <Text style={styles.subtitle}>Missing `code` in the deep link.</Text>
      )}

      {error ? (
        <Pressable style={styles.button} onPress={() => router.replace('/login')}>
          <Text style={styles.buttonText}>Try Login Again</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0b1020', alignItems: 'center', justifyContent: 'center', padding: 20 },
  title: { color: '#a5b4fc', fontSize: 22, fontWeight: '800', marginBottom: 8 },
  subtitle: { color: '#94a3b8', fontSize: 14, marginBottom: 18, textAlign: 'center' },
  error: { color: '#fb7185', fontSize: 12, marginTop: 12, textAlign: 'center' },
  button: { backgroundColor: '#4f46e5', paddingVertical: 14, paddingHorizontal: 18, borderRadius: 12, marginTop: 18 },
  buttonText: { color: 'white', fontWeight: '800' },
});

