import React, { useEffect, useMemo, useState } from 'react';
import { 
  Alert, 
  FlatList, 
  Pressable, 
  StyleSheet, 
  Text, 
  TextInput, 
  View, 
  ActivityIndicator 
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../src/providers/AuthProvider';
import { useOffline } from '../src/offline/OfflineProvider';
import {
  useCreateLeaderboard,
  useDeleteLeaderboard,
  useLeaderboards,
  useToggleLeaderboardStatus,
} from '../src/api/hooks';
import { readJsonCache, writeJsonCache } from '../src/offline/cache';
import { useThemedDialog } from '../src/components/ThemedDialog';
import { useTheme } from '../src/theme/ThemeContext';

export default function Home() {
  const router = useRouter();
  const { user } = useAuth();
  const { isConnected } = useOffline();
  const { colors, isDark } = useTheme();
  const { showConfirm, showAlert } = useThemedDialog();
  const { data: leaderboards, isLoading, isError, refetch } = useLeaderboards();

  const createLeaderboard = useCreateLeaderboard();
  const toggleLeaderboardStatus = useToggleLeaderboardStatus();
  const deleteLeaderboard = useDeleteLeaderboard();

  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState('');
  const [cachedLeaderboards, setCachedLeaderboards] = useState<any[] | null>(null);

  // Search & Status filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'live' | 'down'>('all');

  const isBanned = !!user?.isBanned;
  const canCreate = !!user && !isBanned && isConnected;
  const canAct = !!user && !isBanned && isConnected;

  const boards = useMemo(() => leaderboards ?? [], [leaderboards]);
  const displayedBoards = isConnected ? boards : (cachedLeaderboards ?? []);

  // Filtered boards based on search and status tabs
  const filteredBoards = useMemo(() => {
    let list = Array.isArray(displayedBoards) ? displayedBoards : [];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((b: any) => b.name?.toLowerCase().includes(q));
    }
    if (statusFilter === 'live') {
      list = list.filter((b: any) => b.isLive);
    } else if (statusFilter === 'down') {
      list = list.filter((b: any) => !b.isLive);
    }
    return list;
  }, [displayedBoards, searchQuery, statusFilter]);

  useEffect(() => {
    if (isConnected) return;
    let cancelled = false;
    (async () => {
      const cached = await readJsonCache<any[]>('offline:leaderboards');
      if (cancelled) return;
      setCachedLeaderboards(cached ?? []);
    })();
    return () => { cancelled = true; };
  }, [isConnected]);

  useEffect(() => {
    if (!isConnected || !leaderboards) return;
    writeJsonCache('offline:leaderboards', leaderboards).catch(() => {});
  }, [isConnected, leaderboards]);

  const onCreate = async () => {
    const name = createName.trim();
    if (!name) return;
    if (!user) { router.replace('/login'); return; }
    if (!canCreate) {
      Alert.alert('Actions disabled', isConnected ? 'Your account is banned.' : 'You are offline.');
      return;
    }
    try {
      await createLeaderboard.mutateAsync({ name });
      setCreateOpen(false);
      setCreateName('');
    } catch (e: any) {
      Alert.alert('Create failed', e?.response?.data?.message ?? e?.message ?? 'Unknown error');
    }
  };

  const renderItem = ({ item }: { item: any }) => {
    const lbId = String(item._id);
    const isCreator = user ? String(item.createdBy?._id || item.createdBy) === String(user.id || user._id) : false;
    const canModify = canAct && (user?.isAdmin || isCreator);

    return (
      <Pressable
        style={({ pressed }) => [
          styles.card,
          { backgroundColor: colors.card, borderColor: colors.border },
          pressed && styles.cardPressed
        ]}
        onPress={() => router.push(`/lb/${item.slug}`)}
      >
        <View style={styles.cardTop}>
          <View style={styles.trophyIcon}>
            <Ionicons name="trophy" size={22} color="#facc15" />
          </View>
          <View style={styles.cardTopRight}>
            {canModify && (
              <>
                <Pressable
                  style={[styles.cardActionBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)' }]}
                  onPress={(e) => {
                    e.stopPropagation?.();
                    showConfirm(
                      'Delete Leaderboard?',
                      'This permanently removes the leaderboard and all entries.',
                      () => deleteLeaderboard.mutate(lbId),
                      { type: 'danger', confirmText: 'Delete' }
                    );
                  }}
                >
                  <Ionicons name="trash-outline" size={14} color="#fb7185" />
                </Pressable>
                <Pressable
                  style={[styles.cardActionBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)' }]}
                  onPress={(e) => {
                    e.stopPropagation?.();
                    const action = item.isLive ? 'Pause' : 'Resume';
                    const msg = item.isLive
                      ? 'Put this leaderboard into maintenance mode? Submissions will be paused.'
                      : 'Make this leaderboard live? Students will be able to submit scores.';
                    showConfirm(
                      `${action} Leaderboard?`,
                      msg,
                      () => {
                        toggleLeaderboardStatus.mutate(lbId, {
                          onError: (err: any) => {
                            showAlert('Action Failed', err?.response?.data?.message || err?.message || 'Could not update status', 'danger');
                          },
                        });
                      },
                      {
                        type: item.isLive ? 'warning' : 'info',
                        confirmText: action,
                      }
                    );
                  }}
                >
                  <Ionicons 
                    name={item.isLive ? "pause" : "play"} 
                    size={12} 
                    color={item.isLive ? "#eab308" : "#22c55e"} 
                  />
                </Pressable>
              </>
            )}
            <View style={[styles.statusBadge, item.isLive ? styles.statusLive : styles.statusDown]}>
              <View style={[styles.statusDot, item.isLive ? styles.dotLive : styles.dotDown]} />
              <Text style={[styles.statusText, item.isLive ? styles.statusTextLive : styles.statusTextDown]}>
                {item.isLive ? 'LIVE' : 'MAINTENANCE'}
              </Text>
            </View>
          </View>
        </View>

        <Text style={[styles.cardName, { color: colors.text }]}>{item.name}</Text>

        <View style={styles.cardBadges}>
          <View style={[styles.cardMeta, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.04)' }]}>
            <Ionicons name="people-outline" size={11} color={colors.textSecondary} />
            <Text style={[styles.cardMetaText, { color: colors.textSecondary }]}>{item.entryCount || 0} SUBMISSIONS</Text>
          </View>
          {item.entryMode ? (
            <View style={styles.cardModeBadge}>
              <Text style={styles.cardModeText}>
                {item.entryMode === 'upload' ? 'DOC VERIFIED' : item.entryMode === 'hybrid' ? 'HYBRID' : 'DIRECT ENTRY'}
              </Text>
            </View>
          ) : null}
          {item.ranking?.primaryField ? (
            <View style={[styles.cardFieldBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.04)', borderColor: colors.borderSubtle }]}>
              <Text style={[styles.cardFieldText, { color: colors.textSecondary }]}>BY {item.ranking.primaryField.toUpperCase()}</Text>
            </View>
          ) : null}
        </View>

        {/* Top Performer Snippet */}
        <View style={[styles.topRankerBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)', borderColor: colors.borderSubtle }]}>
          {item.topEntry ? (
            <View style={styles.topRankerContent}>
              <View style={styles.topRankerLeft}>
                <View style={styles.crownWrap}>
                  <Ionicons name="trophy" size={12} color="#facc15" />
                </View>
                <View style={{ flexShrink: 1 }}>
                  <Text style={styles.topRankerLabel}>RANK #1 LEADER</Text>
                  <Text style={[styles.topRankerName, { color: colors.text }]} numberOfLines={1}>{item.topEntry.name}</Text>
                </View>
              </View>
              <Text style={styles.topRankerScore}>
                {typeof item.topEntry.cgpa === 'number' ? `${item.topEntry.cgpa.toFixed(2)} CGPA` : `${item.topEntry.marks} Marks`}
              </Text>
            </View>
          ) : (
            <View style={styles.topRankerEmpty}>
              <Text style={[styles.topRankerEmptyText, { color: colors.textMuted }]}>Awaiting first submission</Text>
              <Text style={styles.topRankerEmptyAction}>Be #1 &rarr;</Text>
            </View>
          )}
        </View>

        <View style={[styles.cardFooter, { borderTopColor: colors.borderSubtle }]}>
          <Text style={[styles.cardFooterText, { color: colors.textMuted }]}>VIEW BOARD</Text>
          <Ionicons name="arrow-forward-outline" size={14} color={colors.textMuted} />
        </View>
      </Pressable>
    );
  };

  if (isError && isConnected) {
    return (
      <View style={[styles.centerWrap, { backgroundColor: colors.bg }]}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.danger} style={{ marginBottom: 12 }} />
        <Text style={[styles.errorTitle, { color: colors.primaryLight }]}>EliteBoards</Text>
        <Text style={[styles.errorSub, { color: colors.textSecondary }]}>Failed to load leaderboards.</Text>
        <Pressable 
          style={[styles.retryBtn, { backgroundColor: colors.primary, marginTop: 20 }]} 
          onPress={() => refetch()}
        >
          <Ionicons name="refresh-outline" size={16} color="#ffffff" style={{ marginRight: 6 }} />
          <Text style={styles.retryBtnText}>TAP TO RETRY</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <FlatList
        data={filteredBoards}
        keyExtractor={(it) => String(it._id)}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 100, paddingTop: 8 }}
        ListHeaderComponent={
          <View style={styles.headerContainer}>
            {/* Header Title Toolbar */}
            <View style={styles.toolbar}>
              <View style={styles.titleWrap}>
                <Ionicons name="trophy" size={24} color={colors.primaryLight} />
                <Text style={[styles.titleText, { color: colors.text }]}>Leaderboards</Text>
              </View>
              <View style={[styles.countBadge, { backgroundColor: isDark ? 'rgba(99, 102, 241, 0.1)' : 'rgba(99, 102, 241, 0.08)', borderColor: isDark ? 'rgba(99, 102, 241, 0.25)' : 'rgba(99, 102, 241, 0.2)' }]}>
                <Text style={[styles.countBadgeText, { color: colors.primaryLight }]}>{displayedBoards.length} TOTAL</Text>
              </View>
            </View>

            {/* Offline or Banned Alert Banners */}
            {isBanned && (
              <View style={styles.bannerRow}>
                <Ionicons name="ban-outline" size={14} color={colors.danger} />
                <Text style={[styles.banner, { color: colors.danger }]}>Account banned — actions disabled</Text>
              </View>
            )}
            {!isConnected && (
              <View style={styles.bannerRow}>
                <Ionicons name="wifi-outline" size={14} color={colors.primaryLight} />
                <Text style={[styles.banner, { color: colors.primaryLight }]}>Offline — showing cached data</Text>
              </View>
            )}

            {/* Search Input Bar */}
            <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Ionicons name="search" size={16} color={colors.textMuted} />
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                placeholder="Search leaderboards by name..."
                placeholderTextColor={colors.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
                  <Ionicons name="close-circle" size={16} color={colors.textMuted} />
                </Pressable>
              )}
            </View>

            {/* Status Filter Tabs */}
            <View style={[styles.tabsRow, { backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.03)', borderColor: colors.borderSubtle }]}>
              {[
                { id: 'all', label: 'All' },
                { id: 'live', label: 'Live' },
                { id: 'down', label: 'Maintenance' },
              ].map((tab) => (
                <Pressable
                  key={tab.id}
                  style={[
                    styles.tabBtn,
                    statusFilter === tab.id && { backgroundColor: colors.primary },
                  ]}
                  onPress={() => setStatusFilter(tab.id as any)}
                >
                  <Text
                    style={[
                      styles.tabText,
                      { color: statusFilter === tab.id ? '#ffffff' : colors.textSecondary },
                    ]}
                  >
                    {tab.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        }
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.emptyWrap}>
              <ActivityIndicator color={colors.primary} size="large" />
              <Text style={[styles.loadingText, { color: colors.textMuted }]}>LOADING_DATA...</Text>
            </View>
          ) : (
            <View style={styles.emptyWrap}>
              <Ionicons name="search-outline" size={36} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                {searchQuery || statusFilter !== 'all' 
                  ? 'No leaderboards match the current filter.' 
                  : 'No leaderboards found. Be the first to create one!'}
              </Text>
            </View>
          )
        }
      />

      {/* Floating Action Button (FAB) to create board */}
      {canCreate && (
        <Pressable
          style={[styles.fab, { backgroundColor: colors.primary }]}
          onPress={() => {
            if (!user) router.replace('/login');
            else setCreateOpen(true);
          }}
          accessibilityLabel="Create Leaderboard"
        >
          <Ionicons name="add" size={30} color="white" />
        </Pressable>
      )}

      {/* Create Modal */}
      {createOpen && (
        <View style={styles.modalOverlay}>
          <View style={[styles.modal, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>New Leaderboard</Text>
              <Pressable onPress={() => { setCreateOpen(false); setCreateName(''); }}>
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </Pressable>
            </View>
            <View style={styles.fieldWrap}>
              <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>BOARD NAME</Text>
              <TextInput
                placeholder="e.g. Batch 2025 MCS"
                placeholderTextColor={colors.textMuted}
                style={[styles.input, { backgroundColor: colors.bg, borderColor: colors.border, color: colors.text }]}
                value={createName}
                onChangeText={setCreateName}
                autoFocus
              />
            </View>
            <View style={styles.modalActions}>
              <Pressable
                style={[styles.modalBtn, styles.modalBtnSecondary, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', borderColor: colors.border }]}
                onPress={() => { setCreateOpen(false); setCreateName(''); }}
              >
                <Text style={[styles.modalBtnSecText, { color: colors.textSecondary }]}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalBtn, { backgroundColor: colors.primary, flex: 2 }]}
                onPress={onCreate}
                disabled={createLeaderboard.isPending}
              >
                <Text style={styles.modalBtnPriText}>
                  {createLeaderboard.isPending ? 'Creating...' : 'Create Board'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#020617' },
  centerWrap: { flex: 1, backgroundColor: '#020617', alignItems: 'center', justifyContent: 'center', padding: 20 },
  errorTitle: { color: '#a5b4fc', fontSize: 28, fontWeight: '900' },
  errorSub: { color: '#94a3b8', fontSize: 14, marginTop: 8, textAlign: 'center' },
  retryBtn: {
    backgroundColor: '#6366f1', paddingHorizontal: 20, paddingVertical: 12,
    borderRadius: 14, flexDirection: 'row', alignItems: 'center',
  },
  retryBtnText: { color: '#ffffff', fontWeight: '900', fontSize: 12, letterSpacing: 1 },

  headerContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    gap: 12,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  titleText: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  countBadge: {
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.25)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  countBadgeText: {
    color: '#818cf8',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },

  bannerRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  banner: { color: '#fb7185', fontSize: 12, fontWeight: '800' },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
    padding: 0,
  },

  tabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 12,
    padding: 3,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
    gap: 4,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    borderRadius: 9,
  },
  tabBtnActive: {
    backgroundColor: '#6366f1',
  },
  tabText: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  tabTextActive: {
    color: '#ffffff',
  },

  card: {
    marginHorizontal: 16, marginVertical: 6, padding: 16,
    borderRadius: 18, backgroundColor: '#0d1527', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  cardPressed: { borderColor: 'rgba(99, 102, 241, 0.4)' },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  trophyIcon: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: 'rgba(250, 204, 21, 0.1)', alignItems: 'center', justifyContent: 'center',
  },
  cardTopRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardActionBtn: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.04)', alignItems: 'center', justifyContent: 'center',
  },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
  },
  statusLive: { backgroundColor: 'rgba(34, 197, 94, 0.12)' },
  statusDown: { backgroundColor: 'rgba(245, 158, 11, 0.12)' },
  statusDot: { width: 5, height: 5, borderRadius: 2.5 },
  dotLive: { backgroundColor: '#22c55e' },
  dotDown: { backgroundColor: '#f59e0b' },
  statusText: { fontSize: 8, fontWeight: '900', letterSpacing: 1.5 },
  statusTextLive: { color: '#4ade80' },
  statusTextDown: { color: '#fbbf24' },
  cardName: { color: '#ffffff', fontSize: 18, fontWeight: '900', letterSpacing: -0.3, marginBottom: 8 },
  cardBadges: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginBottom: 12 },
  cardMeta: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,255,255,0.03)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6,
  },
  cardMetaText: { color: '#94a3b8', fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },
  cardModeBadge: {
    backgroundColor: 'rgba(99, 102, 241, 0.1)', borderWidth: 1, borderColor: 'rgba(99, 102, 241, 0.2)',
    paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6,
  },
  cardModeText: { color: '#a5b4fc', fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  cardFieldBadge: {
    backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6,
  },
  cardFieldText: { color: '#94a3b8', fontSize: 8, fontWeight: '800', letterSpacing: 1 },

  topRankerBox: {
    backgroundColor: 'rgba(255,255,255,0.02)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12, padding: 10, marginBottom: 12,
  },
  topRankerContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  topRankerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  crownWrap: {
    width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(250, 204, 21, 0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  topRankerLabel: { color: '#facc15', fontSize: 8, fontWeight: '900', letterSpacing: 1.5, marginBottom: 1 },
  topRankerName: { color: '#ffffff', fontSize: 12, fontWeight: '700' },
  topRankerScore: { color: '#facc15', fontSize: 12, fontWeight: '900', fontFamily: 'monospace' },
  topRankerEmpty: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 2 },
  topRankerEmptyText: { color: '#475569', fontSize: 10, fontStyle: 'italic', fontWeight: '600' },
  topRankerEmptyAction: { color: '#818cf8', fontSize: 10, fontWeight: '800' },

  cardFooter: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.04)', paddingTop: 10,
  },
  cardFooterText: { color: '#64748b', fontSize: 9, fontWeight: '800', letterSpacing: 2 },

  emptyWrap: { alignItems: 'center', paddingTop: 60, gap: 10, paddingHorizontal: 20 },
  loadingText: { color: '#64748b', fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  emptyText: { color: '#64748b', fontSize: 13, fontWeight: '600', textAlign: 'center' },

  fab: {
    position: 'absolute', right: 20, bottom: 20,
    width: 56, height: 56, borderRadius: 18,
    backgroundColor: '#6366f1', alignItems: 'center', justifyContent: 'center', 
    elevation: 8, shadowColor: '#6366f1', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 10,
  },
  modalOverlay: {
    position: 'absolute', left: 0, right: 0, top: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.75)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20,
  },
  modal: {
    width: '100%', backgroundColor: '#0f172a', borderRadius: 20,
    padding: 20, borderWidth: 1, borderColor: '#1f2a4d',
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16,
  },
  modalTitle: { color: '#e5e7eb', fontWeight: '900', fontSize: 18 },
  fieldWrap: { marginBottom: 16 },
  fieldLabel: { color: '#475569', fontSize: 10, fontWeight: '900', letterSpacing: 2, marginBottom: 6 },
  input: {
    backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    color: '#e5e7eb', paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12, fontSize: 14,
  },
  modalActions: { flexDirection: 'row', gap: 10, justifyContent: 'flex-end' },
  modalBtn: { paddingVertical: 12, paddingHorizontal: 18, borderRadius: 12 },
  modalBtnSecondary: { backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  modalBtnPrimary: { backgroundColor: '#4f46e5', flex: 2 },
  modalBtnSecText: { color: '#94a3b8', fontWeight: '800' },
  modalBtnPriText: { color: 'white', fontWeight: '800', textAlign: 'center' },
});
