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

    const reactionHandler = (payload: any) => {
      const { entryId, likedBy, dislikedBy, leaderboardId: targetLbId } = payload || {};
      if (!entryId) return;
      if (targetLbId && String(targetLbId) !== String(leaderboardId)) return;

      queryClient.setQueriesData({ queryKey: ['leaderboardEntries', String(leaderboardId)] }, (oldData: any) => {
        if (!oldData) return oldData;
        if (Array.isArray(oldData.pages)) {
          return {
            ...oldData,
            pages: oldData.pages.map((page: any) => ({
              ...page,
              items: (page.items || []).map((item: any) =>
                String(item._id) === String(entryId)
                  ? { ...item, likedBy: likedBy || item.likedBy, dislikedBy: dislikedBy || item.dislikedBy }
                  : item
              ),
            })),
          };
        }
        return oldData;
      });
    };

    socket.on('leaderboardChanged', handler);
    socket.on('entryReactionUpdated', reactionHandler);

    return () => {
      socket.off('leaderboardChanged', handler);
      socket.off('entryReactionUpdated', reactionHandler);
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    };
  }, [leaderboardId, queryClient, socket]);
}

