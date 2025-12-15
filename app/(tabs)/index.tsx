import { db } from '@/configs/FirebaseConfig';
import { useAddresses } from '@/contexts/AddressContext';
import { useLocation } from '@/contexts/LocationContext';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { collection, getDocs, onSnapshot, query } from 'firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet, Text,
  TouchableOpacity,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';


const COLORS = {
  background: '#FDF6E3',
  layer1Background: '#F5D6BA', // More orangy/peachy for Layer 1
  primary: '#C67C43',
  secondary: '#A0522D',
  dark: '#333333',
  gray: '#888888',
  lightGray: '#E0E0E0',
  white: '#FFFFFF',
  cardShadow: 'rgba(198, 124, 67, 0.15)',
  yellow: '#FFD700'
};

import { getTelegramImageUrl } from '@/configs/AppConfig';

const CATEGORIES = [
  { id: 'All', label: 'All', icon: 'grid-outline' },
  { id: 'restaurant', label: 'Food', icon: 'fast-food-outline' },
  { id: 'pharmacy', label: 'Pharmacy', icon: 'medkit-outline' },
  { id: 'grocery', label: 'Grocery', icon: 'cart-outline' },
  { id: 'cafe', label: 'Cafe', icon: 'cafe-outline' },
  { id: 'bakery', label: 'Bakery', icon: 'pizza-outline' },
];

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 40) / 2 - 8;


