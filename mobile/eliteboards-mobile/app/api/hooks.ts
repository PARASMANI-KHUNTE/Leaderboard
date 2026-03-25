import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApi } from './useApi';
import { useAuth } from '../providers/AuthProvider';

export type Leaderboard = {
  _id: string;
  name: string;
  slug: string;
  isLive: boolean;
  createdBy: string;
  entryCount?: number;
};

export type LeaderboardEntry = {
  _id: string;
  leaderboardId: string;
  userId: string;
  name: string;
  cgpa: number;
  marks?: number | null;
  useMarks: boolean;
  userPicture?: string;
  likedBy?: string[];
  dislikedBy?: string[];
  createdAt?: string;
  updatedAt?: string;
  rank?: number;
};

export type CursorEntriesResponse = {
  items: LeaderboardEntry[];
  hasMore: boolean;
  nextCursor: string | null;
  page: number;
};

export function useLeaderboards() {
  const api = useApi();
  return useQuery({
    queryKey: ['leaderboards'],
    queryFn: async () => (await api.get('/api/leaderboards')).data as Leaderboard[],
  });
}

export function useLeaderboardBySlug(slug?: string) {
  const api = useApi();
  return useQuery({
    queryKey: ['leaderboardBySlug', slug],
    enabled: !!slug,
    queryFn: async () => (await api.get(`/api/leaderboards/${slug}`)).data as Leaderboard,
  });
}

export function useLeaderboardEntries(leaderboardId?: string, params?: { limit?: number; cursor?: string }) {
  const api = useApi();
  const limit = params?.limit ?? 20;
  return useQuery({
    queryKey: ['leaderboardEntries', leaderboardId, limit, params?.cursor ?? null],
    enabled: !!leaderboardId,
    queryFn: async () => {
      const url = `/api/leaderboard/${leaderboardId}?limit=${limit}${params?.cursor ? `&cursor=${encodeURIComponent(params.cursor)}` : ''}`;
      return (await api.get(url)).data as CursorEntriesResponse;
    },
  });
}

export function useSubmitEntry() {
  const api = useApi();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (payload: { leaderboardId: string; name: string; cgpa: number; marks?: number | null }) => {
      return (await api.post('/api/leaderboard/submit', payload)).data;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['leaderboardEntries', vars.leaderboardId] });
    },
  });
}

export function useEditEntry() {
  const api = useApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { id: string; name: string; cgpa: number; marks?: number | null }) => {
      return (await api.put(`/api/leaderboard/edit/${payload.id}`, payload)).data;
    },
    onSuccess: () => {
      // Editing invalidates all entry pages; caller should supply tighter invalidation later.
      queryClient.invalidateQueries({ queryKey: ['leaderboardEntries'] });
    },
  });
}

export function useDeleteEntry() {
  const api = useApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => (await api.delete(`/api/leaderboard/delete/${id}`)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leaderboardEntries'] });
    },
  });
}

export function useReactEntry() {
  const api = useApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => (await api.post(`/api/leaderboard/react/${id}`)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leaderboardEntries'] });
    },
  });
}

export function useDislikeEntry() {
  const api = useApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => (await api.post(`/api/leaderboard/dislike/${id}`)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leaderboardEntries'] });
    },
  });
}

export function useCreateLeaderboard() {
  const api = useApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { name: string }) => (await api.post('/api/leaderboards/create', payload)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leaderboards'] });
    },
  });
}

export function useToggleLeaderboardStatus() {
  const api = useApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => (await api.post(`/api/leaderboards/toggle-status/${id}`)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leaderboards'] });
    },
  });
}

export function useDeleteLeaderboard() {
  const api = useApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => (await api.delete(`/api/leaderboards/${id}`)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leaderboards'] });
    },
  });
}

export function useSubmitReport() {
  const api = useApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { entryId: string; reason: string }) => (await api.post('/api/reports/submit', payload)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminReports'] });
    },
  });
}

export function useSubmitFeedback() {
  const api = useApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { text: string }) => (await api.post('/api/feedback/submit', payload)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminFeedback'] });
    },
  });
}

// Admin
export function useAdminReports() {
  const api = useApi();
  return useQuery({
    queryKey: ['adminReports'],
    queryFn: async () => (await api.get('/api/admin/reports')).data,
  });
}

export function useAdminFeedback() {
  const api = useApi();
  return useQuery({
    queryKey: ['adminFeedback'],
    queryFn: async () => (await api.get('/api/admin/feedback')).data,
  });
}

export function useAdminUsers(search?: string) {
  const api = useApi();
  return useQuery({
    queryKey: ['adminUsers', search ?? ''],
    queryFn: async () => {
      const url = search ? `/api/admin/users?search=${encodeURIComponent(search)}` : '/api/admin/users';
      return (await api.get(url)).data;
    },
    enabled: true,
  });
}

export function useResolveReport() {
  const api = useApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { reportId: string; action: 'delete' | 'ignore' }) => {
      const { reportId, action } = payload;
      return (await api.post(`/api/admin/resolve-report/${reportId}`, { action })).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminReports'] });
    },
  });
}

export function useToggleBan() {
  const api = useApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => (await api.post(`/api/admin/toggle-ban/${userId}`)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
    },
  });
}

export function useDeleteAdminUser() {
  const api = useApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => (await api.delete(`/api/admin/user/${userId}`)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
    },
  });
}

export function useDeleteAdminFeedback() {
  const api = useApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => (await api.delete(`/api/admin/feedback/${id}`)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminFeedback'] });
    },
  });
}

export function useToggleFeedbackRead() {
  const api = useApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => (await api.patch(`/api/admin/feedback/${id}/toggle-read`)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminFeedback'] });
    },
  });
}

