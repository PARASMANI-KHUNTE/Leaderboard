import React, { useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable } from 'react-native';
import { useAuth } from '../src/providers/AuthProvider';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../src/theme/ThemeContext';

export default function NotificationsScreen() {
  const { notifications, clearUnread } = useAuth();
  const router = useRouter();
  const { colors, isDark } = useTheme();

  useEffect(() => {
    clearUnread();
  }, [clearUnread]);

  const renderIcon = (type: string) => {
    switch (type) {
      case 'report':
        return <Ionicons name="alert-circle" size={20} color={colors.danger} />;
      case 'feedback':
        return <Ionicons name="chatbubble-ellipses" size={20} color={colors.primaryLight} />;
      case 'ban':
        return <Ionicons name="ban" size={20} color={colors.danger} />;
      case 'unban':
        return <Ionicons name="checkmark-circle" size={20} color={colors.success} />;
      default:
        return <Ionicons name="notifications" size={20} color={colors.primaryLight} />;
    }
  };

  const renderItem = ({ item }: { item: any }) => (
    <Pressable
      style={[
        s.item,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
      ]}
      onPress={() => {
        if (item.target) {
          router.push(item.target);
        }
      }}
    >
      <View style={[s.iconWrap, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)' }]}>
        {renderIcon(item.type)}
      </View>
      <View style={s.content}>
        <Text style={[s.message, { color: colors.text }]}>{item.message}</Text>
        <Text style={[s.time, { color: colors.textSecondary }]}>
          {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
      {item.target && <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />}
    </Pressable>
  );

  return (
    <View style={[s.container, { backgroundColor: colors.bg }]}>
      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={s.empty}>
            <Ionicons name="mail-open-outline" size={56} color={colors.textMuted} style={{ marginBottom: 16 }} />
            <Text style={[s.emptyText, { color: colors.text }]}>All caught up!</Text>
            <Text style={[s.emptySub, { color: colors.textSecondary }]}>No new notifications to show right now.</Text>
          </View>
        }
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
  },
  list: {
    padding: 16,
    flexGrow: 1,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  content: {
    flex: 1,
  },
  message: {
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  time: {
    fontSize: 10,
    marginTop: 4,
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '800',
  },
  emptySub: {
    fontSize: 12,
    marginTop: 6,
  },
});