export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { calculateDistance } = useLocation();
  const { addresses, selectedAddress, selectAddress, refreshAddresses } = useAddresses();
  const [shops, setShops] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('All');
  const [directionModalShop, setDirectionModalShop] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'shops' | 'products'>('shops');
  const [showAddressModal, setShowAddressModal] = useState(false);
  const modalFade = useRef(new Animated.Value(0)).current;

  // Show/hide address modal with animation
  const openAddressModal = () => {
    setShowAddressModal(true);
    Animated.timing(modalFade, {
      toValue: 1,
      duration: 250,
      useNativeDriver: true,
    }).start();
  };

  const closeAddressModal = () => {
    Animated.timing(modalFade, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => setShowAddressModal(false));
  };

  // Get icon for address type
  const getAddressIcon = (type: string) => {
    switch (type) {
      case 'home': return 'home';
      case 'work': return 'briefcase';
      default: return 'location';
    }
  };

  // Animated scroll value
  const scrollY = useRef(new Animated.Value(0)).current;

  // Scroll threshold - when user has scrolled past search bar
  const SEARCH_THRESHOLD = 70;

  // Scroll direction tracking for reveal-on-scroll-up
  const lastScrollY = useRef(0);
  const [revealHeaderVisible, setRevealHeaderVisible] = useState(false);
  const [revealHeaderMounted, setRevealHeaderMounted] = useState(false);
  const revealHeaderTranslateY = useRef(new Animated.Value(-250)).current;

  useEffect(() => {
    // Load shops from the 'shops' collection
    const unsubscribe = onSnapshot(query(collection(db, 'shops')), async (snapshot) => {
      const shopsData = await Promise.all(
        snapshot.docs.map(async (doc) => {
          const data = doc.data();
          let logoUrl = null;

          // Get image URL from Telegram if logoFileId exists
          if (data.logoFileId) {
            logoUrl = await getTelegramImageUrl(data.logoFileId);
          }

          return {
            id: doc.id,
            name: data.name || 'Unknown Shop',
            ...data,
            logoUrl: logoUrl
          };
        })
      );
      setShops(shopsData);

      // Load products from all shops
      const allProducts: any[] = [];
      for (const shop of shopsData) {
        try {
          const productsSnapshot = await getDocs(collection(db, 'shops', shop.id, 'products'));
          for (const productDoc of productsSnapshot.docs) {
            const productData = productDoc.data();
            let imageUrl = null;
            if (productData.imageFileId) {
              imageUrl = await getTelegramImageUrl(productData.imageFileId);
            }
            allProducts.push({
              id: productDoc.id,
              shopId: shop.id,
              shopName: shop.name,
              ...productData,
              imageUrl,
            });
          }
        } catch (e) {
          console.error('Error loading products for shop', shop.id, e);
        }
      }
      setProducts(allProducts);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const filteredShops = shops.filter(shop => activeCategory === 'All' || shop.type === activeCategory);

  const handleLocationClick = (shop: any) => {
    setDirectionModalShop(shop);
  };

  // Show reveal header with animation
  const showRevealHeaderAnimated = () => {
    if (!revealHeaderMounted) {
      setRevealHeaderMounted(true);
      revealHeaderTranslateY.setValue(-250); // Reset position
    }
    setRevealHeaderVisible(true);
    Animated.timing(revealHeaderTranslateY, {
      toValue: 0,
      duration: 280,
      useNativeDriver: true,
    }).start();
  };

  // Hide reveal header with animation
  const hideRevealHeaderAnimated = () => {
    if (!revealHeaderVisible) return;
    setRevealHeaderVisible(false);
    Animated.timing(revealHeaderTranslateY, {
      toValue: -250,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      // Unmount after animation completes
      setRevealHeaderMounted(false);
    });
  };

  // Handle scroll events
  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    {
      useNativeDriver: false,
      listener: (event: any) => {
        const offsetY = event.nativeEvent.contentOffset.y;
        const isScrollingUp = offsetY < lastScrollY.current;
        const scrollDelta = Math.abs(offsetY - lastScrollY.current);

        // Only show reveal header when:
        // 1. User has scrolled past search bar (offsetY > SEARCH_THRESHOLD)
        // 2. User is scrolling UP
        // 3. Scroll delta is significant enough (> 5px to avoid jitter)
        if (offsetY > SEARCH_THRESHOLD) {
          if (isScrollingUp && scrollDelta > 5) {
            if (!revealHeaderVisible) {
              showRevealHeaderAnimated();
            }
          } else if (!isScrollingUp && scrollDelta > 10) {
            if (revealHeaderVisible) {
              hideRevealHeaderAnimated();
            }
          }
        } else {
          // Hide reveal header when scrolled back up to search bar area
          if (revealHeaderVisible) {
            hideRevealHeaderAnimated();
          }
        }

        lastScrollY.current = offsetY;
      }
    }
  );

  // LAYER 2 MOVEMENT - Entire layer moves UP as user scrolls
  const layer2TranslateY = scrollY.interpolate({
    inputRange: [0, 80],
    outputRange: [0, -80],
    extrapolate: 'clamp',
  });

  // CYLINDER ROLL for location bar
  const locationBarRotation = scrollY.interpolate({
    inputRange: [60, 80, 100],
    outputRange: ['0deg', '45deg', '90deg'],
    extrapolate: 'clamp',
  });

  const locationBarOpacity = scrollY.interpolate({
    inputRange: [60, 90, 100],
    outputRange: [1, 0.4, 0],
    extrapolate: 'clamp',
  });

  // Welcome text fade/blur effect
  const welcomeOpacity = scrollY.interpolate({
    inputRange: [0, 60, 100],
    outputRange: [1, 0.6, 0.2],
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      {/* --- LAYER 1: FIXED BACKGROUND (Welcome + Logo) --- */}
      {/* Background stays visible always */}
      <View style={[
        styles.fixedLayer,
        {
          paddingTop: insets.top,
          height: 200,
          backgroundColor: COLORS.layer1Background,
        }
      ]}>
        {/* Only text and logo fade */}
        <Animated.View style={[styles.headerRow, { opacity: welcomeOpacity }]}>
          <View>
            <Text style={styles.greeting}>Good Morning,</Text>
            <Text style={styles.appName}>Welcome to SHOXA</Text>
          </View>
          <Image source={require('@/assets/logo.png')} style={styles.logo} resizeMode="contain" />
        </Animated.View>
      </View>

      {/* --- REVEAL-ON-SCROLL-UP HEADER (Search + Categories) --- */}
      {revealHeaderMounted && (
        <Animated.View style={[
          styles.revealHeader,
          {
            top: insets.top,
            transform: [{ translateY: revealHeaderTranslateY }]
          }
        ]}>
          {/* Centered Title */}
          <View style={styles.revealTitleContainer}>
            <Text style={styles.revealTitle}>SHOXA</Text>
            <Text style={styles.revealSubtitle}>Tashkent City, Uzbekistan</Text>
          </View>

          {/* Search Bar */}
          <View style={styles.revealSearchContainer}>
            <Pressable onPress={() => router.push('/search')} style={styles.searchContainer}>
              <Ionicons name="search" size={20} color={COLORS.secondary} style={styles.searchIcon} />
              <Text style={styles.searchInputPlaceholder}>Search stores, medicine, food...</Text>
            </Pressable>
          </View>

          {/* Categories */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesList}>
            {CATEGORIES.map((cat) => {
              const isActive = activeCategory === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.categoryPill, isActive ? styles.categoryPillActive : styles.categoryPillInactive]}
                  onPress={() => setActiveCategory(cat.id)}
                >
                  <Ionicons name={cat.icon as any} size={18} color={isActive ? COLORS.white : '#5D4037'} style={{ marginRight: 6 }} />
                  <Text style={[styles.categoryText, isActive ? { color: COLORS.white } : { color: '#5D4037' }]}>{cat.label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </Animated.View>
      )}

      {/* --- LAYER 2: SCROLLABLE CONTENT --- */}
      <Animated.ScrollView
        style={{
          marginTop: insets.top + 80,
          transform: [{ translateY: layer2TranslateY }],
          backgroundColor: COLORS.background, // Same as Layer 1
          borderTopLeftRadius: 25,
          borderTopRightRadius: 25,
          // Top shadow to make roll-over visible
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.15,
          shadowRadius: 8,
          elevation: 10,
        }}
        contentContainerStyle={{
          paddingBottom: 120,
          paddingTop: 15,
        }}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >

        {/* Location Bar - Cylinder Roll Animation */}
        <Animated.View style={[
          styles.locationBarWrapper,
          {
            opacity: locationBarOpacity,
            transform: [
              { perspective: 1000 },
              { rotateX: locationBarRotation },
            ]
          }
        ]}>
          <View style={styles.locationBarBackground} />
          <TouchableOpacity style={styles.locationBar} onPress={openAddressModal}>
            <View style={styles.locationIconBg}>
              <Ionicons name="location" size={14} color={COLORS.white} />
            </View>
            <Text style={styles.locationText} numberOfLines={1}>
              {selectedAddress ? `${selectedAddress.name} • ${selectedAddress.address}` : 'Manzil tanlang'}
            </Text>
            <Ionicons name="chevron-down" size={14} color={COLORS.gray} />
          </TouchableOpacity>
        </Animated.View>

        {/* Search Bar (in-flow, stays visible - no fade) */}
        <View style={styles.searchWrapper}>
          <Pressable onPress={() => router.push('/search')} style={styles.searchContainer}>
            <Ionicons name="search" size={20} color={COLORS.secondary} style={styles.searchIcon} />
            <Text style={styles.searchInputPlaceholder}>Search stores, medicine, food...</Text>
          </Pressable>
        </View>

        {/* Banner */}
        <View style={styles.contentBackground}>
          <TouchableOpacity style={styles.bannerContainer} onPress={() => router.push('/(tabs)/explore')}>
            <View style={styles.bannerTextContainer}>
              <Text style={styles.bannerTitle}>Explore Nearby</Text>
              <Text style={styles.bannerSubtitle}>See shops on the 3D Map</Text>
              <View style={styles.bannerBtn}>
                <Text style={styles.bannerBtnText}>Open Map</Text>
                <Ionicons name="map" size={16} color={COLORS.white} style={{ marginLeft: 5 }} />
              </View>
            </View>
            <Image source={{ uri: 'https://img.freepik.com/free-vector/map-navigation-concept_23-2147983944.jpg' }} style={styles.bannerImage} />
          </TouchableOpacity>
        </View>

        {/* Categories Title with Toggle */}
        <View style={styles.categoriesTitleSection}>
          <Text style={styles.categoryTitle}>Categories</Text>
          {/* Small toggle buttons on the right */}
          <View style={styles.miniToggleContainer}>
            <TouchableOpacity
              style={[styles.miniToggleBtn, viewMode === 'shops' && styles.miniToggleBtnActive]}
              onPress={() => setViewMode('shops')}
            >
              <Text style={[styles.miniToggleText, viewMode === 'shops' && styles.miniToggleTextActive]}>Shops</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.miniToggleBtn, viewMode === 'products' && styles.miniToggleBtnActive]}
              onPress={() => setViewMode('products')}
            >
              <Text style={[styles.miniToggleText, viewMode === 'products' && styles.miniToggleTextActive]}>Products</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Category Pills (in-flow, stays visible - no fade) */}
        <View style={styles.categoriesSection}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesList}>
            {CATEGORIES.map((cat) => {
              const isActive = activeCategory === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.categoryPill, isActive ? styles.categoryPillActive : styles.categoryPillInactive]}
                  onPress={() => setActiveCategory(cat.id)}
                >
                  <Ionicons name={cat.icon as any} size={18} color={isActive ? COLORS.white : '#5D4037'} style={{ marginRight: 6 }} />
                  <Text style={[styles.categoryText, isActive ? { color: COLORS.white } : { color: '#5D4037' }]}>{cat.label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Content List */}
        <View style={[styles.listSection, styles.contentBackground]}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitleNoPadding}>
              {viewMode === 'shops' ? 'Recommended for you' : 'Products for you'}
            </Text>
            <TouchableOpacity><Text style={styles.seeAll}>See all</Text></TouchableOpacity>
          </View>

          {loading ? <ActivityIndicator size="large" color={COLORS.primary} /> : (
            <View style={styles.gridContainer}>
              {viewMode === 'shops' ? (
                // SHOPS VIEW
                filteredShops.map((shop) => (
                  <TouchableOpacity
                    key={shop.id}
                    style={styles.card}
                    onPress={() => router.push(`/shop/${shop.id}`)}
                    activeOpacity={0.9}
                  >
                    <Image
                      source={{ uri: shop.logoUrl || 'https://via.placeholder.com/150?text=No+Image' }}
                      style={styles.cardImage}
                    />
                    <View style={styles.cardContent}>
                      <View style={styles.cardHeader}>
                        <Text style={styles.cardTitle} numberOfLines={2}>{shop.name || 'Unnamed Shop'}</Text>
                        <View style={styles.ratingContainer}>
                          <Ionicons name="star" size={12} color={COLORS.yellow} />
                          <Text style={styles.ratingText}>{shop.rating || '4.5'}</Text>
                        </View>
                      </View>
                      <Text style={styles.cardType}>{shop.type || 'Shop'}</Text>
                      <View style={styles.cardFooter}>
                        <View style={styles.locationContainer}>
                          <Ionicons name="location-sharp" size={14} color={COLORS.primary} />
                          <Text style={styles.distanceText}>
                            {shop.latitude && shop.longitude
                              ? calculateDistance(shop.latitude, shop.longitude)
                              : '--'}
                          </Text>
                        </View>
                        <TouchableOpacity
                          style={styles.locationButton}
                          onPress={(e) => { e.stopPropagation(); handleLocationClick(shop); }}
                        >
                          <Ionicons name="navigate" size={16} color={COLORS.white} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))
              ) : (
                // PRODUCTS VIEW
                products.map((product) => (
                  <TouchableOpacity
                    key={`${product.shopId}-${product.id}`}
                    style={styles.card}
                    onPress={() => router.push(`/product/${product.id}?shopId=${product.shopId}`)}
                    activeOpacity={0.9}
                  >
                    <Image
                      source={{ uri: product.imageUrl || 'https://via.placeholder.com/150?text=Product' }}
                      style={styles.cardImage}
                    />
                    <View style={styles.cardContent}>
                      <View style={styles.cardHeader}>
                        <Text style={styles.cardTitle} numberOfLines={2}>{product.name || 'Product'}</Text>
                        {product.discountPrice && (
                          <View style={styles.discountBadge}>
                            <Text style={styles.discountBadgeText}>
                              -{Math.round(100 - (product.discountPrice / product.price) * 100)}%
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.cardType}>{product.shopName}</Text>
                      <View style={styles.cardFooter}>
                        <View style={styles.priceContainer}>
                          {product.discountPrice ? (
                            <>
                              <Text style={styles.discountPrice}>{product.discountPrice?.toLocaleString()}</Text>
                              <Text style={styles.originalPrice}>{product.price?.toLocaleString()}</Text>
                            </>
                          ) : (
                            <Text style={styles.productPrice}>{product.price?.toLocaleString()} so'm</Text>
                          )}
                        </View>
                        <TouchableOpacity style={styles.addToCartBtn}>
                          <Ionicons name="add" size={18} color={COLORS.white} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </View>
          )}
        </View>

      </Animated.ScrollView>


      {/* Address Picker Modal (like Uzum) */}
      {showAddressModal && (
        <Modal
          visible={true}
          animationType="none"
          transparent={true}
          onRequestClose={closeAddressModal}
        >
          <Animated.View style={[styles.addressModalOverlay, { opacity: modalFade }]}>
            <TouchableOpacity
              style={StyleSheet.absoluteFill}
              activeOpacity={1}
              onPress={closeAddressModal}
            />
            <Animated.View
              style={[
                styles.addressModalContent,
                {
                  transform: [{
                    translateY: modalFade.interpolate({
                      inputRange: [0, 1],
                      outputRange: [300, 0],
                    }),
                  }],
                },
              ]}
            >
              {/* Handle bar */}
              <View style={styles.modalHandle} />

              {/* Header */}
              <View style={styles.addressModalHeader}>
                <Text style={styles.addressModalTitle}>Manzillar</Text>
                <TouchableOpacity onPress={closeAddressModal}>
                  <Ionicons name="close" size={24} color={COLORS.dark} />
                </TouchableOpacity>
              </View>

              {/* Address List */}
              <ScrollView style={styles.addressModalList}>
                {addresses.length === 0 ? (
                  <View style={styles.emptyAddressContainer}>
                    <Ionicons name="location-outline" size={48} color={COLORS.gray} />
                    <Text style={styles.emptyAddressText}>Saqlangan manzil yo'q</Text>
                    <Text style={styles.emptyAddressSubtext}>Yangi manzil qo'shing</Text>
                  </View>
                ) : (
                  addresses.map((addr) => (
                    <TouchableOpacity
                      key={addr.id}
                      style={[
                        styles.addressModalItem,
                        selectedAddress?.id === addr.id && styles.addressModalItemSelected
                      ]}
                      onPress={() => {
                        selectAddress(addr.id);
                        closeAddressModal();
                      }}
                    >
                      <View style={[
                        styles.addressModalIcon,
                        selectedAddress?.id === addr.id && styles.addressModalIconSelected
                      ]}>
                        <Ionicons
                          name={getAddressIcon(addr.type) as any}
                          size={20}
                          color={selectedAddress?.id === addr.id ? COLORS.white : COLORS.dark}
                        />
                      </View>
                      <View style={styles.addressModalInfo}>
                        <Text style={styles.addressModalName}>{addr.name}</Text>
                        <Text style={styles.addressModalAddress} numberOfLines={1}>{addr.address}</Text>
                      </View>
                      <TouchableOpacity
                        style={styles.editAddressBtn}
                        onPress={() => {
                          closeAddressModal();
                          router.push(`/onboarding/address-details?editId=${addr.id}`);
                        }}
                      >
                        <Ionicons name="create-outline" size={20} color={COLORS.gray} />
                      </TouchableOpacity>
                    </TouchableOpacity>
                  ))
                )}
              </ScrollView>

              {/* Add New Address Button */}
              <TouchableOpacity
                style={styles.addAddressBtn}
                onPress={() => {
                  closeAddressModal();
                  router.push('/onboarding/location');
                }}
              >
                <Ionicons name="add" size={22} color={COLORS.white} style={{ marginRight: 8 }} />
                <Text style={styles.addAddressBtnText}>Yangi manzil</Text>
              </TouchableOpacity>
            </Animated.View>
          </Animated.View>
        </Modal>
      )}

      {/* Direction Modal */}
      {directionModalShop && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Navigate to {directionModalShop.name}?</Text>
            <Text style={styles.modalText}>Estimated time: 15 mins (Driving)</Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: '#eee' }]} onPress={() => setDirectionModalShop(null)}>
                <Text>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: COLORS.primary }]}
                onPress={() => { setDirectionModalShop(null); router.push(`/shop/${directionModalShop.id}`); }}
              >
                <Text style={{ color: 'white', fontWeight: 'bold' }}>Start Navigation</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  // LAYER 1: FIXED HEADER (Only Welcome + Logo)
  fixedLayer: {
    position: 'absolute', top: 0, left: 0, right: 0,
    backgroundColor: COLORS.background,
    zIndex: 0,
    paddingHorizontal: 20,
    // Height is handled dynamically via inline style
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  greeting: { fontSize: 14, color: COLORS.secondary, marginBottom: 2 },
  appName: { fontSize: 26, fontWeight: '800', color: '#5D4037' },
  logo: { width: 80, height: 80 },

  // LAYER 2: Location Bar (Scrollable)
  locationBarWrapper: {
    paddingHorizontal: 20,
    marginBottom: 10,
    backgroundColor: COLORS.background, // Match Layer 2
  },
  locationBarBackground: {
    display: 'none', // No longer needed
  },
  locationBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.white, paddingHorizontal: 12, paddingVertical: 10,
    borderRadius: 20, alignSelf: 'flex-start',
    shadowColor: '#000', shadowOpacity: 0.05, elevation: 2
  },
  locationIconBg: { backgroundColor: COLORS.primary, width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  locationText: { fontSize: 14, color: COLORS.dark, fontWeight: '600', marginRight: 8 },

  // LAYER 2: SCROLL CONTENT
  contentBackground: {
    backgroundColor: COLORS.background,
  },

  // Reveal-on-scroll-up Header
  revealHeader: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: COLORS.background,
    zIndex: 1000,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    paddingBottom: 12,
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
  },
  revealTitleContainer: {
    alignItems: 'center',
    paddingTop: 15,
    paddingBottom: 10,
  },
  revealTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.dark,
  },
  revealSubtitle: {
    fontSize: 13,
    color: COLORS.gray,
    marginTop: 2,
  },
  revealSearchContainer: {
    paddingHorizontal: 20,
    paddingTop: 5,
    paddingBottom: 10,
  },

  // In-flow Search Wrapper
  searchWrapper: {
    paddingHorizontal: 20,
    paddingBottom: 10,
    paddingTop: 5,
    backgroundColor: COLORS.background, // Match Layer 2
  },
  searchContainer: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white,
    height: 50, borderRadius: 15, paddingLeft: 15,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, elevation: 3,
  },
  searchIcon: { marginRight: 10 },
  searchInputPlaceholder: { color: '#897461', fontSize: 16 },

  // Banner
  bannerContainer: { marginHorizontal: 20, marginBottom: 20, height: 140, backgroundColor: '#FFE0B2', borderRadius: 20, flexDirection: 'row', overflow: 'hidden', elevation: 3 },
  bannerTextContainer: { flex: 1, padding: 20, justifyContent: 'center' },
  bannerTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.dark },
  bannerSubtitle: { fontSize: 12, color: '#6D4C41', marginBottom: 10 },
  bannerBtn: { backgroundColor: COLORS.primary, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center' },
  bannerBtnText: { color: COLORS.white, fontSize: 12, fontWeight: 'bold' },
  bannerImage: { width: 120, height: '100%', resizeMode: 'cover' },

  // Categories Title Section (scrolls away)
  categoriesTitleSection: {
    backgroundColor: COLORS.background,
    paddingHorizontal: 20,
    paddingTop: 5,
    paddingBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.dark,
  },
  // Mini toggle buttons (icon only)
  miniToggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#F5EFE6',
    borderRadius: 10,
    padding: 3,
    gap: 2,
  },
  miniToggleBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  miniToggleBtnActive: {
    backgroundColor: COLORS.primary,
  },
  miniToggleText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
  },
  miniToggleTextActive: {
    color: COLORS.white,
  },

  // In-flow Categories Section
  categoriesSection: {
    backgroundColor: COLORS.background,
    paddingTop: 5,
    paddingBottom: 15,
  },
  categoriesList: { paddingLeft: 20, paddingRight: 20 },
  categoryPill: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 30, marginRight: 10, borderWidth: 1 },
  categoryPillActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  categoryPillInactive: { backgroundColor: COLORS.white, borderColor: '#E0E0E0' },
  categoryText: { fontWeight: '600', fontSize: 14 },

  // Toggle Switch Section
  toggleSection: {
    paddingHorizontal: 20,
    paddingBottom: 15,
    backgroundColor: COLORS.background,
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#F5EFE6',
    borderRadius: 14,
    padding: 4,
  },
  toggleOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    gap: 6,
  },
  toggleOptionActive: {
    backgroundColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  toggleTextActive: {
    color: COLORS.white,
  },

  // List
  listSection: { paddingHorizontal: 20, minHeight: 800 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  sectionTitleNoPadding: { fontSize: 18, fontWeight: 'bold', color: COLORS.dark },
  seeAll: { color: COLORS.primary, fontWeight: '600' },

  // Card
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  card: { width: CARD_WIDTH, backgroundColor: COLORS.white, borderRadius: 16, marginBottom: 20, shadowColor: COLORS.cardShadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 10, elevation: 4, overflow: 'hidden' },
  cardImage: { width: '100%', height: 120, resizeMode: 'cover' },
  cardContent: { padding: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  cardTitle: { fontSize: 15, fontWeight: 'bold', color: COLORS.dark, flex: 1, marginRight: 4 },
  ratingContainer: { flexDirection: 'row', alignItems: 'center' },
  ratingText: { fontSize: 12, fontWeight: 'bold', color: COLORS.dark, marginLeft: 2 },
  cardType: { fontSize: 12, color: COLORS.gray, marginBottom: 10 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  locationContainer: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  distanceText: { fontSize: 12, color: COLORS.gray, marginLeft: 4, fontWeight: '500' },
  locationButton: { backgroundColor: COLORS.primary, width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginLeft: 8 },

  // Product card specific styles
  discountBadge: {
    backgroundColor: '#E53935',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  discountBadgeText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: 'bold',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 6,
  },
  productPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  discountPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  originalPrice: {
    fontSize: 11,
    color: COLORS.gray,
    textDecorationLine: 'line-through',
  },
  addToCartBtn: {
    backgroundColor: COLORS.primary,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },

  modalOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, top: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: 'white', padding: 20, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
  modalText: { marginBottom: 20, color: '#666' },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  modalBtn: { flex: 1, padding: 15, borderRadius: 10, alignItems: 'center' },

  // Address Picker Modal
  addressModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'flex-end',
  },
  addressModalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    paddingTop: 10,
    paddingBottom: 40,
    maxHeight: '70%',
  },
  modalHandle: {
    width: 40,
    height: 5,
    backgroundColor: COLORS.lightGray,
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 15,
  },
  addressModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  addressModalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.dark,
  },
  addressModalList: {
    paddingHorizontal: 20,
  },
  addressModalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  addressModalIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  addressModalInfo: {
    flex: 1,
  },
  addressModalName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.dark,
  },
  addressModalAddress: {
    fontSize: 14,
    color: COLORS.gray,
    marginTop: 2,
  },
  addAddressBtn: {
    backgroundColor: COLORS.primary,
    marginHorizontal: 20,
    marginTop: 15,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  addAddressBtnText: {
    color: COLORS.white,
    fontSize: 17,
    fontWeight: 'bold',
  },
  // Empty address state
  emptyAddressContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyAddressText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.dark,
    marginTop: 15,
  },
  emptyAddressSubtext: {
    fontSize: 14,
    color: COLORS.gray,
    marginTop: 5,
  },
  // Selected address state
  addressModalItemSelected: {
    backgroundColor: 'rgba(198, 124, 67, 0.1)',
    borderRadius: 12,
    marginHorizontal: -10,
    paddingHorizontal: 10,
  },
  addressModalIconSelected: {
    backgroundColor: COLORS.primary,
  },
  editAddressBtn: {
    padding: 8,
  },
});