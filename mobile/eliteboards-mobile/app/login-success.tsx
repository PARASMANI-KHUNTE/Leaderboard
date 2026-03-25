import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from './providers/AuthProvider';

export default function LoginSuccessScreen() {
  const params = useLocalSearchParams<{ code?: string }>();
  const router = useRouter();
  const { exchangeCodeAndSignIn, loading: authLoading } = useAuth();
  const [status, setStatus] = useState<'idle' | 'exchanging' | 'done'>('idle');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    const code = params?.code;
    if (!code) {
      setError('Missing login code.');
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        setError(null);
        setStatus('exchanging');
        await exchangeCodeAndSignIn(code);
        if (cancelled) return;
        setStatus('done');
        router.replace('/');
      } catch (e: any) {
        if (cancelled) return;
        setError(e?.message ?? 'Login failed');
        setStatus('idle');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authLoading, exchangeCodeAndSignIn, params?.code, router]);

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

