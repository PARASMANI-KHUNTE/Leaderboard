import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, Pressable,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../src/providers/AuthProvider';
import { useSubmitFeedback } from '../src/api/hooks';

export default function FeedbackScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [text, setText] = useState('');
  const submitFeedback = useSubmitFeedback();

  const handleSubmit = async () => {
    if (!user) {
      Alert.alert('Login Required', 'Please login to send feedback.');
      router.push('/login');
      return;
    }
    if (!text.trim()) return;

    try {
      await submitFeedback.mutateAsync({ text });
      setText('');
      Alert.alert('Success', 'Feedback sent! Appreciation incoming.', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Failed to send feedback');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={s.screen}
    >
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.header}>
          <Pressable style={s.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color="#64748b" />
            <Text style={s.backText}>BACK</Text>
          </Pressable>
          <View style={s.titleRow}>
            <View style={s.iconWrap}>
              <Ionicons name="star" size={24} color="white" />
            </View>
            <View>
              <Text style={s.title}>Elite Feedback</Text>
              <Text style={s.subtitle}>SHAPE THE FUTURE OF THIS PLATFORM</Text>
            </View>
          </View>
        </View>

        <View style={s.card}>
          <Text style={s.label}>YOUR MESSAGE</Text>
          <TextInput
            style={s.input}
            multiline
            numberOfLines={6}
            placeholder="What's on your mind? Bug reports, feature requests, or just a generic 'Hello'..."
            placeholderTextColor="#475569"
            value={text}
            onChangeText={setText}
            textAlignVertical="top"
          />

          <Pressable
            style={[s.submitBtn, (!text.trim() || submitFeedback.isPending) && s.btnDisabled]}
            onPress={handleSubmit}
            disabled={!text.trim() || submitFeedback.isPending}
          >
            {submitFeedback.isPending ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={s.submitBtnText}>TRANSMIT FEEDBACK</Text>
            )}
          </Pressable>

          <View style={s.footer}>
            <View style={s.dot} />
            <Text style={s.footerText}>END-TO-END ENCRYPTED WITH SYSTEM INTEGRITY</Text>
            <View style={s.dot} />
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0b1020' },
  scroll: { flexGrow: 1, paddingBottom: 40 },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 24 },
  backArrow: { color: '#64748b', fontSize: 16 },
  backText: { color: '#64748b', fontSize: 9, fontWeight: '800', letterSpacing: 2 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  iconWrap: {
    width: 52, height: 52, borderRadius: 16, backgroundColor: '#4f46e5',
    alignItems: 'center', justifyContent: 'center', elevation: 4,
  },
  icon: { fontSize: 24 },
  title: { color: 'white', fontSize: 28, fontWeight: '900', letterSpacing: -0.5 },
  subtitle: { color: '#64748b', fontSize: 8, fontWeight: '900', letterSpacing: 2.5, marginTop: 2 },

  card: {
    marginHorizontal: 16, padding: 20, borderRadius: 24,
    backgroundColor: '#111a33', borderWidth: 1, borderColor: '#1f2a4d',
  },
  label: { color: '#475569', fontSize: 10, fontWeight: '900', letterSpacing: 2, marginBottom: 10 },
  input: {
    backgroundColor: 'rgba(2, 6, 23, 0.4)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16, padding: 16, color: 'white', fontSize: 14, minHeight: 140, marginBottom: 20,
  },
  submitBtn: {
    backgroundColor: '#4f46e5', paddingVertical: 18, borderRadius: 16, alignItems: 'center', elevation: 4,
  },
  btnDisabled: { opacity: 0.5 },
  submitBtnText: { color: 'white', fontWeight: '900', fontSize: 13, letterSpacing: 3 },

  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 24 },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: 'rgba(99,102,241,0.3)' },
  footerText: { color: '#475569', fontSize: 8, fontWeight: '800', letterSpacing: 1.5, textAlign: 'center' },
});
