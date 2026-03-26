import React, { useState, useMemo } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    FlatList, 
    TextInput, 
    Pressable, 
    ActivityIndicator,
    RefreshControl
} from 'react-native';
import { useLeaderboards } from '../src/api/hooks';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useOffline } from '../src/offline/OfflineProvider';

export default function Boards() {
    const router = useRouter();
    const { isConnected } = useOffline();
    const { data: leaderboards, isLoading, refetch } = useLeaderboards();
    
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState<'all' | 'live' | 'closed'>('all');

    const filteredBoards = useMemo(() => {
        let list = Array.isArray(leaderboards) ? leaderboards : [];
        if (search) {
            list = list.filter(b => b.name.toLowerCase().includes(search.toLowerCase()));
        }
        if (filter === 'live') {
            list = list.filter(b => b.isLive);
        } else if (filter === 'closed') {
            list = list.filter(b => !b.isLive);
        }
        return list;
    }, [leaderboards, search, filter]);

    const renderItem = ({ item }: { item: any }) => (
        <Pressable 
            style={styles.card}
            onPress={() => router.push(`/lb/${item.slug}`)}
        >
            <View style={styles.cardHeader}>
                <View style={styles.iconBox}>
                    <Ionicons name="trophy" size={20} color="#facc15" />
                </View>
                <View style={[styles.badge, item.isLive ? styles.badgeLive : styles.badgeClosed]}>
                    <Text style={[styles.badgeText, item.isLive ? styles.textLive : styles.textClosed]}>
                        {item.isLive ? 'LIVE' : 'CLOSED'}
                    </Text>
                </View>
            </View>
            <Text style={styles.cardName}>{item.name}</Text>
            <View style={styles.cardFooter}>
                <View style={styles.meta}>
                    <Ionicons name="people-outline" size={12} color="#475569" />
                    <Text style={styles.metaText}>{item.entryCount || 0} SUBMISSIONS</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#475569" />
            </View>
        </Pressable>
    );

    return (
        <View style={styles.container}>
            {/* Header / Search */}
            <View style={styles.header}>
                <Text style={styles.title}>All Leaderboards</Text>
                <View style={styles.searchBar}>
                    <Ionicons name="search" size={18} color="#475569" style={{marginLeft: 12}} />
                    <TextInput 
                        style={styles.searchInput}
                        placeholder="Search by board name..."
                        placeholderTextColor="#475569"
                        value={search}
                        onChangeText={setSearch}
                    />
                    {search ? (
                        <Pressable onPress={() => setSearch('')} style={{padding: 8}}>
                            <Ionicons name="close-circle" size={18} color="#475569" />
                        </Pressable>
                    ) : null}
                </View>

                {/* Filters */}
                <View style={styles.filters}>
                    <Pressable 
                        style={[styles.filterBtn, filter === 'all' && styles.filterBtnActive]}
                        onPress={() => setFilter('all')}
                    >
                        <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>ALL</Text>
                    </Pressable>
                    <Pressable 
                        style={[styles.filterBtn, filter === 'live' && styles.filterBtnActive]}
                        onPress={() => setFilter('live')}
                    >
                        <Text style={[styles.filterText, filter === 'live' && styles.filterTextActive]}>LIVE</Text>
                    </Pressable>
                    <Pressable 
                        style={[styles.filterBtn, filter === 'closed' && styles.filterBtnActive]}
                        onPress={() => setFilter('closed')}
                    >
                        <Text style={[styles.filterText, filter === 'closed' && styles.filterTextActive]}>CLOSED</Text>
                    </Pressable>
                </View>
            </View>

            {isLoading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#6366f1" />
                </View>
            ) : (
                <FlatList 
                    data={filteredBoards}
                    keyExtractor={it => it._id}
                    renderItem={renderItem}
                    contentContainerStyle={styles.list}
                    refreshControl={
                        <RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor="#6366f1" />
                    }
                    ListEmptyComponent={
                        <View style={styles.empty}>
                            <Ionicons name="search-outline" size={48} color="#1e293b" />
                            <Text style={styles.emptyTitle}>NO RESULTS</Text>
                            <Text style={styles.emptyText}>We couldn't find any boards matching your criteria.</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#020617' },
    header: { padding: 20, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
    title: { color: 'white', fontSize: 24, fontWeight: '900', marginBottom: 20, letterSpacing: -0.5 },
    searchBar: { 
        height: 52, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 16, 
        flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)'
    },
    searchInput: { flex: 1, color: 'white', paddingHorizontal: 12, fontSize: 14, fontWeight: '500' },
    filters: { flexDirection: 'row', gap: 8, marginTop: 16 },
    filterBtn: { 
        paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10, 
        backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' 
    },
    filterBtnActive: { backgroundColor: '#4f46e5', borderColor: '#4f46e5' },
    filterText: { color: '#64748b', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
    filterTextActive: { color: 'white' },

    list: { padding: 16, paddingBottom: 40 },
    card: { 
        backgroundColor: '#0f172a', borderRadius: 20, padding: 18, marginBottom: 12,
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)'
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    iconBox: { width: 40, height: 40, backgroundColor: 'rgba(79, 70, 229, 0.1)', borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    badgeLive: { backgroundColor: 'rgba(34, 197, 94, 0.1)' },
    badgeClosed: { backgroundColor: 'rgba(239, 68, 68, 0.1)' },
    badgeText: { fontSize: 8, fontWeight: '900', letterSpacing: 1 },
    textLive: { color: '#4ade80' },
    textClosed: { color: '#f87171' },
    cardName: { color: 'white', fontSize: 18, fontWeight: '900', marginBottom: 12, letterSpacing: -0.3 },
    cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.03)', paddingTop: 12 },
    meta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    metaText: { color: '#475569', fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },

    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    empty: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 40 },
    emptyTitle: { color: '#1e293b', fontSize: 18, fontWeight: '900', marginTop: 16, letterSpacing: 2 },
    emptyText: { color: '#475569', fontSize: 12, textAlign: 'center', marginTop: 8, fontWeight: '500' }
});
