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
  PanResponder,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

const COLORS = {
  background: '#FDF6E3',
  primary: '#C67C43',
  primaryLight: '#F5D6BA',
  dark: '#333333',
  gray: '#888888',
  lightGray: '#E8E4DF',
  white: '#FFFFFF',
  cream: '#FFF8F0',
  green: '#43A047',
  red: '#E53935',
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
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

const ZOOMED_OUT_DELTA = {
  latitudeDelta: 0.15,
  longitudeDelta: 0.15,
};

// Sheet heights
const NEARBY_COLLAPSED = 60; // Just peek 10%
const NEARBY_EXPANDED = 220;
const CATEGORY_COLLAPSED = 80;
const CATEGORY_EXPANDED = height * 0.5;

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

  // Animations for sheets
  const nearbyHeight = useRef(new Animated.Value(NEARBY_EXPANDED)).current;
  const categoryHeight = useRef(new Animated.Value(CATEGORY_EXPANDED)).current;
  const [nearbyExpanded, setNearbyExpanded] = useState(true);
  const [categoryExpanded, setCategoryExpanded] = useState(true);

  // Pan responders
  const nearbyPan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dy) > 5,
      onPanResponderMove: (_, gs) => {
        if (gs.dy > 0 && nearbyExpanded) {
          // Dragging down from expanded
          nearbyHeight.setValue(Math.max(NEARBY_COLLAPSED, NEARBY_EXPANDED - gs.dy));
        } else if (gs.dy < 0 && !nearbyExpanded) {
          // Dragging up from collapsed
          nearbyHeight.setValue(Math.min(NEARBY_EXPANDED, NEARBY_COLLAPSED - gs.dy));
        }
      },
      onPanResponderRelease: (_, gs) => {
        if (Math.abs(gs.dy) > 30) {
          if (gs.dy > 0) {
            // Swipe down - collapse
            Animated.spring(nearbyHeight, { toValue: NEARBY_COLLAPSED, useNativeDriver: false, friction: 8 }).start();
            setNearbyExpanded(false);
          } else {
            // Swipe up - expand
            Animated.spring(nearbyHeight, { toValue: NEARBY_EXPANDED, useNativeDriver: false, friction: 8 }).start();
            setNearbyExpanded(true);
          }
        } else {
          // Snap back
          Animated.spring(nearbyHeight, {
            toValue: nearbyExpanded ? NEARBY_EXPANDED : NEARBY_COLLAPSED,
            useNativeDriver: false,
            friction: 8,
          }).start();
        }
      },
    })
  ).current;

  const categoryPan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dy) > 5,
      onPanResponderMove: (_, gs) => {
        if (gs.dy > 0 && categoryExpanded) {
          categoryHeight.setValue(Math.max(CATEGORY_COLLAPSED, CATEGORY_EXPANDED - gs.dy));
        } else if (gs.dy < 0 && !categoryExpanded) {
          categoryHeight.setValue(Math.min(CATEGORY_EXPANDED, CATEGORY_COLLAPSED - gs.dy));
        }
      },
      onPanResponderRelease: (_, gs) => {
        if (Math.abs(gs.dy) > 40) {
          if (gs.dy > 0) {
            Animated.spring(categoryHeight, { toValue: CATEGORY_COLLAPSED, useNativeDriver: false, friction: 8 }).start();
            setCategoryExpanded(false);
          } else {
            Animated.spring(categoryHeight, { toValue: CATEGORY_EXPANDED, useNativeDriver: false, friction: 8 }).start();
            setCategoryExpanded(true);
          }
        } else {
          Animated.spring(categoryHeight, {
            toValue: categoryExpanded ? CATEGORY_EXPANDED : CATEGORY_COLLAPSED,
            useNativeDriver: false,
            friction: 8,
          }).start();
        }
      },
    })
  ).current;

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
        accuracy: Location.Accuracy.Balanced,
      });

      const coords = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
      setUserLocation(coords);

      const newRegion = {
        ...coords,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      };

      setRegion(newRegion);
      if (mapRef.current) {
        mapRef.current.animateToRegion(newRegion, 1000);
      }
    } catch (error) {
      console.error('Error getting location:', error);
    }
  };

  const handleRecenter = () => getCurrentLocation();

  const toggle3D = () => {
    setIs3D(!is3D);
    if (mapRef.current) {
      mapRef.current.animateCamera({ pitch: is3D ? 0 : 45 }, { duration: 500 });
    }
  };

  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setSelectedShop(null);

    if (categoryId === 'all') {
      setIsCategoryBrowse(false);
      if (userLocation && mapRef.current) {
        mapRef.current.animateToRegion({
          ...userLocation,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        }, 500);
      }
    } else {
      setIsCategoryBrowse(true);
      setCategoryExpanded(true);
      Animated.spring(categoryHeight, { toValue: CATEGORY_EXPANDED, useNativeDriver: false, friction: 8 }).start();

      // Zoom out centered on user location
      if (mapRef.current && userLocation) {
        mapRef.current.animateToRegion({
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
          ...ZOOMED_OUT_DELTA,
        }, 500);
      }
    }
  };

  const handleSelectShop = (shop: Shop) => {
    setSelectedShop(shop);
    setIsCategoryBrowse(false);

    if (mapRef.current && shop.latitude && shop.longitude) {
      mapRef.current.animateToRegion({
        latitude: shop.latitude,
        longitude: shop.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }, 500);
    }
  };

  const handleCloseCard = () => {
    setSelectedShop(null);
  };

  const handleCloseCategoryBrowse = () => {
    setIsCategoryBrowse(false);
    setSelectedCategory('all');
    if (userLocation && mapRef.current) {
      mapRef.current.animateToRegion({
        ...userLocation,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      }, 500);
    }
  };

  const handleDirections = () => {
    if (selectedShop?.latitude && selectedShop?.longitude) {
      const url = Platform.select({
        ios: `maps:?daddr=${selectedShop.latitude},${selectedShop.longitude}`,
        android: `geo:${selectedShop.latitude},${selectedShop.longitude}?q=${selectedShop.latitude},${selectedShop.longitude}(${selectedShop.name})`
      });
      if (url) Linking.openURL(url);
    }
  };

  const filteredShops = shops.filter(shop => {
    if (selectedCategory !== 'all' && shop.type !== selectedCategory) return false;
    return shop.latitude && shop.longitude;
  });

  const getCategoryLabel = () => {
    const cat = CATEGORIES.find(c => c.id === selectedCategory);
    return cat?.label || 'Shops';
  };

  return (
    <View style={styles.container}>
      {/* Map */}
      <MapView
        ref={mapRef}
        style={styles.map}
        region={region}
        onRegionChangeComplete={setRegion}
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
            <View style={[styles.markerWrap, selectedShop?.id === shop.id && styles.markerWrapSelected]}>
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
            <TouchableOpacity style={styles.categoryCloseBtn} onPress={handleCloseCategoryBrowse}>
              <Ionicons name="close" size={22} color={COLORS.dark} />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.searchBar}
            onPress={() => router.push('/map-search')}
          >
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
              <Ionicons
                name={cat.icon as any}
                size={16}
                color={selectedCategory === cat.id ? COLORS.white : COLORS.primary}
              />
              <Text style={[styles.categoryText, selectedCategory === cat.id && styles.categoryTextActive]}>
                {cat.label}
              </Text>
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

      {/* Shop Card - Compact */}
      {selectedShop && !isCategoryBrowse && (
        <View style={[styles.shopCard, { paddingBottom: insets.bottom + 20 }]}>
          <TouchableOpacity style={styles.closeBtn} onPress={handleCloseCard}>
            <Ionicons name="close" size={18} color={COLORS.gray} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.directionsBtn} onPress={handleDirections}>
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
                <View style={[styles.statusDot, { backgroundColor: selectedShop.isOpen ? COLORS.green : COLORS.red }]} />
                <Text style={[styles.statusText, { color: selectedShop.isOpen ? COLORS.green : COLORS.red }]}>
                  {selectedShop.isOpen ? 'Open' : 'Closed'}
                </Text>
                <Text style={styles.distanceText}>
                  • {selectedShop.latitude && selectedShop.longitude
                    ? calculateDistance(selectedShop.latitude, selectedShop.longitude)
                    : '--'}
                </Text>
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={styles.viewShopBtn}
            onPress={() => router.push(`/shop/${selectedShop.id}`)}
          >
            <Text style={styles.viewShopText}>View Shop</Text>
            <Ionicons name="arrow-forward" size={18} color={COLORS.white} />
          </TouchableOpacity>
        </View>
      )}

      {/* Category Browse Sheet - Draggable */}
      {isCategoryBrowse && (
        <Animated.View
          style={[
            styles.categorySheet,
            {
              height: categoryHeight,
              paddingBottom: insets.bottom + 20,
            }
          ]}
        >
          {/* Drag Handle */}
          <View {...categoryPan.panHandlers} style={styles.dragHandle}>
            <View style={styles.dragBar} />
          </View>

          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>{getCategoryLabel()}</Text>
            <View style={styles.sheetActions}>
              <TouchableOpacity style={styles.filterChip}>
                <Ionicons name="funnel-outline" size={14} color={COLORS.primary} />
                <Text style={styles.filterText}>Filters</Text>
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView style={styles.sheetList} showsVerticalScrollIndicator={false}>
            {filteredShops.map((shop) => (
              <TouchableOpacity
                key={shop.id}
                style={styles.listCard}
                onPress={() => handleSelectShop(shop)}
              >
                <View style={styles.listLogo}>
                  {shop.logoUrl ? (
                    <Image source={{ uri: shop.logoUrl }} style={styles.listLogoImg} />
                  ) : (
                    <Ionicons name="storefront" size={20} color={COLORS.primary} />
                  )}
                </View>
                <View style={styles.listContent}>
                  <Text style={styles.listName}>{shop.name}</Text>
                  <View style={styles.listMeta}>
                    <Ionicons name="star" size={12} color="#FFB800" />
                    <Text style={styles.listRating}>{shop.rating}</Text>
                    <Text style={styles.listDot}>•</Text>
                    <Text style={styles.listDistance}>
                      {shop.latitude && shop.longitude
                        ? calculateDistance(shop.latitude, shop.longitude)
                        : '--'}
                    </Text>
                  </View>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: shop.isOpen ? COLORS.green : COLORS.red }]}>
                  <Text style={styles.statusBadgeText}>{shop.isOpen ? 'Open' : 'Closed'}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Animated.View>
      )}

      {/* Nearby - Compact & Draggable */}
      {!selectedShop && !isCategoryBrowse && filteredShops.length > 0 && (
        <Animated.View style={[styles.nearbySheet, { height: nearbyHeight, paddingBottom: insets.bottom + 20 }]}>
          {/* Drag Handle */}
          <View {...nearbyPan.panHandlers} style={styles.dragHandle}>
            <View style={styles.dragBar} />
          </View>

          <View style={styles.nearbyHeader}>
            <Ionicons name="location" size={18} color={COLORS.primary} />
            <Text style={styles.nearbyTitle}>Nearby</Text>
            <Text style={styles.nearbyCount}>{filteredShops.length}</Text>
          </View>

          {nearbyExpanded && (
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
          )}
        </Animated.View>
      )}

      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  map: { flex: 1 },

  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 15,
    paddingBottom: 10,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    paddingHorizontal: 16,
    height: 46,
    borderRadius: 23,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchPlaceholder: {
    flex: 1,
    marginLeft: 10,
    fontSize: 15,
    color: COLORS.gray,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.white,
    paddingHorizontal: 16,
    height: 46,
    borderRadius: 23,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  categoryHeaderText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.dark,
  },
  categoryCloseBtn: {
    padding: 4,
  },

  categoryWrap: { position: 'absolute', left: 0, right: 0 },
  categoryScroll: { paddingHorizontal: 15, gap: 8 },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    gap: 6,
  },
  categoryPillActive: { backgroundColor: COLORS.primary },
  categoryText: { fontSize: 13, fontWeight: '600', color: COLORS.primary },
  categoryTextActive: { color: COLORS.white },

  rightControls: { position: 'absolute', right: 15, gap: 10 },
  controlBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  controlBtnText: { fontSize: 13, fontWeight: 'bold', color: COLORS.primary },

  markerWrap: { width: 48, height: 48, position: 'relative' },
  markerWrapSelected: { transform: [{ scale: 1.15 }] },
  markerImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 3,
    borderColor: COLORS.white,
  },
  markerFallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: COLORS.white,
  },
  markerBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.white,
  },

  // Shop Card
  shopCard: {
    position: 'absolute',
    bottom: 110,
    left: 0,
    right: 0,
    height: height * 0.22,
    backgroundColor: COLORS.cream,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 12,
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  directionsBtn: {
    position: 'absolute',
    top: 16,
    right: 56,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingRight: 80,
  },
  shopLogo: {
    width: 56,
    height: 56,
    borderRadius: 14,
    overflow: 'hidden',
    marginRight: 14,
  },
  shopLogoImg: { width: 56, height: 56, borderRadius: 14 },
  shopLogoFallback: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shopInfo: { flex: 1 },
  shopName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.dark,
    marginBottom: 4,
  },
  shopMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  shopRating: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.dark,
    marginLeft: 4,
  },
  shopDot: { marginHorizontal: 6, color: COLORS.gray },
  shopType: {
    fontSize: 14,
    color: COLORS.gray,
    textTransform: 'capitalize',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: { fontSize: 13, fontWeight: '500' },
  distanceText: { fontSize: 13, color: COLORS.gray, marginLeft: 4 },

  viewShopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
  },
  viewShopText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
  },

  // Category Sheet - Sleek & Draggable
  categorySheet: {
    position: 'absolute',
    bottom: 110,
    left: 0,
    right: 0,
    backgroundColor: COLORS.cream,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 12,
  },
  dragHandle: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  dragBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.lightGray,
  },
  sheetHeader: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.dark,
    marginBottom: 10,
  },
  sheetActions: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: COLORS.primaryLight,
    gap: 4,
  },
  filterText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
  },
  sheetList: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  listCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  listLogo: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  listLogoImg: {
    width: 44,
    height: 44,
    borderRadius: 12,
  },
  listContent: { flex: 1 },
  listName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.dark,
    marginBottom: 4,
  },
  listMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  listRating: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.dark,
    marginLeft: 3,
  },
  listDot: {
    marginHorizontal: 5,
    color: COLORS.gray,
    fontSize: 12,
  },
  listDistance: {
    fontSize: 12,
    color: COLORS.gray,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.white,
  },

  // Nearby Sheet - Compact & Draggable
  nearbySheet: {
    position: 'absolute',
    bottom: 110,
    left: 0,
    right: 0,
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 8,
  },
  nearbyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 8,
  },
  nearbyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.dark,
  },
  nearbyCount: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.gray,
  },
  nearbyScroll: {
    paddingHorizontal: 16,
  },
  nearbyCard: {
    alignItems: 'center',
    marginRight: 14,
    width: 70,
  },
  nearbyLogo: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
    overflow: 'hidden',
  },
  nearbyLogoImg: {
    width: 54,
    height: 54,
    borderRadius: 27,
  },
  nearbyName: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.dark,
    textAlign: 'center',
    marginBottom: 3,
  },
  nearbyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  nearbyRating: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.dark,
  },

  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});