import { CartItem, useCart } from '@/contexts/CartContext';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import {
    Animated,
    Dimensions,
    Image,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

const { width, height } = Dimensions.get('window');

const COLORS = {
    background: '#FDF6E3',
    primary: '#C67C43',
    primaryLight: '#E5A067',
    primaryDark: '#A05A2C',
    dark: '#333333',
    gray: '#888888',
    lightGray: '#F5F5F5',
    white: '#FFFFFF',
    green: '#4CAF50',
    red: '#E53935',
    cream: '#FFF8F0',
};

export default function Cart() {
    const router = useRouter();
    const cart = useCart();
    const slideAnim = useRef(new Animated.Value(height)).current;

    useEffect(() => {
        // Slide up animation when cart opens
        Animated.spring(slideAnim, {
            toValue: 0,
            useNativeDriver: true,
            tension: 50,
            friction: 8,
        }).start();
    }, []);

    const handleClose = () => {
        // Slide down animation when closing
        Animated.timing(slideAnim, {
            toValue: height,
            duration: 300,
            useNativeDriver: true,
        }).start(() => {
            router.back();
        });
    };

    // Group items by shop
    const itemsByShop = cart.items.reduce((acc, item) => {
        if (!acc[item.shopId]) {
            acc[item.shopId] = {
                shopName: item.shopName,
                items: [],
            };
        }
        acc[item.shopId].items.push(item);
        return acc;
    }, {} as { [key: string]: { shopName: string; items: CartItem[] } });

    if (cart.items.length === 0) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.emptyContainer}>
                    <Ionicons name="cart-outline" size={80} color={COLORS.gray} />
                    <Text style={styles.emptyTitle}>Savatingiz bo'sh</Text>
                    <Text style={styles.emptySubtitle}>Mahsulotlarni qo'shing va xarid qiling</Text>
                    <TouchableOpacity style={styles.shopNowBtn} onPress={() => router.push('/')}>
                        <Text style={styles.shopNowText}>Xarid qilish</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
                    <Ionicons name="close" size={28} color={COLORS.dark} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Savat</Text>
                <TouchableOpacity onPress={() => cart.clearCart()} style={styles.clearBtn}>
                    <Ionicons name="trash-outline" size={24} color={COLORS.red} />
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {Object.entries(itemsByShop).map(([shopId, shopData]) => (
                    <View key={shopId} style={styles.shopSection}>
                        {/* Shop Header */}
                        <View style={styles.shopHeader}>
                            <Ionicons name="storefront-outline" size={20} color={COLORS.primary} />
                            <Text style={styles.shopName}>{shopData.shopName}</Text>
                        </View>

                        {/* Items */}
                        {shopData.items.map((item) => (
                            <View key={item.productId} style={styles.cartItem}>
                                <Image
                                    source={{ uri: item.imageUrl || 'https://via.placeholder.com/80?text=Product' }}
                                    style={styles.itemImage}
                                />
                                <View style={styles.itemDetails}>
                                    <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
                                    <View style={styles.itemPriceRow}>
                                        {item.discountPrice ? (
                                            <>
                                                <Text style={styles.itemPrice}>{item.discountPrice.toLocaleString()} so'm</Text>
                                                <Text style={styles.itemOriginalPrice}>{item.price.toLocaleString()}</Text>
                                            </>
                                        ) : (
                                            <Text style={styles.itemPrice}>{item.price.toLocaleString()} so'm</Text>
                                        )}
                                    </View>
                                </View>
                                <View style={styles.quantityControls}>
                                    <TouchableOpacity
                                        style={styles.qtyBtn}
                                        onPress={() => cart.removeItem(item.productId, item.shopId)}
                                    >
                                        <Ionicons name="remove" size={18} color={COLORS.primary} />
                                    </TouchableOpacity>
                                    <Text style={styles.qtyText}>{item.quantity}</Text>
                                    <TouchableOpacity
                                        style={styles.qtyBtn}
                                        onPress={() => cart.addItem(item)}
                                    >
                                        <Ionicons name="add" size={18} color={COLORS.primary} />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ))}
                    </View>
                ))}

                {/* Add spacing for bottom bar */}
                <View style={{ height: 120 }} />
            </ScrollView>

            {/* Bottom Checkout Bar */}
            <View style={styles.checkoutBar}>
                <View style={styles.totalSection}>
                    <Text style={styles.totalLabel}>Jami:</Text>
                    <Text style={styles.totalPrice}>{cart.getTotalPrice().toLocaleString()} so'm</Text>
                </View>
                <TouchableOpacity style={styles.checkoutBtn}>
                    <Text style={styles.checkoutBtnText}>Buyurtma berish</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
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
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E5E5',
        backgroundColor: COLORS.white,
    },
    closeBtn: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.dark,
    },
    clearBtn: {
        padding: 4,
    },
    content: {
        flex: 1,
        padding: 16,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: COLORS.dark,
        marginTop: 20,
    },
    emptySubtitle: {
        fontSize: 14,
        color: COLORS.gray,
        textAlign: 'center',
        marginTop: 8,
    },
    shopNowBtn: {
        backgroundColor: COLORS.primary,
        paddingHorizontal: 32,
        paddingVertical: 14,
        borderRadius: 12,
        marginTop: 24,
    },
    shopNowText: {
        color: COLORS.white,
        fontSize: 16,
        fontWeight: 'bold',
    },
    shopSection: {
        marginBottom: 24,
    },
    shopHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
    },
    shopName: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.dark,
    },
    cartItem: {
        flexDirection: 'row',
        backgroundColor: COLORS.white,
        borderRadius: 12,
        padding: 12,
        marginBottom: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    itemImage: {
        width: 70,
        height: 70,
        borderRadius: 8,
        backgroundColor: COLORS.lightGray,
    },
    itemDetails: {
        flex: 1,
        marginLeft: 12,
        justifyContent: 'center',
    },
    itemName: {
        fontSize: 14,
        fontWeight: '500',
        color: COLORS.dark,
        marginBottom: 4,
    },
    itemPriceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    itemPrice: {
        fontSize: 15,
        fontWeight: 'bold',
        color: COLORS.primary,
    },
    itemOriginalPrice: {
        fontSize: 13,
        color: COLORS.gray,
        textDecorationLine: 'line-through',
    },
    quantityControls: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    qtyBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        borderWidth: 1.5,
        borderColor: COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    qtyText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.dark,
        minWidth: 24,
        textAlign: 'center',
    },
    checkoutBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: COLORS.white,
        padding: 16,
        paddingBottom: 32,
        borderTopWidth: 1,
        borderTopColor: '#E5E5E5',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 8,
    },
    totalSection: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    totalLabel: {
        fontSize: 16,
        color: COLORS.gray,
    },
    totalPrice: {
        fontSize: 22,
        fontWeight: 'bold',
        color: COLORS.dark,
    },
    checkoutBtn: {
        backgroundColor: COLORS.primary,
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    checkoutBtnText: {
        color: COLORS.white,
        fontSize: 16,
        fontWeight: 'bold',
    },
});