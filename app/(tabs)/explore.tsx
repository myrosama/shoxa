import { getTelegramImageUrl } from '@/configs/AppConfig';
import { db } from '@/configs/FirebaseConfig';
import { useLocation } from '@/contexts/LocationContext';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { collection, onSnapshot, query } from 'firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Image,
  Linking,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { GestureHandlerRootView, PanGestureHandler, State } from 'react-native-gesture-handler';
import MapView, { Marker } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

const COLORS = {
  background: '#FDF6E3',
  primary: '#C67C43',
  primaryLight: '#F5D6BA',
  dark: '#333333',
  gray: '#888888',
  lightGray: '#E5E5EA',
  white: '#FFFFFF',
  cream: '#FFF8F0',
  green: '#34C759',
  red: '#FF3B30',
  blue: '#007AFF',
};

const CATEGORIES = [
  { id: 'all', label: 'All', icon: 'grid' },
  { id: 'restaurant', label: 'Restaurants', icon: 'restaurant' },
  { id: 'pharmacy', label: 'Pharmacies', icon: 'medkit' },
  { id: 'grocery', label: 'Grocery', icon: 'cart' },
  { id: 'cafe', label: 'Cafes', icon: 'cafe' },
];

const DEFAULT_REGION = {
  latitude: 41.2995,
  longitude: 69.2401,
  latitudeDelta: 0.02,
  longitudeDelta: 0.02,
};

// Sheet snap points
const NEARBY_MIN = 70;
const NEARBY_MAX = 220;
const CATEGORY_MIN = 130;
const CATEGORY_MAX = height * 0.55;

interface Shop {
  id: string;
  name: string;
  type: string;
  latitude?: number;
  longitude?: number;
  logoUrl?: string;
  rating?: number;
  isOpen?: boolean;
  openingHours?: string;
  posts?: string[];
}

