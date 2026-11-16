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
    Dimensions,
    TextInput
} from 'react-native';
import { useAuth } from '../src/providers/AuthProvider';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { API_URL } from '../src/config/env';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

export default function Profile() {
    const { user, token, logout, refreshProfile } = useAuth();
    const router = useRouter();
    const [joinedBoards, setJoinedBoards] = useState<any[]>([]);
    const [managedBoards, setManagedBoards] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Name update state
    const [isEditingName, setIsEditingName] = useState(false);
    const [nameInput, setNameInput] = useState(user?.name || '');
    const [savingName, setSavingName] = useState(false);

    useEffect(() => {
        if (!user) {
            router.replace('/login');
            return;
        }
        setNameInput(user.name || '');
        fetchAllData();
    }, [user?.id]);

    const fetchAllData = async () => {
        setLoading(true);
        try {
            const [joinedRes, managedRes] = await Promise.all([
                axios.get(`${API_URL}/auth/joined-leaderboards`, {
                    headers: { Authorization: `Bearer ${token}` }
                }).catch(() => ({ data: [] })),
                axios.get(`${API_URL}/auth/managed-leaderboards`, {
                    headers: { Authorization: `Bearer ${token}` }
                }).catch(() => ({ data: [] }))
            ]);
            setJoinedBoards(joinedRes.data || []);
            setManagedBoards(managedRes.data || []);
        } catch (err) {
            console.error('Failed to fetch profile boards:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveName = async () => {
        const trimmed = nameInput.trim();
        if (!trimmed) {
            Alert.alert("Invalid Name", "Display name cannot be empty.");
            return;
        }

        setSavingName(true);
        try {
            await axios.put(`${API_URL}/auth/profile`, { name: trimmed }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            await refreshProfile();
            setIsEditingName(false);
            Alert.alert("Profile Updated", "Your display name has been updated successfully.");
        } catch (err: any) {
            Alert.alert("Update Failed", err.response?.data?.message || "Could not update display name.");
        } finally {
            setSavingName(false);
        }
    };

    const handleToggleManagedStatus = async (boardId: string, currentStatus: boolean) => {
        const title = currentStatus ? "Pause Leaderboard?" : "Set Leaderboard Live?";
        const msg = currentStatus
            ? "Putting this board in maintenance mode will pause student submissions."
            : "Making this board live will allow students to submit scores again.";

        Alert.alert(title, msg, [
            { text: "Cancel", style: "cancel" },
            {
                text: currentStatus ? "Pause" : "Set Live",
                style: currentStatus ? "destructive" : "default",
                onPress: async () => {
                    try {
                        await axios.post(`${API_URL}/api/leaderboards/toggle-status/${boardId}`, {}, {
                            headers: { Authorization: `Bearer ${token}` }
                        });
                        setManagedBoards(prev => prev.map(b => b._id === boardId ? { ...b, isLive: !currentStatus } : b));
                    } catch (err) {
                        Alert.alert("Error", "Failed to update leaderboard status.");
                    }
                }
            }
        ]);
    };

    const handleDeleteManagedBoard = async (boardId: string, boardName: string) => {
        Alert.alert(
            "Delete Leaderboard?",
            `Are you sure you want to permanently delete "${boardName}" and all associated entries?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete Board",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await axios.delete(`${API_URL}/api/leaderboards/${boardId}`, {
                                headers: { Authorization: `Bearer ${token}` }
                            });
                            setManagedBoards(prev => prev.filter(b => b._id !== boardId));
                            Alert.alert("Deleted", "Leaderboard removed successfully.");
                        } catch (err) {
                            Alert.alert("Error", "Failed to delete leaderboard.");
                        }
                    }
                }
            ]
        );
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
                            await logout();
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
                colors={['rgba(79, 70, 229, 0.2)', 'rgba(2, 6, 23, 0)']}
                style={styles.headerGradient}
            >
                <View style={styles.userCard}>
                    <View style={styles.avatarWrap}>
                        {user.picture ? (
                            <Image source={{ uri: user.picture }} style={styles.avatar} />
                        ) : (
                            <View style={styles.avatarPlaceholder}>
                                <Text style={styles.avatarPlaceholderText}>{user.name?.charAt(0) || '?'}</Text>
                            </View>
                        )}
                        <View style={styles.statusBadge}>
                            <Ionicons name="flash" size={12} color="white" />
                        </View>
                    </View>
                    
                    {/* Display Name with inline editing */}
                    {isEditingName ? (
                        <View style={styles.editNameRow}>
                            <TextInput
                                style={styles.nameInput}
                                value={nameInput}
                                onChangeText={setNameInput}
                                placeholder="Enter display name"
                                placeholderTextColor="#64748b"
                                autoFocus
                                maxLength={50}
                            />
                            <Pressable 
                                style={[styles.editIconBtn, styles.saveBtn]} 
                                onPress={handleSaveName}
                                disabled={savingName}
                            >
                                {savingName ? (
                                    <ActivityIndicator size="small" color="#ffffff" />
                                ) : (
                                    <Ionicons name="checkmark" size={18} color="#ffffff" />
                                )}
                            </Pressable>
                            <Pressable 
                                style={[styles.editIconBtn, styles.cancelBtn]} 
                                onPress={() => {
                                    setNameInput(user.name || '');
                                    setIsEditingName(false);
                                }}
                            >
                                <Ionicons name="close" size={18} color="#94a3b8" />
                            </Pressable>
                        </View>
                    ) : (
                        <View style={styles.nameRow}>
                            <Text style={styles.userName}>{user.name}</Text>
                            <Pressable 
                                style={styles.editNameTrigger} 
                                onPress={() => setIsEditingName(true)}
                            >
                                <Ionicons name="pencil" size={14} color="#818cf8" />
                            </Pressable>
                        </View>
                    )}

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
                            <Text style={styles.statLabel}>ROLE</Text>
                            <Text style={[styles.statValue, { color: user.isAdmin ? '#a855f7' : '#818cf8' }]}>
                                {user.isAdmin ? 'Admin' : 'Competitive'}
                            </Text>
                        </View>
                    </View>
                </View>
            </LinearGradient>

            {/* Manage My Created Leaderboards */}
            <View style={styles.section}>
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>MY CREATED LEADERBOARDS</Text>
                    <Text style={styles.sectionCount}>{managedBoards.length} MANAGED</Text>
                </View>

                {loading ? (
                    <ActivityIndicator color="#6366f1" style={{ marginTop: 12 }} />
                ) : managedBoards.length > 0 ? (
                    <View style={styles.boardsGrid}>
                        {managedBoards.map((board) => (
                            <View key={board._id} style={styles.managedCard}>
                                <Pressable 
                                    style={styles.managedMain}
                                    onPress={() => router.push(`/lb/${board.slug}`)}
                                >
                                    <View style={styles.boardIconWrap}>
                                        <Ionicons name="trophy" size={22} color="#818cf8" />
                                    </View>
                                    <View style={styles.boardInfo}>
                                        <Text style={styles.boardName} numberOfLines={1}>{board.name}</Text>
                                        <View style={styles.boardMetaRow}>
                                            <View style={[styles.statusDot, { backgroundColor: board.isLive ? '#10b981' : '#f59e0b' }]} />
                                            <Text style={[styles.statusText, { color: board.isLive ? '#10b981' : '#f59e0b' }]}>
                                                {board.isLive ? 'LIVE' : 'MAINTENANCE'}
                                            </Text>
                                            <Text style={styles.metaDivider}>•</Text>
                                            <Text style={styles.metaSubmissions}>{board.entryCount || 0} entries</Text>
                                        </View>
                                    </View>
                                </Pressable>

                                <View style={styles.managedActions}>
                                    <Pressable 
                                        style={[styles.miniActionBtn, board.isLive ? styles.pauseBtn : styles.resumeBtn]}
                                        onPress={() => handleToggleManagedStatus(board._id, board.isLive)}
                                    >
                                        <Ionicons 
                                            name={board.isLive ? "pause" : "play"} 
                                            size={14} 
                                            color={board.isLive ? "#f59e0b" : "#10b981"} 
                                        />
                                    </Pressable>
                                    <Pressable 
                                        style={[styles.miniActionBtn, styles.deleteBoardBtn]}
                                        onPress={() => handleDeleteManagedBoard(board._id, board.name)}
                                    >
                                        <Ionicons name="trash-outline" size={14} color="#f87171" />
                                    </Pressable>
                                </View>
                            </View>
                        ))}
                    </View>
                ) : (
                    <View style={styles.emptyCard}>
                        <Ionicons name="create-outline" size={28} color="#475569" />
                        <Text style={styles.emptyTitle}>NO MANAGED BOARDS</Text>
                        <Text style={styles.emptyText}>You haven't created any leaderboards yet.</Text>
                        <Pressable 
                            style={styles.exploreBtn}
                            onPress={() => router.replace('/')}
                        >
                            <Ionicons name="add" size={14} color="#020617" />
                            <Text style={styles.exploreBtnText}>CREATE ON HOME</Text>
                        </Pressable>
                    </View>
                )}
            </View>

            {/* Competitive Activity (Joined Boards) */}
            <View style={styles.section}>
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>COMPETITIVE ACTIVITY</Text>
                    <Text style={styles.sectionCount}>{joinedBoards.length} JOINED</Text>
                </View>

                {loading ? (
                    <ActivityIndicator color="#6366f1" style={{ marginTop: 12 }} />
                ) : joinedBoards.length > 0 ? (
                    <View style={styles.boardsGrid}>
                        {joinedBoards.map((board, idx) => (
                            <Pressable 
                                key={idx} 
                                style={styles.boardCard}
                                onPress={() => router.push(`/lb/${board.slug}`)}
                            >
                                <View style={styles.boardIconWrap}>
                                    <Ionicons name="ribbon-outline" size={24} color="#818cf8" />
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
                        <Ionicons name="search-outline" size={28} color="#475569" />
                        <Text style={styles.emptyTitle}>NO PARTICIPATION YET</Text>
                        <Text style={styles.emptyText}>You haven't submitted scores to any competitive boards yet.</Text>
                        <Pressable 
                            style={styles.exploreBtn}
                            onPress={() => router.replace('/')}
                        >
                            <Ionicons name="trophy" size={14} color="#020617" />
                            <Text style={styles.exploreBtnText}>BROWSE LEADERBOARDS</Text>
                        </Pressable>
                    </View>
                )}
            </View>

            {/* Account Management & Deletion */}
            <View style={styles.footer}>
                <View style={styles.actionsRow}>
                    <Pressable style={styles.actionBtn} onPress={logout}>
                        <Ionicons name="log-out-outline" size={18} color="#94a3b8" />
                        <Text style={styles.actionBtnText}>SIGN OUT</Text>
                    </Pressable>
                    <Pressable style={[styles.actionBtn, styles.dangerBtn]} onPress={handleDeleteAccount}>
                        <Ionicons name="trash-outline" size={18} color="#f87171" />
                        <Text style={[styles.actionBtnText, { color: '#f87171' }]}>DELETE ACCOUNT</Text>
                    </Pressable>
                </View>
                <Text style={styles.versionText}>ELITEBOARDS V1.1.0 • SECURE JWT SESSION</Text>
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
        paddingBottom: 24,
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
        width: 96,
        height: 96,
        borderRadius: 28,
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    avatarPlaceholder: {
        width: 96,
        height: 96,
        borderRadius: 28,
        backgroundColor: 'rgba(255,255,255,0.05)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    avatarPlaceholderText: {
        color: '#94a3b8',
        fontSize: 36,
        fontWeight: '900',
    },
    statusBadge: {
        position: 'absolute',
        bottom: -2,
        right: -2,
        backgroundColor: '#6366f1',
        width: 24,
        height: 24,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#020617',
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    userName: {
        color: 'white',
        fontSize: 22,
        fontWeight: '900',
        letterSpacing: -0.5,
        textAlign: 'center',
    },
    editNameTrigger: {
        padding: 4,
        borderRadius: 8,
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
    },
    editNameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        width: '90%',
    },
    nameInput: {
        flex: 1,
        backgroundColor: 'rgba(255,255,255,0.08)',
        borderWidth: 1,
        borderColor: '#6366f1',
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 8,
        color: '#ffffff',
        fontSize: 15,
        fontWeight: '700',
    },
    editIconBtn: {
        width: 36,
        height: 36,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    saveBtn: {
        backgroundColor: '#6366f1',
    },
    cancelBtn: {
        backgroundColor: 'rgba(255,255,255,0.08)',
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
        marginTop: 20,
    },
    statBox: {
        paddingHorizontal: 14,
        paddingVertical: 10,
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
        alignItems: 'center',
        minWidth: 95,
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
        fontSize: 15,
        fontWeight: '900',
    },
    section: {
        marginTop: 32,
        paddingHorizontal: 20,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
        paddingHorizontal: 4,
    },
    sectionTitle: {
        color: '#64748b',
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 2,
    },
    sectionCount: {
        color: '#475569',
        fontSize: 10,
        fontWeight: '800',
    },
    boardsGrid: {
        gap: 10,
    },
    boardCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.02)',
        padding: 14,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    managedCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'rgba(255,255,255,0.03)',
        padding: 14,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.06)',
    },
    managedMain: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    managedActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginLeft: 12,
    },
    miniActionBtn: {
        width: 32,
        height: 32,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    pauseBtn: {
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(245, 158, 11, 0.2)',
    },
    resumeBtn: {
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(16, 185, 129, 0.2)',
    },
    deleteBoardBtn: {
        backgroundColor: 'rgba(248, 113, 113, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(248, 113, 113, 0.2)',
    },
    boardIconWrap: {
        width: 44,
        height: 44,
        backgroundColor: 'rgba(2, 6, 23, 0.5)',
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    boardInfo: {
        flex: 1,
        marginLeft: 14,
    },
    boardName: {
        color: 'white',
        fontSize: 15,
        fontWeight: '900',
        letterSpacing: -0.3,
    },
    boardStatus: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 4,
    },
    boardMetaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 4,
    },
    metaDivider: {
        color: '#475569',
        fontSize: 10,
    },
    metaSubmissions: {
        color: '#94a3b8',
        fontSize: 11,
        fontWeight: '600',
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
        alignItems: 'center',
        padding: 24,
        backgroundColor: 'rgba(255,255,255,0.02)',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
        gap: 8,
    },
    emptyTitle: {
        color: 'white',
        fontSize: 12,
        fontWeight: '900',
        letterSpacing: 1.5,
        marginTop: 4,
    },
    emptyText: {
        color: '#64748b',
        fontSize: 12,
        textAlign: 'center',
    },
    exploreBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#ffffff',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 14,
        marginTop: 8,
    },
    exploreBtnText: {
        color: '#020617',
        fontSize: 11,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    footer: {
        marginTop: 40,
        paddingHorizontal: 20,
        alignItems: 'center',
        gap: 20,
    },
    actionsRow: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
    },
    actionBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: 'rgba(255,255,255,0.03)',
        paddingVertical: 14,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    dangerBtn: {
        borderColor: 'rgba(248, 113, 113, 0.2)',
        backgroundColor: 'rgba(248, 113, 113, 0.05)',
    },
    actionBtnText: {
        color: '#94a3b8',
        fontSize: 11,
        fontWeight: '900',
        letterSpacing: 1,
    },
    versionText: {
        color: '#334155',
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 1,
    },
});
