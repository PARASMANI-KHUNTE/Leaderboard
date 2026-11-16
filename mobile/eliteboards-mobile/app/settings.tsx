import React, { useState, useEffect } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    ScrollView, 
    Pressable, 
    Switch, 
    ActivityIndicator 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQueryClient } from '@tanstack/react-query';
import { API_URL } from '../src/config/env';
import { useTheme, ThemePreference } from '../src/theme/ThemeContext';
import { useThemedDialog } from '../src/components/ThemedDialog';

const NOTIF_PREF_KEY = 'eliteboards_notif_pref';

export default function Settings() {
    const queryClient = useQueryClient();
    const { themePreference, setThemePreference, colors, isDark } = useTheme();
    const { showAlert, showConfirm } = useThemedDialog();
    
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

    const handleSelectTheme = async (newTheme: ThemePreference) => {
        await setThemePreference(newTheme);
        showAlert(
            "Theme Updated", 
            `Display theme switched to ${newTheme.toUpperCase()}.${newTheme === 'dark' ? ' True black OLED mode is active.' : ''}`,
            'success'
        );
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
        showConfirm(
            "Clear Local Cache?",
            "This will purge offline cached rankings and refresh all data from the server on your next visit.",
            async () => {
                queryClient.clear();
                showAlert("Cache Cleared", "Local cache has been successfully reset.", "success");
            },
            {
                type: 'danger',
                confirmText: 'Clear Cache',
            }
        );
    };

    return (
        <ScrollView 
            style={[styles.container, { backgroundColor: colors.bg }]} 
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
        >
            {/* Theme Preference (Issue 1: Fully functioning dynamic theme switching) */}
            <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>DEVICE THEME</Text>
                <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    {[
                        { id: 'dark', label: 'Dark Mode (OLED)', icon: 'moon', desc: 'True black background optimized for OLED displays' },
                        { id: 'system', label: 'Match System', icon: 'phone-portrait-outline', desc: 'Sync automatically with OS display appearance' },
                        { id: 'light', label: 'Light Mode', icon: 'sunny-outline', desc: 'Clean high-key theme for bright environments' },
                    ].map((item, idx) => (
                        <Pressable 
                            key={item.id} 
                            style={[
                                styles.optionRow,
                                idx !== 0 && { borderTopWidth: 1, borderTopColor: colors.borderSubtle }
                            ]}
                            onPress={() => handleSelectTheme(item.id as ThemePreference)}
                        >
                            <View style={styles.optionLeft}>
                                <View style={[styles.iconWrap, { backgroundColor: isDark ? 'rgba(99, 102, 241, 0.12)' : 'rgba(79, 70, 229, 0.08)' }]}>
                                    <Ionicons name={item.icon as any} size={18} color={colors.primaryLight} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.optionLabel, { color: colors.text }]}>{item.label}</Text>
                                    <Text style={[styles.optionDesc, { color: colors.textSecondary }]}>{item.desc}</Text>
                                </View>
                            </View>
                            <Ionicons 
                                name={themePreference === item.id ? "radio-button-on" : "radio-button-off"} 
                                size={20} 
                                color={themePreference === item.id ? colors.primaryLight : colors.textMuted} 
                            />
                        </Pressable>
                    ))}
                </View>
            </View>

            {/* Notification Settings */}
            <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>NOTIFICATION PREFERENCES</Text>
                <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <View style={styles.switchRow}>
                        <View style={styles.switchLeft}>
                            <View style={[styles.iconWrap, { backgroundColor: isDark ? 'rgba(99, 102, 241, 0.12)' : 'rgba(79, 70, 229, 0.08)' }]}>
                                <Ionicons name="notifications" size={18} color={colors.primaryLight} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.optionLabel, { color: colors.text }]}>Push Notifications</Text>
                                <Text style={[styles.optionDesc, { color: colors.textSecondary }]}>Receive real-time alerts on this device</Text>
                            </View>
                        </View>
                        <Switch 
                            value={pushEnabled} 
                            onValueChange={(val) => handleSaveNotifs(val, rankAlerts, reactionAlerts)}
                            trackColor={{ false: isDark ? '#334155' : '#cbd5e1', true: colors.primary }}
                            thumbColor="#ffffff"
                        />
                    </View>

                    <View style={[styles.switchRow, { borderTopWidth: 1, borderTopColor: colors.borderSubtle }]}>
                        <View style={styles.switchLeft}>
                            <View style={[styles.iconWrap, { backgroundColor: 'rgba(34, 197, 94, 0.1)' }]}>
                                <Ionicons name="trending-up" size={18} color={colors.success} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.optionLabel, { color: colors.text }]}>Rank Position Shifts</Text>
                                <Text style={[styles.optionDesc, { color: colors.textSecondary }]}>Alert when someone overtakes your rank</Text>
                            </View>
                        </View>
                        <Switch 
                            value={rankAlerts} 
                            disabled={!pushEnabled}
                            onValueChange={(val) => handleSaveNotifs(pushEnabled, val, reactionAlerts)}
                            trackColor={{ false: isDark ? '#334155' : '#cbd5e1', true: colors.primary }}
                            thumbColor="#ffffff"
                        />
                    </View>

                    <View style={[styles.switchRow, { borderTopWidth: 1, borderTopColor: colors.borderSubtle }]}>
                        <View style={styles.switchLeft}>
                            <View style={[styles.iconWrap, { backgroundColor: 'rgba(244, 63, 94, 0.1)' }]}>
                                <Ionicons name="heart" size={18} color={colors.danger} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.optionLabel, { color: colors.text }]}>Score Reactions</Text>
                                <Text style={[styles.optionDesc, { color: colors.textSecondary }]}>Notify when peers like your score</Text>
                            </View>
                        </View>
                        <Switch 
                            value={reactionAlerts} 
                            disabled={!pushEnabled}
                            onValueChange={(val) => handleSaveNotifs(pushEnabled, rankAlerts, val)}
                            trackColor={{ false: isDark ? '#334155' : '#cbd5e1', true: colors.primary }}
                            thumbColor="#ffffff"
                        />
                    </View>
                </View>
            </View>

            {/* Network & Diagnostics */}
            <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>SYSTEM DIAGNOSTICS</Text>
                <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <View style={styles.diagRow}>
                        <Text style={[styles.diagLabel, { color: colors.textSecondary }]}>Backend Endpoint</Text>
                        <Text style={[styles.diagValue, { color: colors.text }]} numberOfLines={1}>{API_URL}</Text>
                    </View>
                    <View style={[styles.diagRow, { borderTopWidth: 1, borderTopColor: colors.borderSubtle }]}>
                        <Text style={[styles.diagLabel, { color: colors.textSecondary }]}>Server Status</Text>
                        <View style={styles.pingWrap}>
                            {pingStatus && (
                                <Text style={[
                                    styles.pingText, 
                                    { color: pingStatus.includes('Connected') ? colors.success : colors.danger }
                                ]}>
                                    {pingStatus}
                                </Text>
                            )}
                            <Pressable 
                                style={[styles.pingBtn, { backgroundColor: colors.primary }]} 
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
                <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>STORAGE</Text>
                <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Pressable style={styles.dangerRow} onPress={handleClearCache}>
                        <View style={styles.optionLeft}>
                            <View style={[styles.iconWrap, { backgroundColor: colors.dangerBg }]}>
                                <Ionicons name="refresh-circle-outline" size={20} color={colors.danger} />
                            </View>
                            <View>
                                <Text style={[styles.optionLabel, { color: colors.danger }]}>Purge Offline Cache</Text>
                                <Text style={[styles.optionDesc, { color: colors.textSecondary }]}>Reset TanStack local query disk cache</Text>
                            </View>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                    </Pressable>
                </View>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 40,
    },
    section: {
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 9,
        fontWeight: '900',
        letterSpacing: 2,
        marginBottom: 8,
        paddingHorizontal: 4,
    },
    card: {
        borderRadius: 18,
        borderWidth: 1,
        overflow: 'hidden',
    },
    optionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 14,
    },
    switchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 14,
    },
    optionLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
        paddingRight: 8,
    },
    switchLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
        paddingRight: 12,
    },
    iconWrap: {
        width: 34,
        height: 34,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    optionLabel: {
        fontSize: 13,
        fontWeight: '800',
    },
    optionDesc: {
        fontSize: 10,
        marginTop: 2,
    },
    diagRow: {
        padding: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    diagLabel: {
        fontSize: 12,
        fontWeight: '700',
    },
    diagValue: {
        fontSize: 11,
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
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
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
        padding: 14,
    },
});
