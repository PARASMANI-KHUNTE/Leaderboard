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
  }, [token, user?.id]);

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

    const onLeaderboardCreated = (newBoard: any) => {
      if (newBoard && (newBoard._id || newBoard.id)) {
        queryClient.setQueryData<any>(['leaderboards'], (old: any) => {
          if (!old) return [newBoard];
          if (Array.isArray(old)) {
            if (old.some((b: any) => String(b._id || b.id) === String(newBoard._id || newBoard.id))) return old;
            return [newBoard, ...old];
          }
          if (old.leaderboards && Array.isArray(old.leaderboards)) {
            if (old.leaderboards.some((b: any) => String(b._id || b.id) === String(newBoard._id || newBoard.id))) return old;
            return {
              ...old,
              totalBoards: (old.totalBoards || 0) + 1,
              leaderboards: [newBoard, ...old.leaderboards],
            };
          }
          return old;
        });
      }
      invalidateLeaderboards();
    };

    const onLeaderboardDeleted = (payload: any) => {
      const targetId = typeof payload === 'object' && payload !== null ? (payload._id || payload.id || payload.leaderboardId) : payload;
      if (targetId) {
        queryClient.setQueryData<any>(['leaderboards'], (old: any) => {
          if (!old) return old;
          const filterFn = (b: any) => String(b._id || b.id) !== String(targetId);
          if (Array.isArray(old)) return old.filter(filterFn);
          if (old.leaderboards && Array.isArray(old.leaderboards)) {
            return {
              ...old,
              totalBoards: Math.max(0, (old.totalBoards || 1) - 1),
              leaderboards: old.leaderboards.filter(filterFn),
            };
          }
          return old;
        });
      }
      invalidateLeaderboards();
    };

    const onLeaderboardStatusUpdated = (payload: any) => {
      const targetId = payload?.id || payload?._id || payload?.leaderboardId;
      if (targetId) {
        queryClient.setQueryData<any>(['leaderboards'], (old: any) => {
          if (!old) return old;
          const mapFn = (b: any) => {
            if (String(b._id || b.id) === String(targetId)) {
              return {
                ...b,
                isLive: payload.isLive !== undefined ? payload.isLive : b.isLive,
                entryCount: payload.entryCount !== undefined ? payload.entryCount : b.entryCount,
              };
            }
            return b;
          };
          if (Array.isArray(old)) return old.map(mapFn);
          if (old.leaderboards && Array.isArray(old.leaderboards)) {
            return {
              ...old,
              leaderboards: old.leaderboards.map(mapFn),
            };
          }
          return old;
        });
      }
      invalidateLeaderboards();
    };

    s.on('connect', handleConnect);
    s.on('leaderboardCreated', onLeaderboardCreated);
    s.on('leaderboardDeleted', onLeaderboardDeleted);
    s.on('leaderboardStatusUpdated', onLeaderboardStatusUpdated);

    // connectSocket() can be safely called multiple times
    if (!s.connected) s.connect();

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
