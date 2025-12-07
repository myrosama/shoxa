import React, { useMemo, useRef, useEffect } from 'react';
import { StyleSheet, View, Text, TextInput, FlatList, Dimensions, Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';

// Import our custom components and styles
import { MapView, Marker, PROVIDER_GOOGLE } from '../../components/LocationMap'; // Use the web-safe import we made earlier
import { ShopCard } from '../../components/ShopCard';
import { COLORS, AUTUMN_MAP_STYLE } from '../../constants/MapTheme';

const { width, height } = Dimensions.get('window');

// Data
const SHOPS = [
  { id: '1', name: 'The Rustic Basket', type: 'Grocery', distance: '0.8 km', status: 'Open', image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=200' },
  { id: '2', name: 'Autumn Reads', type: 'Bookstore', distance: '1.2 km', status: 'Closed', image: 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?q=80&w=200' },
  { id: '3', name: 'Harvest Coffee', type: 'Cafe', distance: '0.3 km', status: 'Open', image: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?q=80&w=200' },
  { id: '4', name: 'Golden Pharmacy', type: 'Medicine', distance: '1.5 km', status: 'Open', image: 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?q=80&w=200' },
  { id: '5', name: 'Tashkent Airport', type: 'Travel', distance: '4.2 km', status: 'Open', image: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?q=80&w=200' },
];

export default function HomeScreen() {
  const mapRef = useRef<any>(null);
  const sheetRef = useRef<BottomSheet>(null);
  
  // 1. Snap Points: 
  // '15%' = Just search bar (Map is full focus)
  // '40%' = Map + List split
  // '95%' = Full List (Map hidden behind)
  const snapPoints = useMemo(() => ['15%', '40%', '95%'], []);

  // 2. Force 3D Camera on Load
  useEffect(() => {
    if (mapRef.current && Platform.OS !== 'web') {
      mapRef.current.animateCamera({
        center: { latitude: 41.2995, longitude: 69.2401 },
        pitch: 45, // 45 degree angle for 3D buildings
        heading: 0,
        altitude: 1000,
        zoom: 16,
      }, { duration: 2000 });
    }
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* A. 3D MAP LAYER */}
      <View style={StyleSheet.absoluteFillObject}>
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFillObject}
          provider={PROVIDER_GOOGLE}
          customMapStyle={AUTUMN_MAP_STYLE} // Our custom JSON
          showsUserLocation={true}
          showsMyLocationButton={false} // Hide default button
          showsCompass={false}          // Hide default button
          showsBuildings={true}         // Enable 3D buildings
          pitchEnabled={true}
          initialRegion={{
            latitude: 41.2995,
            longitude: 69.2401,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }}
        >
          {/* Custom Marker */}
          <Marker 
            coordinate={{ latitude: 41.2995, longitude: 69.2401 }} 
            pinColor={COLORS.primary}
          />
        </MapView>

        {/* Floating "Current Location" Button (Custom) */}
        <View style={styles.fabContainer}>
          <View style={styles.fab}>
            <Ionicons name="navigate" size={24} color={COLORS.primary} />
          </View>
        </View>
      </View>

      {/* B. INTERACTIVE PANEL */}
      <BottomSheet
        ref={sheetRef}
        index={1} // Start at 40%
        snapPoints={snapPoints}
        backgroundStyle={styles.sheetBackground}
        handleIndicatorStyle={styles.sheetHandle}
      >
        <View style={styles.sheetContent}>
          
          {/* Floating Search Bar Look */}
          <View style={styles.searchContainer}>
            <View style={styles.searchBar}>
              <Ionicons name="search" size={20} color={COLORS.textSub} />
              <TextInput 
                placeholder="What are you looking for?" 
                placeholderTextColor={COLORS.textSub}
                style={styles.searchInput}
              />
              <View style={styles.filterBtn}>
                <Ionicons name="options-outline" size={20} color={COLORS.primary} />
              </View>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Nearby in Tashkent</Text>

          {/* Scrollable List */}
          <BottomSheetScrollView 
            contentContainerStyle={{ paddingBottom: 100 }}
            showsVerticalScrollIndicator={false}
          >
            {SHOPS.map((item) => (
              <ShopCard key={item.id} item={item} />
            ))}
            <View style={{ height: 50 }} />
          </BottomSheetScrollView>
        </View>
      </BottomSheet>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  sheetBackground: {
    backgroundColor: COLORS.bg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
  },
  sheetHandle: {
    backgroundColor: '#DDD',
    width: 60,
  },
  sheetContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  searchContainer: {
    marginBottom: 20,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 20,
    // Neumorphic style shadow
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.textMain,
  },
  filterBtn: {
    padding: 4,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.textMain,
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  // Floating Map Button
  fabContainer: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 1, // Below the bottom sheet but above map
  },
  fab: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
  }
});