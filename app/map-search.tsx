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

    // Animation
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        setTimeout(() => inputRef.current?.focus(), 300);
        Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }).start();
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
        router.back();
    };

    const handleSelectShop = (shop: Shop) => {
        Keyboard.dismiss();
        router.replace(`/shop/${shop.id}`);
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* Header */}
            <View style={styles.header}>
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
            </View>

            <ScrollView
                style={styles.content}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                {searchQuery.length > 0 ? (
                    // Search Results
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
                    // Recent / Popular Shops - Simple list
                    <Animated.View style={[styles.section, { opacity: fadeAnim }]}>
                        <Text style={styles.sectionTitle}>Recent</Text>
                        {shops.slice(0, 8).map((shop) => (
                            <TouchableOpacity
                                key={shop.id}
                                style={styles.shopItem}
                                onPress={() => handleSelectShop(shop)}
                            >
                                <View style={styles.shopIcon}>
                                    <Ionicons name="time-outline" size={20} color={COLORS.gray} />
                                </View>
                                <View style={styles.shopInfo}>
                                    <Text style={styles.shopName}>{shop.name}</Text>
                                    <Text style={styles.shopType}>Shop • {shop.type}</Text>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </Animated.View>
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

    // Section
    section: {
        paddingTop: 8,
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: '600',
        color: COLORS.gray,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        paddingHorizontal: 20,
        paddingVertical: 12,
    },

    // Shop Items - Simple list like Google Maps
    shopItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 14,
    },
    shopIcon: {
        width: 24,
        marginRight: 16,
    },
    shopInfo: { flex: 1 },
    shopName: {
        fontSize: 16,
        color: COLORS.dark,
        marginBottom: 2,
    },
    shopType: {
        fontSize: 14,
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
    resultInfo: { flex: 1 },
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
