import { useEffect, useMemo, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getSocket } from './socketSingleton';
import { useRealtime } from './RealtimeProvider';

export function useLeaderboardRealtime(leaderboardId?: string) {
  const queryClient = useQueryClient();
  const { joinLeaderboardRoom } = useRealtime();
  const socket = useMemo(() => getSocket(), []);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!leaderboardId) return;
    joinLeaderboardRoom(String(leaderboardId));
  }, [joinLeaderboardRoom, leaderboardId]);

  useEffect(() => {
    if (!leaderboardId) return;

    const handler = (payload: any) => {
      const changedLbId = payload?.leaderboardId;
      if (!changedLbId || String(changedLbId) !== String(leaderboardId)) return;

      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(() => {
        // For now we invalidate all pages for this leaderboard.
        // The leaderboard screen will refetch the cursor page it currently holds.
        queryClient.invalidateQueries({ queryKey: ['leaderboardEntries', String(leaderboardId)] });
      }, 500);
    };

    socket.on('leaderboardChanged', handler);

    return () => {
      socket.off('leaderboardChanged', handler);
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    };
  }, [leaderboardId, queryClient, socket]);
}

