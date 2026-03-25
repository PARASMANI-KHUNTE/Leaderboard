import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View,
  ActivityIndicator, Image, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';

import { useAuth } from '../src/providers/AuthProvider';
import { useOffline } from '../src/offline/OfflineProvider';
import {
  useAdminFeedback,
  useAdminReports,
  useAdminUsers,
  useDeleteAdminFeedback,
  useDeleteAdminUser,
  useResolveReport,
  useToggleBan,
  useToggleFeedbackRead,
} from '../src/api/hooks';

type TabKey = 'reports' | 'users' | 'feedback';

const ProfileImage = ({ src, name }: { src?: string; name?: string }) => {
  if (src) return <Image source={{ uri: src }} style={s.avatar} />;
  return (
    <View style={s.avatarPlaceholder}>
      <Text style={s.avatarText}>{name?.charAt(0)?.toUpperCase() ?? '?'}</Text>
    </View>
  );
};

export default function AdminScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { isConnected } = useOffline();

  const [tab, setTab] = useState<TabKey>('reports');
  const [search, setSearch] = useState('');

  const isAdmin = !!user?.isAdmin;
  const isBanned = !!user?.isBanned;
  const disabled = !isAdmin || isBanned || !isConnected;

  const { data: reports, isLoading: loadingReports, refetch: refetchReports } = useAdminReports();
  const { data: feedback, isLoading: loadingFeedback, refetch: refetchFeedback } = useAdminFeedback();
  const { data: users, isLoading: loadingUsers, refetch: refetchUsers } = useAdminUsers(search);

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
      <View style={s.centerScreen}>
        <Text style={s.accessDenied}>ACCESS_DENIED</Text>
        <Pressable style={s.homeBtn} onPress={() => router.replace('/')}>
          <Text style={s.homeBtnText}>Back to Safety</Text>
        </Pressable>
      </View>
    );
  }

  const renderReport = ({ item }: { item: any }) => {
    const entry = item.entryId;
    return (
      <View style={s.card}>
        <View style={s.cardHeader}>
          <View style={s.reasonBadge}>
            <Text style={s.reasonText}>{item.reason ?? 'REPORTED'}</Text>
          </View>
          <Text style={s.timestamp}>
            {item.createdAt ? new Date(item.createdAt).toLocaleString() : '—'}
          </Text>
        </View>

        <View style={s.cardBody}>
          <Text style={s.entryName}>{entry?.name ?? 'Deleted Entry'}</Text>
          <Text style={s.reporterText}>
            Reported by: <Text style={s.reporterSub}>{item.reporterId?.displayName ?? 'Unknown'}</Text>
          </Text>
        </View>

        <View style={s.cardActions}>
          <Pressable
            style={[s.actionBtn, s.btnDanger, disabled && s.btnDisabled]}
            disabled={disabled}
            onPress={() => {
              Alert.alert('Delete Entry?', 'Remove this from the leaderboard.', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: () => resolveReport.mutate({ reportId: item._id, action: 'delete' }) },
              ]);
            }}
          >
            <Text style={s.btnText}>DELETE ENTRY</Text>
          </Pressable>
          <Pressable
            style={[s.actionBtn, s.btnSec, disabled && s.btnDisabled]}
            disabled={disabled}
            onPress={() => resolveReport.mutate({ reportId: item._id, action: 'ignore' })}
          >
            <Text style={s.btnTextSec}>IGNORE</Text>
          </Pressable>
          {entry?.userId && (
            <Pressable
              style={[s.actionBtn, s.btnOutline, disabled && s.btnDisabled]}
              disabled={disabled}
              onPress={() => toggleBan.mutate(entry.userId)}
            >
              <Text style={s.btnTextOutline}>BAN USER</Text>
            </Pressable>
          )}
        </View>
      </View>
    );
  };

  const renderUser = ({ item }: { item: any }) => {
    const isSelf = String(item._id) === String(user?.id);
    return (
      <View style={[s.card, item.isBanned && s.cardBanned]}>
        <View style={s.userInfoRow}>
          <ProfileImage src={item.profilePicture} name={item.displayName} />
          <View style={s.userDetails}>
            <View style={s.nameBadgeRow}>
              <Text style={s.userName}>{item.displayName}</Text>
              {item.isAdmin && <View style={s.adminBadge}><Text style={s.adminBadgeText}>ADMIN</Text></View>}
            </View>
            <Text style={s.userEmail}>{item.email}</Text>
          </View>
        </View>

        <View style={s.userStatsRow}>
          <View style={s.userStat}>
            <Text style={s.userStatVal}>🚩 {item.reportCount || 0}</Text>
            <Text style={s.userStatLabel}>REPORTS</Text>
          </View>
          {!item.isAdmin && !isSelf && (
            <View style={s.userActions}>
              <Pressable
                style={[s.userActionBtn, item.isBanned ? s.btnGreen : s.btnWarn, disabled && s.btnDisabled]}
                disabled={disabled}
                onPress={() => toggleBan.mutate(item._id)}
              >
                <Text style={s.userActionBtnText}>{item.isBanned ? 'UNBAN' : 'BAN'}</Text>
              </Pressable>
              <Pressable
                style={[s.userActionBtn, s.btnDanger, disabled && s.btnDisabled]}
                disabled={disabled}
                onPress={() => {
                  Alert.alert('Purge User?', `Permanently delete ${item.displayName} and all their data?`, [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Delete', style: 'destructive', onPress: () => deleteUser.mutate(item._id) },
                  ]);
                }}
              >
                <Text style={s.userActionBtnText}>DELETE</Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderFeedback = ({ item }: { item: any }) => {
    return (
      <View style={[s.card, item.isRead && s.cardRead]}>
        <View style={s.cardHeader}>
          <View style={s.feedbackMeta}>
            <View style={[s.unreadDot, item.isRead && s.readDot]} />
            <Text style={s.feedbackUser}>{item.userName ?? 'Anonymous'}</Text>
          </View>
          <Text style={s.timestamp}>
            {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '—'}
          </Text>
        </View>
        <Text style={s.feedbackText}>"{item.text}"</Text>
        <View style={s.feedbackActions}>
          <Pressable
             style={[s.iconBtn, disabled && s.btnDisabled]}
             disabled={disabled}
             onPress={() => toggleFeedbackRead.mutate(item._id)}
          >
            <Text style={s.iconBtnText}>{item.isRead ? '💤' : '✅'}</Text>
          </Pressable>
          <Pressable
             style={[s.iconBtn, s.iconBtnDanger, disabled && s.btnDisabled]}
             disabled={disabled}
             onPress={() => {
               Alert.alert('Delete Feedback?', 'Remove this message.', [
                 { text: 'Cancel', style: 'cancel' },
                 { text: 'Delete', style: 'destructive', onPress: () => deleteFeedback.mutate(item._id) },
               ]);
             }}
          >
            <Text style={s.iconBtnText}>🗑</Text>
          </Pressable>
        </View>
      </View>
    );
  };

  return (
    <View style={s.screen}>
      <View style={s.header}>
        <View style={s.titleRow}>
          <View style={s.shieldIcon}><Text style={s.shieldEmoji}>🛡️</Text></View>
          <View>
            <Text style={s.titleMain}>ADMIN CONTROL</Text>
            <Text style={s.titleSub}>SYSTEM MANAGEMENT HUB</Text>
          </View>
        </View>
        {isBanned && <Text style={s.banner}>⛔ Actions disabled: Account Banned</Text>}
        {!isConnected && <Text style={s.banner}>📡 Actions disabled: Offline</Text>}
      </View>

      {/* Persistent Tabs */}
      <View style={s.tabsRow}>
        <Pressable style={[s.tab, tab === 'reports' && s.tabActive]} onPress={() => setTab('reports')}>
          <Text style={[s.tabText, tab === 'reports' && s.tabTextActive]}>REPORTS ({reportsList.length})</Text>
        </Pressable>
        <Pressable style={[s.tab, tab === 'users' && s.tabActive]} onPress={() => setTab('users')}>
          <Text style={[s.tabText, tab === 'users' && s.tabTextActive]}>USERS ({usersList.length})</Text>
        </Pressable>
        <Pressable style={[s.tab, tab === 'feedback' && s.tabActive]} onPress={() => setTab('feedback')}>
          <Text style={[s.tabText, tab === 'feedback' && s.tabTextActive]}>FEEDBACK ({feedbackList.length})</Text>
        </Pressable>
      </View>

      {/* Content */}
      <View style={s.body}>
        {tab === 'users' && (
          <View style={s.searchWrap}>
            <TextInput
              style={s.searchInput}
              placeholder="Search students by name or email..."
              placeholderTextColor="#475569"
              value={search}
              onChangeText={setSearch}
            />
          </View>
        )}

        {((tab === 'reports' && loadingReports) || (tab === 'users' && loadingUsers) || (tab === 'feedback' && loadingFeedback)) ? (
          <View style={s.centerWrap}>
            <ActivityIndicator color="#6366f1" size="large" />
            <Text style={s.loadingText}>LOADING_PANEL...</Text>
          </View>
        ) : (
          <FlatList
            data={tab === 'reports' ? reportsList : tab === 'users' ? usersList : feedbackList}
            keyExtractor={(it: any) => String(it._id)}
            renderItem={tab === 'reports' ? renderReport : tab === 'users' ? renderUser : renderFeedback}
            contentContainerStyle={s.listPadding}
            ListEmptyComponent={
              <View style={s.centerWrap}>
                <Text style={s.emptyText}>Nothing to show here. All clear!</Text>
              </View>
            }
          />
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0b1020' },
  centerScreen: { flex: 1, backgroundColor: '#0b1020', alignItems: 'center', justifyContent: 'center', padding: 20 },
  accessDenied: { color: '#fb7185', fontSize: 24, fontWeight: '900', letterSpacing: 2 },
  homeBtn: { marginTop: 20, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, backgroundColor: '#4f46e5' },
  homeBtnText: { color: 'white', fontWeight: '800' },

  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  shieldIcon: {
    width: 48, height: 48, borderRadius: 14, backgroundColor: '#4f46e5',
    alignItems: 'center', justifyContent: 'center', elevation: 4,
  },
  shieldEmoji: { fontSize: 24 },
  titleMain: { color: 'white', fontSize: 28, fontWeight: '900', letterSpacing: -0.5 },
  titleSub: { color: '#64748b', fontSize: 9, fontWeight: '900', letterSpacing: 2.5, marginTop: 2 },
  banner: { color: '#fb7185', fontSize: 11, fontWeight: '800', marginTop: 10, textAlign: 'center' },

  tabsRow: {
    flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  tab: {
    flex: 1, paddingVertical: 16, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: '#6366f1' },
  tabText: { color: '#475569', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  tabTextActive: { color: '#a5b4fc' },

  body: { flex: 1 },
  searchWrap: { padding: 16 },
  searchInput: {
    backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: '#1f2a4d',
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, color: 'white', fontSize: 14,
  },
  centerWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 12 },
  loadingText: { color: '#64748b', fontSize: 12, fontWeight: '800', letterSpacing: 1.5 },
  emptyText: { color: '#475569', fontSize: 13, fontStyle: 'italic' },
  listPadding: { paddingBottom: 40 },

  /* Cards */
  card: {
    marginHorizontal: 16, marginVertical: 8, padding: 18, borderRadius: 18,
    backgroundColor: '#111a33', borderWidth: 1, borderColor: '#1f2a4d',
  },
  cardBanned: { backgroundColor: 'rgba(239, 68, 68, 0.04)', borderColor: 'rgba(239, 68, 68, 0.15)' },
  cardRead: { opacity: 0.6 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  reasonBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6,
  },
  reasonText: { color: '#f87171', fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },
  timestamp: { color: '#475569', fontSize: 10, fontWeight: '700' },

  cardBody: { marginBottom: 16 },
  entryName: { color: 'white', fontSize: 18, fontWeight: '800', marginBottom: 4 },
  reporterText: { color: '#64748b', fontSize: 11, fontWeight: '600' },
  reporterSub: { color: '#a5b4fc', fontWeight: '800' },

  cardActions: { flexDirection: 'row', gap: 10 },
  actionBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  btnDanger: { backgroundColor: '#dc2626' },
  btnSec: { backgroundColor: 'rgba(255,255,255,0.05)' },
  btnOutline: { borderWidth: 1, borderColor: '#1f2a4d' },
  btnDisabled: { opacity: 0.4 },
  btnText: { color: 'white', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  btnTextSec: { color: '#94a3b8', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  btnTextOutline: { color: '#f87171', fontSize: 10, fontWeight: '900', letterSpacing: 1 },

  /* User rows */
  userInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  avatar: { width: 44, height: 44, borderRadius: 12, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.1)' },
  avatarPlaceholder: {
    width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.1)',
  },
  avatarText: { color: '#94a3b8', fontSize: 18, fontWeight: '900' },
  userDetails: { flex: 1 },
  nameBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  userName: { color: 'white', fontSize: 16, fontWeight: '800' },
  adminBadge: { backgroundColor: '#4f46e5', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  adminBadgeText: { color: 'white', fontSize: 8, fontWeight: '900' },
  userEmail: { color: '#64748b', fontSize: 12, marginTop: 1 },

  userStatsRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.04)',
  },
  userStat: { alignItems: 'center', flexDirection: 'row', gap: 6 },
  userStatVal: { color: '#ef4444', fontWeight: '900', fontSize: 13 },
  userStatLabel: { color: '#475569', fontWeight: '800', fontSize: 8, letterSpacing: 1 },
  userActions: { flexDirection: 'row', gap: 8 },
  userActionBtn: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8,
  },
  btnGreen: { backgroundColor: 'rgba(34, 197, 94, 0.12)' },
  btnWarn: { backgroundColor: 'rgba(239, 68, 68, 0.12)' },
  userActionBtnText: { color: 'white', fontSize: 10, fontWeight: '900', letterSpacing: 1 },

  /* Feedback */
  feedbackMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#6366f1' },
  readDot: { backgroundColor: '#475569' },
  feedbackUser: { color: 'white', fontWeight: '800', fontSize: 13, letterSpacing: 1 },
  feedbackText: { color: '#cbd5e1', fontSize: 14, lineHeight: 22, fontStyle: 'italic', marginVertical: 12 },
  feedbackActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  iconBtn: { padding: 8, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 10 },
  iconBtnDanger: { backgroundColor: 'rgba(239,68,68,0.05)' },
  iconBtnText: { fontSize: 14 },
});
