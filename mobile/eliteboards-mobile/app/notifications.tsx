import React, { useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Pressable,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../src/providers/AuthProvider';

export default function NotificationsScreen() {
  const { notifications, clearUnread } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    clearUnread();
  }, [clearUnread]);

  const renderIcon = (type: string) => {
    switch (type) {
      case 'heart': return <Ionicons name="heart" size={24} color="#f43f5e" />;
      case 'thumbs-down': return <Ionicons name="thumbs-down" size={24} color="#6366f1" />;
      case 'report': return <Ionicons name="flag" size={24} color="#ef4444" />;
      case 'system': return <Ionicons name="megaphone" size={24} color="#a5b4fc" />;
      default: return <Ionicons name="notifications" size={24} color="#94a3b8" />;
    }
  };

  const renderItem = ({ item }: { item: any }) => (
    <Pressable 
      style={s.notifCard}
      onPress={() => item.target && router.push(item.target)}
    >
      <View style={s.iconWrap}>
        {renderIcon(item.type)}
      </View>
      <View style={s.content}>
        <Text style={s.message}>{item.message}</Text>
        <Text style={s.time}>
          {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
      {item.target && <Ionicons name="chevron-forward" size={20} color="#475569" />}
    </Pressable>
  );

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#94a3b8" />
        </Pressable>
        <Text style={s.title}>Notifications</Text>
        <View style={{ width: 40 }} /> 
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={s.list}
        ListEmptyComponent={
          <View style={s.empty}>
            <Ionicons name="mail-open-outline" size={64} color="#1e293b" style={{ marginBottom: 16 }} />
            <Text style={s.emptyText}>All caught up!</Text>
            <Text style={s.emptySub}>No new activity to show right now.</Text>
          </View>
        }
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: {
    color: '#94a3b8',
    fontSize: 24,
  },
  title: {
    color: 'white',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1,
  },
  list: {
    padding: 16,
    paddingBottom: 40,
  },
  notifCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  icon: {
    fontSize: 20,
  },
  content: {
    flex: 1,
  },
  message: {
    color: '#e2e8f0',
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  time: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 4,
  },
  chevron: {
    color: '#475569',
    fontSize: 24,
    marginLeft: 12,
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '800',
  },
  emptySub: {
    color: '#64748b',
    fontSize: 14,
    marginTop: 8,
  },
});
