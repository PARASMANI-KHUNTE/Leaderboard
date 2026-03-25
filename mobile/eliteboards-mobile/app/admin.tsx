import React, { useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';

import { useAuth } from './providers/AuthProvider';
import { useOffline } from './offline/OfflineProvider';
import {
  useAdminFeedback,
  useAdminReports,
  useAdminUsers,
  useDeleteAdminFeedback,
  useDeleteAdminUser,
  useResolveReport,
  useToggleBan,
  useToggleFeedbackRead,
} from './api/hooks';

type TabKey = 'reports' | 'users' | 'feedback';

export default function AdminScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { isConnected } = useOffline();

  const [tab, setTab] = useState<TabKey>('reports');
  const [search, setSearch] = useState('');

  const isAdmin = !!user?.isAdmin;
  const isBanned = !!user?.isBanned;

  const disabled = !isAdmin || isBanned || !isConnected;

  const { data: reports, isLoading: loadingReports } = useAdminReports();
  const { data: feedback, isLoading: loadingFeedback } = useAdminFeedback();
  const { data: users, isLoading: loadingUsers } = useAdminUsers(search);

  const resolveReport = useResolveReport();
  const toggleBan = useToggleBan();
  const deleteUser = useDeleteAdminUser();
  const deleteFeedback = useDeleteAdminFeedback();
  const toggleFeedbackRead = useToggleFeedbackRead();

  const reportsList = useMemo(() => reports ?? [], [reports]);
  const feedbackList = useMemo(() => feedback ?? [], [feedback]);
  const usersList = useMemo(() => users ?? [], [users]);

  if (!isAdmin) {
    return (
      <View style={styles.screen}>
        <Text style={styles.title}>Admin</Text>
        <Text style={styles.subtitle}>Not authorized.</Text>
        <Pressable style={styles.backBtn} onPress={() => router.replace('/')}>
          <Text style={styles.backBtnText}>Go Home</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={() => router.replace('/')} style={styles.backLink}>
          <Text style={styles.backLinkText}>Back</Text>
        </Pressable>
        <Text style={styles.title}>Admin</Text>
        {isBanned ? <Text style={styles.bannedText}>Banned: actions disabled</Text> : null}
        {!isConnected ? <Text style={styles.offlineText}>Offline: actions disabled</Text> : null}
      </View>

      <View style={styles.tabRow}>
        <Pressable
          style={[styles.tabBtn, tab === 'reports' ? styles.tabBtnActive : null]}
          onPress={() => setTab('reports')}
        >
          <Text style={styles.tabText}>Reports</Text>
        </Pressable>
        <Pressable
          style={[styles.tabBtn, tab === 'users' ? styles.tabBtnActive : null]}
          onPress={() => setTab('users')}
        >
          <Text style={styles.tabText}>Users</Text>
        </Pressable>
        <Pressable
          style={[styles.tabBtn, tab === 'feedback' ? styles.tabBtnActive : null]}
          onPress={() => setTab('feedback')}
        >
          <Text style={styles.tabText}>Feedback</Text>
        </Pressable>
      </View>

      {tab === 'reports' ? (
        <View style={styles.body}>
          {loadingReports ? (
            <Text style={styles.loadingText}>Loading reports...</Text>
          ) : (
            <FlatList
              data={reportsList}
              keyExtractor={(it: any) => String(it._id)}
              contentContainerStyle={{ paddingBottom: 80 }}
              ListEmptyComponent={<Text style={styles.emptyText}>No pending reports.</Text>}
              renderItem={({ item }: { item: any }) => {
                const entry = item.entryId;
                return (
                  <View style={styles.card}>
                    <Text style={styles.cardTitle}>
                      Report #{String(item._id).slice(-6)}
                    </Text>
                    <Text style={styles.cardSub}>
                      Reason: {item.reason}
                    </Text>
                    <Text style={styles.cardSub}>
                      Reporter: {item.reporterId?.displayName ?? 'Unknown'}
                    </Text>
                    <Text style={styles.cardSub}>
                      Entry: {entry?.name ?? 'Unknown'} • CGPA {entry?.cgpa ?? '--'}
                    </Text>

                    <View style={styles.rowBtns}>
                      <Pressable
                        style={[styles.actionBtn, disabled ? styles.actionBtnDisabled : null]}
                        disabled={disabled}
                        onPress={() => {
                          resolveReport.mutate({ reportId: item._id, action: 'delete' });
                        }}
                      >
                        <Text style={styles.actionBtnText}>Delete Entry</Text>
                      </Pressable>
                      <Pressable
                        style={[styles.actionBtnSecondary, disabled ? styles.actionBtnDisabled : null]}
                        disabled={disabled}
                        onPress={() => {
                          resolveReport.mutate({ reportId: item._id, action: 'ignore' });
                        }}
                      >
                        <Text style={styles.actionBtnText}>Ignore</Text>
                      </Pressable>
                    </View>
                  </View>
                );
              }}
            />
          )}
        </View>
      ) : null}

      {tab === 'users' ? (
        <View style={styles.body}>
          <View style={styles.searchRow}>
            <TextInput
              placeholder="Search users"
              placeholderTextColor="#64748b"
              style={styles.searchInput}
              value={search}
              onChangeText={setSearch}
            />
          </View>

          {loadingUsers ? (
            <Text style={styles.loadingText}>Loading users...</Text>
          ) : (
            <FlatList
              data={usersList}
              keyExtractor={(it: any) => String(it._id)}
              contentContainerStyle={{ paddingBottom: 80 }}
              ListEmptyComponent={<Text style={styles.emptyText}>No users found.</Text>}
              renderItem={({ item }: { item: any }) => {
                return (
                  <View style={styles.card}>
                    <Text style={styles.cardTitle}>
                      {item.displayName ?? 'Unknown'}
                    </Text>
                    <Text style={styles.cardSub}>{item.email ?? ''}</Text>
                    <Text style={styles.cardSub}>
                      Reports: {item.reportCount ?? 0} • {item.isBanned ? 'Banned' : 'Active'}
                    </Text>
                    <View style={styles.rowBtns}>
                      <Pressable
                        style={[styles.actionBtn, disabled ? styles.actionBtnDisabled : null]}
                        disabled={disabled}
                        onPress={() => toggleBan.mutate(item._id)}
                      >
                        <Text style={styles.actionBtnText}>{item.isBanned ? 'Unban' : 'Ban'}</Text>
                      </Pressable>
                      <Pressable
                        style={[styles.actionBtnSecondary, disabled ? styles.actionBtnDisabled : null]}
                        disabled={disabled}
                        onPress={() => {
                          Alert.alert('Delete user?', 'This cascades and removes their entries.', [
                            { text: 'Cancel', style: 'cancel' },
                            {
                              text: 'Delete',
                              style: 'destructive',
                              onPress: () => deleteUser.mutate(item._id),
                            },
                          ]);
                        }}
                      >
                        <Text style={styles.actionBtnText}>Delete</Text>
                      </Pressable>
                    </View>
                  </View>
                );
              }}
            />
          )}
        </View>
      ) : null}

      {tab === 'feedback' ? (
        <View style={styles.body}>
          {loadingFeedback ? (
            <Text style={styles.loadingText}>Loading feedback...</Text>
          ) : (
            <FlatList
              data={feedbackList}
              keyExtractor={(it: any) => String(it._id)}
              contentContainerStyle={{ paddingBottom: 80 }}
              ListEmptyComponent={<Text style={styles.emptyText}>No feedback.</Text>}
              renderItem={({ item }: { item: any }) => {
                return (
                  <View style={styles.card}>
                    <Text style={styles.cardTitle}>Feedback</Text>
                    <Text style={styles.cardSub}>{item.userName ?? 'Anonymous'}</Text>
                    <Text style={styles.cardSub}>Status: {item.isRead ? 'Read' : 'Unread'}</Text>
                    <Text style={styles.cardSub}>"{item.text}"</Text>
                    <View style={styles.rowBtns}>
                      <Pressable
                        style={[styles.actionBtn, disabled ? styles.actionBtnDisabled : null]}
                        disabled={disabled}
                        onPress={() => toggleFeedbackRead.mutate(item._id)}
                      >
                        <Text style={styles.actionBtnText}>{item.isRead ? 'Mark Unread' : 'Mark Read'}</Text>
                      </Pressable>
                      <Pressable
                        style={[styles.actionBtnSecondary, disabled ? styles.actionBtnDisabled : null]}
                        disabled={disabled}
                        onPress={() => deleteFeedback.mutate(item._id)}
                      >
                        <Text style={styles.actionBtnText}>Delete</Text>
                      </Pressable>
                    </View>
                  </View>
                );
              }}
            />
          )}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0b1020' },
  header: { paddingHorizontal: 16, paddingTop: 22, paddingBottom: 12 },
  subtitle: { color: '#94a3b8', marginTop: 10, fontWeight: '800', textAlign: 'center' },
  backBtn: { marginTop: 22, marginHorizontal: 40, backgroundColor: '#4f46e5', paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  backBtnText: { color: 'white', fontWeight: '900' },
  backLink: { position: 'absolute', left: 16, top: 18, paddingVertical: 8, paddingHorizontal: 8 },
  backLinkText: { color: '#94a3b8', fontWeight: '800' },
  title: { color: '#a5b4fc', fontSize: 24, fontWeight: '900', textAlign: 'center' },
  bannedText: { color: '#fb7185', marginTop: 6, fontWeight: '800', textAlign: 'center' },
  offlineText: { color: '#fb7185', marginTop: 6, fontWeight: '800', textAlign: 'center' },
  tabRow: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 12, paddingBottom: 10 },
  tabBtn: { paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, backgroundColor: '#111a33', borderWidth: 1, borderColor: '#1f2a4d' },
  tabBtnActive: { borderColor: '#7c3aed', backgroundColor: '#1b1147' },
  tabText: { color: '#e5e7eb', fontWeight: '900' },
  body: { flex: 1 },
  loadingText: { color: '#94a3b8', paddingHorizontal: 16, paddingTop: 14 },
  emptyText: { color: '#94a3b8', paddingHorizontal: 16, paddingTop: 14 },
  searchRow: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 8 },
  searchInput: { backgroundColor: '#0b1020', borderRadius: 12, borderWidth: 1, borderColor: '#1f2a4d', padding: 12, color: '#e5e7eb' },
  card: {
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#111a33',
    borderWidth: 1,
    borderColor: '#1f2a4d',
    gap: 6,
  },
  cardTitle: { color: '#e5e7eb', fontWeight: '900', fontSize: 15 },
  cardSub: { color: '#94a3b8', fontWeight: '700', fontSize: 12 },
  rowBtns: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, marginTop: 10 },
  actionBtn: { flex: 1, backgroundColor: '#4f46e5', paddingVertical: 10, borderRadius: 12, alignItems: 'center' },
  actionBtnSecondary: { flex: 1, backgroundColor: '#111a33', borderWidth: 1, borderColor: '#334155', paddingVertical: 10, borderRadius: 12, alignItems: 'center' },
  actionBtnDisabled: { opacity: 0.45 },
  actionBtnText: { color: 'white', fontWeight: '900', fontSize: 12 },
});

