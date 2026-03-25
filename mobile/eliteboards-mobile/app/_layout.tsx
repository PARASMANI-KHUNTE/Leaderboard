import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AuthProvider from './providers/AuthProvider';
import RealtimeProvider from './realtime/RealtimeProvider';
import OfflineProvider from './offline/OfflineProvider';

export default function RootLayout() {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <OfflineProvider>
              <RealtimeProvider>
                <StatusBar style="light" />
                <Stack screenOptions={{ headerShown: false }} />
              </RealtimeProvider>
            </OfflineProvider>
          </AuthProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

