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

const { width } = Dimensions.get('window');
const DRAWER_WIDTH = Math.min(width * 0.82, 330);

interface SidebarDrawerProps {
    visible: boolean;
    onClose: () => void;
    unreadCount: number;
}

export default function SidebarDrawer({ visible, onClose, unreadCount }: SidebarDrawerProps) {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const pathname = usePathname();
    const { user, logout } = useAuth();

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

                {/* Drawer Container */}
                <View 
                    style={[
                        styles.drawer, 
                        { 
                            width: DRAWER_WIDTH, 
                            paddingTop: insets.top + 16,
                            paddingBottom: insets.bottom + 16 
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
                                <Text style={styles.brandTitle}>EliteBoards</Text>
                                <Text style={styles.brandSub}>NAVIGATION</Text>
                            </View>
                        </View>
                        <Pressable style={styles.closeBtn} onPress={onClose} hitSlop={10}>
                            <Ionicons name="close" size={20} color="#94a3b8" />
                        </Pressable>
                    </View>

                    {/* User Card */}
                    {user ? (
                        <Pressable 
                            style={styles.userCard}
                            onPress={() => navigateTo('/profile')}
                        >
                            {user.picture ? (
                                <Image source={{ uri: user.picture }} style={styles.userAvatar} />
                            ) : (
                                <View style={styles.userAvatarPlaceholder}>
                                    <Text style={styles.userAvatarText}>{user.name?.charAt(0) || '?'}</Text>
                                </View>
                            )}
                            <View style={styles.userInfo}>
                                <Text style={styles.userName} numberOfLines={1}>{user.name}</Text>
                                <Text style={styles.userEmail} numberOfLines={1}>{user.email}</Text>
                                <View style={styles.roleBadge}>
                                    <Text style={[styles.roleText, { color: user.isAdmin ? '#a855f7' : '#818cf8' }]}>
                                        {user.isAdmin ? 'ADMINISTRATOR' : 'COMPETITOR'}
                                    </Text>
                                </View>
                            </View>
                            <Ionicons name="chevron-forward" size={16} color="#475569" />
                        </Pressable>
                    ) : (
                        <View style={styles.guestCard}>
                            <View style={styles.guestLeft}>
                                <View style={styles.guestAvatar}>
                                    <Ionicons name="person-outline" size={20} color="#94a3b8" />
                                </View>
                                <View>
                                    <Text style={styles.guestTitle}>Guest Student</Text>
                                    <Text style={styles.guestSub}>Sign in to save rankings</Text>
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
                            <Text style={styles.sectionHeader}>EXPLORE</Text>
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
                                    color={isCurrent('/') ? "#818cf8" : "#94a3b8"} 
                                />
                            </View>
                            <View style={styles.navLabelWrap}>
                                <Text style={[styles.navLabel, isCurrent('/') && styles.navLabelActive]}>Home</Text>
                                <Text style={styles.navSub}>Leaderboards & Rankings</Text>
                            </View>
                        </Pressable>

                        {/* Profile */}
                        <Pressable 
                            style={[styles.navItem, isCurrent('/profile') && styles.navItemActive]}
                            onPress={() => navigateTo('/profile')}
                        >
                            <View style={[styles.navIconWrap, isCurrent('/profile') && styles.navIconActive]}>
                                <Ionicons 
                                    name={isCurrent('/profile') ? "person" : "person-outline"} 
                                    size={18} 
                                    color={isCurrent('/profile') ? "#818cf8" : "#94a3b8"} 
                                />
                            </View>
                            <View style={styles.navLabelWrap}>
                                <Text style={[styles.navLabel, isCurrent('/profile') && styles.navLabelActive]}>Profile</Text>
                                <Text style={styles.navSub}>Name, delete, manage boards</Text>
                            </View>
                        </Pressable>

                        {/* Settings */}
                        <Pressable 
                            style={[styles.navItem, isCurrent('/settings') && styles.navItemActive]}
                            onPress={() => navigateTo('/settings')}
                        >
                            <View style={[styles.navIconWrap, isCurrent('/settings') && styles.navIconActive]}>
                                <Ionicons 
                                    name={isCurrent('/settings') ? "settings" : "settings-outline"} 
                                    size={18} 
                                    color={isCurrent('/settings') ? "#818cf8" : "#94a3b8"} 
                                />
                            </View>
                            <View style={styles.navLabelWrap}>
                                <Text style={[styles.navLabel, isCurrent('/settings') && styles.navLabelActive]}>Settings</Text>
                                <Text style={styles.navSub}>Device theme, notification settings</Text>
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
                                    color={isCurrent('/about') ? "#818cf8" : "#94a3b8"} 
                                />
                            </View>
                            <View style={styles.navLabelWrap}>
                                <Text style={[styles.navLabel, isCurrent('/about') && styles.navLabelActive]}>About</Text>
                                <Text style={styles.navSub}>Version, documentation, live link</Text>
                            </View>
                        </Pressable>

                        <View style={styles.sectionDivider}>
                            <Text style={styles.sectionHeader}>ACTIVITY</Text>
                        </View>

                        {/* Notifications */}
                        <Pressable 
                            style={[styles.navItem, isCurrent('/notifications') && styles.navItemActive]}
                            onPress={() => navigateTo('/notifications')}
                        >
                            <View style={[styles.navIconWrap, isCurrent('/notifications') && styles.navIconActive]}>
                                <Ionicons 
                                    name={isCurrent('/notifications') ? "notifications" : "notifications-outline"} 
                                    size={18} 
                                    color={isCurrent('/notifications') ? "#818cf8" : "#94a3b8"} 
                                />
                            </View>
                            <View style={styles.navLabelWrap}>
                                <Text style={[styles.navLabel, isCurrent('/notifications') && styles.navLabelActive]}>Notifications</Text>
                                <Text style={styles.navSub}>Alerts & reactions</Text>
                            </View>
                            {unreadCount > 0 && (
                                <View style={styles.unreadBadge}>
                                    <Text style={styles.unreadBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                                </View>
                            )}
                        </Pressable>

                        {/* Feedback */}
                        <Pressable 
                            style={[styles.navItem, isCurrent('/feedback') && styles.navItemActive]}
                            onPress={() => navigateTo('/feedback')}
                        >
                            <View style={[styles.navIconWrap, isCurrent('/feedback') && styles.navIconActive]}>
                                <Ionicons 
                                    name={isCurrent('/feedback') ? "chatbubble-ellipses" : "chatbubble-ellipses-outline"} 
                                    size={18} 
                                    color={isCurrent('/feedback') ? "#818cf8" : "#94a3b8"} 
                                />
                            </View>
                            <View style={styles.navLabelWrap}>
                                <Text style={[styles.navLabel, isCurrent('/feedback') && styles.navLabelActive]}>Feedback</Text>
                                <Text style={styles.navSub}>Send bug report & requests</Text>
                            </View>
                        </Pressable>

                        {/* Admin */}
                        {user?.isAdmin && (
                            <Pressable 
                                style={[styles.navItem, isCurrent('/admin') && styles.navItemActive]}
                                onPress={() => navigateTo('/admin')}
                            >
                                <View style={[styles.navIconWrap, { backgroundColor: 'rgba(168, 85, 247, 0.1)' }]}>
                                    <Ionicons name="shield-checkmark" size={18} color="#a855f7" />
                                </View>
                                <View style={styles.navLabelWrap}>
                                    <Text style={[styles.navLabel, { color: '#c084fc' }]}>Admin Console</Text>
                                    <Text style={styles.navSub}>Moderation & audits</Text>
                                </View>
                            </Pressable>
                        )}
                    </ScrollView>

                    {/* Bottom Actions */}
                    <View style={styles.footer}>
                        <Pressable 
                            style={styles.webBtn}
                            onPress={async () => {
                                onClose();
                                await WebBrowser.openBrowserAsync('https://leaderboard-xgi1.onrender.com');
                            }}
                        >
                            <Ionicons name="globe-outline" size={16} color="#818cf8" />
                            <Text style={styles.webBtnText}>Open Web Platform</Text>
                        </Pressable>

                        {user && (
                            <Pressable style={styles.signOutBtn} onPress={handleSignOut}>
                                <Ionicons name="log-out-outline" size={16} color="#f87171" />
                                <Text style={styles.signOutText}>Sign Out</Text>
                            </Pressable>
                        )}

                        <Text style={styles.versionText}>EliteBoards v1.1.0 • OTA Active</Text>
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
        backgroundColor: '#0a0f1d',
        height: '100%',
        borderRightWidth: 1,
        borderRightColor: 'rgba(255,255,255,0.08)',
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
        marginBottom: 16,
        paddingHorizontal: 4,
    },
    brandRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    logo: {
        width: 32,
        height: 32,
    },
    brandTitle: {
        color: '#ffffff',
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
        width: 32,
        height: 32,
        borderRadius: 10,
        backgroundColor: 'rgba(255,255,255,0.05)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    userCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.03)',
        padding: 12,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.06)',
        marginBottom: 14,
    },
    userAvatar: {
        width: 40,
        height: 40,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    userAvatarPlaceholder: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.08)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    userAvatarText: {
        color: '#94a3b8',
        fontSize: 18,
        fontWeight: '900',
    },
    userInfo: {
        flex: 1,
        marginLeft: 10,
    },
    userName: {
        color: '#ffffff',
        fontSize: 13,
        fontWeight: '800',
    },
    userEmail: {
        color: '#64748b',
        fontSize: 10,
        marginTop: 1,
    },
    roleBadge: {
        marginTop: 3,
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
        backgroundColor: 'rgba(255,255,255,0.03)',
        padding: 12,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.06)',
        marginBottom: 14,
    },
    guestLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    guestAvatar: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: 'rgba(255,255,255,0.05)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    guestTitle: {
        color: '#ffffff',
        fontSize: 13,
        fontWeight: '800',
    },
    guestSub: {
        color: '#64748b',
        fontSize: 10,
        marginTop: 1,
    },
    guestLoginBtn: {
        backgroundColor: '#4f46e5',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 10,
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
        marginTop: 10,
        marginBottom: 6,
        paddingHorizontal: 6,
    },
    sectionHeader: {
        color: '#475569',
        fontSize: 8,
        fontWeight: '900',
        letterSpacing: 2,
    },
    navItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 10,
        borderRadius: 14,
        marginBottom: 4,
    },
    navItemActive: {
        backgroundColor: 'rgba(99, 102, 241, 0.12)',
        borderWidth: 1,
        borderColor: 'rgba(99, 102, 241, 0.25)',
    },
    navIconWrap: {
        width: 32,
        height: 32,
        borderRadius: 10,
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
        color: '#cbd5e1',
        fontSize: 13,
        fontWeight: '800',
    },
    navLabelActive: {
        color: '#ffffff',
    },
    navSub: {
        color: '#64748b',
        fontSize: 10,
        marginTop: 1,
    },
    unreadBadge: {
        backgroundColor: '#6366f1',
        minWidth: 18,
        height: 18,
        borderRadius: 9,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 4,
    },
    unreadBadgeText: {
        color: '#ffffff',
        fontSize: 9,
        fontWeight: '900',
    },
    footer: {
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.06)',
        paddingTop: 12,
        gap: 8,
    },
    webBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: 'rgba(255,255,255,0.03)',
        paddingVertical: 10,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.06)',
    },
    webBtnText: {
        color: '#818cf8',
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    signOutBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 8,
    },
    signOutText: {
        color: '#f87171',
        fontSize: 11,
        fontWeight: '800',
    },
    versionText: {
        color: '#334155',
        fontSize: 9,
        fontWeight: '800',
        textAlign: 'center',
        letterSpacing: 0.5,
    },
});
