import React, { useState, useEffect } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    ScrollView, 
    Pressable, 
    Switch, 
    Alert, 
    ActivityIndicator 
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQueryClient } from '@tanstack/react-query';
import { API_URL } from '../src/config/env';

const THEME_KEY = 'eliteboards_theme_pref';
const NOTIF_PREF_KEY = 'eliteboards_notif_pref';

export default function Settings() {
    const router = useRouter();
    const queryClient = useQueryClient();

    // Theme preference: 'dark' | 'light' | 'system'
    const [theme, setTheme] = useState<'dark' | 'light' | 'system'>('dark');
    
    // Notification preferences
    const [pushEnabled, setPushEnabled] = useState(true);
    const [rankAlerts, setRankAlerts] = useState(true);
    const [reactionAlerts, setReactionAlerts] = useState(true);

    // Network diagnostic
    const [pingStatus, setPingStatus] = useState<string | null>(null);
    const [pinging, setPinging] = useState(false);

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            const savedTheme = await AsyncStorage.getItem(THEME_KEY);
            if (savedTheme) setTheme(savedTheme as any);

            const savedNotifs = await AsyncStorage.getItem(NOTIF_PREF_KEY);
            if (savedNotifs) {
                const parsed = JSON.parse(savedNotifs);
                setPushEnabled(parsed.pushEnabled ?? true);
                setRankAlerts(parsed.rankAlerts ?? true);
                setReactionAlerts(parsed.reactionAlerts ?? true);
            }
        } catch (e) {
            console.error('Failed to load settings:', e);
        }
    };

    const handleSelectTheme = async (newTheme: 'dark' | 'light' | 'system') => {
        setTheme(newTheme);
        await AsyncStorage.setItem(THEME_KEY, newTheme);
        Alert.alert("Theme Selected", `Theme set to ${newTheme.toUpperCase()}. EliteBoards is optimized for high-contrast dark OLED displays.`);
    };

    const handleSaveNotifs = async (push: boolean, rank: boolean, reaction: boolean) => {
        setPushEnabled(push);
        setRankAlerts(rank);
        setReactionAlerts(reaction);
        await AsyncStorage.setItem(NOTIF_PREF_KEY, JSON.stringify({
            pushEnabled: push,
            rankAlerts: rank,
            reactionAlerts: reaction
        }));
    };

    const handleTestPing = async () => {
        setPinging(true);
        setPingStatus(null);
        const start = Date.now();
        try {
            const res = await fetch(`${API_URL}/api/leaderboards?limit=1`, { method: 'HEAD' });
            const duration = Date.now() - start;
            if (res.ok) {
                setPingStatus(`Connected (${duration}ms)`);
            } else {
                setPingStatus(`HTTP ${res.status} (${duration}ms)`);
            }
        } catch (err: any) {
            setPingStatus('Connection Failed');
        } finally {
            setPinging(false);
        }
    };

    const handleClearCache = () => {
        Alert.alert(
            "Clear Local Cache?",
            "This will purge offline cached rankings and refresh all data on next visit.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Clear Cache",
                    style: "destructive",
                    onPress: async () => {
                        queryClient.clear();
                        Alert.alert("Cache Cleared", "Local cache has been successfully reset.");
                    }
                }
            ]
        );
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            {/* Header */}
            <View style={styles.header}>
                <Pressable style={styles.backBtn} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={20} color="#ffffff" />
                </Pressable>
                <View>
                    <Text style={styles.title}>Settings</Text>
                    <Text style={styles.subtitle}>Preferences & System Configuration</Text>
                </View>
            </View>

            {/* Theme Preference */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>DEVICE THEME</Text>
                <View style={styles.card}>
                    {[
                        { id: 'dark', label: 'Dark Mode (OLED)', icon: 'moon', desc: 'True black background optimized for battery & contrast' },
                        { id: 'system', label: 'Match System', icon: 'phone-portrait-outline', desc: 'Sync automatically with OS display appearance' },
                        { id: 'light', label: 'Light Mode', icon: 'sunny-outline', desc: 'Standard high-key theme for bright environments' },
                    ].map((item, idx) => (
                        <Pressable 
                            key={item.id} 
                            style={[
                                styles.optionRow,
                                idx !== 0 && styles.rowBorder
                            ]}
                            onPress={() => handleSelectTheme(item.id as any)}
                        >
                            <View style={styles.optionLeft}>
                                <View style={styles.iconWrap}>
                                    <Ionicons name={item.icon as any} size={18} color="#818cf8" />
                                </View>
                                <View>
                                    <Text style={styles.optionLabel}>{item.label}</Text>
                                    <Text style={styles.optionDesc}>{item.desc}</Text>
                                </View>
                            </View>
                            <Ionicons 
                                name={theme === item.id ? "radio-button-on" : "radio-button-off"} 
                                size={20} 
                                color={theme === item.id ? "#6366f1" : "#475569"} 
                            />
                        </Pressable>
                    ))}
                </View>
            </View>

            {/* Notification Settings */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>NOTIFICATION PREFERENCES</Text>
                <View style={styles.card}>
                    <View style={styles.switchRow}>
                        <View style={styles.switchLeft}>
                            <View style={styles.iconWrap}>
                                <Ionicons name="notifications" size={18} color="#818cf8" />
                            </View>
                            <View>
                                <Text style={styles.optionLabel}>Push Notifications</Text>
                                <Text style={styles.optionDesc}>Receive real-time alerts on mobile device</Text>
                            </View>
                        </View>
                        <Switch 
                            value={pushEnabled} 
                            onValueChange={(val) => handleSaveNotifs(val, rankAlerts, reactionAlerts)}
                            trackColor={{ false: '#334155', true: '#6366f1' }}
                            thumbColor="#ffffff"
                        />
                    </View>

                    <View style={[styles.switchRow, styles.rowBorder]}>
                        <View style={styles.switchLeft}>
                            <View style={styles.iconWrap}>
                                <Ionicons name="trending-up" size={18} color="#10b981" />
                            </View>
                            <View>
                                <Text style={styles.optionLabel}>Rank Position Shifts</Text>
                                <Text style={styles.optionDesc}>Alert when someone overtakes your rank</Text>
                            </View>
                        </View>
                        <Switch 
                            value={rankAlerts} 
                            disabled={!pushEnabled}
                            onValueChange={(val) => handleSaveNotifs(pushEnabled, val, reactionAlerts)}
                            trackColor={{ false: '#334155', true: '#6366f1' }}
                            thumbColor="#ffffff"
                        />
                    </View>

                    <View style={[styles.switchRow, styles.rowBorder]}>
                        <View style={styles.switchLeft}>
                            <View style={styles.iconWrap}>
                                <Ionicons name="heart" size={18} color="#f87171" />
                            </View>
                            <View>
                                <Text style={styles.optionLabel}>Score Reactions</Text>
                                <Text style={styles.optionDesc}>Notify when peers like or applaud your score</Text>
                            </View>
                        </View>
                        <Switch 
                            value={reactionAlerts} 
                            disabled={!pushEnabled}
                            onValueChange={(val) => handleSaveNotifs(pushEnabled, rankAlerts, val)}
                            trackColor={{ false: '#334155', true: '#6366f1' }}
                            thumbColor="#ffffff"
                        />
                    </View>
                </View>
            </View>

            {/* Network & Diagnostics */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>SYSTEM DIAGNOSTICS</Text>
                <View style={styles.card}>
                    <View style={styles.diagRow}>
                        <Text style={styles.diagLabel}>Backend Endpoint</Text>
                        <Text style={styles.diagValue} numberOfLines={1}>{API_URL}</Text>
                    </View>
                    <View style={[styles.diagRow, styles.rowBorder]}>
                        <Text style={styles.diagLabel}>Server Status</Text>
                        <View style={styles.pingWrap}>
                            {pingStatus && (
                                <Text style={[
                                    styles.pingText, 
                                    { color: pingStatus.includes('Connected') ? '#10b981' : '#f87171' }
                                ]}>
                                    {pingStatus}
                                </Text>
                            )}
                            <Pressable 
                                style={styles.pingBtn} 
                                onPress={handleTestPing}
                                disabled={pinging}
                            >
                                {pinging ? (
                                    <ActivityIndicator size="small" color="#ffffff" />
                                ) : (
                                    <Text style={styles.pingBtnText}>Test Ping</Text>
                                )}
                            </Pressable>
                        </View>
                    </View>
                </View>
            </View>

            {/* Cache Management */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>STORAGE</Text>
                <View style={styles.card}>
                    <Pressable style={styles.dangerRow} onPress={handleClearCache}>
                        <View style={styles.optionLeft}>
                            <View style={[styles.iconWrap, { backgroundColor: 'rgba(248, 113, 113, 0.1)' }]}>
                                <Ionicons name="refresh-circle-outline" size={20} color="#f87171" />
                            </View>
                            <View>
                                <Text style={[styles.optionLabel, { color: '#f87171' }]}>Purge Offline Cache</Text>
                                <Text style={styles.optionDesc}>Reset TanStack local query disk cache</Text>
                            </View>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color="#475569" />
                    </Pressable>
                </View>
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
        paddingHorizontal: 20,
        paddingTop: 24,
        paddingBottom: 48,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        marginBottom: 28,
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.05)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    title: {
        color: '#ffffff',
        fontSize: 22,
        fontWeight: '900',
        letterSpacing: -0.5,
    },
    subtitle: {
        color: '#64748b',
        fontSize: 12,
        fontWeight: '500',
        marginTop: 2,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        color: '#64748b',
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 2,
        marginBottom: 10,
        paddingHorizontal: 4,
    },
    card: {
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.06)',
        overflow: 'hidden',
    },
    optionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
    },
    switchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
    },
    rowBorder: {
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.04)',
    },
    optionLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    switchLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
        paddingRight: 12,
    },
    iconWrap: {
        width: 36,
        height: 36,
        borderRadius: 12,
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    optionLabel: {
        color: '#ffffff',
        fontSize: 14,
        fontWeight: '800',
    },
    optionDesc: {
        color: '#64748b',
        fontSize: 11,
        marginTop: 2,
    },
    diagRow: {
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    diagLabel: {
        color: '#94a3b8',
        fontSize: 13,
        fontWeight: '700',
    },
    diagValue: {
        color: '#ffffff',
        fontSize: 12,
        fontWeight: '600',
        fontFamily: 'monospace',
        maxWidth: 180,
    },
    pingWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    pingText: {
        fontSize: 11,
        fontWeight: '700',
    },
    pingBtn: {
        backgroundColor: '#6366f1',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 10,
    },
    pingBtnText: {
        color: '#ffffff',
        fontSize: 11,
        fontWeight: '800',
    },
    dangerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
    },
});
