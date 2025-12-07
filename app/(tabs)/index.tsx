import React, { useState, useEffect, useMemo } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TextInput, 
  ScrollView, 
  Image, 
  TouchableOpacity, 
  FlatList,
  Dimensions,
  StatusBar,
  ActivityIndicator,
  Platform // Added to fix the Web crash
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

// --- FIREBASE IMPORTS ---
import { initializeApp } from 'firebase/app';
import { 
  initializeAuth, 
  getReactNativePersistence,
  getAuth,
  onAuthStateChanged, 
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  query, 
  onSnapshot 
} from 'firebase/firestore';

// --- ⚠️ PASTE YOUR FIREBASE CONFIG HERE DIRECTLY ⚠️ ---
// (Environment variables can be tricky in Expo sometimes, let's hardcode to test)
const firebaseConfig = {
  apiKey: "AIzaSy...", // <--- PASTE YOUR REAL API KEY HERE
  authDomain: "shoxa-app.firebaseapp.com",
  projectId: "shoxa-app",
  storageBucket: "shoxa-app.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// --- INITIALIZATION (Fixed for Web & Mobile) ---
let db, auth;
try {
  const app = initializeApp(firebaseConfig);
  db = getFirestore(app);

  // FIX: Check if we are on Web or Native to avoid the crash
  if (Platform.OS === 'web') {
    auth = getAuth(app); // Standard Web Auth
  } else {
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(ReactNativeAsyncStorage)
    });
  }
} catch (e) {
  console.log("Firebase Init Error:", e);
}

// --- THEME ---
const COLORS = {
  bg: '#FFF9F2',        // Cream Background
  primary: '#E86A33',   // Autumn Orange
  secondary: '#2D2D2D', // Dark Text
  textGray: '#888888',
};

// --- DUMMY DATA ---
const PROMOTIONS = [
  { id: '1', title: '50% OFF', subtitle: 'On Plov Center', color: '#FFE0B2' },
  { id: '2', title: 'Free Delivery', subtitle: 'Orders > 100k', color: '#C8E6C9' },
  { id: '3', title: 'New Arrival', subtitle: 'Autumn Collection', color: '#BBDEFB' },
];

const CATEGORIES = [
  { id: '1', name: 'All', icon: 'grid-outline', type: 'all' },
  { id: '2', name: 'Shops', icon: 'cart-outline', type: 'Shop' },
  { id: '3', name: 'Food', icon: 'fast-food-outline', type: 'Restaurant' },
  { id: '4', name: 'Hospital', icon: 'medkit-outline', type: 'Hospital' },
  { id: '5', name: 'Services', icon: 'construct-outline', type: 'Service' },
];

