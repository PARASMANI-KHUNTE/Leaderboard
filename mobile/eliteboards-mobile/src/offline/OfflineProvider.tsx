import React, { createContext, useContext, useMemo } from 'react';
import { useNetInfo } from '@react-native-community/netinfo';

type OfflineContextValue = {
  isConnected: boolean;
};

const OfflineContext = createContext<OfflineContextValue>({ isConnected: true });

export function useOffline() {
  return useContext(OfflineContext);
}

export default function OfflineProvider({ children }: { children: React.ReactNode }) {
  const netInfo = useNetInfo();

  const value = useMemo<OfflineContextValue>(() => {
    // NetInfo can be `null` briefly during startup.
    const isConnected = netInfo.isConnected ?? true;
    return { isConnected };
  }, [netInfo.isConnected]);

  return <OfflineContext.Provider value={value}>{children}</OfflineContext.Provider>;
}

