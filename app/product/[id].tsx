import React, { useEffect, useState } from 'react';
import {
    View, Text, Image, StyleSheet, ScrollView, TouchableOpacity,
    ActivityIndicator, Dimensions, Alert
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import { db } from '@/configs/FirebaseConfig';

const { width } = Dimensions.get('window');

const COLORS = {
    background: '#FDF6E3',
    primary: '#C67C43',
    dark: '#333333',
    gray: '#888888',
    white: '#FFFFFF',
    red: '#E53935',
    green: '#4CAF50',
};

import { getTelegramImageUrl } from '@/configs/AppConfig';

export default function ProductDetails() {
    const { id, shopId } = useLocalSearchParams();
    const router = useRouter();
    const [product, setProduct] = useState<any>(null);
    const [shop, setShop] = useState<any>(null);
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [quantity, setQuantity] = useState(1);

    useEffect(() => {
        if (!id || !shopId) return;
        fetchProduct();
    }, [id, shopId]);

    const fetchProduct = async () => {
        try {
            // Fetch product
            const productRef = doc(db, 'shops', shopId as string, 'products', id as string);
            const productSnap = await getDoc(productRef);

            if (productSnap.exists()) {
                const productData = { id: productSnap.id, ...productSnap.data() };
                setProduct(productData);

                if (productData.imageFileId) {
                    const url = await getTelegramImageUrl(productData.imageFileId);
                    setImageUrl(url);
                }
            }

            // Fetch shop info
            const shopRef = doc(db, 'shops', shopId as string);
            const shopSnap = await getDoc(shopRef);
            if (shopSnap.exists()) {
                setShop({ id: shopSnap.id, ...shopSnap.data() });
            }
        } catch (e) {
            console.error("Error fetching product:", e);
        } finally {
            setLoading(false);
        }
    };

    const addToCart = () => {
        Alert.alert('Added to Cart', `${quantity}x ${product.name} added to your cart!`);
    };

    const currentPrice = product?.discountPrice || product?.price || 0;
    const totalPrice = currentPrice * quantity;
    const discount = product?.discountPrice && product?.price
        ? Math.round((1 - product.discountPrice / product.price) * 100)
        : 0;

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    if (!product) {
        return (
            <View style={styles.loadingContainer}>
                <Text style={styles.errorText}>Product not found</Text>
                <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                    <Text style={styles.backBtnText}>Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />

            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Image Section */}
                <View style={styles.imageSection}>
                    <Image
                        source={{ uri: imageUrl || 'https://via.placeholder.com/400?text=Product' }}
                        style={styles.productImage}
                    />

                    {/* Back Button */}
                    <TouchableOpacity style={styles.headerBackBtn} onPress={() => router.back()}>
                        <Ionicons name="arrow-back" size={22} color={COLORS.dark} />
                    </TouchableOpacity>

                    {/* Share Button */}
                    <TouchableOpacity style={styles.headerShareBtn}>
                        <Ionicons name="share-outline" size={22} color={COLORS.dark} />
                    </TouchableOpacity>

                    {/* Discount Badge */}
                    {discount > 0 && (
                        <View style={styles.discountBadge}>
                            <Text style={styles.discountBadgeText}>-{discount}%</Text>
                        </View>
                    )}
                </View>

                {/* Product Info */}
                <View style={styles.infoSection}>
                    {/* Shop Info */}
                    {shop && (
                        <TouchableOpacity
                            style={styles.shopRow}
                            onPress={() => router.push(`/shop/${shop.id}`)}
                        >
                            <View style={styles.shopAvatar}>
                                <Ionicons name="storefront" size={18} color={COLORS.primary} />
                            </View>
                            <Text style={styles.shopName}>{shop.name}</Text>
                            <Ionicons name="chevron-forward" size={18} color={COLORS.gray} />
                        </TouchableOpacity>
                    )}

                    {/* Product Name */}
                    <Text style={styles.productName}>{product.name}</Text>

                    {/* Price Section */}
                    <View style={styles.priceSection}>
                        {product.discountPrice ? (
                            <>
                                <Text style={styles.originalPrice}>{product.price?.toLocaleString()} UZS</Text>
                                <Text style={styles.currentPrice}>{product.discountPrice?.toLocaleString()} UZS</Text>
                            </>
                        ) : (
                            <Text style={styles.currentPrice}>{product.price?.toLocaleString()} UZS</Text>
                        )}
                    </View>

                    {/* Description */}
                    {product.description && (
                        <View style={styles.descriptionSection}>
                            <Text style={styles.sectionTitle}>Description</Text>
                            <Text style={styles.descriptionText}>{product.description}</Text>
                        </View>
                    )}

                    {/* Category */}
                    {product.category && (
                        <View style={styles.categoryRow}>
                            <Text style={styles.categoryLabel}>Category:</Text>
                            <View style={styles.categoryPill}>
                                <Text style={styles.categoryText}>{product.category}</Text>
                            </View>
                        </View>
                    )}

                    {/* Stock Status */}
                    <View style={styles.stockRow}>
                        <Text style={styles.stockLabel}>Availability:</Text>
                        <Text style={[styles.stockText, { color: product.inStock !== false ? COLORS.green : COLORS.red }]}>
                            {product.inStock !== false ? 'In Stock' : 'Out of Stock'}
                        </Text>
                    </View>
                </View>
            </ScrollView>

            {/* Bottom Action Bar */}
            <View style={styles.bottomBar}>
                {/* Quantity Selector */}
                <View style={styles.quantitySelector}>
                    <TouchableOpacity
                        style={styles.quantityBtn}
                        onPress={() => setQuantity(Math.max(1, quantity - 1))}
                    >
                        <Ionicons name="remove" size={20} color={COLORS.dark} />
                    </TouchableOpacity>
                    <Text style={styles.quantityText}>{quantity}</Text>
                    <TouchableOpacity
                        style={styles.quantityBtn}
                        onPress={() => setQuantity(quantity + 1)}
                    >
                        <Ionicons name="add" size={20} color={COLORS.dark} />
                    </TouchableOpacity>
                </View>

                {/* Add to Cart Button */}
                <TouchableOpacity style={styles.addToCartBtn} onPress={addToCart}>
                    <Ionicons name="cart" size={22} color={COLORS.white} />
                    <Text style={styles.addToCartText}>Add · {totalPrice.toLocaleString()} UZS</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.background,
    },
    errorText: {
        fontSize: 16,
        color: COLORS.gray,
        marginBottom: 20,
    },
    backBtn: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        backgroundColor: COLORS.primary,
        borderRadius: 8,
    },
    backBtnText: {
        color: COLORS.white,
        fontWeight: '600',
    },

    // Image Section
    imageSection: {
        width: '100%',
        height: width,
        backgroundColor: COLORS.white,
        position: 'relative',
    },
    productImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    headerBackBtn: {
        position: 'absolute',
        top: 50,
        left: 16,
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: COLORS.white,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    headerShareBtn: {
        position: 'absolute',
        top: 50,
        right: 16,
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: COLORS.white,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    discountBadge: {
        position: 'absolute',
        bottom: 16,
        left: 16,
        backgroundColor: COLORS.red,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    discountBadgeText: {
        color: COLORS.white,
        fontWeight: 'bold',
        fontSize: 14,
    },

    // Info Section
    infoSection: {
        padding: 20,
    },
    shopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    shopAvatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#FFF5EE',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    shopName: {
        flex: 1,
        fontSize: 15,
        fontWeight: '500',
        color: COLORS.dark,
    },
    productName: {
        fontSize: 24,
        fontWeight: 'bold',
        color: COLORS.dark,
        marginBottom: 12,
    },
    priceSection: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 20,
    },
    originalPrice: {
        fontSize: 16,
        color: COLORS.gray,
        textDecorationLine: 'line-through',
    },
    currentPrice: {
        fontSize: 24,
        fontWeight: 'bold',
        color: COLORS.primary,
    },
    descriptionSection: {
        marginBottom: 20,
        padding: 16,
        backgroundColor: COLORS.white,
        borderRadius: 12,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.dark,
        marginBottom: 8,
    },
    descriptionText: {
        fontSize: 14,
        color: COLORS.dark,
        lineHeight: 22,
    },
    categoryRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        gap: 10,
    },
    categoryLabel: {
        fontSize: 14,
        color: COLORS.gray,
    },
    categoryPill: {
        backgroundColor: '#FFF5EE',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    categoryText: {
        fontSize: 13,
        color: COLORS.primary,
        fontWeight: '500',
    },
    stockRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 100,
    },
    stockLabel: {
        fontSize: 14,
        color: COLORS.gray,
    },
    stockText: {
        fontSize: 14,
        fontWeight: '600',
    },

    // Bottom Bar
    bottomBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: COLORS.white,
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        paddingBottom: 32,
        gap: 16,
        borderTopWidth: 1,
        borderTopColor: '#F0F0F0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 10,
    },
    quantitySelector: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.background,
        borderRadius: 12,
        paddingHorizontal: 4,
    },
    quantityBtn: {
        width: 40,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
    },
    quantityText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.dark,
        minWidth: 30,
        textAlign: 'center',
    },
    addToCartBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.primary,
        paddingVertical: 14,
        borderRadius: 12,
        gap: 8,
    },
    addToCartText: {
        color: COLORS.white,
        fontSize: 16,
        fontWeight: 'bold',
    },
});
