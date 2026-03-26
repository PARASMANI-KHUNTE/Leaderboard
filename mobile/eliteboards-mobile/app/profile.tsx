import React, { useEffect, useState } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    ScrollView, 
    Image, 
    Pressable, 
    ActivityIndicator,
    Alert,
    Dimensions
} from 'react-native';
import { useAuth } from '../src/providers/AuthProvider';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import Constants from 'expo-constants';
import { LinearGradient } from 'expo-linear-gradient';

const API_URL = process.env.EXPO_PUBLIC_API_URL || Constants.expoConfig?.extra?.API_URL || 'https://leaderboard-backend-3pek.onrender.com';
const { width } = Dimensions.get('window');

export default function Profile() {
    const { user, token, logout } = useAuth();
    const router = useRouter();
    const [joinedBoards, setJoinedBoards] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) {
            router.replace('/login');
            return;
        }
        fetchJoinedBoards();
    }, [user]);

    const fetchJoinedBoards = async () => {
        try {
            const res = await axios.get(`${API_URL}/auth/joined-leaderboards`, {
                headers: { 
                    Authorization: `Bearer ${token}`,
                    'ngrok-skip-browser-warning': 'true'
                }
            });
            setJoinedBoards(res.data);
        } catch (err) {
            console.error('Failed to fetch joined boards:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteAccount = () => {
        Alert.alert(
            "Delete Account",
            "Are you absolutely sure? This action is permanent and will delete all your data, scores, and rankings across EliteBoards.",
            [
                { text: "Cancel", style: "cancel" },
                { 
                    text: "Delete Permanently", 
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await axios.delete(`${API_URL}/auth/delete-account`, {
                                headers: { Authorization: `Bearer ${token}` }
                            });
                            logout();
                            router.replace('/login');
                        } catch (err) {
                            Alert.alert("Error", "Failed to delete account. Please try again later.");
                        }
                    }
                }
            ]
        );
    };

    if (!user) return null;

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            {/* Header / Identity Card */}
            <LinearGradient
                colors={['rgba(79, 70, 229, 0.15)', 'rgba(2, 6, 23, 0)']}
                style={styles.headerGradient}
            >
                <View style={styles.userCard}>
                    <View style={styles.avatarWrap}>
                        {user.picture ? (
                            <Image source={{ uri: user.picture }} style={styles.avatar} />
                        ) : (
                            <View style={styles.avatarPlaceholder}>
                                <Text style={styles.avatarPlaceholderText}>{user.name?.charAt(0)}</Text>
                            </View>
                        )}
                        <View style={styles.statusBadge}>
                            <Ionicons name="flash" size={12} color="white" />
                        </View>
                    </View>
                    
                    <Text style={styles.userName}>{user.name}</Text>
                    <Text style={styles.userEmail}>{user.email}</Text>

                    <View style={styles.statsRow}>
                        <View style={styles.statBox}>
                            <Text style={styles.statLabel}>HEARTS EARNED</Text>
                            <View style={styles.statValueWrap}>
                                <Ionicons name="heart" size={14} color="#f87171" />
                                <Text style={styles.statValue}>{user.stats?.heartsEarned || 0}</Text>
                            </View>
                        </View>
                        <View style={styles.statBox}>
                            <Text style={styles.statLabel}>ENTRIES</Text>
                            <View style={styles.statValueWrap}>
                                <Ionicons name="pulse" size={14} color="#10b981" />
                                <Text style={styles.statValue}>{user.stats?.totalSubmissions || 0}</Text>
                            </View>
                        </View>
                        <View style={styles.statBox}>
                            <Text style={styles.statLabel}>STANDING</Text>
                            <Text style={[styles.statValue, { color: '#818cf8' }]}>Competitive</Text>
                        </View>
                    </View>
                </View>
            </LinearGradient>

            {/* Competitive Activity */}
            <View style={styles.section}>
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>COMPETITIVE ACTIVITY</Text>
                    <Text style={styles.sectionCount}>{joinedBoards.length} TOTAL</Text>
                </View>

                {loading ? (
                    <ActivityIndicator color="#6366f1" style={{ marginTop: 20 }} />
                ) : joinedBoards.length > 0 ? (
                    <View style={styles.boardsGrid}>
                        {joinedBoards.map((board, idx) => (
                            <Pressable 
                                key={idx} 
                                style={styles.boardCard}
                                onPress={() => router.push(`/lb/${board.slug}`)}
                            >
                                <View style={styles.boardIconWrap}>
                                    <Ionicons name="trophy-outline" size={24} color="#818cf8" />
                                </View>
                                <View style={styles.boardInfo}>
                                    <Text style={styles.boardName} numberOfLines={1}>{board.name}</Text>
                                    <View style={styles.boardStatus}>
                                        <View style={[styles.statusDot, { backgroundColor: board.isLive ? '#10b981' : '#f87171' }]} />
                                        <Text style={[styles.statusText, { color: board.isLive ? '#10b981' : '#f87171' }]}>
                                            {board.isLive ? 'LIVE' : 'CLOSED'}
                                        </Text>
                                    </View>
                                </View>
                                <Ionicons name="chevron-forward" size={16} color="#475569" />
                            </Pressable>
                        ))}
                    </View>
                ) : (
                    <View style={styles.emptyCard}>
                        <View style={styles.emptyIconWrap}>
                            <Ionicons name="search-outline" size={32} color="#475569" />
                        </View>
                        <Text style={styles.emptyTitle}>BEGIN YOUR JOURNEY</Text>
                        <Text style={styles.emptyText}>You haven't joined any competitive boards yet.</Text>
                        <Pressable 
                            style={styles.exploreBtn}
                            onPress={() => router.replace('/')}
                        >
                            <Ionicons name="trophy" size={14} color="#020617" />
                            <Text style={styles.exploreBtnText}>EXPLORE BOARDS</Text>
                        </Pressable>
                    </View>
                )}
            </View>

            {/* Account Management */}
            <View style={styles.footer}>
                <View style={styles.actionsRow}>
                    <Pressable style={styles.actionBtn} onPress={logout}>
                        <Ionicons name="log-out-outline" size={18} color="#94a3b8" />
                        <Text style={styles.actionBtnText}>SIGN OUT</Text>
                    </Pressable>
                    <Pressable style={[styles.actionBtn]} onPress={handleDeleteAccount}>
                        <Ionicons name="trash-outline" size={18} color="#f87171" opacity={0.5} />
                        <Text style={[styles.actionBtnText, { color: '#f87171', opacity: 0.5 }]}>DELETE ACCOUNT</Text>
                    </Pressable>
                </View>
                <Text style={styles.versionText}>ELITEBOARDS V0.4.2 • SECURE SESSION</Text>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#020617',
    },
    content: {
        paddingBottom: 40,
    },
    headerGradient: {
        paddingTop: 40,
        paddingBottom: 20,
        paddingHorizontal: 20,
    },
    userCard: {
        alignItems: 'center',
    },
    avatarWrap: {
        position: 'relative',
        marginBottom: 16,
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 30,
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    avatarPlaceholder: {
        width: 100,
        height: 100,
        borderRadius: 30,
        backgroundColor: 'rgba(255,255,255,0.05)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    avatarPlaceholderText: {
        color: '#94a3b8',
        fontSize: 40,
        fontWeight: '900',
    },
    statusBadge: {
        position: 'absolute',
        bottom: -4,
        right: -4,
        backgroundColor: '#6366f1',
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 3,
        borderColor: '#020617',
    },
    userName: {
        color: 'white',
        fontSize: 24,
        fontWeight: '900',
        letterSpacing: -1,
        textAlign: 'center',
    },
    userEmail: {
        color: '#64748b',
        fontSize: 12,
        fontWeight: '500',
        marginTop: 4,
        textAlign: 'center',
    },
    statsRow: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 24,
    },
    statBox: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
        alignItems: 'center',
        minWidth: 100,
    },
    statLabel: {
        color: '#64748b',
        fontSize: 8,
        fontWeight: '900',
        letterSpacing: 1.5,
        marginBottom: 4,
    },
    statValueWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    statValue: {
        color: 'white',
        fontSize: 16,
        fontWeight: '900',
    },
    section: {
        marginTop: 40,
        paddingHorizontal: 20,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
        paddingHorizontal: 8,
    },
    sectionTitle: {
        color: '#64748b',
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 3,
    },
    sectionCount: {
        color: '#475569',
        fontSize: 10,
        fontWeight: '800',
    },
    boardsGrid: {
        gap: 12,
    },
    boardCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.02)',
        padding: 16,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    boardIconWrap: {
        width: 48,
        height: 48,
        backgroundColor: 'rgba(2, 6, 23, 0.5)',
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    boardInfo: {
        flex: 1,
        marginLeft: 16,
    },
    boardName: {
        color: 'white',
        fontSize: 16,
        fontWeight: '900',
        letterSpacing: -0.5,
    },
    boardStatus: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 4,
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    statusText: {
        fontSize: 9,
        fontWeight: '900',
        letterSpacing: 1,
    },
    emptyCard: {
        backgroundColor: 'rgba(255,255,255,0.02)',
        padding: 40,
        borderRadius: 40,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
        borderStyle: 'dashed',
        alignItems: 'center',
    },
    emptyIconWrap: {
        width: 64,
        height: 64,
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    emptyTitle: {
        color: 'white',
        fontSize: 18,
        fontWeight: '900',
        letterSpacing: -0.5,
        marginBottom: 8,
    },
    emptyText: {
        color: '#64748b',
        fontSize: 12,
        fontWeight: '500',
        textAlign: 'center',
        marginBottom: 24,
    },
    exploreBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        paddingHorizontal: 24,
        paddingVertical: 14,
        borderRadius: 16,
        gap: 8,
    },
    exploreBtnText: {
        color: '#020617',
        fontSize: 12,
        fontWeight: '900',
        letterSpacing: 1,
    },
    footer: {
        marginTop: 60,
        paddingHorizontal: 20,
        alignItems: 'center',
    },
    actionsRow: {
        flexDirection: 'row',
        gap: 40,
        marginBottom: 24,
    },
    actionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    actionBtnText: {
        color: '#64748b',
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 2,
    },
    versionText: {
        color: '#334155',
        fontSize: 9,
        fontWeight: '800',
        letterSpacing: 3,
    },
});
