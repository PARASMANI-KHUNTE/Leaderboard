import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View,
  Share, Image, ActivityIndicator, ScrollView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useInfiniteQuery } from '@tanstack/react-query';

import { useAuth } from '../../../src/providers/AuthProvider';
import { useApi } from '../../../src/api/useApi';
import { useOffline } from '../../../src/offline/OfflineProvider';
import { readJsonCache, writeJsonCache } from '../../../src/offline/cache';
import {
  useDeleteEntry,
  useDislikeEntry,
  useEditEntry,
  useLeaderboardBySlug,
  useReactEntry,
  useSubmitEntry,
  useSubmitReport,
  useDeleteLeaderboard,
  useToggleLeaderboardStatus,
} from '../../../src/api/hooks';
import { useLeaderboardRealtime } from '../../../src/realtime/useLeaderboardRealtime';

const PAGE_LIMIT = 20;
const REPORT_REASONS = ['Fake Name', 'Suspicious CGPA', 'Duplicate Entry', 'Inappropriate Content'];

export default function LeaderboardScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const api = useApi();
  const { user, token } = useAuth();
  const { isConnected } = useOffline();

  const { data: leaderboard } = useLeaderboardBySlug(slug);
  const [cachedLeaderboardMeta, setCachedLeaderboardMeta] = useState<any | null>(null);

  const effectiveLeaderboard = isConnected ? leaderboard : cachedLeaderboardMeta;
  const leaderboardId = effectiveLeaderboard?._id;

  useLeaderboardRealtime(leaderboardId);

  const deleteBoard = useDeleteLeaderboard();
  const toggleBoardStatus = useToggleLeaderboardStatus();

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

  /* Offline caching */
  useEffect(() => {
    if (isConnected || !leaderboardId) return;
    let cancelled = false;
    (async () => {
      const cached = await readJsonCache<any[]>(`offline:lb:${leaderboardId}:entries`);
      if (!cancelled) setCachedEntries(cached ?? []);
    })();
    return () => { cancelled = true; };
  }, [isConnected, leaderboardId]);

  useEffect(() => {
    if (!isConnected || !leaderboardId || !entries.length) return;
    writeJsonCache(`offline:lb:${leaderboardId}:entries`, entries).catch(() => {});
  }, [isConnected, leaderboardId, entries]);

  useEffect(() => {
    if (!slug) return;
    if (isConnected) {
      if (leaderboard) writeJsonCache(`offline:lb:${slug}:meta`, leaderboard).catch(() => {});
      return;
    }
    let cancelled = false;
    (async () => {
      const cached = await readJsonCache<any>(`offline:lb:${slug}:meta`);
      if (!cancelled) setCachedLeaderboardMeta(cached);
    })();
    return () => { cancelled = true; };
  }, [isConnected, slug, leaderboard]);

  /* Entry form */
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

  const canAdmin = !!user && (user.isAdmin || String(user.id) === String(effectiveLeaderboard?.createdBy));

  const playPromotedSound = async () => {
    // expo-av requires native modules not available in Expo Go.
  };

  const onSubmitReport = async () => {
    if (!reportEntryId || !reportReason) {
      Alert.alert('Reason required', 'Please select a reason for the report.');
      return;
    }
    try {
      await submitReport.mutateAsync({ entryId: reportEntryId, reason: reportReason });
      setReportEntryId(null);
      setReportReason('');
      Alert.alert('Report submitted', 'Thanks. The admin team will review it.');
    } catch (e: any) {
      Alert.alert('Report failed', e?.message ?? 'Unknown error');
    }
  };

  const openSubmitModal = () => {
    if (!effectiveLeaderboard?.isLive) { Alert.alert('Closed', 'Submissions are disabled.'); return; }
    if (!isConnected) { Alert.alert('Offline', 'Actions are disabled while offline.'); return; }
    if (!user) { Alert.alert('Sign in required'); router.replace('/login'); return; }
    setEditingEntry(null); setEntryName(''); setEntryCgpa(''); setEntryMarks('');
    setEntryError(null); setEntryStatus('idle'); setEntryModalOpen(true);
  };

  const openEditModal = (entry: any) => {
    setEditingEntry(entry);
    setEntryName(String(entry?.name ?? ''));
    setEntryCgpa(String(entry?.cgpa ?? ''));
    setEntryMarks(String(entry?.marks ?? ''));
    setEntryError(null); setEntryStatus('idle'); setEntryModalOpen(true);
  };

  const closeEntryModal = () => {
    setEntryModalOpen(false); setEditingEntry(null);
    setEntryError(null); setEntryStatus('idle');
  };

  const onSubmitEntry = async () => {
    if (!leaderboardId || !isConnected) { setEntryError('Offline: actions disabled.'); return; }
    const name = entryName.trim();
    const cgpaParsed = entryCgpa === '' ? NaN : parseFloat(entryCgpa);
    const marksParsed = entryMarks === '' ? NaN : parseFloat(entryMarks);
    if (!name || Number.isNaN(cgpaParsed) || Number.isNaN(marksParsed)) {
      setEntryError('Please fill in all fields.'); return;
    }
    if (marksParsed < 0 || marksParsed > 700) { setEntryError('Marks must be 0-700.'); return; }
    setEntryStatus('loading'); setEntryError(null);
    try {
      const payload = { name, cgpa: cgpaParsed, marks: marksParsed };
      const data = editingEntry
        ? await editEntry.mutateAsync({ id: editingEntry._id, ...payload })
        : await submitEntry.mutateAsync({ leaderboardId, ...payload });
      if (data && Number(data.cgpa) === 0) {
        setShowCelebration(true);
        await playPromotedSound();
        setTimeout(() => setShowCelebration(false), 5000);
      }
      closeEntryModal();
    } catch (e: any) {
      setEntryError(e?.response?.data?.message ?? e?.message ?? 'Failed');
      setEntryStatus('idle');
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({ message: `Check out ${effectiveLeaderboard?.name} on EliteBoards!`, title: 'EliteBoards' });
    } catch {}
  };

  /* ─── Rank icon helper ─── */
  const RankDisplay = ({ rank }: { rank: number | null }) => {
    if (rank === 1) return <View style={s.crownWrap}><Text style={s.crown}>👑</Text><View style={s.pingDot} /></View>;
    if (rank === 2) return <Text style={s.medal}>🥈</Text>;
    if (rank === 3) return <Text style={s.medal}>🥉</Text>;
    return <Text style={s.rankNum}>{rank ? `#${rank}` : '#--'}</Text>;
  };

  const renderItem = ({ item, index }: { item: any; index: number }) => {
    const entryId = String(item._id);
    const liked = (item.likedBy ?? []).some((u: any) => String(u) === String(user?.id));
    const disliked = (item.dislikedBy ?? []).some((u: any) => String(u) === String(user?.id));
    const rowRank = typeof item.rank === 'number' ? item.rank : null;
    const isOwner = !!user && String(item.userId) === String(user.id);
    const isPromoted = item.useMarks;

    // Tie detection
    let isTied = false;
    if (index > 0) {
      const prev = entriesToRender[index - 1];
      if (prev && item.cgpa === prev.cgpa && item.marks === prev.marks) isTied = true;
    }

    return (
      <View style={[s.row, rowRank === 1 && s.rowFirst]}>
        {/* Rank */}
        <View style={s.rankCol}>
          <RankDisplay rank={rowRank} />
        </View>

        {/* Student info */}
        <View style={s.infoCol}>
          <View style={s.nameRow}>
            {item.userPicture ? (
              <Image source={{ uri: item.userPicture }} style={s.avatar} />
            ) : (
              <View style={s.avatarPlaceholder}>
                <Text style={s.avatarText}>{item.name?.charAt(0)?.toUpperCase() ?? '?'}</Text>
              </View>
            )}
            <View style={s.nameBlock}>
              <View style={s.nameTagRow}>
                <Text style={[s.name, rowRank === 1 && s.nameGold]}>{item.name}</Text>
                {isPromoted ? (
                  <View style={s.badgePromoted}><Text style={s.badgePromotedText}>PROMOTED</Text></View>
                ) : (
                  <View style={s.badgePass}><Text style={s.badgePassText}>PASS</Text></View>
                )}
                {isTied && (
                  <View style={s.badgeTied}><Text style={s.badgeTiedText}>TIED</Text></View>
                )}
              </View>
              <Text style={s.joinDate}>Joined {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '—'}</Text>
            </View>
          </View>

          {/* Score */}
          <View style={s.scoreRow}>
            {isPromoted ? (
              <Text style={s.scoreMain}>{item.marks ?? 0} <Text style={s.scoreLabel}>MARKS (700)</Text></Text>
            ) : (
              <Text style={s.scoreMain}>
                {Number(item.cgpa).toFixed(2)} <Text style={s.scoreLabel}>CGPA{item.marks ? ` | ${item.marks} Marks` : ''}</Text>
              </Text>
            )}
          </View>

          {/* Social + Actions */}
          <View style={s.actionsRow}>
            <Pressable
              style={[s.socialBtn, liked && s.socialBtnActive]}
              onPress={() => user && reactEntry.mutate(entryId)}
            >
              <Text style={s.socialIcon}>{liked ? '❤️' : '🤍'}</Text>
              <Text style={s.socialCount}>{(item.likedBy ?? []).length}</Text>
            </Pressable>

            <Pressable
              style={[s.socialBtn, disliked && s.socialBtnActiveBlue]}
              onPress={() => user && dislikeEntry.mutate(entryId)}
            >
              <Text style={s.socialIcon}>👎</Text>
              <Text style={s.socialCount}>{(item.dislikedBy ?? []).length}</Text>
            </Pressable>

            {isOwner ? (
              <>
                <Pressable style={s.actionBtn} onPress={() => openEditModal(item)}>
                  <Text style={s.actionBtnText}>✏️</Text>
                </Pressable>
                <Pressable
                  style={[s.actionBtn, s.actionBtnDanger]}
                  onPress={() => {
                    Alert.alert('Delete entry?', 'This cannot be undone.', [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Delete', style: 'destructive', onPress: () => deleteEntry.mutateAsync(entryId) },
                    ]);
                  }}
                >
                  <Text style={s.actionBtnText}>🗑</Text>
                </Pressable>
              </>
            ) : user ? (
              <Pressable style={s.actionBtn} onPress={() => { setReportEntryId(entryId); setReportReason(''); }}>
                <Text style={s.actionBtnText}>🚩</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={s.screen}>
      <FlatList
        data={entriesToRender}
        keyExtractor={(it) => String(it._id)}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 100 }}
        onEndReached={() => {
          if (hasMore && !entriesQuery.isFetchingNextPage) entriesQuery.fetchNextPage();
        }}
        onEndReachedThreshold={0.3}
        ListHeaderComponent={
          <View>
            {/* Back + Admin bar */}
            <View style={s.topBar}>
              <Pressable style={s.backBtn} onPress={() => router.back()}>
                <Text style={s.backArrow}>←</Text>
                <Text style={s.backText}>BACK TO EXPLORE</Text>
              </Pressable>
              <View style={s.topBarRight}>
                {canAdmin && (
                  <>
                    <Pressable
                      style={[s.topActionBtn, effectiveLeaderboard?.isLive ? s.topBtnWarn : s.topBtnGreen]}
                      onPress={() => toggleBoardStatus.mutate(String(effectiveLeaderboard?._id))}
                    >
                      <Text style={s.topActionText}>
                        {effectiveLeaderboard?.isLive ? '⏸ DOWN' : '▶ LIVE'}
                      </Text>
                    </Pressable>
                    <Pressable
                      style={[s.topActionBtn, s.topBtnDanger]}
                      onPress={() => {
                        Alert.alert('Delete Board?', 'Removes all entries permanently.', [
                          { text: 'Cancel', style: 'cancel' },
                          { text: 'Delete', style: 'destructive', onPress: () => { deleteBoard.mutate(String(effectiveLeaderboard?._id)); router.replace('/'); }},
                        ]);
                      }}
                    >
                      <Text style={s.topActionText}>🗑 DELETE</Text>
                    </Pressable>
                  </>
                )}
                <Pressable style={s.shareBtn} onPress={handleShare}>
                  <Text style={s.shareBtnText}>📤 SHARE</Text>
                </Pressable>
              </View>
            </View>

            {/* Title */}
            <View style={s.titleWrap}>
              <View style={s.titleRow}>
                <Text style={s.titleElite}>Elite</Text>
                <Text style={s.titleName}> {effectiveLeaderboard?.name ?? 'Leaderboard'}</Text>
              </View>
              {!effectiveLeaderboard?.isLive && (
                <View style={s.downBadge}><Text style={s.downBadgeText}>DOWN</Text></View>
              )}
              <Text style={s.titleSub}>Live updates of student performance</Text>
              {!isConnected && <Text style={s.offlineText}>Offline: showing cached entries</Text>}
            </View>

            {/* Stats */}
            <View style={s.statsRow}>
              <View style={s.statCard}>
                <Text style={s.statIcon}>👥</Text>
                <Text style={s.statNum}>{entriesToRender.length}</Text>
                <Text style={s.statLabel}>STUDENTS</Text>
              </View>
              <View style={s.statCard}>
                <Text style={s.statIcon}>🏆</Text>
                <Text style={s.statNum}>{entriesToRender[0]?.cgpa ? Number(entriesToRender[0].cgpa).toFixed(2) : '0.00'}</Text>
                <Text style={s.statLabel}>TOP SCORE</Text>
              </View>
            </View>
          </View>
        }
        ListEmptyComponent={
          !leaderboardId ? (
            <View style={s.emptyWrap}><ActivityIndicator color="#6366f1" /><Text style={s.emptyText}>LOADING_DATA...</Text></View>
          ) : (
            <View style={s.emptyWrap}><Text style={s.emptyText}>No entries yet.</Text></View>
          )
        }
        ListFooterComponent={
          hasMore ? (
            <View style={s.loadMoreWrap}>
              <Pressable style={s.loadMoreBtn} onPress={() => entriesQuery.fetchNextPage()} disabled={entriesQuery.isFetchingNextPage}>
                <Text style={s.loadMoreText}>{entriesQuery.isFetchingNextPage ? 'LOADING...' : 'LOAD MORE'}</Text>
              </Pressable>
            </View>
          ) : null
        }
      />

      {/* Submit FAB */}
      <Pressable style={s.fab} onPress={openSubmitModal}>
        <Text style={s.fabText}>＋</Text>
      </Pressable>

      {/* Celebration Overlay */}
      {showCelebration && (
        <View style={s.celebOverlay}>
          <View style={s.celebCard}>
            <Text style={s.celebTitle}>LEGENDARY_SUBMISSION!</Text>
            <Text style={s.celebSub}>Your Rank is being Calculated...</Text>
            <View style={s.celebProgress}><View style={s.celebBar} /></View>
          </View>
        </View>
      )}

      {/* Report Modal */}
      {reportEntryId && (
        <View style={s.modalOverlay}>
          <View style={s.modal}>
            <View style={s.modalHeader}>
              <Text style={s.modalHeaderIcon}>⚠️</Text>
              <View>
                <Text style={s.modalTitle}>Report Entry</Text>
                <Text style={s.modalSub}>Help us maintain integrity</Text>
              </View>
            </View>
            <Text style={s.fieldLabel}>REASON FOR REPORT</Text>
            <View style={s.reasonList}>
              {REPORT_REASONS.map((r) => (
                <Pressable
                  key={r}
                  style={[s.reasonBtn, reportReason === r && s.reasonBtnActive]}
                  onPress={() => setReportReason(r)}
                >
                  <Text style={[s.reasonText, reportReason === r && s.reasonTextActive]}>{r}</Text>
                </Pressable>
              ))}
            </View>
            <View style={s.modalActions}>
              <Pressable style={s.modalBtnSec} onPress={() => { setReportEntryId(null); setReportReason(''); }}>
                <Text style={s.modalBtnSecText}>Cancel</Text>
              </Pressable>
              <Pressable style={s.modalBtnDanger} onPress={onSubmitReport}>
                <Text style={s.modalBtnPriText}>Submit Report</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}

      {/* Entry Form Modal */}
      {entryModalOpen && (
        <View style={s.modalOverlay}>
          <ScrollView contentContainerStyle={s.modalScroll}>
            <View style={s.modal}>
              <Text style={s.modalTitle}>{editingEntry ? 'Edit Entry' : 'Submit Entry'}</Text>

              {/* Warning */}
              <View style={s.warningBox}>
                <Text style={s.warningIcon}>⚠️</Text>
                <Text style={s.warningText}>
                  <Text style={s.warningBold}>ATTENTION: </Text>
                  Please enter valid details. Do not use fake names or CGPA. Persistent fake entries may lead to a ban.
                </Text>
              </View>

              <Text style={s.fieldLabel}>FULL NAME</Text>
              <TextInput style={s.input} value={entryName} onChangeText={setEntryName} placeholder="e.g. John Doe" placeholderTextColor="#475569" />

              <Text style={s.fieldLabel}>CGPA (OUT OF 10)</Text>
              <TextInput style={s.input} value={entryCgpa} onChangeText={setEntryCgpa} placeholder="e.g. 9.5" placeholderTextColor="#475569" keyboardType="decimal-pad" />
              {parseFloat(entryCgpa) === 0 && <Text style={s.promotedHint}>⚡ Promoted Student Mode Activated</Text>}

              <Text style={s.fieldLabel}>MARKS OBTAINED (MAX 700)</Text>
              <TextInput style={s.inputMarks} value={entryMarks} onChangeText={setEntryMarks} placeholder="Enter total marks" placeholderTextColor="#475569" keyboardType="numeric" />
              <Text style={s.fieldHint}>Used as a tie-breaker if CGPAs are identical.</Text>

              {entryError && <Text style={s.errorText}>{entryError}</Text>}

              <View style={s.modalActions}>
                <Pressable style={s.modalBtnSec} onPress={closeEntryModal}>
                  <Text style={s.modalBtnSecText}>Cancel</Text>
                </Pressable>
                <Pressable style={s.modalBtnPrimary} onPress={onSubmitEntry} disabled={entryStatus === 'loading'}>
                  <Text style={s.modalBtnPriText}>{entryStatus === 'loading' ? 'Processing...' : editingEntry ? 'Update Entry' : 'Submit Entry'}</Text>
                </Pressable>
              </View>
              <Text style={s.footerNote}>{editingEntry ? 'You can update your details anytime' : 'Caution: One entry per student'}</Text>
            </View>
          </ScrollView>
        </View>
      )}
    </View>
  );
}

/* ─── Styles ─── */
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0b1020' },

  /* Top bar */
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, flexWrap: 'wrap', gap: 8 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  backArrow: { color: '#64748b', fontSize: 16 },
  backText: { color: '#64748b', fontSize: 9, fontWeight: '800', letterSpacing: 2 },
  topBarRight: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  topActionBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, borderWidth: 1 },
  topActionText: { fontSize: 10, fontWeight: '800' },
  topBtnWarn: { borderColor: 'rgba(234,179,8,0.3)', backgroundColor: 'rgba(234,179,8,0.08)', },
  topBtnGreen: { borderColor: 'rgba(34,197,94,0.3)', backgroundColor: 'rgba(34,197,94,0.08)' },
  topBtnDanger: { borderColor: 'rgba(239,68,68,0.3)', backgroundColor: 'rgba(239,68,68,0.08)' },
  shareBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, backgroundColor: '#4f46e5' },
  shareBtnText: { color: 'white', fontSize: 10, fontWeight: '800' },

  /* Title */
  titleWrap: { alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16 },
  titleRow: { flexDirection: 'row', alignItems: 'baseline' },
  titleElite: { color: '#6366f1', fontSize: 28, fontWeight: '900', fontStyle: 'italic' },
  titleName: { color: 'white', fontSize: 28, fontWeight: '900' },
  downBadge: { backgroundColor: '#ef4444', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 6, marginTop: 6 },
  downBadgeText: { color: 'white', fontSize: 9, fontWeight: '900', letterSpacing: 2 },
  titleSub: { color: '#64748b', fontSize: 14, fontStyle: 'italic', marginTop: 6 },
  offlineText: { color: '#fb7185', fontSize: 11, fontWeight: '800', marginTop: 6 },

  /* Stats */
  statsRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 16, marginBottom: 8, marginTop: 4 },
  statCard: {
    flex: 1, backgroundColor: '#111a33', borderRadius: 14, borderWidth: 1, borderColor: '#1f2a4d',
    padding: 14, alignItems: 'center',
  },
  statIcon: { fontSize: 20, marginBottom: 4 },
  statNum: { color: 'white', fontSize: 22, fontWeight: '900' },
  statLabel: { color: '#475569', fontSize: 8, fontWeight: '900', letterSpacing: 2, marginTop: 2 },

  /* Entry rows */
  row: {
    marginHorizontal: 14, marginVertical: 5, padding: 14, borderRadius: 14,
    backgroundColor: '#111a33', borderWidth: 1, borderColor: '#1f2a4d',
    flexDirection: 'row', gap: 12,
  },
  rowFirst: { backgroundColor: 'rgba(99, 102, 241, 0.08)', borderColor: 'rgba(99, 102, 241, 0.2)' },
  rankCol: { width: 40, alignItems: 'center', justifyContent: 'flex-start', paddingTop: 4 },
  crownWrap: { position: 'relative' },
  crown: { fontSize: 26 },
  pingDot: { position: 'absolute', top: -2, right: -4, width: 8, height: 8, borderRadius: 4, backgroundColor: '#ef4444' },
  medal: { fontSize: 22 },
  rankNum: { color: '#64748b', fontWeight: '800', fontSize: 14 },
  infoCol: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  avatar: { width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.1)' },
  avatarPlaceholder: {
    width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: '#94a3b8', fontWeight: '800', fontSize: 14 },
  nameBlock: { flex: 1 },
  nameTagRow: { flexDirection: 'row', alignItems: 'center', gap: 5, flexWrap: 'wrap' },
  name: { color: '#e5e7eb', fontWeight: '800', fontSize: 14 },
  nameGold: { color: '#facc15', fontSize: 15 },
  badgePromoted: { backgroundColor: 'rgba(99,102,241,0.15)', borderWidth: 1, borderColor: 'rgba(99,102,241,0.25)', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 3 },
  badgePromotedText: { color: '#a5b4fc', fontSize: 7, fontWeight: '900', letterSpacing: 0.5 },
  badgePass: { backgroundColor: 'rgba(34,197,94,0.12)', borderWidth: 1, borderColor: 'rgba(34,197,94,0.2)', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 3 },
  badgePassText: { color: '#4ade80', fontSize: 7, fontWeight: '900', letterSpacing: 0.5 },
  badgeTied: { backgroundColor: 'rgba(255,255,255,0.06)', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 3 },
  badgeTiedText: { color: '#94a3b8', fontSize: 7, fontWeight: '900', letterSpacing: 0.5 },
  joinDate: { color: '#475569', fontSize: 9, fontWeight: '700', letterSpacing: 1.5, marginTop: 2 },

  /* Score */
  scoreRow: { marginBottom: 8 },
  scoreMain: { color: '#a5b4fc', fontWeight: '900', fontSize: 16 },
  scoreLabel: { color: '#475569', fontWeight: '700', fontSize: 9, letterSpacing: 1.5 },

  /* Social */
  actionsRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  socialBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8,
    borderWidth: 1, borderColor: '#1f2a4d', backgroundColor: '#0b1020',
  },
  socialBtnActive: { borderColor: '#7c3aed', backgroundColor: '#1b1147' },
  socialBtnActiveBlue: { borderColor: '#4f46e5', backgroundColor: '#1b1147' },
  socialIcon: { fontSize: 13 },
  socialCount: { color: '#94a3b8', fontWeight: '800', fontSize: 11 },
  actionBtn: {
    width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  actionBtnDanger: { backgroundColor: 'rgba(239,68,68,0.08)' },
  actionBtnText: { fontSize: 13 },

  /* Empty & Loading */
  emptyWrap: { alignItems: 'center', paddingTop: 50, gap: 10 },
  emptyText: { color: '#64748b', fontSize: 13 },

  /* Load more */
  loadMoreWrap: { alignItems: 'center', paddingVertical: 16 },
  loadMoreBtn: { backgroundColor: '#4f46e5', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12 },
  loadMoreText: { color: 'white', fontWeight: '800', fontSize: 11, letterSpacing: 2 },

  /* FAB */
  fab: {
    position: 'absolute', right: 16, bottom: 16,
    width: 52, height: 52, borderRadius: 16,
    backgroundColor: '#4f46e5', alignItems: 'center', justifyContent: 'center', elevation: 6,
  },
  fabText: { color: 'white', fontSize: 22, fontWeight: '900' },

  /* Celebration */
  celebOverlay: {
    position: 'absolute', left: 0, right: 0, top: 0, bottom: 0,
    backgroundColor: 'rgba(2,6,23,0.92)', alignItems: 'center', justifyContent: 'center', padding: 20,
  },
  celebCard: { alignItems: 'center', gap: 12 },
  celebTitle: { color: 'white', fontSize: 28, fontWeight: '900', fontStyle: 'italic', textAlign: 'center' },
  celebSub: { color: '#a5b4fc', fontSize: 14, fontWeight: '700', letterSpacing: 2, textAlign: 'center' },
  celebProgress: { width: 200, height: 3, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 2, overflow: 'hidden', marginTop: 16 },
  celebBar: { width: '100%', height: 3, backgroundColor: '#6366f1', borderRadius: 2 },

  /* Modals */
  modalOverlay: {
    position: 'absolute', left: 0, right: 0, top: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.75)', alignItems: 'center', justifyContent: 'center', padding: 16,
  },
  modalScroll: { flexGrow: 1, justifyContent: 'center', paddingVertical: 20 },
  modal: {
    width: '100%', backgroundColor: '#0f172a', borderRadius: 18, padding: 20,
    borderWidth: 1, borderColor: '#1f2a4d',
  },
  modalHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  modalHeaderIcon: { fontSize: 28 },
  modalTitle: { color: '#e5e7eb', fontWeight: '900', fontSize: 18 },
  modalSub: { color: '#475569', fontSize: 10, fontWeight: '700', letterSpacing: 2 },

  /* Report reasons picker */
  reasonList: { gap: 6, marginBottom: 16, marginTop: 6 },
  reasonBtn: {
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  reasonBtnActive: { borderColor: '#ef4444', backgroundColor: 'rgba(239,68,68,0.08)' },
  reasonText: { color: '#94a3b8', fontWeight: '700', fontSize: 13 },
  reasonTextActive: { color: '#f87171' },

  /* Form */
  fieldLabel: { color: '#475569', fontSize: 9, fontWeight: '900', letterSpacing: 2, marginBottom: 6, marginTop: 12 },
  input: {
    backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    color: '#e5e7eb', paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12, fontSize: 14,
  },
  inputMarks: {
    backgroundColor: 'rgba(99,102,241,0.08)', borderWidth: 1, borderColor: 'rgba(99,102,241,0.2)',
    color: '#c7d2fe', paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12, fontSize: 14,
  },
  fieldHint: { color: '#475569', fontSize: 9, fontWeight: '700', letterSpacing: 1.5, marginTop: 4 },
  promotedHint: { color: '#a5b4fc', fontSize: 10, fontWeight: '900', marginTop: 4 },
  warningBox: {
    flexDirection: 'row', gap: 10, padding: 12, borderRadius: 12,
    backgroundColor: 'rgba(234,179,8,0.06)', borderWidth: 1, borderColor: 'rgba(234,179,8,0.15)',
    marginBottom: 4,
  },
  warningIcon: { fontSize: 16 },
  warningText: { flex: 1, color: 'rgba(253,224,71,0.7)', fontSize: 11, lineHeight: 16 },
  warningBold: { fontWeight: '900', color: '#eab308' },
  errorText: { color: '#fb7185', fontSize: 12, fontWeight: '800', textAlign: 'center', marginTop: 10 },
  footerNote: { color: '#475569', fontSize: 9, fontWeight: '700', letterSpacing: 1, textAlign: 'center', marginTop: 12 },

  /* Modal buttons */
  modalActions: { flexDirection: 'row', gap: 10, justifyContent: 'flex-end', marginTop: 16 },
  modalBtnSec: {
    flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  modalBtnSecText: { color: '#94a3b8', fontWeight: '800', fontSize: 12, letterSpacing: 1 },
  modalBtnDanger: {
    flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', backgroundColor: '#dc2626',
  },
  modalBtnPrimary: {
    flex: 2, paddingVertical: 14, borderRadius: 12, alignItems: 'center', backgroundColor: '#4f46e5',
  },
  modalBtnPriText: { color: 'white', fontWeight: '800', fontSize: 12, letterSpacing: 1 },
});
