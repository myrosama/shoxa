import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet, Text, View, Image, ScrollView,
  TouchableOpacity, StatusBar, Dimensions, ActivityIndicator, Pressable, Platform, Animated
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { db } from '@/configs/FirebaseConfig';

const COLORS = {
  background: '#FDF6E3',
  layer1Background: '#F5D6BA', // More orangy/peachy for Layer 1
  primary: '#C67C43',
  secondary: '#A0522D',
  dark: '#333333',
  gray: '#888888',
  white: '#FFFFFF',
  cardShadow: 'rgba(198, 124, 67, 0.15)',
  yellow: '#FFD700'
};

const CATEGORIES = [
  { id: 'All', label: 'All', icon: 'grid-outline' },
  { id: 'Shop', label: 'Shops', icon: 'cart-outline' },
  { id: 'Restaurant', label: 'Food', icon: 'fast-food-outline' },
  { id: 'Hospital', label: 'Hospital', icon: 'medkit-outline' },
  { id: 'Service', label: 'Services', icon: 'construct-outline' },
];

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 40) / 2 - 8;

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [shops, setShops] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('All');
  const [directionModalShop, setDirectionModalShop] = useState<any>(null);

  // Animated scroll value
  const scrollY = useRef(new Animated.Value(0)).current;

  // Scroll threshold - when user has scrolled past categories
  const CATEGORY_THRESHOLD = 340;

  // Scroll direction tracking for reveal-on-scroll-up
  const lastScrollY = useRef(0);
  const [showRevealHeader, setShowRevealHeader] = useState(false);
  const revealHeaderAnim = useRef(new Animated.Value(-150)).current; // Start hidden above screen

  useEffect(() => {
    const unsubscribe = onSnapshot(query(collection(db, 'artifacts', 'default-app-id', 'public', 'data', 'shops')), (snapshot) => {
      setShops(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const filteredShops = shops.filter(shop => activeCategory === 'All' || shop.type === activeCategory);

  const handleLocationClick = (shop: any) => {
    setDirectionModalShop(shop);
  };

  // Animate reveal header in/out
  const animateRevealHeader = (show: boolean) => {
    Animated.spring(revealHeaderAnim, {
      toValue: show ? 0 : -150,
      useNativeDriver: true,
      tension: 80,
      friction: 12,
    }).start();
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
        // 1. User has scrolled past categories (offsetY > CATEGORY_THRESHOLD)
        // 2. User is scrolling UP
        // 3. Scroll delta is significant enough (> 5px to avoid jitter)
        if (offsetY > CATEGORY_THRESHOLD) {
          if (isScrollingUp && scrollDelta > 5) {
            if (!showRevealHeader) {
              setShowRevealHeader(true);
              animateRevealHeader(true);
            }
          } else if (!isScrollingUp && scrollDelta > 10) {
            if (showRevealHeader) {
              setShowRevealHeader(false);
              animateRevealHeader(false);
            }
          }
        } else {
          // Hide reveal header when scrolled back up to categories area
          if (showRevealHeader) {
            setShowRevealHeader(false);
            animateRevealHeader(false);
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
      <Animated.View style={[
        styles.fixedLayer,
        {
          paddingTop: insets.top,
          height: 200,
          backgroundColor: COLORS.layer1Background,
          opacity: welcomeOpacity,
        }
      ]}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.greeting}>Good Morning,</Text>
            <Text style={styles.appName}>Welcome to SHOXA</Text>
          </View>
          <View style={styles.logoWrapper}>
            <Image source={require('@/assets/logo.png')} style={styles.logo} resizeMode="contain" />
          </View>
        </View>
      </Animated.View>

      {/* --- REVEAL-ON-SCROLL-UP HEADER (Search + Categories) --- */}
      {showRevealHeader && (
        <Animated.View style={[
          styles.revealHeader,
          {
            top: insets.top,
            transform: [{ translateY: revealHeaderAnim }]
          }
        ]}>
          <View style={styles.revealSearchContainer}>
            <Pressable onPress={() => router.push('/search')} style={styles.searchContainer}>
              <Ionicons name="search" size={20} color={COLORS.secondary} style={styles.searchIcon} />
              <Text style={styles.searchInputPlaceholder}>Search stores, medicine, food...</Text>
            </Pressable>
          </View>
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
          <TouchableOpacity style={styles.locationBar}>
            <View style={styles.locationIconBg}>
              <Ionicons name="location" size={14} color={COLORS.white} />
            </View>
            <Text style={styles.locationText} numberOfLines={1}>
              Home • Tashkent City, Uzbekistan
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

        {/* Categories Title (scrolls away) */}
        <View style={styles.categoriesTitleSection}>
          <Text style={styles.categoryTitle}>Categories</Text>
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

        {/* Shop List */}
        <View style={[styles.listSection, styles.contentBackground]}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitleNoPadding}>Recommended for you</Text>
            <TouchableOpacity><Text style={styles.seeAll}>See all</Text></TouchableOpacity>
          </View>

          {loading ? <ActivityIndicator size="large" color={COLORS.primary} /> : (
            <View style={styles.gridContainer}>
              {filteredShops.map((shop) => (
                <TouchableOpacity
                  key={shop.id}
                  style={styles.card}
                  onPress={() => router.push(`/shop/${shop.id}`)}
                  activeOpacity={0.9}
                >
                  <Image source={{ uri: shop.profilePicUrl || 'https://via.placeholder.com/150' }} style={styles.cardImage} />
                  <View style={styles.cardContent}>
                    <View style={styles.cardHeader}>
                      <Text style={styles.cardTitle} numberOfLines={2}>{shop.name_uz}</Text>
                      <View style={styles.ratingContainer}>
                        <Ionicons name="star" size={12} color={COLORS.yellow} />
                        <Text style={styles.ratingText}>{shop.rating || '4.5'}</Text>
                      </View>
                    </View>
                    <Text style={styles.cardType}>{shop.type}</Text>
                    <View style={styles.cardFooter}>
                      <View style={styles.locationContainer}>
                        <Ionicons name="location-sharp" size={14} color={COLORS.primary} />
                        <Text style={styles.distanceText}>1.2 km</Text>
                      </View>
                      <TouchableOpacity
                        style={styles.locationButton}
                        onPress={(e) => { e.stopPropagation(); handleLocationClick(shop); }}
                      >
                        <Ionicons name="location-outline" size={18} color={COLORS.white} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

      </Animated.ScrollView>

      {/* Direction Modal */}
      {directionModalShop && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Navigate to {directionModalShop.name_uz}?</Text>
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
  logoWrapper: { width: 50, height: 50, backgroundColor: COLORS.white, borderRadius: 25, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.1, elevation: 2 },
  logo: { width: 30, height: 30 },

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
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    paddingBottom: 12,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  revealSearchContainer: {
    paddingHorizontal: 20,
    paddingTop: 10,
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
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.dark,
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
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  locationContainer: { flexDirection: 'row', alignItems: 'center' },
  distanceText: { fontSize: 12, color: COLORS.gray, marginLeft: 4, fontWeight: '500' },
  locationButton: { backgroundColor: '#3E2723', width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },

  modalOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, top: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: 'white', padding: 20, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
  modalText: { marginBottom: 20, color: '#666' },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  modalBtn: { flex: 1, padding: 15, borderRadius: 10, alignItems: 'center' }
});