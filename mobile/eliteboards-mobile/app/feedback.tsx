import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, Pressable,
  ActivityIndicator, KeyboardAvoidingView, Platform,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../src/providers/AuthProvider';
import { useSubmitFeedback } from '../src/api/hooks';
import { useTheme } from '../src/theme/ThemeContext';
import { useThemedDialog } from '../src/components/ThemedDialog';

export default function FeedbackScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const { showAlert } = useThemedDialog();
  const [text, setText] = useState('');
  const submitFeedback = useSubmitFeedback();

  const handleSubmit = async () => {
    if (!user) {
      showAlert('Login Required', 'Please login to send feedback.', 'info');
      router.push('/login');
      return;
    }
    if (!text.trim()) return;

    try {
      await submitFeedback.mutateAsync({ text });
      setText('');
      showAlert('Feedback Sent', 'Thanks for helping shape the future of EliteBoards.', 'success');
    } catch (err: any) {
      showAlert('Error', err?.message ?? 'Failed to send feedback', 'danger');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[s.screen, { backgroundColor: colors.bg }]}
    >
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={s.cardTopHeader}>
            <View style={[s.iconWrap, { backgroundColor: isDark ? 'rgba(99, 102, 241, 0.12)' : 'rgba(79, 70, 229, 0.08)' }]}>
              <Ionicons name="chatbubble-ellipses" size={20} color={colors.primaryLight} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.cardTitle, { color: colors.text }]}>Send Platform Feedback</Text>
              <Text style={[s.cardSubtitle, { color: colors.textSecondary }]}>Bug reports, suggestions, or university requests</Text>
            </View>
          </View>

          <Text style={[s.label, { color: colors.textMuted }]}>YOUR MESSAGE</Text>
          <TextInput
            style={[
              s.input,
              {
                backgroundColor: isDark ? 'rgba(2, 6, 23, 0.4)' : 'rgba(0, 0, 0, 0.03)',
                borderColor: colors.border,
                color: colors.text,
              },
            ]}
            multiline
            numberOfLines={6}
            placeholder="What's on your mind? Tell us what you like or how we can improve EliteBoards..."
            placeholderTextColor={colors.textMuted}
            value={text}
            onChangeText={setText}
            textAlignVertical="top"
          />

          <Pressable
            style={[
              s.submitBtn, 
              { backgroundColor: colors.primary },
              (!text.trim() || submitFeedback.isPending) && s.btnDisabled
            ]}
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
            <Text style={[s.footerText, { color: colors.textMuted }]}>END-TO-END AUDITED BY SYSTEM ADMINISTRATORS</Text>
            <View style={s.dot} />
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { flexGrow: 1, paddingVertical: 16 },
  card: {
    marginHorizontal: 16,
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
  },
  cardTopHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  cardSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  label: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    fontSize: 13,
    minHeight: 120,
    marginBottom: 18,
  },
  submitBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  btnDisabled: {
    opacity: 0.5,
  },
  submitBtnText: {
    color: 'white',
    fontWeight: '900',
    fontSize: 12,
    letterSpacing: 2,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 18,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(99,102,241,0.3)',
  },
  footerText: {
    fontSize: 7,
    fontWeight: '800',
    letterSpacing: 1.5,
    textAlign: 'center',
  },
});
