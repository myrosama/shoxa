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

// Zoomed out region for category browse
const ZOOMED_OUT_DELTA = {
  latitudeDelta: 0.15,
  longitudeDelta: 0.15,
};

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

  // Animation for bottom sheet
  const sheetAnim = useRef(new Animated.Value(0)).current;

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
          logoUrl,
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

  // Handle category selection - zoom out and show list
  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setSelectedShop(null);

    if (categoryId === 'all') {
      // Exit category browse mode
      setIsCategoryBrowse(false);
      Animated.timing(sheetAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start();
      // Zoom back to user location
      if (userLocation && mapRef.current) {
        mapRef.current.animateToRegion({
          ...userLocation,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        }, 500);
      }
    } else {
      // Enter category browse mode - zoom out
      setIsCategoryBrowse(true);
      Animated.spring(sheetAnim, { toValue: 1, useNativeDriver: true, friction: 8 }).start();
      if (mapRef.current && userLocation) {
        mapRef.current.animateToRegion({
          ...userLocation,
          ...ZOOMED_OUT_DELTA,
        }, 500);
      }
    }
  };

  const handleSelectShop = (shop: Shop) => {
    setSelectedShop(shop);
    setIsCategoryBrowse(false);
    Animated.timing(sheetAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start();

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
    Animated.timing(sheetAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start();
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
          // Category browse header
          <View style={styles.categoryHeader}>
            <Text style={styles.categoryHeaderText}>{getCategoryLabel()}</Text>
            <TouchableOpacity style={styles.categoryCloseBtn} onPress={handleCloseCategoryBrowse}>
              <Ionicons name="close" size={22} color={COLORS.dark} />
            </TouchableOpacity>
          </View>
        ) : (
          // Normal search bar
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

      {/* Shop Card - Simple & Clean - 45% height */}
      {selectedShop && !isCategoryBrowse && (
        <View style={[styles.shopCard, { paddingBottom: insets.bottom + 20 }]}>
          {/* Close Button */}
          <TouchableOpacity style={styles.closeBtn} onPress={handleCloseCard}>
            <Ionicons name="close" size={18} color={COLORS.gray} />
          </TouchableOpacity>

          {/* Directions button - right side */}
          <TouchableOpacity style={styles.directionsBtn} onPress={handleDirections}>
            <Ionicons name="navigate" size={20} color={COLORS.primary} />
          </TouchableOpacity>

          {/* Header Row */}
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

          {/* View Shop Button */}
          <TouchableOpacity
            style={styles.viewShopBtn}
            onPress={() => router.push(`/shop/${selectedShop.id}`)}
          >
            <Text style={styles.viewShopText}>View Shop</Text>
            <Ionicons name="arrow-forward" size={18} color={COLORS.white} />
          </TouchableOpacity>
        </View>
      )}

      {/* Category Browse Sheet - List of filtered shops */}
      {isCategoryBrowse && (
        <Animated.View
          style={[
            styles.categorySheet,
            {
              paddingBottom: insets.bottom + 100,
              transform: [{
                translateY: sheetAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [300, 0],
                })
              }]
            }
          ]}
        >
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>{getCategoryLabel()}</Text>
            <View style={styles.sheetFilters}>
              <TouchableOpacity style={styles.filterBtn}>
                <Text style={styles.filterText}>Open Now</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.filterBtn}>
                <Text style={styles.filterText}>Sort by Distance</Text>
                <Ionicons name="chevron-down" size={16} color={COLORS.dark} />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView style={styles.sheetList} showsVerticalScrollIndicator={false}>
            {filteredShops.map((shop) => (
              <TouchableOpacity
                key={shop.id}
                style={styles.listItem}
                onPress={() => handleSelectShop(shop)}
              >
                <View style={styles.listItemLogo}>
                  {shop.logoUrl ? (
                    <Image source={{ uri: shop.logoUrl }} style={styles.listItemLogoImg} />
                  ) : (
                    <Ionicons name="storefront" size={22} color={COLORS.primary} />
                  )}
                </View>
                <View style={styles.listItemInfo}>
                  <Text style={styles.listItemName}>{shop.name}</Text>
                  <Text style={styles.listItemMeta}>
                    {shop.type} • {shop.latitude && shop.longitude
                      ? calculateDistance(shop.latitude, shop.longitude)
                      : '--'}
                  </Text>
                  <View style={styles.listItemStatus}>
                    <View style={[styles.statusDotSmall, { backgroundColor: shop.isOpen ? COLORS.green : COLORS.red }]} />
                    <Text style={[styles.statusTextSmall, { color: shop.isOpen ? COLORS.green : COLORS.red }]}>
                      {shop.isOpen ? 'Open' : 'Closed'}
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color={COLORS.lightGray} />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Animated.View>
      )}

      {/* Nearby - Only when not in category browse and no shop selected */}
      {!selectedShop && !isCategoryBrowse && filteredShops.length > 0 && (
        <View style={[styles.nearbyCard, { paddingBottom: insets.bottom + 100 }]}>
          <Text style={styles.nearbyTitle}>Nearby</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {filteredShops.slice(0, 6).map((shop) => (
              <TouchableOpacity key={shop.id} style={styles.nearbyItem} onPress={() => handleSelectShop(shop)}>
                <View style={styles.nearbyLogo}>
                  {shop.logoUrl ? (
                    <Image source={{ uri: shop.logoUrl }} style={styles.nearbyLogoImg} />
                  ) : (
                    <Ionicons name="storefront" size={22} color={COLORS.primary} />
                  )}
                </View>
                <Text style={styles.nearbyName} numberOfLines={1}>{shop.name}</Text>
                <Text style={styles.nearbyType}>{shop.type}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
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

  // Top Bar
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

  // Categories
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

  // Right Controls
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

  // Markers
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

  // Shop Card - 45% height, simple
  shopCard: {
    position: 'absolute',
    bottom: 0,
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

  // View Shop Button
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

  // Category Browse Sheet
  categorySheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: height * 0.45,
    backgroundColor: COLORS.cream,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 12,
  },
  sheetHeader: {
    padding: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.dark,
    marginBottom: 12,
  },
  sheetFilters: {
    flexDirection: 'row',
    gap: 10,
  },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    gap: 4,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.dark,
  },
  sheetList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  listItemLogo: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    overflow: 'hidden',
  },
  listItemLogoImg: {
    width: 50,
    height: 50,
    borderRadius: 12,
  },
  listItemInfo: { flex: 1 },
  listItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.dark,
    marginBottom: 2,
  },
  listItemMeta: {
    fontSize: 13,
    color: COLORS.gray,
    textTransform: 'capitalize',
    marginBottom: 2,
  },
  listItemStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDotSmall: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  statusTextSmall: {
    fontSize: 12,
    fontWeight: '500',
  },

  // Nearby
  nearbyCard: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10,
  },
  nearbyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.dark,
    marginBottom: 12,
  },
  nearbyItem: {
    alignItems: 'center',
    marginRight: 16,
    width: 80,
  },
  nearbyLogo: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    overflow: 'hidden',
  },
  nearbyLogoImg: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  nearbyName: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.dark,
    textAlign: 'center',
  },
  nearbyType: {
    fontSize: 10,
    color: COLORS.gray,
    textTransform: 'capitalize',
  },

  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});