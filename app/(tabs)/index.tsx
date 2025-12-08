import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, Text, View, ScrollView, Image, 
  TouchableOpacity, StatusBar, Dimensions, ActivityIndicator, Pressable
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
const HEADER_HEIGHT = 80; // Height of the "Welcome" area

export default function HomeScreen() {
  const router = useRouter();
  const [shops, setShops] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('All');
  
  // Fetch Shops
  useEffect(() => {
    const unsubscribe = onSnapshot(query(collection(db, 'artifacts', 'default-app-id', 'public', 'data', 'shops')), (snapshot) => {
      setShops(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const filteredShops = shops.filter(shop => activeCategory === 'All' || shop.type === activeCategory);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
      
      {/* LAYER 1: Fixed Welcome Header (Stays behind) */}
      <SafeAreaView edges={['top']} style={styles.fixedHeader}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.greeting}>Good Morning,</Text>
            <Text style={styles.appName}>Welcome to SHOXA</Text>
          </View>
          <View style={styles.logoWrapper}>
             <Image source={require('@/assets/logo.png')} style={styles.logo} resizeMode="contain" />
          </View>
        </View>
      </SafeAreaView>

      {/* LAYER 2: Scrollable Content (Covers Layer 1) */}
      <ScrollView 
        contentContainerStyle={{ paddingTop: HEADER_HEIGHT + 40, paddingBottom: 120 }} 
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[1]} // Index 1 is the Combined Sticky Header
      >
        
        {/* Index 0: Transparent Spacer (Allows seeing the header initially) */}
        <View style={{ height: 10 }} />

        {/* Index 1: STICKY SEARCH BAR */}
        <View style={styles.stickyContainer}>
          <Pressable onPress={() => router.push('/search')} style={styles.searchContainer}>
            <Ionicons name="search" size={20} color={COLORS.secondary} style={styles.searchIcon} />
            <Text style={styles.searchInputPlaceholder}>Search stores, medicine, food...</Text>
          </Pressable>
        </View>

        {/* Index 2: Banner (Scrolls) */}
        <View style={styles.contentBackground}>
          <TouchableOpacity style={styles.bannerContainer} onPress={() => router.push('/(tabs)/explore')}>
            <View style={styles.bannerTextContainer}>
              <Text style={styles.bannerTitle}>Explore Nearby</Text>
              <Text style={styles.bannerSubtitle}>See shops on the 3D Map</Text>
              <View style={styles.bannerBtn}>
                <Text style={styles.bannerBtnText}>Open Map</Text>
                <Ionicons name="map" size={16} color={COLORS.white} style={{marginLeft: 5}}/>
              </View>
            </View>
            <Image source={{ uri: 'https://img.freepik.com/free-vector/map-navigation-concept_23-2147983944.jpg' }} style={styles.bannerImage} />
          </TouchableOpacity>

          {/* Categories (Below Banner) */}
          <View style={styles.categoriesWrapper}>
            <Text style={styles.sectionTitle}>Categories</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesList}>
              {CATEGORIES.map((cat) => {
                const isActive = activeCategory === cat.id;
                return (
                  <TouchableOpacity 
                    key={cat.id} 
                    style={[styles.categoryPill, isActive ? styles.categoryPillActive : styles.categoryPillInactive]}
                    onPress={() => setActiveCategory(cat.id)}
                  >
                    <Ionicons name={cat.icon as any} size={18} color={isActive ? COLORS.white : '#5D4037'} style={{ marginRight: 6 }}/>
                    <Text style={[styles.categoryText, isActive ? { color: COLORS.white } : { color: '#5D4037' }]}>{cat.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Shop List */}
          <View style={styles.listSection}>
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
                        {/* New Location Icon */}
                        <TouchableOpacity 
                          style={styles.locationButton}
                          onPress={(e) => { e.stopPropagation(); /* Add Nav Logic Later */ }}
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
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  
  // Layer 1: Fixed Header
  fixedHeader: { 
    position: 'absolute', top: 0, left: 0, right: 0, 
    zIndex: 0, paddingHorizontal: 20, 
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  greeting: { fontSize: 14, color: COLORS.secondary, marginBottom: 2 },
  appName: { fontSize: 26, fontWeight: '800', color: '#5D4037' },
  logoWrapper: { width: 50, height: 50, backgroundColor: COLORS.white, borderRadius: 25, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.1, elevation: 2 },
  logo: { width: 30, height: 30 },

  // Layer 2: Content
  stickyContainer: {
    backgroundColor: COLORS.background, // Match background to look seamless
    paddingHorizontal: 20,
    paddingBottom: 15,
    paddingTop: 10,
    zIndex: 10
  },
  searchContainer: { 
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, 
    height: 50, borderRadius: 15, paddingLeft: 15, 
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, elevation: 3
  },
  searchIcon: { marginRight: 10 },
  searchInputPlaceholder: { color: '#897461', fontSize: 16 },

  // Background for scrolling content to cover header
  contentBackground: {
    backgroundColor: COLORS.background, 
    minHeight: 500,
  },

  // Body
  bannerContainer: { marginHorizontal: 20, marginBottom: 20, height: 140, backgroundColor: '#FFE0B2', borderRadius: 20, flexDirection: 'row', overflow: 'hidden', elevation: 3 },
  bannerTextContainer: { flex: 1, padding: 20, justifyContent: 'center' },
  bannerTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.dark },
  bannerSubtitle: { fontSize: 12, color: '#6D4C41', marginBottom: 10 },
  bannerBtn: { backgroundColor: COLORS.primary, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center' },
  bannerBtnText: { color: COLORS.white, fontSize: 12, fontWeight: 'bold' },
  bannerImage: { width: 120, height: '100%', resizeMode: 'cover' },

  categoriesWrapper: { marginBottom: 10 },
  categoriesList: { paddingLeft: 20, paddingRight: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.dark, marginLeft: 20, marginBottom: 10 },
  categoryPill: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 30, marginRight: 10, borderWidth: 1 },
  categoryPillActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  categoryPillInactive: { backgroundColor: COLORS.white, borderColor: '#E0E0E0' },
  categoryText: { fontWeight: '600', fontSize: 14 },

  listSection: { paddingHorizontal: 20 },
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
});