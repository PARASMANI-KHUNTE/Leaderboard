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

export default function Home() {
  const router = useRouter();
  const { user } = useAuth();
  const { isConnected } = useOffline();
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
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
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
                  style={styles.cardActionBtn}
                  onPress={(e) => {
                    e.stopPropagation?.();
                    Alert.alert('Delete leaderboard?', 'This permanently removes the leaderboard and all entries.', [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Delete', style: 'destructive', onPress: () => deleteLeaderboard.mutate(lbId) },
                    ]);
                  }}
                >
                  <Ionicons name="trash-outline" size={14} color="#fb7185" />
                </Pressable>
                <Pressable
                  style={styles.cardActionBtn}
                  onPress={(e) => {
                    e.stopPropagation?.();
                    const action = item.isLive ? 'Pause' : 'Resume';
                    const msg = item.isLive
                      ? 'Put this leaderboard into maintenance mode? Submissions will be paused.'
                      : 'Make this leaderboard live? Students will be able to submit scores.';
                    Alert.alert(`${action} Leaderboard?`, msg, [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: action,
                        style: item.isLive ? 'destructive' : 'default',
                        onPress: () => {
                          toggleLeaderboardStatus.mutate(lbId, {
                            onError: (err: any) => {
                              Alert.alert('Action Failed', err?.response?.data?.message || err?.message || 'Could not update status');
                            },
                          });
                        },
                      },
                    ]);
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

        <Text style={styles.cardName}>{item.name}</Text>

        <View style={styles.cardBadges}>
          <View style={styles.cardMeta}>
            <Ionicons name="people-outline" size={11} color="#94a3b8" />
            <Text style={styles.cardMetaText}>{item.entryCount || 0} SUBMISSIONS</Text>
          </View>
          {item.entryMode ? (
            <View style={styles.cardModeBadge}>
              <Text style={styles.cardModeText}>
                {item.entryMode === 'upload' ? 'DOC VERIFIED' : item.entryMode === 'hybrid' ? 'HYBRID' : 'DIRECT ENTRY'}
              </Text>
            </View>
          ) : null}
          {item.ranking?.primaryField ? (
            <View style={styles.cardFieldBadge}>
              <Text style={styles.cardFieldText}>BY {item.ranking.primaryField.toUpperCase()}</Text>
            </View>
          ) : null}
        </View>

        {/* Top Performer Snippet */}
        <View style={styles.topRankerBox}>
          {item.topEntry ? (
            <View style={styles.topRankerContent}>
              <View style={styles.topRankerLeft}>
                <View style={styles.crownWrap}>
                  <Ionicons name="trophy" size={12} color="#facc15" />
                </View>
                <View style={{ flexShrink: 1 }}>
                  <Text style={styles.topRankerLabel}>RANK #1 LEADER</Text>
                  <Text style={styles.topRankerName} numberOfLines={1}>{item.topEntry.name}</Text>
                </View>
              </View>
              <Text style={styles.topRankerScore}>
                {typeof item.topEntry.cgpa === 'number' ? `${item.topEntry.cgpa.toFixed(2)} CGPA` : `${item.topEntry.marks} Marks`}
              </Text>
            </View>
          ) : (
            <View style={styles.topRankerEmpty}>
              <Text style={styles.topRankerEmptyText}>Awaiting first submission</Text>
              <Text style={styles.topRankerEmptyAction}>Be #1 &rarr;</Text>
            </View>
          )}
        </View>

        <View style={styles.cardFooter}>
          <Text style={styles.cardFooterText}>VIEW BOARD</Text>
          <Ionicons name="arrow-forward-outline" size={14} color="#64748b" />
        </View>
      </Pressable>
    );
  };

  if (isError && isConnected) {
    return (
      <View style={styles.centerWrap}>
        <Ionicons name="alert-circle-outline" size={48} color="#fb7185" style={{ marginBottom: 12 }} />
        <Text style={styles.errorTitle}>EliteBoards</Text>
        <Text style={styles.errorSub}>Failed to load leaderboards.</Text>
        <Pressable 
          style={[styles.retryBtn, { marginTop: 20 }]} 
          onPress={() => refetch()}
        >
          <Ionicons name="refresh-outline" size={16} color="#ffffff" style={{ marginRight: 6 }} />
          <Text style={styles.retryBtnText}>TAP TO RETRY</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
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
                <Ionicons name="trophy" size={24} color="#818cf8" />
                <Text style={styles.titleText}>Leaderboards</Text>
              </View>
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{displayedBoards.length} TOTAL</Text>
              </View>
            </View>

            {/* Offline or Banned Alert Banners */}
            {isBanned && (
              <View style={styles.bannerRow}>
                <Ionicons name="ban-outline" size={14} color="#fb7185" />
                <Text style={styles.banner}>Account banned — actions disabled</Text>
              </View>
            )}
            {!isConnected && (
              <View style={styles.bannerRow}>
                <Ionicons name="wifi-outline" size={14} color="#6366f1" />
                <Text style={styles.banner}>Offline — showing cached data</Text>
              </View>
            )}

            {/* Search Input Bar */}
            <View style={styles.searchBar}>
              <Ionicons name="search" size={16} color="#64748b" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search leaderboards by name..."
                placeholderTextColor="#64748b"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
                  <Ionicons name="close-circle" size={16} color="#64748b" />
                </Pressable>
              )}
            </View>

            {/* Status Filter Tabs */}
            <View style={styles.tabsRow}>
              {[
                { id: 'all', label: 'All' },
                { id: 'live', label: 'Live' },
                { id: 'down', label: 'Maintenance' },
              ].map((tab) => (
                <Pressable
                  key={tab.id}
                  style={[
                    styles.tabBtn,
                    statusFilter === tab.id && styles.tabBtnActive,
                  ]}
                  onPress={() => setStatusFilter(tab.id as any)}
                >
                  <Text
                    style={[
                      styles.tabText,
                      statusFilter === tab.id && styles.tabTextActive,
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
              <ActivityIndicator color="#6366f1" size="large" />
              <Text style={styles.loadingText}>LOADING_DATA...</Text>
            </View>
          ) : (
            <View style={styles.emptyWrap}>
              <Ionicons name="search-outline" size={36} color="#475569" />
              <Text style={styles.emptyText}>
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
          style={styles.fab}
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
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Leaderboard</Text>
              <Pressable onPress={() => { setCreateOpen(false); setCreateName(''); }}>
                <Ionicons name="close" size={20} color="#94a3b8" />
              </Pressable>
            </View>
            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>BOARD NAME</Text>
              <TextInput
                placeholder="e.g. Batch 2025 MCS"
                placeholderTextColor="#475569"
                style={styles.input}
                value={createName}
                onChangeText={setCreateName}
                autoFocus
              />
            </View>
            <View style={styles.modalActions}>
              <Pressable
                style={[styles.modalBtn, styles.modalBtnSecondary]}
                onPress={() => { setCreateOpen(false); setCreateName(''); }}
              >
                <Text style={styles.modalBtnSecText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalBtn, styles.modalBtnPrimary]}
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
