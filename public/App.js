import React, { useMemo, useRef } from 'react';
import { StyleSheet, View, Text, Image, TextInput, TouchableOpacity, FlatList, Platform } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import BottomSheet from '@gorhom/bottom-sheet';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

// --- 1. DESIGN SYSTEM (From your Stitch HTML) ---
const COLORS = {
  primary: '#ec7813',       // Burnt Orange (Autumn Vibe)
  secondary: '#B5651D',     // Deep Amber
  background: '#F5F5DC',    // Soft Cream
  textDark: '#4A444B',      // Dark Brownish-Grey
  textLight: '#897461',     // Light Brown
  white: '#FFFFFF',
  green: '#228B22',         // Forest Green for "Open"
};

// Dummy Data (We will connect Firebase later)
const SHOPS = [
  { id: '1', name: 'The Rustic Basket', type: 'Grocery', distance: '0.8 mi', status: 'Open', image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=200' },
  { id: '2', name: 'Autumn Reads', type: 'Bookstore', distance: '1.2 mi', status: 'Closed', image: 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?q=80&w=200' },
  { id: '3', name: 'Harvest Coffee', type: 'Cafe', distance: '0.3 mi', status: 'Open', image: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?q=80&w=200' },
  { id: '4', name: 'Golden Pharmacy', type: 'Medicine', distance: '1.5 mi', status: 'Open', image: 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?q=80&w=200' },
];

// --- 2. COMPONENTS ---
const ShopCard = ({ item }) => (
  <TouchableOpacity style={styles.card} activeOpacity={0.9}>
    <Image source={{ uri: item.image }} style={styles.cardImage} />
    <View style={styles.cardContent}>
      <View style={styles.cardHeader}>
        <Text style={styles.shopName}>{item.name}</Text>
        <Text style={[styles.status, { color: item.status === 'Open' ? COLORS.green : 'red' }]}>
          {item.status}
        </Text>
      </View>
      <Text style={styles.shopType}>{item.type} • {item.distance}</Text>
    </View>
    <View style={styles.actionBtn}>
      <Ionicons name="arrow-forward" size={20} color={COLORS.white} />
    </View>
  </TouchableOpacity>
);

// --- 3. MAIN APP ---
export default function App() {
  const sheetRef = useRef(null);
  
  // Snap Points: 
  // 15% = Just the search bar visible
  // 45% = Half screen
  // 90% = Full list view
  const snapPoints = useMemo(() => ['15%', '45%', '90%'], []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="dark" />

      {/* BACKGROUND: 3D MAP */}
      <View style={styles.container}>
        <MapView
          style={styles.map}
          provider={PROVIDER_GOOGLE} // Remove this line if testing on iOS Simulator without Google Maps
          showsUserLocation={true}
          showsBuildings={true}
          pitchEnabled={true}
          initialRegion={{
            latitude: 41.2995, // Tashkent
            longitude: 69.2401,
            latitudeDelta: 0.02,
            longitudeDelta: 0.02,
          }}
        >
          {/* Example Marker for a Shop */}
          <Marker 
            coordinate={{ latitude: 41.2995, longitude: 69.2401 }} 
            pinColor={COLORS.primary}
            title="Harvest Coffee"
          />
        </MapView>
      </View>

      {/* FOREGROUND: SWIPE UP PANEL */}
      <BottomSheet
        ref={sheetRef}
        index={1} // Opens at 45% height initially
        snapPoints={snapPoints}
        backgroundStyle={{ backgroundColor: COLORS.background }}
        handleIndicatorStyle={{ backgroundColor: COLORS.secondary }}
      >
        <View style={styles.sheetContent}>
          
          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <View style={styles.searchBar}>
              <Ionicons name="search" size={20} color={COLORS.textLight} />
              <TextInput 
                placeholder="Find shops, products, or services..." 
                placeholderTextColor={COLORS.textLight}
                style={styles.searchInput}
              />
            </View>
          </View>

          {/* Title */}
          <Text style={styles.sectionTitle}>Nearby in Tashkent</Text>

          {/* List of Shops */}
          <FlatList
            data={SHOPS}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <ShopCard item={item} />}
            contentContainerStyle={{ paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
          />
        </View>
      </BottomSheet>
    </GestureHandlerRootView>
  );
}

// --- 4. STYLING ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  sheetContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  searchContainer: {
    marginBottom: 20,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    padding: 14,
    borderRadius: 16,
    // Soft shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 3,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: COLORS.textDark,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textDark,
    marginBottom: 15,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: 18,
    padding: 12,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardImage: {
    width: 60,
    height: 60,
    borderRadius: 14,
    backgroundColor: '#eee',
  },
  cardContent: {
    flex: 1,
    marginLeft: 14,
    justifyContent: 'center',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  shopName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  status: {
    fontSize: 12,
    fontWeight: '600',
  },
  shopType: {
    fontSize: 13,
    color: COLORS.textLight,
  },
  actionBtn: {
    backgroundColor: COLORS.primary,
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
});