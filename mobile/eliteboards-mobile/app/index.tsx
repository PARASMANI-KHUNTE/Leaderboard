import React, { useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View, ActivityIndicator, Image as RNImage, Linking } from 'react-native';
import { useRouter } from 'expo-router';

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
  const { data: leaderboards, isLoading, isError } = useLeaderboards();

  const createLeaderboard = useCreateLeaderboard();
  const toggleLeaderboardStatus = useToggleLeaderboardStatus();
  const deleteLeaderboard = useDeleteLeaderboard();

  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState('');
  const [cachedLeaderboards, setCachedLeaderboards] = useState<any[] | null>(null);

  const isBanned = !!user?.isBanned;
  const canCreate = !!user && !isBanned && isConnected;
  const canAct = !!user && !isBanned && isConnected;

  const boards = useMemo(() => leaderboards ?? [], [leaderboards]);
  const displayedBoards = isConnected ? boards : (cachedLeaderboards ?? []);

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

  const renderItem = ({ item, index }: { item: any; index: number }) => {
    const lbId = String(item._id);
    const isCreator = user ? String(item.createdBy) === String(user.id) : false;
    const canModify = canAct && (user?.isAdmin || isCreator);

    return (
      <Pressable
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
        onPress={() => router.push(`/lb/${item.slug}`)}
      >
        {/* Top row: icon + status */}
        <View style={styles.cardTop}>
          <View style={styles.trophyIcon}>
            <Text style={styles.trophyText}>🏆</Text>
          </View>
          <View style={styles.cardTopRight}>
            {canModify && (
              <>
                <Pressable
                  style={styles.cardActionBtn}
                  onPress={(e) => {
                    e.stopPropagation?.();
                    Alert.alert('Delete leaderboard?', 'This removes all entries.', [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Delete', style: 'destructive', onPress: () => deleteLeaderboard.mutate(lbId) },
                    ]);
                  }}
                >
                  <Text style={styles.cardActionDanger}>🗑</Text>
                </Pressable>
                <Pressable
                  style={styles.cardActionBtn}
                  onPress={(e) => {
                    e.stopPropagation?.();
                    toggleLeaderboardStatus.mutate(lbId);
                  }}
                >
                  <Text style={styles.cardActionToggle}>{item.isLive ? '⏸' : '▶'}</Text>
                </Pressable>
              </>
            )}
            <View style={[styles.statusBadge, item.isLive ? styles.statusLive : styles.statusDown]}>
              <View style={[styles.statusDot, item.isLive ? styles.dotLive : styles.dotDown]} />
              <Text style={[styles.statusText, item.isLive ? styles.statusTextLive : styles.statusTextDown]}>
                {item.isLive ? 'LIVE' : 'DOWN'}
              </Text>
            </View>
          </View>
        </View>

        {/* Board name */}
        <Text style={styles.cardName}>{item.name}</Text>

        {/* Entry count */}
        <View style={styles.cardMeta}>
          <Text style={styles.cardMetaIcon}>👥</Text>
          <Text style={styles.cardMetaText}>{item.entryCount || 0} SUBMISSIONS</Text>
        </View>

        {/* Footer */}
        <View style={styles.cardFooter}>
          <Text style={styles.cardFooterText}>VIEW BOARD</Text>
          <Text style={styles.cardFooterArrow}>→</Text>
        </View>
      </Pressable>
    );
  };

  if (isError && isConnected) {
    return (
      <View style={styles.centerWrap}>
        <Text style={styles.errorTitle}>EliteBoards</Text>
        <Text style={styles.errorSub}>Failed to load leaderboards.</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <FlatList
        data={displayedBoards}
        keyExtractor={(it) => String(it._id)}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 100, paddingTop: 4 }}
        ListHeaderComponent={
          <View style={styles.hero}>
            {/* Realtime badge */}
            <View style={styles.realtimeBadge}>
              <View style={styles.realtimeDot} />
              <Text style={styles.realtimeText}>REAL-TIME SYSTEMS ACTIVE</Text>
            </View>

            {/* Logo and Title */}
            <RNImage 
              source={require('../assets/logo.png')} 
              style={styles.heroLogo} 
              resizeMode="contain"
            />
            <View style={styles.titleRow}>
              <Text style={styles.titleElite}>Elite</Text>
              <Text style={styles.titleBoards}>Boards</Text>
            </View>
            <Text style={styles.heroSub}>
              The ultimate student ranking platform. Create, share, and track performance in real-time.
            </Text>

            {/* Banners */}
            {isBanned && <Text style={styles.banner}>⛔ Account banned — actions disabled</Text>}
            {!isConnected && <Text style={styles.banner}>📡 Offline — showing cached data</Text>}

            {/* Create button */}
            {user && isConnected && !isBanned && (
              <Pressable style={styles.createBtn} onPress={() => setCreateOpen(true)}>
                <Text style={styles.createBtnText}>＋  Create New Board</Text>
              </Pressable>
            )}
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
              <Text style={styles.emptyIcon}>📋</Text>
              <Text style={styles.emptyText}>No leaderboards found. Be the first to create one!</Text>
            </View>
          )
        }
        ListFooterComponent={
          !isLoading ? (
            <View style={styles.footerSection}>
              {/* About Section */}
              <View style={styles.aboutContainer}>
                <Text style={styles.aboutTitle}>HOW <Text style={{color: '#6366f1'}}>ELITEBOARDS</Text> WORKS</Text>
                
                <View style={styles.aboutCard}>
                  <View style={styles.aboutIconWrap}><Text style={styles.aboutIcon}>⚡</Text></View>
                  <Text style={styles.aboutCardTitle}>1. Create a Board</Text>
                  <Text style={styles.aboutCardDesc}>Instantly generate a real-time leaderboard for your batch, classroom, or competition.</Text>
                </View>

                <View style={styles.aboutCard}>
                  <View style={styles.aboutIconWrap}><Text style={styles.aboutIcon}>👥</Text></View>
                  <Text style={styles.aboutCardTitle}>2. Share & Compete</Text>
                  <Text style={styles.aboutCardDesc}>Share the unique link. Users can seamlessly submit their scores through web or this app.</Text>
                </View>

                <View style={styles.aboutCard}>
                  <View style={styles.aboutIconWrap}><Text style={styles.aboutIcon}>📈</Text></View>
                  <Text style={styles.aboutCardTitle}>3. Track in Real-time</Text>
                  <Text style={styles.aboutCardDesc}>Watch the rankings update live. Perfect for hackathons, quizzes, and gamified learning.</Text>
                </View>
              </View>

              {/* Dev Footer */}
              <View style={styles.devFooter}>
                <View style={styles.devHeader}>
                  <Text style={styles.devElite}>Elite</Text>
                  <Text style={styles.devBoards}>Boards</Text>
                </View>
                <Text style={styles.devSub}>Empowering student communities with real-time competitive ranking systems.</Text>
                
                <Text style={styles.connectTitle}>DEVELOPED BY</Text>
                <View style={styles.socialRow}>
                  <Pressable style={styles.socialBtn} onPress={() => Linking.openURL('https://github.com/PARASMANI-KHUNTE')}><Text style={styles.socialIcon}>🐙</Text></Pressable>
                  <Pressable style={styles.socialBtn} onPress={() => Linking.openURL('https://www.linkedin.com/in/parasmani-khunte-330488228/')}><Text style={styles.socialIcon}>💼</Text></Pressable>
                  <Pressable style={styles.socialBtn} onPress={() => Linking.openURL('mailto:parasmanikhunte@gmail.com')}><Text style={styles.socialIcon}>✉️</Text></Pressable>
                  <Pressable style={styles.socialBtn} onPress={() => Linking.openURL('https://parasmanikhunte.onrender.com/')}><Text style={styles.socialIcon}>🌐</Text></Pressable>
                </View>
                <Text style={styles.copyright}>© {new Date().getFullYear()} EliteBoards. Designed & Built by Parasmani Khunte.</Text>
              </View>
            </View>
          ) : null
        }
      />

      {/* FAB */}
      {canCreate && (
        <Pressable
          style={styles.fab}
          onPress={() => {
            if (!user) router.replace('/login');
            else setCreateOpen(true);
          }}
        >
          <Text style={styles.fabText}>＋</Text>
        </Pressable>
      )}

      {/* Create modal */}
      {createOpen && (
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>New Leaderboard</Text>
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

  /* Hero */
  hero: { paddingHorizontal: 20, paddingTop: 32, paddingBottom: 16, alignItems: 'center' },
  heroLogo: {
    width: 100,
    height: 100,
    marginBottom: 12,
  },
  realtimeBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: 'rgba(34, 197, 94, 0.08)',
    borderWidth: 1, borderColor: 'rgba(34, 197, 94, 0.15)',
    marginBottom: 14,
  },
  realtimeDot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: '#22c55e',
  },
  realtimeText: { color: '#22c55e', fontSize: 9, fontWeight: '900', letterSpacing: 2.5 },
  titleRow: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 8 },
  titleElite: {
    color: '#c7d2fe', fontSize: 38, fontWeight: '900',
    fontStyle: 'italic', letterSpacing: -1,
  },
  titleBoards: {
    color: '#6366f1', fontSize: 38, fontWeight: '900', letterSpacing: -1,
  },
  heroSub: {
    color: '#64748b', fontSize: 14, fontWeight: '500',
    textAlign: 'center', lineHeight: 20, maxWidth: 320, marginBottom: 16,
  },
  banner: { color: '#fb7185', fontSize: 12, fontWeight: '800', marginBottom: 8, textAlign: 'center' },
  createBtn: {
    backgroundColor: '#4f46e5', paddingHorizontal: 24, paddingVertical: 14,
    borderRadius: 16, marginTop: 4, elevation: 4,
  },
  createBtnText: { color: 'white', fontWeight: '900', fontSize: 14 },

  /* Cards */
  card: {
    marginHorizontal: 16, marginVertical: 6, padding: 16,
    borderRadius: 16, backgroundColor: '#111a33',
    borderWidth: 1, borderColor: '#1f2a4d',
  },
  cardPressed: { borderColor: 'rgba(99, 102, 241, 0.4)' },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  trophyIcon: {
    width: 42, height: 42, borderRadius: 12,
    backgroundColor: 'rgba(79, 70, 229, 0.1)', alignItems: 'center', justifyContent: 'center',
  },
  trophyText: { fontSize: 20 },
  cardTopRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardActionBtn: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.04)', alignItems: 'center', justifyContent: 'center',
  },
  cardActionDanger: { fontSize: 13 },
  cardActionToggle: { fontSize: 12 },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4,
  },
  statusLive: { backgroundColor: 'rgba(34, 197, 94, 0.12)' },
  statusDown: { backgroundColor: 'rgba(239, 68, 68, 0.12)' },
  statusDot: { width: 5, height: 5, borderRadius: 2.5 },
  dotLive: { backgroundColor: '#22c55e' },
  dotDown: { backgroundColor: '#ef4444' },
  statusText: { fontSize: 8, fontWeight: '900', letterSpacing: 2 },
  statusTextLive: { color: '#4ade80' },
  statusTextDown: { color: '#f87171' },
  cardName: {
    color: '#e5e7eb', fontSize: 20, fontWeight: '900',
    letterSpacing: -0.3, marginBottom: 8,
  },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 },
  cardMetaIcon: { fontSize: 12 },
  cardMetaText: { color: '#475569', fontSize: 9, fontWeight: '900', letterSpacing: 2 },
  cardFooter: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.04)', paddingTop: 12,
  },
  cardFooterText: { color: '#64748b', fontSize: 10, fontWeight: '800', letterSpacing: 2 },
  cardFooterArrow: { color: '#64748b', fontSize: 14 },

  /* Empty / Loading */
  emptyWrap: { alignItems: 'center', paddingTop: 60, gap: 12 },
  loadingText: { color: '#64748b', fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  emptyIcon: { fontSize: 40 },
  emptyText: { color: '#475569', fontSize: 13, fontWeight: '600', textAlign: 'center', fontStyle: 'italic' },

  /* FAB */
  fab: {
    position: 'absolute', right: 18, bottom: 18,
    width: 56, height: 56, borderRadius: 18,
    backgroundColor: '#4f46e5', alignItems: 'center', justifyContent: 'center',
    elevation: 8,
  },
  fabText: { color: 'white', fontSize: 24, fontWeight: '900' },

  /* Modal */
  modalOverlay: {
    position: 'absolute', left: 0, right: 0, top: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)', alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 20,
  },
  modal: {
    width: '100%', backgroundColor: '#0f172a', borderRadius: 20,
    padding: 20, borderWidth: 1, borderColor: '#1f2a4d',
  },
  modalTitle: { color: '#e5e7eb', fontWeight: '900', fontSize: 20, marginBottom: 16 },
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

  /* Footer Section */
  footerSection: {
    marginTop: 40,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
    paddingTop: 30,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  aboutContainer: {
    marginBottom: 40,
  },
  aboutTitle: {
    color: '#e5e7eb',
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 20,
    letterSpacing: -0.5,
  },
  aboutCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  aboutIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  aboutIcon: {
    fontSize: 20,
  },
  aboutCardTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  aboutCardDesc: {
    color: '#94a3b8',
    fontSize: 13,
    lineHeight: 20,
  },
  devFooter: {
    paddingTop: 30,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
  },
  devHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  devElite: {
    color: '#c7d2fe',
    fontSize: 24,
    fontWeight: '900',
    fontStyle: 'italic',
  },
  devBoards: {
    color: '#6366f1',
    fontSize: 24,
    fontWeight: '900',
  },
  devSub: {
    color: '#64748b',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  connectTitle: {
    color: '#475569',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 12,
  },
  socialRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
  },
  socialBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  socialIcon: {
    fontSize: 20,
  },
  copyright: {
    color: '#475569',
    fontSize: 10,
    fontWeight: '600',
  },
});
