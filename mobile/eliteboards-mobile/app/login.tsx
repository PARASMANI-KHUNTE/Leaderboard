import React from 'react';
import { View, Text, StyleSheet, Pressable, Alert } from 'react-native';
import * as Linking from 'expo-linking';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.API_URL ?? 'http://localhost:5000';

export default function LoginScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>EliteBoards Login</Text>
      <Text style={styles.subtitle}>Continue with Google to sign in.</Text>

      <Pressable
        style={styles.button}
        onPress={async () => {
          try {
            // Backend will later support platform=mobile to redirect back with `code`.
            await Linking.openURL(`${API_URL}/auth/google?platform=mobile`);
          } catch (e: any) {
            Alert.alert('Open Login Failed', e?.message ?? 'Unknown error');
          }
        }}
      >
        <Text style={styles.buttonText}>Continue with Google</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0b1020', alignItems: 'center', justifyContent: 'center', padding: 20 },
  title: { color: '#a5b4fc', fontSize: 22, fontWeight: '800', marginBottom: 8 },
  subtitle: { color: '#94a3b8', fontSize: 14, marginBottom: 24, textAlign: 'center' },
  button: { backgroundColor: '#4f46e5', paddingVertical: 14, paddingHorizontal: 18, borderRadius: 12 },
  buttonText: { color: 'white', fontWeight: '800' },
});

