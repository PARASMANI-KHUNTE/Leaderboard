import React from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    ScrollView, 
    Pressable, 
    Image, 
    Linking 
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';

export default function About() {
    const router = useRouter();

    const openUrl = async (url: string) => {
        try {
            await WebBrowser.openBrowserAsync(url);
        } catch (e) {
            Linking.openURL(url).catch(() => {});
        }
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            {/* Header */}
            <View style={styles.header}>
                <Pressable style={styles.backBtn} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={20} color="#ffffff" />
                </Pressable>
                <View>
                    <Text style={styles.title}>About</Text>
                    <Text style={styles.subtitle}>Platform Overview & System Specs</Text>
                </View>
            </View>

            {/* Brand Card */}
            <View style={styles.brandCard}>
                <Image 
                    source={require('../assets/logo.png')} 
                    style={styles.logoImage} 
                    resizeMode="contain" 
                />
                <Text style={styles.brandTitle}>EliteBoards</Text>
                <Text style={styles.brandTagline}>PREMIUM ACADEMIC & COMPETITIVE RANKINGS</Text>
                
                <View style={styles.badgeRow}>
                    <View style={styles.badge}>
                        <View style={styles.statusDot} />
                        <Text style={styles.badgeText}>v1.1.0 OTA ACTIVE</Text>
                    </View>
                    <View style={[styles.badge, { backgroundColor: 'rgba(99, 102, 241, 0.1)', borderColor: 'rgba(99, 102, 241, 0.3)' }]}>
                        <Text style={[styles.badgeText, { color: '#818cf8' }]}>EXPO SDK 55</Text>
                    </View>
                </View>
            </View>

            {/* Production Live Links */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>PRODUCTION ACCESS</Text>
                <View style={styles.card}>
                    <Pressable 
                        style={styles.linkRow} 
                        onPress={() => openUrl('https://leaderboard-xgi1.onrender.com')}
                    >
                        <View style={styles.linkLeft}>
                            <View style={[styles.iconWrap, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
                                <Ionicons name="globe-outline" size={18} color="#10b981" />
                            </View>
                            <View>
                                <Text style={styles.linkLabel}>Live Web Application</Text>
                                <Text style={styles.linkUrl}>leaderboard-xgi1.onrender.com</Text>
                            </View>
                        </View>
                        <Ionicons name="open-outline" size={18} color="#94a3b8" />
                    </Pressable>

                    <Pressable 
                        style={[styles.linkRow, styles.rowBorder]} 
                        onPress={() => openUrl('https://leaderboard-xgi1.onrender.com/docs')}
                    >
                        <View style={styles.linkLeft}>
                            <View style={[styles.iconWrap, { backgroundColor: 'rgba(99, 102, 241, 0.1)' }]}>
                                <Ionicons name="book-outline" size={18} color="#818cf8" />
                            </View>
                            <View>
                                <Text style={styles.linkLabel}>System Documentation</Text>
                                <Text style={styles.linkUrl}>Architecture, schemas & API guides</Text>
                            </View>
                        </View>
                        <Ionicons name="open-outline" size={18} color="#94a3b8" />
                    </Pressable>
                </View>
            </View>

            {/* Core Architectural Pillars */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>CORE ARCHITECTURE</Text>
                <View style={styles.card}>
                    <View style={styles.featureRow}>
                        <View style={styles.iconWrap}>
                            <Ionicons name="flash-outline" size={18} color="#818cf8" />
                        </View>
                        <View style={styles.featureTextWrap}>
                            <Text style={styles.featureTitle}>Upstash Redis Engine</Text>
                            <Text style={styles.featureDesc}>
                                Sub-10ms composite ranking engine with O(log N) Sorted Sets (ZSets) and real-time Socket.IO room invalidation.
                            </Text>
                        </View>
                    </View>

                    <View style={[styles.featureRow, styles.rowBorder]}>
                        <View style={[styles.iconWrap, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
                            <Ionicons name="shield-checkmark-outline" size={18} color="#10b981" />
                        </View>
                        <View style={styles.featureTextWrap}>
                            <Text style={styles.featureTitle}>OCR Document Verification</Text>
                            <Text style={styles.featureDesc}>
                                Sharp image processing + Tesseract OCR extraction prevents fraudulent submissions and validates university credentials.
                            </Text>
                        </View>
                    </View>

                    <View style={[styles.featureRow, styles.rowBorder]}>
                        <View style={[styles.iconWrap, { backgroundColor: 'rgba(168, 85, 247, 0.1)' }]}>
                            <Ionicons name="phone-portrait-outline" size={18} color="#a855f7" />
                        </View>
                        <View style={styles.featureTextWrap}>
                            <Text style={styles.featureTitle}>Cross-Platform Parity</Text>
                            <Text style={styles.featureDesc}>
                                Built with React Native & Expo EAS for zero-downtime over-the-air updates, offline persistence, and seamless mobile UX.
                            </Text>
                        </View>
                    </View>
                </View>
            </View>

            {/* Developer & Credits */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>DEVELOPER</Text>
                <View style={styles.card}>
                    <Pressable 
                        style={styles.linkRow} 
                        onPress={() => openUrl('https://github.com/PARASMANI-KHUNTE')}
                    >
                        <View style={styles.linkLeft}>
                            <View style={styles.iconWrap}>
                                <Ionicons name="logo-github" size={18} color="#ffffff" />
                            </View>
                            <View>
                                <Text style={styles.linkLabel}>Parasmani Khunte</Text>
                                <Text style={styles.linkUrl}>github.com/PARASMANI-KHUNTE</Text>
                            </View>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color="#475569" />
                    </Pressable>
                </View>
            </View>

            <View style={styles.footer}>
                <Text style={styles.copyright}>&copy; {new Date().getFullYear()} EliteBoards. All rights reserved.</Text>
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
        marginBottom: 24,
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
    brandCard: {
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.02)',
        borderRadius: 24,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.06)',
        padding: 24,
        marginBottom: 24,
    },
    logoImage: {
        width: 64,
        height: 64,
        marginBottom: 12,
    },
    brandTitle: {
        color: '#ffffff',
        fontSize: 24,
        fontWeight: '900',
        letterSpacing: -0.5,
    },
    brandTagline: {
        color: '#818cf8',
        fontSize: 9,
        fontWeight: '900',
        letterSpacing: 2,
        marginTop: 4,
    },
    badgeRow: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 16,
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
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 1,
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
    linkRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
    },
    featureRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        padding: 16,
        gap: 14,
    },
    featureTextWrap: {
        flex: 1,
    },
    featureTitle: {
        color: '#ffffff',
        fontSize: 14,
        fontWeight: '800',
        marginBottom: 4,
    },
    featureDesc: {
        color: '#94a3b8',
        fontSize: 12,
        lineHeight: 18,
    },
    rowBorder: {
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.04)',
    },
    linkLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    iconWrap: {
        width: 36,
        height: 36,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.05)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    linkLabel: {
        color: '#ffffff',
        fontSize: 14,
        fontWeight: '800',
    },
    linkUrl: {
        color: '#64748b',
        fontSize: 11,
        marginTop: 2,
    },
    footer: {
        alignItems: 'center',
        marginTop: 12,
    },
    copyright: {
        color: '#334155',
        fontSize: 11,
        fontWeight: '700',
    },
});
