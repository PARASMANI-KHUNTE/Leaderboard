import React from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    ScrollView, 
    Pressable, 
    Image 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { useTheme } from '../src/theme/ThemeContext';

export default function About() {
    const { colors, isDark } = useTheme();

    const openUrl = async (url: string) => {
        try {
            await WebBrowser.openBrowserAsync(url);
        } catch (e) {
            console.error('Failed to open URL:', e);
        }
    };

    return (
        <ScrollView 
            style={[styles.container, { backgroundColor: colors.bg }]} 
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
        >
            {/* Brand Card */}
            <View style={[styles.brandCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Image 
                    source={require('../assets/logo.png')} 
                    style={styles.logoImage} 
                    resizeMode="contain" 
                />
                <Text style={[styles.brandTitle, { color: colors.text }]}>EliteBoards</Text>
                <Text style={[styles.brandTagline, { color: colors.primaryLight }]}>PREMIUM ACADEMIC & COMPETITIVE RANKINGS</Text>
                
                <View style={styles.badgeRow}>
                    <View style={styles.badge}>
                        <View style={styles.statusDot} />
                        <Text style={styles.badgeText}>v1.1.0 OTA ACTIVE</Text>
                    </View>
                    <View style={[styles.badge, { backgroundColor: isDark ? 'rgba(99, 102, 241, 0.12)' : 'rgba(79, 70, 229, 0.08)', borderColor: isDark ? 'rgba(99, 102, 241, 0.3)' : 'rgba(79, 70, 229, 0.2)' }]}>
                        <Text style={[styles.badgeText, { color: colors.primaryLight }]}>EXPO SDK 55</Text>
                    </View>
                </View>
            </View>

            {/* Production Live Links */}
            <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>PRODUCTION ACCESS</Text>
                <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Pressable 
                        style={styles.linkRow} 
                        onPress={() => openUrl('https://leaderboard-xgi1.onrender.com')}
                    >
                        <View style={styles.linkLeft}>
                            <View style={[styles.iconWrap, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
                                <Ionicons name="globe-outline" size={18} color="#10b981" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.linkLabel, { color: colors.text }]}>Live Web Platform</Text>
                                <Text style={[styles.linkUrl, { color: colors.textSecondary }]}>leaderboard-xgi1.onrender.com</Text>
                            </View>
                        </View>
                        <Ionicons name="open-outline" size={16} color={colors.textMuted} />
                    </Pressable>

                    <Pressable 
                        style={[styles.linkRow, { borderTopWidth: 1, borderTopColor: colors.borderSubtle }]} 
                        onPress={() => openUrl('https://leaderboard-xgi1.onrender.com/docs')}
                    >
                        <View style={styles.linkLeft}>
                            <View style={[styles.iconWrap, { backgroundColor: isDark ? 'rgba(99, 102, 241, 0.12)' : 'rgba(79, 70, 229, 0.08)' }]}>
                                <Ionicons name="book-outline" size={18} color={colors.primaryLight} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.linkLabel, { color: colors.text }]}>API & Architecture Docs</Text>
                                <Text style={[styles.linkUrl, { color: colors.textSecondary }]}>Technical specifications & schema</Text>
                            </View>
                        </View>
                        <Ionicons name="open-outline" size={16} color={colors.textMuted} />
                    </Pressable>

                    <Pressable 
                        style={[styles.linkRow, { borderTopWidth: 1, borderTopColor: colors.borderSubtle }]} 
                        onPress={() => openUrl('https://github.com/PARASMANI-KHUNTE/Leaderboard')}
                    >
                        <View style={styles.linkLeft}>
                            <View style={[styles.iconWrap, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)' }]}>
                                <Ionicons name="logo-github" size={18} color={colors.text} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.linkLabel, { color: colors.text }]}>GitHub Repository</Text>
                                <Text style={[styles.linkUrl, { color: colors.textSecondary }]}>Source code, PRs, and security scans</Text>
                            </View>
                        </View>
                        <Ionicons name="open-outline" size={16} color={colors.textMuted} />
                    </Pressable>
                </View>
            </View>

            {/* Architecture Highlights */}
            <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>CORE ARCHITECTURE</Text>
                <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <View style={styles.featureRow}>
                        <View style={[styles.iconWrap, { backgroundColor: 'rgba(234, 179, 8, 0.1)' }]}>
                            <Ionicons name="flash-outline" size={18} color="#eab308" />
                        </View>
                        <View style={styles.featureTextWrap}>
                            <Text style={[styles.featureTitle, { color: colors.text }]}>Realtime WebSocket Sync</Text>
                            <Text style={[styles.featureDesc, { color: colors.textSecondary }]}>Sub-millisecond score updates and reactive cache invalidation powered by Socket.IO singletons.</Text>
                        </View>
                    </View>

                    <View style={[styles.featureRow, { borderTopWidth: 1, borderTopColor: colors.borderSubtle }]}>
                        <View style={[styles.iconWrap, { backgroundColor: isDark ? 'rgba(99, 102, 241, 0.12)' : 'rgba(79, 70, 229, 0.08)' }]}>
                            <Ionicons name="shield-checkmark-outline" size={18} color={colors.primaryLight} />
                        </View>
                        <View style={styles.featureTextWrap}>
                            <Text style={[styles.featureTitle, { color: colors.text }]}>AI Academic Verification</Text>
                            <Text style={[styles.featureDesc, { color: colors.textSecondary }]}>Automated grade card validation utilizing Sharp image compression, Tesseract OCR, and OpenRouter LLMs.</Text>
                        </View>
                    </View>

                    <View style={[styles.featureRow, { borderTopWidth: 1, borderTopColor: colors.borderSubtle }]}>
                        <View style={[styles.iconWrap, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
                            <Ionicons name="cloud-offline-outline" size={18} color="#ef4444" />
                        </View>
                        <View style={styles.featureTextWrap}>
                            <Text style={[styles.featureTitle, { color: colors.text }]}>Offline Persistence</Text>
                            <Text style={[styles.featureDesc, { color: colors.textSecondary }]}>Cached ranking data powered by TanStack Query and AsyncStorage with automatic reconnect rehydration.</Text>
                        </View>
                    </View>
                </View>
            </View>

            {/* Footer */}
            <View style={styles.footer}>
                <Text style={[styles.copyright, { color: colors.textMuted }]}>© 2026 EliteBoards Team • Built for Universities</Text>
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
    brandCard: {
        alignItems: 'center',
        borderRadius: 20,
        borderWidth: 1,
        padding: 20,
        marginBottom: 20,
    },
    logoImage: {
        width: 56,
        height: 56,
        marginBottom: 10,
    },
    brandTitle: {
        fontSize: 22,
        fontWeight: '900',
        letterSpacing: -0.5,
    },
    brandTagline: {
        fontSize: 8,
        fontWeight: '900',
        letterSpacing: 2,
        marginTop: 4,
    },
    badgeRow: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 14,
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 12,
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(16, 185, 129, 0.3)',
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#10b981',
    },
    badgeText: {
        color: '#10b981',
        fontSize: 9,
        fontWeight: '900',
        letterSpacing: 1,
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
    linkRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 14,
    },
    featureRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        padding: 14,
        gap: 12,
    },
    featureTextWrap: {
        flex: 1,
    },
    featureTitle: {
        fontSize: 13,
        fontWeight: '800',
        marginBottom: 3,
    },
    featureDesc: {
        fontSize: 11,
        lineHeight: 16,
    },
    linkLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    iconWrap: {
        width: 34,
        height: 34,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    linkLabel: {
        fontSize: 13,
        fontWeight: '800',
    },
    linkUrl: {
        fontSize: 10,
        marginTop: 1,
    },
    footer: {
        alignItems: 'center',
        marginTop: 8,
    },
    copyright: {
        fontSize: 10,
        fontWeight: '700',
    },
});
