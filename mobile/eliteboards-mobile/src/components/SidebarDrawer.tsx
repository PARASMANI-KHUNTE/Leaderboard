import React from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    Pressable, 
    Modal, 
    Image, 
    Dimensions, 
    ScrollView 
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../providers/AuthProvider';
import * as WebBrowser from 'expo-web-browser';
import { useTheme } from '../theme/ThemeContext';

const { width } = Dimensions.get('window');
const DRAWER_WIDTH = Math.min(width * 0.82, 320);

interface SidebarDrawerProps {
    visible: boolean;
    onClose: () => void;
    unreadCount?: number;
}

export default function SidebarDrawer({ visible, onClose }: SidebarDrawerProps) {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const pathname = usePathname();
    const { user, logout } = useAuth();
    const { colors, isDark } = useTheme();

    const navigateTo = (path: string) => {
        onClose();
        if (path === '/') {
            router.replace('/');
        } else {
            router.push(path as any);
        }
    };

    const handleSignOut = async () => {
        onClose();
        await logout();
        router.replace('/login');
    };

    const isCurrent = (path: string) => {
        if (path === '/' && (pathname === '/' || pathname === '')) return true;
        return pathname === path;
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                {/* Backdrop touch area */}
                <Pressable style={styles.backdrop} onPress={onClose} />

                {/* Drawer Container - covers 100% height without blank spaces */}
                <View 
                    style={[
                        styles.drawer, 
                        { 
                            width: DRAWER_WIDTH, 
                            backgroundColor: colors.surface,
                            borderRightColor: colors.border,
                            paddingTop: insets.top + 10,
                            paddingBottom: Math.max(insets.bottom, 12),
                        }
                    ]}
                >
                    {/* Header */}
                    <View style={styles.header}>
                        <View style={styles.brandRow}>
                            <Image 
                                source={require('../../assets/logo.png')} 
                                style={styles.logo} 
                                resizeMode="contain" 
                            />
                            <View>
                                <Text style={[styles.brandTitle, { color: colors.text }]}>EliteBoards</Text>
                                <Text style={styles.brandSub}>NAVIGATION</Text>
                            </View>
                        </View>
                        <Pressable 
                            style={[styles.closeBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]} 
                            onPress={onClose} 
                            hitSlop={10}
                        >
                            <Ionicons name="close" size={20} color={colors.textSecondary} />
                        </Pressable>
                    </View>

                    {/* Informative Identity Card (Issue 7: Single canonical way to access profile is nav item below) */}
                    {user ? (
                        <View 
                            style={[
                                styles.userCard, 
                                { 
                                    backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                                    borderColor: colors.border,
                                }
                            ]}
                        >
                            {user.picture ? (
                                <Image source={{ uri: user.picture }} style={styles.userAvatar} />
                            ) : (
                                <View style={[styles.userAvatarPlaceholder, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
                                    <Text style={[styles.userAvatarText, { color: colors.textSecondary }]}>{user.name?.charAt(0) || '?'}</Text>
                                </View>
                            )}
                            <View style={styles.userInfo}>
                                <Text style={[styles.userName, { color: colors.text }]} numberOfLines={1}>{user.name}</Text>
                                <Text style={[styles.userEmail, { color: colors.textSecondary }]} numberOfLines={1}>{user.email}</Text>
                                <View style={styles.roleBadge}>
                                    <Text style={[styles.roleText, { color: user.isAdmin ? '#c084fc' : colors.primaryLight }]}>
                                        {user.isAdmin ? 'ADMINISTRATOR' : 'COMPETITOR'}
                                    </Text>
                                </View>
                            </View>
                        </View>
                    ) : (
                        <View 
                            style={[
                                styles.guestCard,
                                {
                                    backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                                    borderColor: colors.border,
                                }
                            ]}
                        >
                            <View style={styles.guestLeft}>
                                <View style={[styles.guestAvatar, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
                                    <Ionicons name="person-outline" size={18} color={colors.textSecondary} />
                                </View>
                                <View>
                                    <Text style={[styles.guestTitle, { color: colors.text }]}>Guest Student</Text>
                                    <Text style={[styles.guestSub, { color: colors.textSecondary }]}>Sign in to save rankings</Text>
                                </View>
                            </View>
                            <Pressable 
                                style={styles.guestLoginBtn}
                                onPress={() => navigateTo('/login')}
                            >
                                <Text style={styles.guestLoginText}>Login</Text>
                            </Pressable>
                        </View>
                    )}

                    {/* Nav Items List */}
                    <ScrollView style={styles.navScroll} showsVerticalScrollIndicator={false}>
                        <View style={styles.sectionDivider}>
                            <Text style={[styles.sectionHeader, { color: colors.textMuted }]}>EXPLORE</Text>
                        </View>

                        {/* Home */}
                        <Pressable 
                            style={[styles.navItem, isCurrent('/') && styles.navItemActive]}
                            onPress={() => navigateTo('/')}
                        >
                            <View style={[styles.navIconWrap, isCurrent('/') && styles.navIconActive]}>
                                <Ionicons 
                                    name={isCurrent('/') ? "home" : "home-outline"} 
                                    size={18} 
                                    color={isCurrent('/') ? colors.primaryLight : colors.textSecondary} 
                                />
                            </View>
                            <View style={styles.navLabelWrap}>
                                <Text style={[styles.navLabel, { color: isCurrent('/') ? colors.text : colors.textSecondary }, isCurrent('/') && styles.navLabelActive]}>Home</Text>
                                <Text style={[styles.navSub, { color: colors.textMuted }]}>Leaderboards & Rankings</Text>
                            </View>
                        </Pressable>

                        {/* Profile - The single place to navigate to profile */}
                        {user && (
                            <Pressable 
                                style={[styles.navItem, isCurrent('/profile') && styles.navItemActive]}
                                onPress={() => navigateTo('/profile')}
                            >
                                <View style={[styles.navIconWrap, isCurrent('/profile') && styles.navIconActive]}>
                                    <Ionicons 
                                        name={isCurrent('/profile') ? "person" : "person-outline"} 
                                        size={18} 
                                        color={isCurrent('/profile') ? colors.primaryLight : colors.textSecondary} 
                                    />
                                </View>
                                <View style={styles.navLabelWrap}>
                                    <Text style={[styles.navLabel, { color: isCurrent('/profile') ? colors.text : colors.textSecondary }, isCurrent('/profile') && styles.navLabelActive]}>Profile</Text>
                                    <Text style={[styles.navSub, { color: colors.textMuted }]}>Name update, delete, manage boards</Text>
                                </View>
                            </Pressable>
                        )}

                        {/* Settings */}
                        <Pressable 
                            style={[styles.navItem, isCurrent('/settings') && styles.navItemActive]}
                            onPress={() => navigateTo('/settings')}
                        >
                            <View style={[styles.navIconWrap, isCurrent('/settings') && styles.navIconActive]}>
                                <Ionicons 
                                    name={isCurrent('/settings') ? "settings" : "settings-outline"} 
                                    size={18} 
                                    color={isCurrent('/settings') ? colors.primaryLight : colors.textSecondary} 
                                />
                            </View>
                            <View style={styles.navLabelWrap}>
                                <Text style={[styles.navLabel, { color: isCurrent('/settings') ? colors.text : colors.textSecondary }, isCurrent('/settings') && styles.navLabelActive]}>Settings</Text>
                                <Text style={[styles.navSub, { color: colors.textMuted }]}>Device theme, notification settings</Text>
                            </View>
                        </Pressable>

                        {/* About */}
                        <Pressable 
                            style={[styles.navItem, isCurrent('/about') && styles.navItemActive]}
                            onPress={() => navigateTo('/about')}
                        >
                            <View style={[styles.navIconWrap, isCurrent('/about') && styles.navIconActive]}>
                                <Ionicons 
                                    name={isCurrent('/about') ? "information-circle" : "information-circle-outline"} 
                                    size={18} 
                                    color={isCurrent('/about') ? colors.primaryLight : colors.textSecondary} 
                                />
                            </View>
                            <View style={styles.navLabelWrap}>
                                <Text style={[styles.navLabel, { color: isCurrent('/about') ? colors.text : colors.textSecondary }, isCurrent('/about') && styles.navLabelActive]}>About</Text>
                                <Text style={[styles.navSub, { color: colors.textMuted }]}>Version, documentation & overview</Text>
                            </View>
                        </Pressable>

                        <View style={styles.sectionDivider}>
                            <Text style={[styles.sectionHeader, { color: colors.textMuted }]}>COMMUNITY & SYSTEM</Text>
                        </View>

                        {/* Feedback */}
                        <Pressable 
                            style={[styles.navItem, isCurrent('/feedback') && styles.navItemActive]}
                            onPress={() => navigateTo('/feedback')}
                        >
                            <View style={[styles.navIconWrap, isCurrent('/feedback') && styles.navIconActive]}>
                                <Ionicons 
                                    name={isCurrent('/feedback') ? "chatbubble-ellipses" : "chatbubble-ellipses-outline"} 
                                    size={18} 
                                    color={isCurrent('/feedback') ? colors.primaryLight : colors.textSecondary} 
                                />
                            </View>
                            <View style={styles.navLabelWrap}>
                                <Text style={[styles.navLabel, { color: isCurrent('/feedback') ? colors.text : colors.textSecondary }, isCurrent('/feedback') && styles.navLabelActive]}>Feedback</Text>
                                <Text style={[styles.navSub, { color: colors.textMuted }]}>Send bug report & feature requests</Text>
                            </View>
                        </Pressable>

                        {/* Admin Console (Admin Only) */}
                        {user?.isAdmin && (
                            <Pressable 
                                style={[styles.navItem, isCurrent('/admin') && styles.navItemActive]}
                                onPress={() => navigateTo('/admin')}
                            >
                                <View style={[styles.navIconWrap, { backgroundColor: 'rgba(168, 85, 247, 0.12)' }]}>
                                    <Ionicons name="shield-checkmark" size={18} color="#a855f7" />
                                </View>
                                <View style={styles.navLabelWrap}>
                                    <Text style={[styles.navLabel, { color: '#c084fc' }]}>Admin Console</Text>
                                    <Text style={[styles.navSub, { color: colors.textMuted }]}>Moderation & audits</Text>
                                </View>
                            </Pressable>
                        )}
                    </ScrollView>

                    {/* Bottom Actions */}
                    <View style={[styles.footer, { borderTopColor: colors.border }]}>
                        <Pressable 
                            style={[styles.webBtn, { borderColor: colors.border, backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)' }]}
                            onPress={async () => {
                                onClose();
                                await WebBrowser.openBrowserAsync('https://leaderboard-xgi1.onrender.com');
                            }}
                        >
                            <Ionicons name="globe-outline" size={15} color={colors.primaryLight} />
                            <Text style={[styles.webBtnText, { color: colors.primaryLight }]}>Open Web Platform</Text>
                        </Pressable>

                        {user && (
                            <Pressable style={styles.signOutBtn} onPress={handleSignOut}>
                                <Ionicons name="log-out-outline" size={15} color={colors.danger} />
                                <Text style={[styles.signOutText, { color: colors.danger }]}>Sign Out</Text>
                            </Pressable>
                        )}

                        <Text style={[styles.versionText, { color: colors.textMuted }]}>EliteBoards v1.1.0 • OTA Active</Text>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(2, 6, 23, 0.75)',
        flexDirection: 'row',
    },
    backdrop: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
    },
    drawer: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 0,
        borderRightWidth: 1,
        paddingHorizontal: 16,
        justifyContent: 'space-between',
        shadowColor: '#000',
        shadowOffset: { width: 4, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 16,
        elevation: 20,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
        paddingHorizontal: 2,
    },
    brandRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    logo: {
        width: 30,
        height: 30,
    },
    brandTitle: {
        fontSize: 16,
        fontWeight: '900',
        letterSpacing: -0.5,
    },
    brandSub: {
        color: 'rgba(99, 102, 241, 0.6)',
        fontSize: 7,
        fontWeight: '800',
        letterSpacing: 2,
    },
    closeBtn: {
        width: 30,
        height: 30,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    userCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        borderRadius: 14,
        borderWidth: 1,
        marginBottom: 10,
    },
    userAvatar: {
        width: 36,
        height: 36,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    userAvatarPlaceholder: {
        width: 36,
        height: 36,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    userAvatarText: {
        fontSize: 16,
        fontWeight: '900',
    },
    userInfo: {
        flex: 1,
        marginLeft: 10,
    },
    userName: {
        fontSize: 13,
        fontWeight: '800',
    },
    userEmail: {
        fontSize: 10,
        marginTop: 1,
    },
    roleBadge: {
        marginTop: 2,
    },
    roleText: {
        fontSize: 8,
        fontWeight: '900',
        letterSpacing: 1,
    },
    guestCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 10,
        borderRadius: 14,
        borderWidth: 1,
        marginBottom: 10,
    },
    guestLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    guestAvatar: {
        width: 32,
        height: 32,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    guestTitle: {
        fontSize: 12,
        fontWeight: '800',
    },
    guestSub: {
        fontSize: 9,
    },
    guestLoginBtn: {
        backgroundColor: '#4f46e5',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    guestLoginText: {
        color: '#ffffff',
        fontSize: 11,
        fontWeight: '800',
    },
    navScroll: {
        flex: 1,
    },
    sectionDivider: {
        marginTop: 6,
        marginBottom: 4,
        paddingHorizontal: 6,
    },
    sectionHeader: {
        fontSize: 8,
        fontWeight: '900',
        letterSpacing: 2,
    },
    navItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 9,
        paddingHorizontal: 10,
        borderRadius: 12,
        marginBottom: 3,
    },
    navItemActive: {
        backgroundColor: 'rgba(99, 102, 241, 0.12)',
        borderWidth: 1,
        borderColor: 'rgba(99, 102, 241, 0.25)',
    },
    navIconWrap: {
        width: 30,
        height: 30,
        borderRadius: 8,
        backgroundColor: 'rgba(255,255,255,0.03)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    navIconActive: {
        backgroundColor: 'rgba(99, 102, 241, 0.2)',
    },
    navLabelWrap: {
        flex: 1,
        marginLeft: 10,
    },
    navLabel: {
        fontSize: 13,
        fontWeight: '800',
    },
    navLabelActive: {
        fontWeight: '900',
    },
    navSub: {
        fontSize: 9,
        marginTop: 1,
    },
    footer: {
        borderTopWidth: 1,
        paddingTop: 10,
        gap: 6,
    },
    webBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 9,
        borderRadius: 10,
        borderWidth: 1,
    },
    webBtnText: {
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    signOutBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 6,
    },
    signOutText: {
        fontSize: 11,
        fontWeight: '800',
    },
    versionText: {
        fontSize: 8,
        fontWeight: '800',
        textAlign: 'center',
        letterSpacing: 0.5,
    },
});
