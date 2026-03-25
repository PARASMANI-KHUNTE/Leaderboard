import React, { useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Audio } from 'expo-av';

import { useAuth } from '../../providers/AuthProvider';
import { useApi } from '../../api/useApi';
import { useOffline } from '../../offline/OfflineProvider';
import { readJsonCache, writeJsonCache } from '../../offline/cache';
import {
  useDeleteEntry,
  useDislikeEntry,
  useEditEntry,
  useLeaderboardBySlug,
  useReactEntry,
  useSubmitEntry,
  useSubmitReport,
} from '../../api/hooks';
import { useLeaderboardRealtime } from '../../realtime/useLeaderboardRealtime';

const PAGE_LIMIT = 20;
const PROMOTED_AUDIO_URI = 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3';

export default function LeaderboardScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const api = useApi();
  const { user } = useAuth();
  const { isConnected } = useOffline();

  const { data: leaderboard } = useLeaderboardBySlug(slug);
  const [cachedLeaderboardMeta, setCachedLeaderboardMeta] = useState<any | null>(null);

  const effectiveLeaderboard = isConnected ? leaderboard : cachedLeaderboardMeta;
  const leaderboardId = effectiveLeaderboard?._id;

  useLeaderboardRealtime(leaderboardId);

  const [cachedEntries, setCachedEntries] = useState<any[]>([]);

  const [reportEntryId, setReportEntryId] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState('');

  const submitReport = useSubmitReport();
  const reactEntry = useReactEntry();
  const dislikeEntry = useDislikeEntry();

  const entriesQuery = useInfiniteQuery({
    queryKey: ['leaderboardEntries', leaderboardId, 'infinite'],
    enabled: !!leaderboardId && isConnected,
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) => {
      const cursor = pageParam;
      const url = `/api/leaderboard/${leaderboardId}?limit=${PAGE_LIMIT}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`;
      return (await api.get(url)).data as any;
    },
    getNextPageParam: (lastPage) => (lastPage?.hasMore ? lastPage.nextCursor ?? undefined : undefined),
  });

  const entries = useMemo(() => {
    return (entriesQuery.data?.pages ?? []).flatMap((p: any) => (p?.items ?? []));
  }, [entriesQuery.data]);

  const hasMore = isConnected ? entriesQuery.hasNextPage ?? false : false;

  const entriesToRender = isConnected ? entries : cachedEntries;

  useEffect(() => {
    if (isConnected) return;
    if (!leaderboardId) return;

    let cancelled = false;
    (async () => {
      const cached = await readJsonCache<any[]>(`offline:lb:${leaderboardId}:entries`);
      if (cancelled) return;
      setCachedEntries(cached ?? []);
    })();

    return () => {
      cancelled = true;
    };
  }, [isConnected, leaderboardId]);

  useEffect(() => {
    if (!isConnected) return;
    if (!leaderboardId) return;
    if (!entries || entries.length === 0) return;
    writeJsonCache(`offline:lb:${leaderboardId}:entries`, entries).catch(() => {});
  }, [isConnected, leaderboardId, entries]);

  // Offline-friendly leaderboard metadata (needed to render cached entries after a cold start).
  useEffect(() => {
    if (!slug) return;

    if (isConnected) {
      if (!leaderboard) return;
      writeJsonCache(`offline:lb:${slug}:meta`, leaderboard).catch(() => {});
      return;
    }

    let cancelled = false;
    (async () => {
      const cached = await readJsonCache<any>(`offline:lb:${slug}:meta`);
      if (cancelled) return;
      setCachedLeaderboardMeta(cached);
    })();

    return () => {
      cancelled = true;
    };
  }, [isConnected, slug, leaderboard]);

  const submitEntry = useSubmitEntry();
  const editEntry = useEditEntry();
  const deleteEntry = useDeleteEntry();

  const [entryModalOpen, setEntryModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<any | null>(null);
  const [entryName, setEntryName] = useState('');
  const [entryCgpa, setEntryCgpa] = useState('');
  const [entryMarks, setEntryMarks] = useState('');
  const [entryError, setEntryError] = useState<string | null>(null);
  const [entryStatus, setEntryStatus] = useState<'idle' | 'loading'>('idle');

  const [showCelebration, setShowCelebration] = useState(false);

  const playPromotedSound = async () => {
    try {
      const { sound } = await Audio.Sound.createAsync(
        { uri: PROMOTED_AUDIO_URI },
        { shouldPlay: true }
      );
      setTimeout(() => {
        sound.unloadAsync().catch(() => {});
      }, 6000);
    } catch {
      // Audio can fail on some devices; the overlay still provides feedback.
    }
  };

  const onSubmitReport = async () => {
    if (!reportEntryId) return;
    const reason = reportReason.trim();
    if (!reason) {
      Alert.alert('Reason required', 'Please enter a short reason for the report.');
      return;
    }

    try {
      await submitReport.mutateAsync({ entryId: reportEntryId, reason });
      setReportEntryId(null);
      setReportReason('');
      Alert.alert('Report submitted', 'Thanks. The admin team will review it shortly.');
    } catch (e: any) {
      Alert.alert('Report failed', e?.message ?? 'Unknown error');
    }
  };

  const openSubmitModal = () => {
    if (!effectiveLeaderboard?.isLive) {
      Alert.alert('Leaderboard closed', 'Submissions are disabled for this leaderboard.');
      return;
    }
    if (!isConnected) {
      Alert.alert('Offline', 'Actions are disabled while offline.');
      return;
    }
    if (!user) {
      Alert.alert('Sign in required', 'Please login to submit an entry.');
      router.replace('/login');
      return;
    }
    setEditingEntry(null);
    setEntryName('');
    setEntryCgpa('');
    setEntryMarks('');
    setEntryError(null);
    setEntryStatus('idle');
    setEntryModalOpen(true);
  };

  const openEditModal = (entry: any) => {
    setEditingEntry(entry);
    setEntryName(String(entry?.name ?? ''));
    setEntryCgpa(String(entry?.cgpa ?? ''));
    setEntryMarks(String(entry?.marks ?? ''));
    setEntryError(null);
    setEntryStatus('idle');
    setEntryModalOpen(true);
  };

  const closeEntryModal = () => {
    setEntryModalOpen(false);
    setEditingEntry(null);
    setEntryError(null);
    setEntryStatus('idle');
  };

  const onSubmitEntry = async () => {
    if (!leaderboardId) return;
    if (!isConnected) {
      setEntryError('Offline: actions disabled.');
      return;
    }

    const name = entryName.trim();
    const cgpaParsed = entryCgpa === '' ? NaN : parseFloat(entryCgpa);
    const marksParsed = entryMarks === '' ? NaN : parseFloat(entryMarks);

    if (!name || Number.isNaN(cgpaParsed) || Number.isNaN(marksParsed)) {
      setEntryError('Please fill in all fields (Name, CGPA and Marks).');
      return;
    }

    if (marksParsed < 0 || marksParsed > 700) {
      setEntryError('Please enter valid marks (0-700).');
      return;
    }

    setEntryStatus('loading');
    setEntryError(null);

    try {
      const payload = {
        name,
        cgpa: cgpaParsed,
        marks: marksParsed,
      };

      const data = editingEntry
        ? await editEntry.mutateAsync({ id: editingEntry._id, ...payload })
        : await submitEntry.mutateAsync({ leaderboardId, ...payload });

      // Promoted student mode: exactly 0 CGPA.
      if (data && Number(data.cgpa) === 0) {
        setShowCelebration(true);
        await playPromotedSound();
        setTimeout(() => setShowCelebration(false), 5000);
      }

      closeEntryModal();
    } catch (e: any) {
      setEntryError(e?.response?.data?.message ?? e?.message ?? 'Failed to submit entry');
      setEntryStatus('idle');
    }
  };

  const renderItem = ({ item }: { item: any }) => {
    const entryId = String(item._id);
    const liked = (item.likedBy ?? []).some((u: any) => String(u) === String(user?.id));
    const disliked = (item.dislikedBy ?? []).some((u: any) => String(u) === String(user?.id));
    const rowRank = typeof item.rank === 'number' ? item.rank : null;
    const isOwner = !!user && String(item.userId) === String(user.id);

    const marksText = item.marks ?? 0;

    return (
      <View style={styles.row}>
        <View style={styles.rowLeft}>
          <Text style={styles.rank}>{rowRank ? `#${rowRank}` : '#--'}</Text>
          <View style={styles.card}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.score}>
              {item.useMarks ? `CGPA: ${item.cgpa}` : `CGPA: ${item.cgpa} • Marks: ${marksText ?? '--'}`}
            </Text>
          </View>
        </View>

        <View style={styles.actions}>
          <Pressable
            style={[styles.actionBtn, liked ? styles.actionBtnActive : null]}
            disabled={!user || !isConnected}
            onPress={() => reactEntry.mutate(entryId)}
          >
            <Text style={styles.actionText}>Like</Text>
            <Text style={styles.actionSub}>{(item.likedBy ?? []).length}</Text>
          </Pressable>

          <Pressable
            style={[styles.actionBtn, disliked ? styles.actionBtnActive : null]}
            disabled={!user || !isConnected}
            onPress={() => dislikeEntry.mutate(entryId)}
          >
            <Text style={styles.actionText}>Dislike</Text>
            <Text style={styles.actionSub}>{(item.dislikedBy ?? []).length}</Text>
          </Pressable>

          <Pressable
            style={styles.reportBtn}
            disabled={!user || !isConnected}
            onPress={() => {
              if (!user) return;
              setReportEntryId(entryId);
            }}
          >
            <Text style={styles.reportBtnText}>Report</Text>
          </Pressable>

          {isOwner ? (
            <View style={styles.ownerActions}>
              <Pressable
                style={styles.ownerBtn}
                onPress={() => openEditModal(item)}
                disabled={!effectiveLeaderboard?.isLive || !isConnected}
              >
                <Text style={styles.ownerBtnText}>Edit</Text>
              </Pressable>
              <Pressable
                style={[styles.ownerBtn, styles.ownerBtnDanger]}
                onPress={() => {
                  if (!isConnected) {
                    Alert.alert('Offline', 'Delete is disabled while offline.');
                    return;
                  }
                  if (!effectiveLeaderboard?.isLive) {
                    Alert.alert('Leaderboard closed', 'You can still delete your entry.');
                  }
                  Alert.alert('Delete entry?', 'This cannot be undone.', [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Delete',
                      style: 'destructive',
                      onPress: async () => {
                        try {
                          await deleteEntry.mutateAsync(entryId);
                        } catch (e: any) {
                          Alert.alert('Delete failed', e?.response?.data?.message ?? e?.message ?? 'Unknown error');
                        }
                      },
                    },
                  ]);
                }}
              >
                <Text style={styles.ownerBtnText}>Delete</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{leaderboard?.name ?? 'Leaderboard'}</Text>
        <Text style={styles.headerSub}>{effectiveLeaderboard?.isLive ? 'Live' : 'Down'}</Text>
        {!isConnected ? <Text style={styles.offlineText}>Offline: showing cached entries • actions disabled</Text> : null}
      </View>

      {!leaderboardId ? (
        <View style={styles.loadingWrap}>
          <Text style={styles.loadingText}>Loading leaderboard...</Text>
        </View>
      ) : (
        <FlatList
          data={entriesToRender}
          keyExtractor={(it) => String(it._id)}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 120 }}
          onEndReached={() => {
            if (hasMore && !entriesQuery.isFetchingNextPage) {
              entriesQuery.fetchNextPage();
            }
          }}
          onEndReachedThreshold={0.2}
          ListEmptyComponent={
            <View style={styles.loadingWrap}>
              <Text style={styles.loadingText}>No entries yet.</Text>
            </View>
          }
        />
      )}

      {reportEntryId ? (
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Report entry</Text>
            <TextInput
              placeholder="Reason"
              placeholderTextColor="#64748b"
              style={styles.input}
              value={reportReason}
              onChangeText={setReportReason}
              multiline
            />
            <View style={styles.modalActions}>
              <Pressable
                style={[styles.modalBtn, styles.modalBtnSecondary]}
                onPress={() => {
                  setReportEntryId(null);
                  setReportReason('');
                }}
              >
                <Text style={styles.modalBtnText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.modalBtn} onPress={onSubmitReport}>
                <Text style={styles.modalBtnText}>Submit</Text>
              </Pressable>
            </View>
          </View>
        </View>
      ) : null}

      <Pressable
        style={styles.fab}
        onPress={openSubmitModal}
        disabled={!effectiveLeaderboard?.isLive || !user || !isConnected}
      >
        <Text style={styles.fabText}>+</Text>
      </Pressable>

      {showCelebration ? (
        <View style={styles.celebrationOverlay}>
          <View style={styles.celebrationCard}>
            <Text style={styles.celebrationTitle}>Promoted!</Text>
            <Text style={styles.celebrationSub}>Success audio is playing.</Text>
          </View>
        </View>
      ) : null}

      {entryModalOpen ? (
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>{editingEntry ? 'Edit entry' : 'Submit entry'}</Text>

            <TextInput
              placeholder="Full Name"
              placeholderTextColor="#64748b"
              style={styles.input}
              value={entryName}
              onChangeText={setEntryName}
            />

            <TextInput
              placeholder="CGPA (0-10)"
              placeholderTextColor="#64748b"
              style={styles.input}
              value={entryCgpa}
              onChangeText={setEntryCgpa}
              keyboardType="decimal-pad"
            />

            <TextInput
              placeholder="Marks Obtained (0-700)"
              placeholderTextColor="#64748b"
              style={styles.input}
              value={entryMarks}
              onChangeText={setEntryMarks}
              keyboardType="numeric"
            />

            {entryError ? <Text style={styles.errorText}>{entryError}</Text> : null}

            <View style={styles.modalActions}>
              <Pressable style={[styles.modalBtn, styles.modalBtnSecondary]} onPress={closeEntryModal}>
                <Text style={styles.modalBtnText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalBtn, entryStatus === 'loading' ? styles.modalBtnDisabled : null]}
                onPress={onSubmitEntry}
                disabled={entryStatus === 'loading'}
              >
                <Text style={styles.modalBtnText}>{entryStatus === 'loading' ? 'Processing...' : 'Submit'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0b1020' },
  header: { paddingHorizontal: 16, paddingTop: 18, paddingBottom: 10 },
  headerTitle: { color: '#e5e7eb', fontSize: 20, fontWeight: '800' },
  headerSub: { color: '#94a3b8', marginTop: 4, fontSize: 13 },
  offlineText: { color: '#fb7185', fontWeight: '800', fontSize: 12, marginTop: 6, textAlign: 'center' },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 40 },
  loadingText: { color: '#94a3b8' },
  row: {
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 12,
    borderRadius: 14,
    backgroundColor: '#111a33',
    borderWidth: 1,
    borderColor: '#1f2a4d',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  rowLeft: { flex: 1, flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  rank: { color: '#a5b4fc', fontWeight: '800', marginTop: 6, width: 40 },
  card: { flex: 1 },
  name: { color: '#e5e7eb', fontWeight: '800', fontSize: 16 },
  score: { color: '#94a3b8', marginTop: 4, fontSize: 12 },
  actions: { alignItems: 'flex-end', gap: 8 },
  actionBtn: {
    borderWidth: 1,
    borderColor: '#334155',
    backgroundColor: '#0b1020',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    minWidth: 92,
    alignItems: 'center',
  },
  actionBtnActive: {
    borderColor: '#7c3aed',
    backgroundColor: '#1b1147',
  },
  actionText: { color: '#c7d2fe', fontWeight: '700', fontSize: 12 },
  actionSub: { color: '#94a3b8', fontWeight: '700', fontSize: 11, marginTop: 2 },
  reportBtn: {
    backgroundColor: '#0b1020',
    borderColor: '#f43f5e',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    minWidth: 92,
    alignItems: 'center',
  },
  reportBtnText: { color: '#fda4af', fontWeight: '800', fontSize: 12 },
  modalOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  modal: { width: '100%', backgroundColor: '#0f172a', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#1f2a4d' },
  modalTitle: { color: '#e5e7eb', fontWeight: '900', fontSize: 16, marginBottom: 10 },
  input: { backgroundColor: '#0b1020', borderWidth: 1, borderColor: '#1f2a4d', color: '#e5e7eb', padding: 12, borderRadius: 12, minHeight: 80 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 14 },
  modalBtn: { backgroundColor: '#4f46e5', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12 },
  modalBtnSecondary: { backgroundColor: '#111a33' },
  modalBtnDisabled: { opacity: 0.6 },
  modalBtnText: { color: 'white', fontWeight: '900' },
  fab: {
    position: 'absolute',
    right: 18,
    bottom: 18,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#4f46e5',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
  },
  fabText: { color: 'white', fontSize: 26, fontWeight: '900' },

  ownerActions: { marginTop: 6, gap: 8, alignItems: 'flex-end' },
  ownerBtn: { backgroundColor: '#0b1020', borderColor: '#334155', borderWidth: 1, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 10, alignItems: 'center' },
  ownerBtnDanger: { borderColor: '#fb7185' },
  ownerBtnText: { color: '#cbd5e1', fontWeight: '800', fontSize: 12 },

  errorText: { color: '#fb7185', marginTop: 10, fontSize: 12, textAlign: 'center' },

  celebrationOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.62)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  celebrationCard: { width: '100%', backgroundColor: '#0f172a', borderColor: '#1f2a4d', borderWidth: 1, borderRadius: 16, padding: 18, alignItems: 'center' },
  celebrationTitle: { color: '#a5b4fc', fontWeight: '900', fontSize: 22, marginBottom: 4 },
  celebrationSub: { color: '#94a3b8', fontWeight: '700', fontSize: 12, textAlign: 'center' },
});

