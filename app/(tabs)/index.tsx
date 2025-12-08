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

  // The CLIP LINE - where content "rolls over" behind (at Good Morning level)
  const CLIP_LINE = insets.top + 55; // Just below status bar, at Good Morning text

  // Content positions from top of scroll content
  const LOCATION_BAR_TOP = 0;
  const SEARCH_BAR_TOP = 60; // After location bar
  const BANNER_TOP = SEARCH_BAR_TOP + 65;
  const CATEGORIES_TOP = BANNER_TOP + 180; // After banner

  // When scroll value causes element to reach clip line
  const LOCATION_STICKY_SCROLL = 30; // Location rolls over first
  const SEARCH_STICKY_SCROLL = 70; // Search becomes sticky
  const CATEGORY_STICKY_SCROLL = 340; // Categories become sticky

  // Sticky state
  const [showStickySearch, setShowStickySearch] = useState(false);
  const [showStickyCategories, setShowStickyCategories] = useState(false);

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

  // Handle scroll events
  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    {
      useNativeDriver: false,
      listener: (event: any) => {
        const offsetY = event.nativeEvent.contentOffset.y;

        // Search becomes sticky when it reaches the clip line
        if (offsetY >= SEARCH_STICKY_SCROLL && !showStickySearch) {
          setShowStickySearch(true);
        } else if (offsetY < SEARCH_STICKY_SCROLL && showStickySearch) {
          setShowStickySearch(false);
        }

        // Categories become sticky when they reach clip line
        if (offsetY >= CATEGORY_STICKY_SCROLL && !showStickyCategories) {
          setShowStickyCategories(true);
        } else if (offsetY < CATEGORY_STICKY_SCROLL && showStickyCategories) {
          setShowStickyCategories(false);
        }
      }
    }
  );

  // CYLINDER ROLL for location bar
  // Positive rotation = top of element goes backward (rolls over forward like paper on cylinder)
  // Also moves UP (translateY negative) to cover the welcome text
  const locationBarRotation = scrollY.interpolate({
    inputRange: [0, LOCATION_STICKY_SCROLL * 0.5, LOCATION_STICKY_SCROLL],
    outputRange: ['0deg', '45deg', '90deg'], // POSITIVE = rolls forward (top goes back)
    extrapolate: 'clamp',
  });

  // Move UP as it rolls (cylinder moving upward)
  const locationBarTranslateY = scrollY.interpolate({
    inputRange: [0, LOCATION_STICKY_SCROLL],
    outputRange: [0, -50], // Moves UP 50px
    extrapolate: 'clamp',
  });

  const locationBarOpacity = scrollY.interpolate({
    inputRange: [0, LOCATION_STICKY_SCROLL * 0.6, LOCATION_STICKY_SCROLL],
    outputRange: [1, 0.4, 0],
    extrapolate: 'clamp',
  });

  // Search bar - fades out when sticky appears (no roll)
  const inFlowSearchOpacity = scrollY.interpolate({
    inputRange: [SEARCH_STICKY_SCROLL - 20, SEARCH_STICKY_SCROLL],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  // Categories - CYLINDER ROLL (top goes back)
  const categoriesRotation = scrollY.interpolate({
    inputRange: [CATEGORY_STICKY_SCROLL - 60, CATEGORY_STICKY_SCROLL - 20, CATEGORY_STICKY_SCROLL],
    outputRange: ['0deg', '45deg', '90deg'], // POSITIVE = rolls forward
    extrapolate: 'clamp',
  });

  const categoriesTranslateY = scrollY.interpolate({
    inputRange: [CATEGORY_STICKY_SCROLL - 60, CATEGORY_STICKY_SCROLL],
    outputRange: [0, -40], // Moves UP
    extrapolate: 'clamp',
  });

  const categoriesOpacity = scrollY.interpolate({
    inputRange: [CATEGORY_STICKY_SCROLL - 40, CATEGORY_STICKY_SCROLL - 10, CATEGORY_STICKY_SCROLL],
    outputRange: [1, 0.4, 0],
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      {/* --- LAYER 1: FIXED BACKGROUND (Welcome + Logo) --- */}
      <View style={[styles.fixedLayer, { paddingTop: insets.top, height: 200 }]}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.greeting}>Good Morning,</Text>
            <Text style={styles.appName}>Welcome to SHOXA</Text>
          </View>
          <View style={styles.logoWrapper}>
            <Image source={require('@/assets/logo.png')} style={styles.logo} resizeMode="contain" />
          </View>
        </View>
      </View>

      {/* --- FIXED STICKY HEADERS (Fade in based on scroll) --- */}
      {showStickySearch && (
        <Animated.View style={[
          styles.fixedStickyHeader,
          { top: insets.top }
        ]}>
          <View style={styles.stickySearchContainer}>
            <Pressable onPress={() => router.push('/search')} style={styles.searchContainer}>
              <Ionicons name="search" size={20} color={COLORS.secondary} style={styles.searchIcon} />
              <Text style={styles.searchInputPlaceholder}>Search stores, medicine, food...</Text>
            </Pressable>
          </View>
          {showStickyCategories && (
            <View style={styles.stickyCategoriesContainer}>
              <Animated.ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesList}>
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
              </Animated.ScrollView>
            </View>
          )}
        </Animated.View>
      )}

      {/* --- LAYER 2: SCROLLABLE CONTENT (with solid background to cover welcome text) --- */}
      <Animated.ScrollView
        style={{ backgroundColor: COLORS.background }}
        contentContainerStyle={{
          paddingTop: CLIP_LINE + 5,
          paddingBottom: 120,
          backgroundColor: COLORS.background,
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
              { translateY: locationBarTranslateY },
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

        {/* Search Bar (in-flow, fades when sticky appears) */}
        <Animated.View style={[styles.searchWrapper, { opacity: inFlowSearchOpacity }]}>
          <Pressable onPress={() => router.push('/search')} style={styles.searchContainer}>
            <Ionicons name="search" size={20} color={COLORS.secondary} style={styles.searchIcon} />
            <Text style={styles.searchInputPlaceholder}>Search stores, medicine, food...</Text>
          </Pressable>
        </Animated.View>

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

        {/* Category Pills (in-flow, rolls over when reaching clip line) */}
        <Animated.View style={[
          styles.categoriesSection,
          {
            opacity: categoriesOpacity,
            transform: [
              { perspective: 800 },
              { translateY: categoriesTranslateY },
              { rotateX: categoriesRotation }
            ]
          }
        ]}>
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
    marginTop: 10,
    marginBottom: 10,
    backgroundColor: COLORS.background,
  },
  locationBarBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.background,
    opacity: 0.98,
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

  // Fixed Sticky Header (appears on scroll)
  fixedStickyHeader: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: COLORS.background,
    zIndex: 1000,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  stickySearchContainer: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 10,
  },
  stickyCategoriesContainer: {
    paddingBottom: 10,
  },

  // In-flow Search Wrapper
  searchWrapper: {
    paddingHorizontal: 20,
    paddingBottom: 10,
    paddingTop: 5,
    backgroundColor: COLORS.background,
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