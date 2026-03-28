import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getSocket, setSocketAuthToken } from './socketSingleton';
import { useAuth } from '../providers/AuthProvider';

type RealtimeContextValue = {
  joinLeaderboardRoom: (leaderboardId: string) => void;
};

const RealtimeContext = createContext<RealtimeContextValue | null>(null);

export function useRealtime() {
  const ctx = useContext(RealtimeContext);
  if (!ctx) throw new Error('useRealtime must be used within RealtimeProvider');
  return ctx;
}

export default function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const { user, token } = useAuth();
  const joinedLeaderboardsRef = useRef<Set<string>>(new Set());
  const userIdRef = useRef<string | null>(null);

  const socket = useMemo(() => getSocket(), []);

  useEffect(() => {
    userIdRef.current = user?.id ?? null;
    setSocketAuthToken(token ?? null);

    if (socket && socket.connected) {
      socket.disconnect();
      socket.connect();
    }
  }, [socket, token, user?.id]);

  useEffect(() => {
    // One-time connect + room rejoin.
    const s = socket;

    const handleConnect = () => {
      // Rejoin user room.
      if (userIdRef.current) {
        s.emit('joinUser', userIdRef.current);
      }

      // Rejoin all leaderboard rooms previously joined.
      for (const lbId of joinedLeaderboardsRef.current) {
        s.emit('joinLeaderboard', lbId);
      }
    };

    const invalidateLeaderboards = () => {
      queryClient.invalidateQueries({ queryKey: ['leaderboards'] });
    };

    const onLeaderboardCreated = () => invalidateLeaderboards();
    const onLeaderboardDeleted = () => invalidateLeaderboards();
    const onLeaderboardStatusUpdated = () => invalidateLeaderboards();

    s.on('connect', handleConnect);
    s.on('leaderboardCreated', onLeaderboardCreated);
    s.on('leaderboardDeleted', onLeaderboardDeleted);
    s.on('leaderboardStatusUpdated', onLeaderboardStatusUpdated);

    s.connect();

    return () => {
      s.off('connect', handleConnect);
      s.off('leaderboardCreated', onLeaderboardCreated);
      s.off('leaderboardDeleted', onLeaderboardDeleted);
      s.off('leaderboardStatusUpdated', onLeaderboardStatusUpdated);
    };
  }, [queryClient, socket]);

  const joinLeaderboardRoom = useCallback(
    (leaderboardId: string) => {
      if (!leaderboardId) return;
      joinedLeaderboardsRef.current.add(String(leaderboardId));
      if (socket && socket.connected) {
        socket.emit('joinLeaderboard', leaderboardId);
      }
    },
    [socket]
  );

  const value = useMemo<RealtimeContextValue>(() => ({ joinLeaderboardRoom }), [joinLeaderboardRoom]);

  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
}
