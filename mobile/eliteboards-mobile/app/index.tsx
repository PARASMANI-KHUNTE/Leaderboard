import React, { useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';

import { useAuth } from './providers/AuthProvider';
import { useOffline } from './offline/OfflineProvider';
import {
  useCreateLeaderboard,
  useDeleteLeaderboard,
  useLeaderboards,
  useToggleLeaderboardStatus,
} from './api/hooks';
import { readJsonCache, writeJsonCache } from './offline/cache';

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

    return () => {
      cancelled = true;
    };
  }, [isConnected]);

  useEffect(() => {
    if (!isConnected) return;
    if (!leaderboards) return;
    writeJsonCache('offline:leaderboards', leaderboards).catch(() => {});
  }, [isConnected, leaderboards]);

  const onCreate = async () => {
    const name = createName.trim();
    if (!name) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (!canCreate) {
      Alert.alert('Actions disabled', isConnected ? 'Your account is banned.' : 'You are offline. Try again when connected.');
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
    const isCreator = user ? String(item.createdBy) === String(user.id) : false;
    const canModify = canAct && (user?.isAdmin || isCreator);

    return (
      <View style={styles.boardCard}>
        <Pressable
          style={{ flex: 1 }}
          onPress={() => router.push(`/lb/${item.slug}`)}
        >
          <Text style={styles.boardName}>{item.name}</Text>
          <Text style={styles.boardMeta}>{item.isLive ? 'Live' : 'Down'} • {item.entryCount ?? 0} entries</Text>
        </Pressable>

        <View style={styles.boardActions}>
          {canModify ? (
            <>
              <Pressable
                style={[styles.smallBtn, styles.smallBtnPrimary]}
                onPress={() => toggleLeaderboardStatus.mutate(lbId)}
              >
                <Text style={styles.smallBtnText}>Toggle</Text>
              </Pressable>
              <Pressable
                style={[styles.smallBtn, styles.smallBtnDanger]}
                onPress={() => {
                  Alert.alert('Delete leaderboard?', 'This removes all entries in the board.', [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Delete',
                      style: 'destructive',
                      onPress: () => deleteLeaderboard.mutate(lbId),
                    },
                  ]);
                }}
              >
                <Text style={styles.smallBtnText}>Delete</Text>
              </Pressable>
            </>
          ) : (
            <Text style={styles.readOnlyTag}>{user ? (item.isLive ? 'Open' : 'Down') : 'Read-only'}</Text>
          )}
        </View>
      </View>
    );
  };

  if (isError && isConnected) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>EliteBoards</Text>
        <Text style={styles.subtitle}>Failed to load leaderboards.</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>EliteBoards</Text>
        {isBanned ? <Text style={styles.bannedText}>Banned: actions disabled</Text> : null}
        {!isConnected ? <Text style={styles.offlineText}>Offline: showing cached leaderboards</Text> : null}
      </View>

      {isLoading ? (
        <View style={styles.loadingWrap}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      ) : (
        <FlatList
          data={displayedBoards}
          keyExtractor={(it) => String(it._id)}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 120 }}
        />
      )}

      <Pressable
        style={[styles.fab, !canCreate ? styles.fabDisabled : null]}
        disabled={!canCreate}
        onPress={() => {
          if (!user) router.replace('/login');
          else if (!isConnected) Alert.alert('Offline', 'Actions are disabled while offline.');
          else setCreateOpen(true);
        }}
      >
        <Text style={styles.fabText}>+</Text>
      </Pressable>

      {createOpen ? (
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Create leaderboard</Text>
            <TextInput
              placeholder="Leaderboard name"
              placeholderTextColor="#64748b"
              style={styles.input}
              value={createName}
              onChangeText={setCreateName}
            />
            <View style={styles.modalActions}>
              <Pressable
                style={[styles.modalBtn, styles.modalBtnSecondary]}
                onPress={() => {
                  setCreateOpen(false);
                  setCreateName('');
                }}
              >
                <Text style={styles.modalBtnText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.modalBtn} onPress={onCreate} disabled={createLeaderboard.isPending}>
                <Text style={styles.modalBtnText}>{createLeaderboard.isPending ? 'Creating...' : 'Create'}</Text>
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
  container: { flex: 1, backgroundColor: '#0b1020', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  header: { paddingHorizontal: 16, paddingTop: 22, paddingBottom: 10 },
  title: { color: '#a5b4fc', fontSize: 28, fontWeight: '900' },
  bannedText: { color: '#fb7185', marginTop: 6, fontWeight: '800' },
  offlineText: { color: '#fb7185', marginTop: 6, fontWeight: '800', textAlign: 'left' },
  subtitle: { color: '#94a3b8', fontSize: 14, marginTop: 8 },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: '#94a3b8' },
  boardCard: {
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#111a33',
    borderWidth: 1,
    borderColor: '#1f2a4d',
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  boardName: { color: '#e5e7eb', fontWeight: '900', fontSize: 16 },
  boardMeta: { color: '#94a3b8', fontWeight: '700', fontSize: 12, marginTop: 4 },
  boardActions: { alignItems: 'flex-end', gap: 8 },
  readOnlyTag: { color: '#94a3b8', fontWeight: '800', fontSize: 12 },
  smallBtn: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 90,
    alignItems: 'center',
  },
  smallBtnText: { color: '#e5e7eb', fontWeight: '900', fontSize: 12 },
  smallBtnPrimary: { borderColor: '#7c3aed', backgroundColor: '#1b1147' },
  smallBtnDanger: { borderColor: '#fb7185', backgroundColor: '#2a0d16' },
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
  fabDisabled: { opacity: 0.45 },
  fabText: { color: 'white', fontSize: 26, fontWeight: '900' },
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
  input: { backgroundColor: '#0b1020', borderWidth: 1, borderColor: '#1f2a4d', color: '#e5e7eb', padding: 12, borderRadius: 12 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 14 },
  modalBtn: { backgroundColor: '#4f46e5', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12 },
  modalBtnSecondary: { backgroundColor: '#111a33' },
  modalBtnText: { color: 'white', fontWeight: '900' },
});

