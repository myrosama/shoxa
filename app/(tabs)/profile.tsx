import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    Alert,
    Image,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const COLORS = {
    background: '#FDF6E3',
    primary: '#C67C43',
    primaryLight: '#F5D6BA',
    dark: '#333333',
    gray: '#888888',
    lightGray: '#E0E0E0',
    white: '#FFFFFF',
    red: '#E53935',
    green: '#43A047',
};

// Menu item type
interface MenuItem {
    icon: keyof typeof Ionicons.glyphMap;
    title: string;
    subtitle?: string;
    onPress: () => void;
    rightElement?: React.ReactNode;
    danger?: boolean;
}

export default function ProfileScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [notificationsEnabled, setNotificationsEnabled] = useState(true);

    // Saved addresses (will be moved to context later)
    const savedAddresses = [
        { id: '1', name: 'Home', address: 'Binafsha ko\'chasi, 11', icon: 'home' as const },
        { id: '2', name: 'Work', address: 'IT-Park, Tinchlik Street', icon: 'briefcase' as const },
    ];

    const handleLogin = () => {
        router.push('/auth/login');
    };

    const handleLogout = () => {
        Alert.alert(
            'Sign Out',
            'Are you sure you want to sign out?',
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Sign Out', style: 'destructive', onPress: () => setIsLoggedIn(false) },
            ]
        );
    };

    const renderMenuItem = (item: MenuItem) => (
        <TouchableOpacity
            key={item.title}
            style={[styles.menuItem, item.danger && styles.menuItemDanger]}
            onPress={item.onPress}
        >
            <View style={[styles.menuIcon, item.danger && styles.menuIconDanger]}>
                <Ionicons name={item.icon} size={22} color={item.danger ? COLORS.red : COLORS.primary} />
            </View>
            <View style={styles.menuContent}>
                <Text style={[styles.menuTitle, item.danger && styles.menuTitleDanger]}>{item.title}</Text>
                {item.subtitle && <Text style={styles.menuSubtitle}>{item.subtitle}</Text>}
            </View>
            {item.rightElement || (
                <Ionicons name="chevron-forward" size={20} color={COLORS.gray} />
            )}
        </TouchableOpacity>
    );

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Profile</Text>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                {/* Profile Card */}
                <View style={styles.profileCard}>
                    <View style={styles.avatarContainer}>
                        {isLoggedIn ? (
                            <Image
                                source={{ uri: 'https://i.pravatar.cc/150?img=12' }}
                                style={styles.avatar}
                            />
                        ) : (
                            <View style={styles.avatarPlaceholder}>
                                <Ionicons name="person" size={40} color={COLORS.primary} />
                            </View>
                        )}
                    </View>
                    <View style={styles.profileInfo}>
                        <Text style={styles.profileName}>
                            {isLoggedIn ? 'John Doe' : 'Guest'}
                        </Text>
                        <Text style={styles.profileSubtitle}>
                            {isLoggedIn ? '+998 90 123 45 67' : 'Sign in to manage orders'}
                        </Text>
                    </View>
                    {!isLoggedIn && (
                        <TouchableOpacity style={styles.signInBtn} onPress={handleLogin}>
                            <Text style={styles.signInBtnText}>Sign In</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* Saved Addresses */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Saved Addresses</Text>
                        <TouchableOpacity onPress={() => router.push('/onboarding/location')}>
                            <Text style={styles.sectionAction}>Add New</Text>
                        </TouchableOpacity>
                    </View>
                    <View style={styles.addressList}>
                        {savedAddresses.map((addr) => (
                            <TouchableOpacity key={addr.id} style={styles.addressItem}>
                                <View style={styles.addressIcon}>
                                    <Ionicons name={addr.icon} size={20} color={COLORS.primary} />
                                </View>
                                <View style={styles.addressContent}>
                                    <Text style={styles.addressName}>{addr.name}</Text>
                                    <Text style={styles.addressText} numberOfLines={1}>{addr.address}</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={18} color={COLORS.gray} />
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Account Section (only if logged in) */}
                {isLoggedIn && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Account</Text>
                        <View style={styles.menuCard}>
                            {renderMenuItem({
                                icon: 'receipt-outline',
                                title: 'Order History',
                                subtitle: 'View your past orders',
                                onPress: () => Alert.alert('Coming Soon', 'Order history will be available soon!'),
                            })}
                            {renderMenuItem({
                                icon: 'card-outline',
                                title: 'Payment Methods',
                                subtitle: 'Manage cards and wallets',
                                onPress: () => Alert.alert('Coming Soon', 'Payment methods will be available soon!'),
                            })}
                            {renderMenuItem({
                                icon: 'heart-outline',
                                title: 'Favorites',
                                subtitle: 'Saved shops and products',
                                onPress: () => Alert.alert('Coming Soon', 'Favorites will be available soon!'),
                            })}
                        </View>
                    </View>
                )}

                {/* Settings Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Settings</Text>
                    <View style={styles.menuCard}>
                        {renderMenuItem({
                            icon: 'language-outline',
                            title: 'Language',
                            subtitle: 'English',
                            onPress: () => Alert.alert('Coming Soon', 'Language settings will be available soon!'),
                        })}
                        {renderMenuItem({
                            icon: 'notifications-outline',
                            title: 'Notifications',
                            onPress: () => { },
                            rightElement: (
                                <Switch
                                    value={notificationsEnabled}
                                    onValueChange={setNotificationsEnabled}
                                    trackColor={{ false: COLORS.lightGray, true: COLORS.primaryLight }}
                                    thumbColor={notificationsEnabled ? COLORS.primary : COLORS.gray}
                                />
                            ),
                        })}
                        {renderMenuItem({
                            icon: 'moon-outline',
                            title: 'Dark Mode',
                            subtitle: 'Coming Soon',
                            onPress: () => Alert.alert('Coming Soon', 'Dark mode will be available soon!'),
                        })}
                    </View>
                </View>

                {/* Help & Support */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Help & Support</Text>
                    <View style={styles.menuCard}>
                        {renderMenuItem({
                            icon: 'help-circle-outline',
                            title: 'FAQ',
                            onPress: () => Alert.alert('Coming Soon', 'FAQ will be available soon!'),
                        })}
                        {renderMenuItem({
                            icon: 'chatbubble-outline',
                            title: 'Contact Support',
                            onPress: () => Alert.alert('Coming Soon', 'Contact support will be available soon!'),
                        })}
                        {renderMenuItem({
                            icon: 'document-text-outline',
                            title: 'Terms & Privacy',
                            onPress: () => Alert.alert('Coming Soon', 'Terms will be available soon!'),
                        })}
                    </View>
                </View>

                {/* Sign Out (only if logged in) */}
                {isLoggedIn && (
                    <View style={styles.section}>
                        <View style={styles.menuCard}>
                            {renderMenuItem({
                                icon: 'log-out-outline',
                                title: 'Sign Out',
                                onPress: handleLogout,
                                danger: true,
                            })}
                        </View>
                    </View>
                )}

                {/* App Version */}
                <View style={styles.versionContainer}>
                    <Text style={styles.versionText}>SHOXA v1.0.0</Text>
                    <Text style={styles.copyrightText}>© 2024 SHOXA. All rights reserved.</Text>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    header: {
        paddingHorizontal: 20,
        paddingVertical: 15,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: COLORS.dark,
    },
    scrollContent: {
        paddingBottom: 100,
    },
    profileCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.white,
        marginHorizontal: 20,
        borderRadius: 16,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    avatarContainer: {
        marginRight: 15,
    },
    avatar: {
        width: 60,
        height: 60,
        borderRadius: 30,
        borderWidth: 2,
        borderColor: COLORS.primary,
    },
    avatarPlaceholder: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: COLORS.primaryLight,
        justifyContent: 'center',
        alignItems: 'center',
    },
    profileInfo: {
        flex: 1,
    },
    profileName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.dark,
    },
    profileSubtitle: {
        fontSize: 13,
        color: COLORS.gray,
        marginTop: 2,
    },
    signInBtn: {
        backgroundColor: COLORS.primary,
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 20,
    },
    signInBtnText: {
        color: COLORS.white,
        fontWeight: '600',
        fontSize: 14,
    },
    section: {
        marginTop: 25,
        paddingHorizontal: 20,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.dark,
        marginBottom: 12,
    },
    sectionAction: {
        fontSize: 14,
        color: COLORS.primary,
        fontWeight: '600',
    },
    addressList: {
        backgroundColor: COLORS.white,
        borderRadius: 16,
        overflow: 'hidden',
    },
    addressItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.lightGray,
    },
    addressIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: COLORS.primaryLight,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    addressContent: {
        flex: 1,
    },
    addressName: {
        fontSize: 15,
        fontWeight: '600',
        color: COLORS.dark,
    },
    addressText: {
        fontSize: 13,
        color: COLORS.gray,
        marginTop: 2,
    },
    menuCard: {
        backgroundColor: COLORS.white,
        borderRadius: 16,
        overflow: 'hidden',
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.lightGray,
    },
    menuItemDanger: {
        borderBottomWidth: 0,
    },
    menuIcon: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: COLORS.primaryLight,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    menuIconDanger: {
        backgroundColor: '#FFEBEE',
    },
    menuContent: {
        flex: 1,
    },
    menuTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: COLORS.dark,
    },
    menuTitleDanger: {
        color: COLORS.red,
    },
    menuSubtitle: {
        fontSize: 13,
        color: COLORS.gray,
        marginTop: 2,
    },
    versionContainer: {
        alignItems: 'center',
        marginTop: 30,
        marginBottom: 20,
    },
    versionText: {
        fontSize: 14,
        color: COLORS.gray,
        fontWeight: '500',
    },
    copyrightText: {
        fontSize: 12,
        color: COLORS.lightGray,
        marginTop: 4,
    },
});