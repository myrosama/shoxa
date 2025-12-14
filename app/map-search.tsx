import { getTelegramImageUrl } from '@/configs/AppConfig';
import { db } from '@/configs/FirebaseConfig';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { collection, getDocs, query } from 'firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
import {
    Animated,
    Image,
    Keyboard,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
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
    lightGray: '#E8E4DF',
    white: '#FFFFFF',
    cream: '#FFF8F0',
};

interface Shop {
    id: string;
    name: string;
    type: string;
    logoUrl?: string;
}

export default function MapSearchScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const inputRef = useRef<TextInput>(null);

    const [searchQuery, setSearchQuery] = useState('');
    const [shops, setShops] = useState<Shop[]>([]);
    const [searchResults, setSearchResults] = useState<Shop[]>([]);

    // Animations
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(30)).current;

    useEffect(() => {
        // Focus input
        setTimeout(() => inputRef.current?.focus(), 300);

        // Animate in
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
            Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, friction: 8 }),
        ]).start();

        loadShops();
    }, []);

    const loadShops = async () => {
        try {
            const q = query(collection(db, 'shops'));
            const snapshot = await getDocs(q);
            const shopData: Shop[] = [];

            for (const docSnap of snapshot.docs) {
                const data = docSnap.data();
                let logoUrl = null;
                if (data.logoFileId) {
                    logoUrl = await getTelegramImageUrl(data.logoFileId);
                }
                shopData.push({
                    id: docSnap.id,
                    name: data.name || 'Unnamed Shop',
                    type: data.type || 'shop',
                    logoUrl,
                });
            }

            setShops(shopData);
        } catch (error) {
            console.error('Error loading shops:', error);
        }
    };

    const handleSearch = (text: string) => {
        setSearchQuery(text);
        if (text.length > 0) {
            const filtered = shops.filter(s =>
                s.name.toLowerCase().includes(text.toLowerCase())
            );
            setSearchResults(filtered);
        } else {
            setSearchResults([]);
        }
    };

    const handleBack = () => {
        Keyboard.dismiss();
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
            Animated.timing(slideAnim, { toValue: 30, duration: 150, useNativeDriver: true }),
        ]).start(() => router.back());
    };

    const handleSelectShop = (shop: Shop) => {
        Keyboard.dismiss();
        // Navigate to shop page
        router.replace(`/shop/${shop.id}`);
    };

    // Categories for quick browse
    const categories = [
        { id: 'restaurant', label: 'Restaurants', icon: 'restaurant' },
        { id: 'pharmacy', label: 'Pharmacy', icon: 'medkit' },
        { id: 'grocery', label: 'Grocery', icon: 'cart' },
        { id: 'cafe', label: 'Cafes', icon: 'cafe' },
    ];

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* Header */}
            <Animated.View
                style={[styles.header, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
            >
                <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
                    <Ionicons name="arrow-back" size={24} color={COLORS.primary} />
                </TouchableOpacity>

                <View style={styles.searchWrap}>
                    <Ionicons name="search" size={18} color={COLORS.gray} />
                    <TextInput
                        ref={inputRef}
                        style={styles.searchInput}
                        placeholder="Search shops & products..."
                        placeholderTextColor={COLORS.gray}
                        value={searchQuery}
                        onChangeText={handleSearch}
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => handleSearch('')}>
                            <Ionicons name="close-circle" size={20} color={COLORS.gray} />
                        </TouchableOpacity>
                    )}
                </View>
            </Animated.View>

            <ScrollView
                style={styles.content}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                {/* Search Results */}
                {searchQuery.length > 0 ? (
                    <Animated.View style={{ opacity: fadeAnim }}>
                        {searchResults.length > 0 ? (
                            searchResults.map((shop) => (
                                <TouchableOpacity
                                    key={shop.id}
                                    style={styles.resultItem}
                                    onPress={() => handleSelectShop(shop)}
                                >
                                    <View style={styles.resultLogo}>
                                        {shop.logoUrl ? (
                                            <Image source={{ uri: shop.logoUrl }} style={styles.resultLogoImg} />
                                        ) : (
                                            <Ionicons name="storefront" size={20} color={COLORS.primary} />
                                        )}
                                    </View>
                                    <View style={styles.resultInfo}>
                                        <Text style={styles.resultName}>{shop.name}</Text>
                                        <Text style={styles.resultType}>{shop.type}</Text>
                                    </View>
                                    <Ionicons name="chevron-forward" size={20} color={COLORS.lightGray} />
                                </TouchableOpacity>
                            ))
                        ) : (
                            <View style={styles.emptyState}>
                                <Ionicons name="search-outline" size={48} color={COLORS.lightGray} />
                                <Text style={styles.emptyText}>No shops found</Text>
                                <Text style={styles.emptySubtext}>Try a different search</Text>
                            </View>
                        )}
                    </Animated.View>
                ) : (
                    <>
                        {/* Categories */}
                        <Animated.View style={[styles.section, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
                            <Text style={styles.sectionTitle}>Browse by Category</Text>
                            <View style={styles.categoryGrid}>
                                {categories.map((cat) => (
                                    <TouchableOpacity
                                        key={cat.id}
                                        style={styles.categoryCard}
                                        onPress={() => {
                                            handleBack();
                                            // Could filter by category on explore screen
                                        }}
                                    >
                                        <View style={styles.categoryIcon}>
                                            <Ionicons name={cat.icon as any} size={24} color={COLORS.primary} />
                                        </View>
                                        <Text style={styles.categoryLabel}>{cat.label}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </Animated.View>

                        {/* Popular Shops */}
                        <Animated.View style={[styles.section, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
                            <Text style={styles.sectionTitle}>Popular Shops</Text>
                            {shops.slice(0, 5).map((shop) => (
                                <TouchableOpacity
                                    key={shop.id}
                                    style={styles.shopItem}
                                    onPress={() => handleSelectShop(shop)}
                                >
                                    <View style={styles.shopLogo}>
                                        {shop.logoUrl ? (
                                            <Image source={{ uri: shop.logoUrl }} style={styles.shopLogoImg} />
                                        ) : (
                                            <Ionicons name="storefront" size={22} color={COLORS.primary} />
                                        )}
                                    </View>
                                    <View style={styles.shopInfo}>
                                        <Text style={styles.shopName}>{shop.name}</Text>
                                        <Text style={styles.shopType}>{shop.type}</Text>
                                    </View>
                                    <Ionicons name="chevron-forward" size={20} color={COLORS.lightGray} />
                                </TouchableOpacity>
                            ))}
                        </Animated.View>
                    </>
                )}
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
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: COLORS.background,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.lightGray,
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: COLORS.cream,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    searchWrap: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.white,
        paddingHorizontal: 14,
        height: 44,
        borderRadius: 22,
        borderWidth: 1,
        borderColor: COLORS.lightGray,
    },
    searchInput: {
        flex: 1,
        marginLeft: 10,
        fontSize: 16,
        color: COLORS.dark,
    },
    content: {
        flex: 1,
    },

    // Sections
    section: {
        padding: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.dark,
        marginBottom: 16,
    },

    // Categories
    categoryGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    categoryCard: {
        width: '47%',
        backgroundColor: COLORS.white,
        borderRadius: 16,
        padding: 16,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
    },
    categoryIcon: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: COLORS.primaryLight,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
    },
    categoryLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.dark,
    },

    // Shop Items
    shopItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.white,
        borderRadius: 14,
        padding: 14,
        marginBottom: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 1,
    },
    shopLogo: {
        width: 48,
        height: 48,
        borderRadius: 12,
        backgroundColor: COLORS.primaryLight,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
        overflow: 'hidden',
    },
    shopLogoImg: {
        width: 48,
        height: 48,
        borderRadius: 12,
    },
    shopInfo: {
        flex: 1,
    },
    shopName: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.dark,
        marginBottom: 2,
    },
    shopType: {
        fontSize: 13,
        color: COLORS.gray,
        textTransform: 'capitalize',
    },

    // Search Results
    resultItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.lightGray,
    },
    resultLogo: {
        width: 44,
        height: 44,
        borderRadius: 10,
        backgroundColor: COLORS.primaryLight,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
        overflow: 'hidden',
    },
    resultLogoImg: {
        width: 44,
        height: 44,
        borderRadius: 10,
    },
    resultInfo: {
        flex: 1,
    },
    resultName: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.dark,
        marginBottom: 2,
    },
    resultType: {
        fontSize: 13,
        color: COLORS.gray,
        textTransform: 'capitalize',
    },

    // Empty State
    emptyState: {
        alignItems: 'center',
        paddingVertical: 60,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: '600',
        color: COLORS.dark,
        marginTop: 16,
    },
    emptySubtext: {
        fontSize: 14,
        color: COLORS.gray,
        marginTop: 4,
    },
});