export default function ExploreScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);
  const { calculateDistance } = useLocation();

  const [region, setRegion] = useState(DEFAULT_REGION);
  const [userLocation, setUserLocation] = useState<{ latitude: number, longitude: number } | null>(null);
  const [shops, setShops] = useState<Shop[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedShop, setSelectedShop] = useState<Shop | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [is3D, setIs3D] = useState(true);
  const [isCategoryBrowse, setIsCategoryBrowse] = useState(false);

  // Animated values for sheet heights
  const nearbyTranslateY = useRef(new Animated.Value(0)).current;
  const categoryTranslateY = useRef(new Animated.Value(0)).current;
  const [nearbyExpanded, setNearbyExpanded] = useState(true);
  const [categoryExpanded, setCategoryExpanded] = useState(true);

  useEffect(() => {
    getCurrentLocation();

    const q = query(collection(db, 'shops'));
    const unsubscribe = onSnapshot(q, async (snapshot) => {
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
          latitude: data.latitude || data.location?.lat,
          longitude: data.longitude || data.location?.lng,
          logoUrl: logoUrl || undefined,
          rating: data.rating || 4.5,
          isOpen: data.isOpen !== false,
          openingHours: data.openingHours,
          posts: data.posts || [],
        });
      }
      setShops(shopData);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High
      });

      const coords = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
      };
      setUserLocation(coords);

      const newRegion = { ...coords, latitudeDelta: 0.02, longitudeDelta: 0.02 };
      setRegion(newRegion);
      mapRef.current?.animateToRegion(newRegion, 800);
    } catch (error) {
      console.error('Error getting location:', error);
    }
  };

  const handleRecenter = () => getCurrentLocation();

  const toggle3D = () => {
    setIs3D(!is3D);
    mapRef.current?.animateCamera({ pitch: is3D ? 0 : 45 }, { duration: 400 });
  };

  // Simplified gesture handlers using onGestureEvent
  const onNearbyGesture = Animated.event(
    [{ nativeEvent: { translationY: nearbyTranslateY } }],
    { useNativeDriver: true }
  );

  const onNearbyHandlerStateChange = (event: any) => {
    if (event.nativeEvent.oldState === State.ACTIVE) {
      const { translationY } = event.nativeEvent;
      const threshold = 50;

      if (translationY > threshold && nearbyExpanded) {
        // Collapse
        Animated.spring(nearbyTranslateY, {
          toValue: NEARBY_MAX - NEARBY_MIN,
          useNativeDriver: true,
          tension: 50,
          friction: 10,
        }).start();
        setNearbyExpanded(false);
      } else if (translationY < -threshold && !nearbyExpanded) {
        // Expand
        Animated.spring(nearbyTranslateY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 50,
          friction: 10,
        }).start();
        setNearbyExpanded(true);
      } else {
        // Snap back
        Animated.spring(nearbyTranslateY, {
          toValue: nearbyExpanded ? 0 : NEARBY_MAX - NEARBY_MIN,
          useNativeDriver: true,
          tension: 50,
          friction: 10,
        }).start();
      }
    }
  };

  const onCategoryGesture = Animated.event(
    [{ nativeEvent: { translationY: categoryTranslateY } }],
    { useNativeDriver: true }
  );

  const onCategoryHandlerStateChange = (event: any) => {
    if (event.nativeEvent.oldState === State.ACTIVE) {
      const { translationY } = event.nativeEvent;
      const threshold = 60;

      if (translationY > threshold && categoryExpanded) {
        Animated.spring(categoryTranslateY, {
          toValue: CATEGORY_MAX - CATEGORY_MIN,
          useNativeDriver: true,
          tension: 50,
          friction: 10,
        }).start();
        setCategoryExpanded(false);
      } else if (translationY < -threshold && !categoryExpanded) {
        Animated.spring(categoryTranslateY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 50,
          friction: 10,
        }).start();
        setCategoryExpanded(true);
      } else {
        Animated.spring(categoryTranslateY, {
          toValue: categoryExpanded ? 0 : CATEGORY_MAX - CATEGORY_MIN,
          useNativeDriver: true,
          tension: 50,
          friction: 10,
        }).start();
      }
    }
  };

  const handleMapInteraction = () => {
    if (categoryExpanded) {
      Animated.spring(categoryTranslateY, {
        toValue: CATEGORY_MAX - CATEGORY_MIN,
        useNativeDriver: true,
        tension: 50,
        friction: 10,
      }).start();
      setCategoryExpanded(false);
    }
  };

  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setSelectedShop(null);

    if (categoryId === 'all') {
      // Return to default view with nearby expanded
      setIsCategoryBrowse(false);
      setNearbyExpanded(true);
      Animated.spring(nearbyTranslateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 50,
        friction: 10,
      }).start();

      // Focus on user location
      if (userLocation) {
        mapRef.current?.animateToRegion({
          ...userLocation,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02
        }, 500);
      }
    } else {
      // Show category browse with expanded sheet
      setIsCategoryBrowse(true);
      setCategoryExpanded(true);
      Animated.spring(categoryTranslateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 50,
        friction: 10,
      }).start();

      // Keep map centered on user location - stay zoomed in
      if (userLocation) {
        // Offset the center SOUTH so user location appears in upper visible area
        // The bottom sheet covers ~50% of screen, so we shift the center down
        const latOffset = 0.025; // Move center south so user dot is higher on screen
        mapRef.current?.animateToRegion({
          latitude: userLocation.latitude - latOffset,
          longitude: userLocation.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05
        }, 500);
      }
    }
  };

  const handleSelectShop = (shop: Shop) => {
    setSelectedShop(shop);
    setIsCategoryBrowse(false);
    if (shop.latitude && shop.longitude) {
      mapRef.current?.animateToRegion({
        latitude: shop.latitude,
        longitude: shop.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01
      }, 500);
    }
  };

  const handleCloseCard = () => setSelectedShop(null);

  const handleCloseCategoryBrowse = () => {
    setIsCategoryBrowse(false);
    setSelectedCategory('all');
    setNearbyExpanded(true);
    Animated.spring(nearbyTranslateY, {
      toValue: 0,
      useNativeDriver: true,
      tension: 50,
      friction: 10,
    }).start();

    if (userLocation) {
      mapRef.current?.animateToRegion({
        ...userLocation,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02
      }, 500);
    }
  };

  const handleDirections = (shop: Shop) => {
    if (shop.latitude && shop.longitude) {
      const url = Platform.select({
        ios: `maps:?daddr=${shop.latitude},${shop.longitude}`,
        android: `geo:${shop.latitude},${shop.longitude}?q=${shop.latitude},${shop.longitude}(${shop.name})`
      });
      if (url) Linking.openURL(url);
    }
  };

  const handleShare = async (shop: Shop) => {
    try {
      await Share.share({ message: `Check out ${shop.name} on SHOXA!`, title: shop.name });
    } catch (error) { }
  };

  const handleSave = (shop: Shop) => console.log('Save:', shop.name);

  const filteredShops = shops.filter(shop => {
    if (selectedCategory !== 'all' && shop.type !== selectedCategory) return false;
    return shop.latitude && shop.longitude;
  });

  const getCategoryLabel = () => CATEGORIES.find(c => c.id === selectedCategory)?.label || 'Shops';

  // Calculate animated heights
  const nearbyAnimatedStyle = {
    transform: [{
      translateY: nearbyTranslateY.interpolate({
        inputRange: [0, NEARBY_MAX - NEARBY_MIN],
        outputRange: [0, NEARBY_MAX - NEARBY_MIN],
        extrapolate: 'clamp',
      })
    }]
  };

  const categoryAnimatedStyle = {
    transform: [{
      translateY: categoryTranslateY.interpolate({
        inputRange: [0, CATEGORY_MAX - CATEGORY_MIN],
        outputRange: [0, CATEGORY_MAX - CATEGORY_MIN],
        extrapolate: 'clamp',
      })
    }]
  };

  return (
    <GestureHandlerRootView style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        region={region}
        onRegionChangeComplete={setRegion}
        onPanDrag={handleMapInteraction}
        showsUserLocation
        showsMyLocationButton={false}
        showsCompass={false}
        showsBuildings={is3D}
        pitchEnabled={is3D}
        rotateEnabled={is3D}
      >
        {filteredShops.map((shop) => (
          <Marker
            key={shop.id}
            coordinate={{ latitude: shop.latitude!, longitude: shop.longitude! }}
            onPress={() => handleSelectShop(shop)}
          >
            <View style={[styles.markerWrap, selectedShop?.id === shop.id && styles.markerSelected]}>
              {shop.logoUrl ? (
                <Image source={{ uri: shop.logoUrl }} style={styles.markerImage} />
              ) : (
                <View style={styles.markerFallback}>
                  <Ionicons name="storefront" size={18} color={COLORS.primary} />
                </View>
              )}
              <View style={styles.markerBadge}>
                <Ionicons
                  name={shop.type === 'restaurant' ? 'restaurant' : shop.type === 'pharmacy' ? 'medkit' : 'cart'}
                  size={10}
                  color={COLORS.white}
                />
              </View>
            </View>
          </Marker>
        ))}
      </MapView>

      {/* Top Bar */}
      <View style={[styles.topBar, { paddingTop: insets.top + 10 }]}>
        {isCategoryBrowse ? (
          <View style={styles.categoryHeader}>
            <Text style={styles.categoryHeaderText}>{getCategoryLabel()}</Text>
            <TouchableOpacity style={styles.closeHeaderBtn} onPress={handleCloseCategoryBrowse}>
              <Ionicons name="close" size={22} color={COLORS.dark} />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.searchBar} onPress={() => router.push('/map-search')}>
            <Ionicons name="search" size={18} color={COLORS.gray} />
            <Text style={styles.searchPlaceholder}>Search shops, products...</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Category Pills */}
      <View style={[styles.categoryWrap, { top: insets.top + 60 }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[styles.categoryPill, selectedCategory === cat.id && styles.categoryPillActive]}
              onPress={() => handleCategorySelect(cat.id)}
            >
              <Ionicons name={cat.icon as any} size={16} color={selectedCategory === cat.id ? COLORS.white : COLORS.primary} />
              <Text style={[styles.categoryText, selectedCategory === cat.id && styles.categoryTextActive]}>{cat.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Right Controls */}
      <View style={[styles.rightControls, { top: insets.top + 120 }]}>
        <TouchableOpacity style={styles.controlBtn} onPress={toggle3D}>
          <Text style={styles.controlBtnText}>{is3D ? '2D' : '3D'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.controlBtn} onPress={handleRecenter}>
          <Ionicons name="locate" size={22} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* Shop Card */}
      {selectedShop && !isCategoryBrowse && (
        <View style={[styles.shopCard, { paddingBottom: insets.bottom + 20 }]}>
          <TouchableOpacity style={styles.closeBtn} onPress={handleCloseCard}>
            <Ionicons name="close" size={18} color={COLORS.gray} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.directionsBtn} onPress={() => handleDirections(selectedShop)}>
            <Ionicons name="navigate" size={20} color={COLORS.primary} />
          </TouchableOpacity>

          <View style={styles.cardHeader}>
            <View style={styles.shopLogo}>
              {selectedShop.logoUrl ? (
                <Image source={{ uri: selectedShop.logoUrl }} style={styles.shopLogoImg} />
              ) : (
                <View style={styles.shopLogoFallback}>
                  <Ionicons name="storefront" size={24} color={COLORS.primary} />
                </View>
              )}
            </View>
            <View style={styles.shopInfo}>
              <Text style={styles.shopName}>{selectedShop.name}</Text>
              <View style={styles.shopMeta}>
                <Ionicons name="star" size={14} color="#FFB800" />
                <Text style={styles.shopRating}>{selectedShop.rating}</Text>
                <Text style={styles.shopDot}>•</Text>
                <Text style={styles.shopType}>{selectedShop.type}</Text>
              </View>
              <View style={styles.statusRow}>
                <Text style={[styles.statusText, { color: selectedShop.isOpen ? COLORS.green : COLORS.red }]}>
                  {selectedShop.isOpen ? 'Open' : 'Closed'}
                </Text>
                <Text style={styles.distanceText}>
                  {' '}• {selectedShop.latitude && selectedShop.longitude ? calculateDistance(selectedShop.latitude, selectedShop.longitude) : '--'}
                </Text>
              </View>
            </View>
          </View>

          <TouchableOpacity style={styles.viewShopBtn} onPress={() => router.push(`/shop/${selectedShop.id}`)}>
            <Text style={styles.viewShopText}>View Shop</Text>
            <Ionicons name="arrow-forward" size={18} color={COLORS.white} />
          </TouchableOpacity>
        </View>
      )}

      {/* Category Browse Sheet */}
      {isCategoryBrowse && (
        <Animated.View style={[styles.categorySheet, categoryAnimatedStyle, { paddingBottom: insets.bottom + 20 }]}>
          <PanGestureHandler
            onGestureEvent={onCategoryGesture}
            onHandlerStateChange={onCategoryHandlerStateChange}
          >
            <Animated.View style={styles.dragHandle}>
              <View style={styles.dragBar} />
            </Animated.View>
          </PanGestureHandler>

          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>{getCategoryLabel()}</Text>
            <TouchableOpacity style={styles.sheetCloseBtn} onPress={handleCloseCategoryBrowse}>
              <Ionicons name="close" size={24} color={COLORS.dark} />
            </TouchableOpacity>
          </View>

          <View style={styles.filterRow}>
            <TouchableOpacity style={styles.filterIconBtn}>
              <Ionicons name="options-outline" size={18} color={COLORS.dark} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.filterChip}>
              <Text style={styles.filterChipText}>Sort by</Text>
              <Ionicons name="chevron-down" size={14} color={COLORS.dark} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.filterChip}>
              <Text style={styles.filterChipText}>Open now</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.filterChip}>
              <Text style={styles.filterChipText}>Top rated</Text>
            </TouchableOpacity>
          </View>

          {categoryExpanded && (
            <ScrollView style={styles.shopList} showsVerticalScrollIndicator={false}>
              {filteredShops.map((shop) => (
                <View key={shop.id} style={styles.shopListItem}>
                  <TouchableOpacity onPress={() => handleSelectShop(shop)}>
                    <Text style={styles.shopListName}>{shop.name}</Text>
                    <View style={styles.shopListMeta}>
                      <Text style={styles.shopListRating}>{shop.rating}</Text>
                      <Ionicons name="star" size={12} color="#FFB800" />
                      <Text style={styles.shopListReviews}> (63) • </Text>
                      <Text style={styles.shopListType}>{shop.type}</Text>
                    </View>
                    <Text style={[styles.shopListStatus, { color: shop.isOpen ? COLORS.green : COLORS.red }]}>
                      {shop.isOpen ? 'Open 24 hours' : 'Closed'} • {shop.latitude && shop.longitude ? calculateDistance(shop.latitude, shop.longitude) : '--'}
                    </Text>
                  </TouchableOpacity>

                  {shop.posts && shop.posts.length > 0 && (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.postGallery}>
                      {shop.posts.map((postUrl, i) => (
                        <Image key={i} source={{ uri: postUrl }} style={styles.postImage} />
                      ))}
                    </ScrollView>
                  )}

                  <View style={styles.actionRow}>
                    <TouchableOpacity style={styles.actionPill} onPress={() => handleDirections(shop)}>
                      <Ionicons name="navigate" size={16} color={COLORS.blue} />
                      <Text style={styles.actionPillText}>Directions</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionPill} onPress={() => handleShare(shop)}>
                      <Ionicons name="share-outline" size={16} color={COLORS.blue} />
                      <Text style={styles.actionPillText}>Share</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionPill} onPress={() => handleSave(shop)}>
                      <Ionicons name="bookmark-outline" size={16} color={COLORS.blue} />
                      <Text style={styles.actionPillText}>Save</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.listDivider} />
                </View>
              ))}
            </ScrollView>
          )}
        </Animated.View>
      )}

      {/* Nearby Sheet */}
      {!selectedShop && !isCategoryBrowse && filteredShops.length > 0 && (
        <Animated.View style={[styles.nearbySheet, nearbyAnimatedStyle, { paddingBottom: insets.bottom + 20 }]}>
          <PanGestureHandler
            onGestureEvent={onNearbyGesture}
            onHandlerStateChange={onNearbyHandlerStateChange}
          >
            <Animated.View style={styles.dragHandle}>
              <View style={styles.dragBar} />
            </Animated.View>
          </PanGestureHandler>

          <View style={styles.nearbyHeader}>
            <Ionicons name="location" size={18} color={COLORS.primary} />
            <Text style={styles.nearbyTitle}>Nearby</Text>
            <Text style={styles.nearbyCount}>{filteredShops.length}</Text>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.nearbyScroll}>
            {filteredShops.slice(0, 8).map((shop) => (
              <TouchableOpacity key={shop.id} style={styles.nearbyCard} onPress={() => handleSelectShop(shop)}>
                <View style={styles.nearbyLogo}>
                  {shop.logoUrl ? (
                    <Image source={{ uri: shop.logoUrl }} style={styles.nearbyLogoImg} />
                  ) : (
                    <Ionicons name="storefront" size={18} color={COLORS.primary} />
                  )}
                </View>
                <Text style={styles.nearbyName} numberOfLines={1}>{shop.name}</Text>
                <View style={styles.nearbyBadge}>
                  <Ionicons name="star" size={10} color="#FFB800" />
                  <Text style={styles.nearbyRating}>{shop.rating}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Animated.View>
      )}

      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      )}
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },

  topBar: { position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: 15 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white,
    paddingHorizontal: 16, height: 46, borderRadius: 23,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3,
  },
  searchPlaceholder: { flex: 1, marginLeft: 10, fontSize: 15, color: COLORS.gray },
  categoryHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.white,
    paddingHorizontal: 16, height: 46, borderRadius: 23,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3,
  },
  categoryHeaderText: { fontSize: 16, fontWeight: '600', color: COLORS.dark },
  closeHeaderBtn: { padding: 4 },

  categoryWrap: { position: 'absolute', left: 0, right: 0 },
  categoryScroll: { paddingHorizontal: 15, gap: 8 },
  categoryPill: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: COLORS.white, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2, gap: 6,
  },
  categoryPillActive: { backgroundColor: COLORS.primary },
  categoryText: { fontSize: 13, fontWeight: '600', color: COLORS.primary },
  categoryTextActive: { color: COLORS.white },

  rightControls: { position: 'absolute', right: 15, gap: 10 },
  controlBtn: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.white, justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4, elevation: 3,
  },
  controlBtnText: { fontSize: 13, fontWeight: 'bold', color: COLORS.primary },

  markerWrap: { width: 48, height: 48 },
  markerSelected: { transform: [{ scale: 1.15 }] },
  markerImage: { width: 44, height: 44, borderRadius: 22, borderWidth: 3, borderColor: COLORS.white },
  markerFallback: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.primaryLight, justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: COLORS.white },
  markerBadge: { position: 'absolute', bottom: 0, right: 0, width: 20, height: 20, borderRadius: 10, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: COLORS.white },

  shopCard: {
    position: 'absolute', bottom: 110, left: 0, right: 0, height: height * 0.22,
    backgroundColor: COLORS.cream, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 12,
  },
  closeBtn: { position: 'absolute', top: 16, right: 16, width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.lightGray, justifyContent: 'center', alignItems: 'center', zIndex: 10 },
  directionsBtn: { position: 'absolute', top: 16, right: 56, width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.primaryLight, justifyContent: 'center', alignItems: 'center', zIndex: 10 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, paddingRight: 80 },
  shopLogo: { width: 56, height: 56, borderRadius: 14, overflow: 'hidden', marginRight: 14 },
  shopLogoImg: { width: 56, height: 56, borderRadius: 14 },
  shopLogoFallback: { width: 56, height: 56, borderRadius: 14, backgroundColor: COLORS.primaryLight, justifyContent: 'center', alignItems: 'center' },
  shopInfo: { flex: 1 },
  shopName: { fontSize: 18, fontWeight: 'bold', color: COLORS.dark, marginBottom: 4 },
  shopMeta: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  shopRating: { fontSize: 14, fontWeight: '600', color: COLORS.dark, marginLeft: 4 },
  shopDot: { marginHorizontal: 6, color: COLORS.gray },
  shopType: { fontSize: 14, color: COLORS.gray, textTransform: 'capitalize' },
  statusRow: { flexDirection: 'row', alignItems: 'center' },
  statusText: { fontSize: 13, fontWeight: '500' },
  distanceText: { fontSize: 13, color: COLORS.gray },
  viewShopBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primary, paddingVertical: 14, borderRadius: 14, gap: 8 },
  viewShopText: { color: COLORS.white, fontSize: 16, fontWeight: 'bold' },

  categorySheet: {
    position: 'absolute', bottom: 110, left: 0, right: 0, height: CATEGORY_MAX,
    backgroundColor: COLORS.background, borderTopLeftRadius: 16, borderTopRightRadius: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 10,
  },
  dragHandle: { alignItems: 'center', paddingVertical: 10 },
  dragBar: { width: 36, height: 4, borderRadius: 2, backgroundColor: COLORS.lightGray },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 8 },
  sheetTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.dark },
  sheetCloseBtn: { padding: 4 },

  filterRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, marginBottom: 10, gap: 6 },
  filterIconBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.white, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: COLORS.lightGray },
  filterChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 18, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.lightGray, gap: 4 },
  filterChipText: { fontSize: 13, color: COLORS.dark },

  shopList: { flex: 1, paddingHorizontal: 16 },
  shopListItem: { paddingVertical: 12 },
  shopListName: { fontSize: 16, fontWeight: '600', color: COLORS.dark, marginBottom: 2 },
  shopListMeta: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  shopListRating: { fontSize: 14, fontWeight: '600', color: COLORS.dark },
  shopListReviews: { fontSize: 14, color: COLORS.gray },
  shopListType: { fontSize: 14, color: COLORS.gray, textTransform: 'capitalize' },
  shopListStatus: { fontSize: 13, fontWeight: '500' },

  postGallery: { marginTop: 12, marginBottom: 8 },
  postImage: { width: 120, height: 80, borderRadius: 8, marginRight: 8 },

  actionRow: { flexDirection: 'row', marginTop: 8, gap: 8 },
  actionPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.lightGray, gap: 6 },
  actionPillText: { fontSize: 13, color: COLORS.blue, fontWeight: '500' },
  listDivider: { height: 1, backgroundColor: COLORS.lightGray, marginTop: 12 },

  nearbySheet: {
    position: 'absolute', bottom: 110, left: 0, right: 0, height: NEARBY_MAX,
    backgroundColor: COLORS.white, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: -3 }, shadowOpacity: 0.12, shadowRadius: 8, elevation: 8,
  },
  nearbyHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 12, gap: 8 },
  nearbyTitle: { fontSize: 16, fontWeight: 'bold', color: COLORS.dark },
  nearbyCount: { fontSize: 13, fontWeight: '600', color: COLORS.gray },
  nearbyScroll: { paddingHorizontal: 16 },
  nearbyCard: { alignItems: 'center', marginRight: 14, width: 70 },
  nearbyLogo: { width: 54, height: 54, borderRadius: 27, backgroundColor: COLORS.primaryLight, justifyContent: 'center', alignItems: 'center', marginBottom: 6, overflow: 'hidden' },
  nearbyLogoImg: { width: 54, height: 54, borderRadius: 27 },
  nearbyName: { fontSize: 11, fontWeight: '600', color: COLORS.dark, textAlign: 'center', marginBottom: 3 },
  nearbyBadge: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  nearbyRating: { fontSize: 10, fontWeight: '600', color: COLORS.dark },

  loadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.8)', justifyContent: 'center', alignItems: 'center' },
});