export default function HomeScreen() {
  const [activeCategory, setActiveCategory] = useState('1'); 
  const [searchQuery, setSearchQuery] = useState('');
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    if (!auth || !db) return;

    // 1. Auth Listener
    const unsubAuth = onAuthStateChanged(auth, (u) => setUser(u));

    // 2. Shops Listener
    // MAKE SURE 'artifacts/...' MATCHES YOUR DATABASE PATH EXACTLY
    const shopsRef = collection(db, 'artifacts', firebaseConfig.appId || 'shoxa_app', 'public', 'data', 'shops');
    
    const unsubShops = onSnapshot(query(shopsRef), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setShops(data);
      setLoading(false);
    }, (error) => {
      console.log("Firestore Error (Check Permissions):", error.message);
      setLoading(false);
    });

    return () => { unsubAuth(); unsubShops(); };
  }, []);

  // --- FILTERING ---
  const filteredShops = useMemo(() => {
    let result = shops;

    // Fallback Dummy Data (Only shows if Firestore returns 0 items)
    if (result.length === 0 && !loading) {
       result = [
         { id: '1', name_uz: 'Korzinka', type: 'Shop', rating: 4.8, image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=1000' },
         { id: '2', name_uz: 'Oq Tep Lavash', type: 'Restaurant', rating: 4.5, image: 'https://images.unsplash.com/photo-1561758033-d8f19662cb23?q=80&w=1000' },
         { id: '3', name_uz: 'City Med', type: 'Hospital', rating: 4.9, image: 'https://images.unsplash.com/photo-1538108149393-fbbd81895907?q=80&w=1000' },
       ];
    }

    const selectedType = CATEGORIES.find(c => c.id === activeCategory)?.type;
    if (selectedType && selectedType !== 'all') {
      result = result.filter(s => s.type === selectedType);
    }
    
    if (searchQuery) {
      result = result.filter(s => 
        (s.name_uz && s.name_uz.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (s.type && s.type.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    return result;
  }, [shops, activeCategory, loading, searchQuery]);

  // --- SUB-COMPONENTS ---
  const PromotionCard = ({ item }) => (
    <TouchableOpacity style={[styles.promoCard, { backgroundColor: item.color }]}>
      <View>
        <Text style={styles.promoTitle}>{item.title}</Text>
        <Text style={styles.promoSubtitle}>{item.subtitle}</Text>
      </View>
      <Ionicons name="pricetag" size={20} color="rgba(0,0,0,0.2)" style={{position: 'absolute', right: 10, bottom: 10}} />
    </TouchableOpacity>
  );

  const CategoryPill = ({ item, isActive, onPress }) => (
    <TouchableOpacity 
      onPress={onPress} 
      style={[styles.categoryPill, isActive ? styles.categoryPillActive : styles.categoryPillInactive]}
    >
      <Ionicons name={item.icon} size={18} color={isActive ? '#FFF' : COLORS.secondary} />
      <Text style={[styles.categoryText, isActive ? { color: '#FFF' } : { color: COLORS.secondary }]}>
        {item.name}
      </Text>
    </TouchableOpacity>
  );

  const ShopCard = ({ item }) => (
    <TouchableOpacity style={styles.card}>
      <View style={styles.cardImageContainer}>
        <Image 
          source={{ uri: item.profilePicUrl || item.image || 'https://placehold.co/400x300/C67C43/FFFFFF/png' }} 
          style={styles.cardImage} 
        />
        <View style={styles.ratingBadge}>
          <Ionicons name="star" size={10} color="#FFD700" />
          <Text style={styles.ratingText}>{item.rating || 'New'}</Text>
        </View>
      </View>
      <View style={styles.cardContent}>
        <View style={{flex: 1}}>
            <Text style={styles.cardTitle} numberOfLines={1}>{item.name_uz || item.name_en || 'Shop Name'}</Text>
            <Text style={styles.cardCategory}>{item.type}</Text>
        </View>
        <TouchableOpacity style={styles.addButton}>
            <Ionicons name="add" size={20} color="#FFF" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />
      
      {/* HEADER */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greetingText}>Good Morning,</Text>
          <Text style={styles.welcomeText}>Welcome to SHOXA</Text>
        </View>
        <View style={styles.avatarContainer}>
            <Image source={{ uri: 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png' }} style={styles.avatar} />
        </View>
      </View>

      {/* SEARCH */}
      <View style={styles.searchRow}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={COLORS.textGray} />
          <TextInput 
            placeholder="Search stores, items..." 
            style={styles.searchInput}
            placeholderTextColor={COLORS.textGray}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <TouchableOpacity style={styles.filterButton}>
          <Ionicons name="options-outline" size={22} color="#FFF" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        
        {/* BANNER */}
        <View style={styles.bannerContainer}>
          <View style={styles.bannerContent}>
            <Text style={styles.bannerTitle}>Explore Nearby</Text>
            <Text style={styles.bannerSubtitle}>Find the best spots in Tashkent</Text>
            <TouchableOpacity style={styles.bannerButton}>
              <Text style={styles.bannerButtonText}>Open Map</Text>
            </TouchableOpacity>
          </View>
          <Image 
            source={{ uri: 'https://img.freepik.com/free-photo/happy-woman-holding-laptop_23-2148002621.jpg' }} 
            style={styles.bannerImage}
          />
        </View>

        {/* 1. PROMOTIONS (The Rectangle Ones you wanted) */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionHeader}>Promotions</Text>
          <FlatList 
            horizontal
            data={PROMOTIONS}
            keyExtractor={item => item.id}
            renderItem={({ item }) => <PromotionCard item={item} />}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20 }}
          />
        </View>

        {/* 2. CATEGORIES (The Pill Ones) */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionHeader}>Categories</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20 }}>
            {CATEGORIES.map((cat) => (
              <CategoryPill 
                key={cat.id} 
                item={cat} 
                isActive={activeCategory === cat.id}
                onPress={() => setActiveCategory(cat.id)}
              />
            ))}
          </ScrollView>
        </View>

        {/* 3. RECOMMENDED SHOPS (Grid) */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionHeader}>Recommended</Text>
            <TouchableOpacity><Text style={styles.seeAllText}>See all</Text></TouchableOpacity>
          </View>
          
          <View style={styles.shopGrid}>
             {loading ? <ActivityIndicator color={COLORS.primary} /> : filteredShops.map((item) => (
                <View key={item.id} style={styles.shopWrapper}>
                    <ShopCard item={item} />
                </View>
             ))}
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  
  // Header
  header: {
    paddingHorizontal: 20, paddingTop: 10, marginBottom: 15,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  greetingText: { fontSize: 14, color: COLORS.textGray },
  welcomeText: { fontSize: 22, fontWeight: '800', color: '#4E342E' },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFF' },

  // Search
  searchRow: { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 20 },
  searchBar: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFF', borderRadius: 12, paddingHorizontal: 15, height: 48,
    elevation: 2, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5,
  },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 15, color: COLORS.secondary },
  filterButton: {
    width: 48, height: 48, backgroundColor: COLORS.primary, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center', marginLeft: 12,
    elevation: 4, shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8,
  },

  // Banner
  bannerContainer: {
    marginHorizontal: 20, marginBottom: 20, height: 150,
    backgroundColor: '#FFEBCD', borderRadius: 24, flexDirection: 'row', overflow: 'hidden',
  },
  bannerContent: { flex: 1, padding: 20, justifyContent: 'center', zIndex: 2 },
  bannerTitle: { fontSize: 18, fontWeight: 'bold', color: '#4E342E' },
  bannerSubtitle: { fontSize: 12, color: '#8D6E63', marginTop: 4, marginBottom: 12 },
  bannerButton: { backgroundColor: COLORS.primary, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8, alignSelf: 'flex-start' },
  bannerButtonText: { color: '#FFF', fontWeight: 'bold', fontSize: 12 },
  bannerImage: { width: 130, height: 160, resizeMode: 'cover', position: 'absolute', right: 0, bottom: 0 },

  // Sections
  sectionContainer: { marginBottom: 20 },
  sectionHeader: { fontSize: 18, fontWeight: 'bold', color: '#4E342E', marginBottom: 12, marginLeft: 20 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 12 },
  seeAllText: { color: COLORS.primary, fontWeight: '600', fontSize: 14 },

  // Promotions (Small Rectangles)
  promoCard: {
    width: 130, height: 65, borderRadius: 12, padding: 10, marginRight: 12, justifyContent: 'center',
    elevation: 2, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 3,
  },
  promoTitle: { fontSize: 14, fontWeight: 'bold', color: '#3E2723' },
  promoSubtitle: { fontSize: 10, color: '#5D4037' },

  // Categories (Pills)
  categoryPill: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 16,
    borderRadius: 20, marginRight: 10, backgroundColor: '#FFF',
    borderWidth: 1, borderColor: 'transparent',
    elevation: 2, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 3,
  },
  categoryPillActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  categoryPillInactive: { backgroundColor: '#FFF' },
  categoryText: { marginLeft: 6, fontWeight: '600', fontSize: 13 },

  // Shop Cards
  shopGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 20, justifyContent: 'space-between' },
  shopWrapper: { width: '48%', marginBottom: 15 },
  card: {
    backgroundColor: '#FFF', borderRadius: 16, overflow: 'hidden',
    elevation: 3, shadowColor: "#000", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.1, shadowRadius: 5,
  },
  cardImageContainer: { height: 110, width: '100%', position: 'relative' },
  cardImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  ratingBadge: {
    position: 'absolute', top: 8, right: 8, backgroundColor: '#FFF',
    flexDirection: 'row', alignItems: 'center', paddingVertical: 2, paddingHorizontal: 6, borderRadius: 8,
  },
  ratingText: { fontSize: 10, fontWeight: 'bold', marginLeft: 3 },
  cardContent: { padding: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { fontSize: 14, fontWeight: 'bold', color: '#333' },
  cardCategory: { fontSize: 11, color: COLORS.textGray, marginTop: 2 },
  addButton: {
    backgroundColor: '#333', width: 28, height: 28, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center',
  },
});