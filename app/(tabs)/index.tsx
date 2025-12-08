import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, Text, View, TextInput, ScrollView, Image, 
  TouchableOpacity, StatusBar, Dimensions, ActivityIndicator, FlatList
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { collection, query, onSnapshot } from 'firebase/firestore';
import * as Location from 'expo-location';

import { db } from '@/configs/FirebaseConfig';
import { seedDatabase } from '@/utils/seedDatabase'; // Import the seed function

// --- AUTUMN THEME ---
const COLORS = {
  background: '#FDF6E3', // Soft Cream
  primary: '#C67C43',    // Autumn Orange
  secondary: '#A0522D',  // Sienna
  dark: '#333333',       // Dark Gray
  white: '#FFFFFF',
  cardShadow: 'rgba(198, 124, 67, 0.15)'
};

const CATEGORIES = [
  { id: 'All', label: 'All', icon: 'grid-outline' },
  { id: 'Shop', label: 'Shops', icon: 'cart-outline' },
  { id: 'Restaurant', label: 'Food', icon: 'fast-food-outline' },
  { id: 'Hospital', label: 'Hospital', icon: 'medkit-outline' },
  { id: 'Service', label: 'Services', icon: 'construct-outline' },
];

export default function HomeScreen() {
  const router = useRouter();
  const [shops, setShops] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [activeCategory, setActiveCategory] = useState('All');

  // 1. Fetch Location
  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      let loc = await Location.getCurrentPositionAsync({});
      setLocation(loc);
    })();
  }, []);

  // 2. Fetch Shops Real-time
  useEffect(() => {
    const appId = "default-app-id";
    const shopsRef = collection(db, 'artifacts', appId, 'public', 'data', 'shops');
    
    const unsubscribe = onSnapshot(query(shopsRef), (snapshot) => {
      const shopList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setShops(shopList);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Filter Logic
  const filteredShops = shops.filter(shop => {
    const matchesSearch = shop.name_uz?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          shop.type?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = activeCategory === 'All' || shop.type === activeCategory;
    
    return matchesSearch && matchesCategory;
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
      
      {/* Header Section */}
      <SafeAreaView edges={['top']} style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.greeting}>Good Morning,</Text>
            <Text style={styles.appName}>SHOXA</Text>
          </View>
          <Image 
            source={{ uri: 'https://cdn-icons-png.flaticon.com/512/149/149071.png' }} 
            style={styles.profileImage} 
          />
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={COLORS.secondary} style={styles.searchIcon} />
          <TextInput 
            placeholder="Search stores, medicine, food..." 
            placeholderTextColor="#897461"
            style={styles.input}
            value={searchTerm}
            onChangeText={setSearchTerm}
          />
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        
        {/* Map Banner */}
        <TouchableOpacity 
          style={styles.bannerContainer}
          onPress={() => router.push('/(tabs)/explore')}
        >
          <View style={styles.bannerTextContainer}>
            <Text style={styles.bannerTitle}>Explore Nearby</Text>
            <Text style={styles.bannerSubtitle}>See shops on the 3D Map</Text>
            <View style={styles.bannerBtn}>
              <Text style={styles.bannerBtnText}>Open Map</Text>
              <Ionicons name="map" size={16} color={COLORS.white} style={{marginLeft: 5}}/>
            </View>
          </View>
          <Image 
            source={{ uri: 'https://img.freepik.com/free-vector/map-navigation-concept_23-2147983944.jpg' }} 
            style={styles.bannerImage} 
          />
        </TouchableOpacity>

        {/* Categories (Rounded Pill Design) */}
        <Text style={styles.sectionTitle}>Categories</Text>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          contentContainerStyle={styles.categoriesList}
        >
          {CATEGORIES.map((cat) => {
            const isActive = activeCategory === cat.id;
            return (
              <TouchableOpacity 
                key={cat.id} 
                style={[
                  styles.categoryPill, 
                  isActive ? styles.categoryPillActive : styles.categoryPillInactive
                ]}
                onPress={() => setActiveCategory(cat.id)}
              >
                <Ionicons 
                  name={cat.icon as any} 
                  size={18} 
                  color={isActive ? COLORS.white : '#5D4037'} 
                  style={{ marginRight: 6 }}
                />
                <Text style={[
                  styles.categoryText, 
                  isActive ? { color: COLORS.white } : { color: '#5D4037' }
                ]}>{cat.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Shop List */}
        <Text style={styles.sectionTitle}>Popular Near You</Text>
        
        {loading ? (
          <ActivityIndicator size="large" color={COLORS.primary} style={{marginTop: 20}} />
        ) : (
          <View style={styles.gridContainer}>
            {filteredShops.length > 0 ? filteredShops.map((shop) => (
              <TouchableOpacity 
                key={shop.id} 
                style={styles.card}
                onPress={() => router.push(`/shop/${shop.id}`)}
              >
                <Image 
                  source={{ uri: shop.profilePicUrl || 'https://via.placeholder.com/150' }} 
                  style={styles.cardImage} 
                />
                <View style={styles.cardContent}>
                  <Text style={styles.cardTitle} numberOfLines={1}>{shop.name_uz}</Text>
                  <Text style={styles.cardType}>{shop.type}</Text>
                  <View style={styles.cardFooter}>
                    <View style={styles.distanceBadge}>
                      <Ionicons name="location-sharp" size={12} color={COLORS.primary} />
                      <Text style={styles.distanceText}>1.2 km</Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            )) : (
              <View style={{ alignItems: 'center', padding: 20 }}>
                <Text style={{ color: '#888', marginBottom: 10 }}>No shops found.</Text>
                {/* Temporary Seed Button */}
                <TouchableOpacity 
                  onPress={seedDatabase}
                  style={{ backgroundColor: COLORS.secondary, padding: 10, borderRadius: 8 }}
                >
                  <Text style={{ color: 'white' }}>Generate Dummy Data</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { paddingHorizontal: 20, marginBottom: 10 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  greeting: { fontSize: 14, color: COLORS.secondary },
  appName: { fontSize: 24, fontWeight: 'bold', color: COLORS.primary },
  profileImage: { width: 40, height: 40, borderRadius: 20 },
  searchContainer: { flexDirection: 'row', alignItems: 'center' },
  searchIcon: { position: 'absolute', left: 15, zIndex: 1 },
  input: {
    flex: 1, backgroundColor: COLORS.white, height: 50, borderRadius: 15,
    paddingLeft: 45, fontSize: 16, color: COLORS.dark,
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, shadowRadius: 10, elevation: 5
  },
  bannerContainer: {
    marginHorizontal: 20, marginTop: 10, marginBottom: 20, height: 140,
    backgroundColor: '#FFE0B2', borderRadius: 20, flexDirection: 'row', overflow: 'hidden',
    elevation: 3
  },
  bannerTextContainer: { flex: 1, padding: 20, justifyContent: 'center' },
  bannerTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.dark },
  bannerSubtitle: { fontSize: 12, color: '#6D4C41', marginBottom: 10 },
  bannerBtn: { 
    backgroundColor: COLORS.primary, paddingVertical: 8, paddingHorizontal: 12, 
    borderRadius: 8, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center' 
  },
  bannerBtnText: { color: COLORS.white, fontSize: 12, fontWeight: 'bold' },
  bannerImage: { width: 120, height: '100%', resizeMode: 'cover' },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.dark, marginLeft: 20, marginBottom: 10 },
  
  // New Categories Styles
  categoriesList: { paddingLeft: 20, paddingRight: 20, marginBottom: 20 },
  categoryPill: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 10, paddingHorizontal: 16, borderRadius: 30, // Fully rounded
    marginRight: 10, borderWidth: 1
  },
  categoryPillActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  categoryPillInactive: {
    backgroundColor: COLORS.white,
    borderColor: '#E0E0E0', // Light grey border
  },
  categoryText: {
    fontWeight: '600', fontSize: 14
  },

  gridContainer: { paddingHorizontal: 20, paddingBottom: 20 },
  card: {
    backgroundColor: COLORS.white, borderRadius: 16, marginBottom: 15,
    flexDirection: 'row', padding: 10,
    shadowColor: COLORS.cardShadow, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1, shadowRadius: 12, elevation: 3
  },
  cardImage: { width: 80, height: 80, borderRadius: 12, backgroundColor: '#eee' },
  cardContent: { flex: 1, marginLeft: 15, justifyContent: 'center' },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: COLORS.dark },
  cardType: { fontSize: 13, color: COLORS.secondary, marginBottom: 8 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  distanceBadge: { 
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF3E0', 
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 
  },
  distanceText: { fontSize: 12, color: COLORS.primary, marginLeft: 4, fontWeight: '600' }
});