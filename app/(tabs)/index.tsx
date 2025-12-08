import React, { useState, useEffect, useMemo } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TextInput, 
  ScrollView, 
  Image, 
  TouchableOpacity, 
  Dimensions,
  StatusBar,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

// --- FIREBASE CONFIG ---
import { initializeApp } from 'firebase/app';
import { 
  initializeAuth, 
  getReactNativePersistence,
  getAuth,
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  query, 
  onSnapshot 
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDd0PkrXLPT8NDKEJuwTUmFb1o0SPuHN7U",
  authDomain: "shoxabranch.firebaseapp.com",
  projectId: "shoxabranch",
  storageBucket: "shoxabranch.firebasestorage.app",
  messagingSenderId: "274790573053",
  appId: "1:274790573053:web:7f0df0f443e27c22bcef94",
  measurementId: "G-DYXYK6NCYK"
};

// --- INIT ---
let db, auth;
try {
  const app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  if (Platform.OS === 'web') {
    auth = getAuth(app);
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
  bg: '#FAFAFA',       
  primary: '#E86A33',  // SHOXA Orange
  primaryLight: '#FFF0E6',
  secondary: '#2D2D2D',
  textGray: '#888888',
  white: '#FFFFFF',
};

// --- DATA ---
const BANNERS = [
  { id: '1', image: 'https://img.freepik.com/free-psd/food-menu-restaurant-web-banner-template_23-2148962365.jpg' },
  { id: '2', image: 'https://img.freepik.com/free-psd/horizontal-banner-template-big-sale-with-woman-shopping-bags_23-2148786755.jpg' },
  { id: '3', image: 'https://img.freepik.com/free-vector/flat-supermarket-twitch-banner_23-2149356079.jpg' },
];

const CATEGORIES = [
  { id: '1', name: 'Shops', icon: 'cart-outline' },
  { id: '2', name: 'Restaurants', icon: 'restaurant-outline' },
  { id: '3', name: 'Cafes', icon: 'cafe-outline' },
  { id: '4', name: 'Pharmacy', icon: 'medkit-outline' },
  { id: '5', name: 'Hospital', icon: 'pulse-outline' },
];

const FILTERS = [
  { id: '1', label: '', icon: 'options-outline', width: 44 },
  { id: '2', label: 'Aksiyalar', icon: 'flame', color: '#FF4081' },
  { id: '3', label: 'Top', icon: 'ribbon', color: '#FFD700' },
  { id: '4', label: 'Yangiliklar', icon: 'sparkles', color: '#7B61FF' },
  { id: '5', label: 'Fast Delivery', icon: 'bicycle', color: COLORS.primary },
];

export default function HomeScreen() {
  const [activeTab, setActiveTab] = useState('Home');
  const [activeCategory, setActiveCategory] = useState(null); 
  const [searchQuery, setSearchQuery] = useState('');
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- DATA FETCHING ---
  useEffect(() => {
    if (!auth || !db) return;
    const shopsRef = collection(db, 'artifacts', firebaseConfig.appId || 'shoxa_app', 'public', 'data', 'shops');
    const unsubShops = onSnapshot(query(shopsRef), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setShops(data);
      setLoading(false);
    }, () => setLoading(false));
    return () => unsubShops();
  }, []);

  // --- FILTERING ---
  const filteredShops = useMemo(() => {
    let result = shops;
    if (result.length === 0 && !loading) {
       result = [
         { id: '1', name_uz: 'Oqtepa Lavash', type: 'Restaurants', rating: 4.7, time: '25-35 daq', badge: '1+1', image: 'https://images.unsplash.com/photo-1626804475297-411d0c285270?q=80&w=1000' },
         { id: '2', name_uz: 'Garage Burger', type: 'Cafes', rating: 4.8, time: '30-40 daq', badge: '-20%', image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=1000' },
         { id: '3', name_uz: 'Grand Pharmacy', type: 'Pharmacy', rating: 4.9, time: '15-20 daq', image: 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?q=80&w=1000' },
         { id: '4', name_uz: 'Makro Supermarket', type: 'Shops', rating: 4.5, time: '40-50 daq', badge: 'Top', image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=1000' },
       ];
    }
    if (searchQuery) {
      result = result.filter(s => s.name_uz.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    if (activeCategory) {
      const catName = CATEGORIES.find(c => c.id === activeCategory)?.name;
      result = result.filter(s => s.type === catName);
    }
    return result;
  }, [shops, searchQuery, activeCategory, loading]);

  // --- COMPONENTS ---
  const BannerItem = ({ item }) => (
    <View style={styles.bannerWrapper}>
      <Image source={{ uri: item.image }} style={styles.bannerImage} />
    </View>
  );

  const CircularCategory = ({ item, isActive, onPress }) => (
    <TouchableOpacity style={styles.catItem} onPress={onPress}>
      <View style={[styles.catCircle, isActive && styles.catCircleActive]}>
        <Ionicons name={item.icon} size={24} color={isActive ? COLORS.primary : '#555'} />
      </View>
      <Text style={[styles.catText, isActive && styles.catTextActive]}>{item.name}</Text>
    </TouchableOpacity>
  );

  const FilterChip = ({ item }) => (
    <TouchableOpacity style={[styles.filterChip, item.width && { width: item.width, paddingHorizontal: 0, justifyContent:'center' }]}>
      {item.icon === 'options-outline' ? (
         <Ionicons name="options-outline" size={20} color="#333" />
      ) : (
         <>
           <Ionicons name={item.icon} size={16} color={item.color} />
           <Text style={styles.filterText}>{item.label}</Text>
         </>
      )}
    </TouchableOpacity>
  );

  const ShopCard = ({ item }) => (
    <TouchableOpacity style={styles.shopCard}>
      <View style={styles.shopImageContainer}>
        <Image source={{ uri: item.profilePicUrl || item.image }} style={styles.shopImage} />
        {item.badge && (
          <View style={styles.badgeLeft}>
             <Ionicons name="flame" size={12} color="#FFF" style={{marginRight: 2}} />
             <Text style={styles.badgeText}>{item.badge}</Text>
          </View>
        )}
        <View style={styles.badgeRight}>
          <Text style={styles.badgeText}>{item.time || '30-40 daq'}</Text>
        </View>
      </View>
      <View style={styles.shopContent}>
        <View style={styles.shopHeader}>
          <Text style={styles.shopTitle}>{item.name_uz || item.name_en}</Text>
          <View style={styles.ratingContainer}>
            <Ionicons name="star" size={14} color="#333" />
            <Text style={styles.ratingNum}>{item.rating}</Text>
          </View>
        </View>
        <Text style={styles.shopSubtitle}>{item.type} • Delivery 10,000 UZS</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF" />

      {/* --- TOP HEADER (Logo) --- */}
      <View style={styles.topHeader}>
        <View style={styles.logoRow}>
            <View style={styles.logoCircle}>
                <Text style={styles.logoLetter}>S</Text>
            </View>
            <Text style={styles.logoText}>SHOXA</Text>
        </View>
        <TouchableOpacity style={styles.settingsBtn}>
          <Ionicons name="settings-outline" size={22} color="#333" />
        </TouchableOpacity>
      </View>

      {/* --- MAIN SCROLLVIEW --- */}
      {/* Search is sticky (index 0). Filters are sticky (index 3). */}
      <ScrollView 
        stickyHeaderIndices={[0, 3]} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 110 }}
      >
        
        {/* Index 0: STICKY SEARCH BAR */}
        <View style={styles.stickySearchWrapper}>
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#666" />
            <TextInput 
              placeholder="Search shops, restaurants, products" 
              style={styles.searchInput} 
              placeholderTextColor="#999"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </View>

        {/* Index 1: BANNERS (Below Search) */}
        <View style={styles.bannerContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 15 }}>
            {BANNERS.map(b => <BannerItem key={b.id} item={b} />)}
          </ScrollView>
        </View>

        {/* Index 2: CIRCULAR CATEGORIES (Centered) */}
        <View style={styles.categoriesContainer}>
          <View style={styles.categoriesWrapper}>
              {CATEGORIES.map(cat => (
                <CircularCategory 
                  key={cat.id} item={cat} 
                  isActive={activeCategory === cat.id}
                  onPress={() => setActiveCategory(activeCategory === cat.id ? null : cat.id)}
                />
              ))}
          </View>
        </View>

        {/* Index 3: STICKY FILTERS (Below Categories when scrolling, stacks with Search) */}
        <View style={styles.stickyFiltersWrapper}>
           <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 15 }}>
             {FILTERS.map(f => <FilterChip key={f.id} item={f} />)}
           </ScrollView>
        </View>

        {/* Index 4: CONTENT */}
        <View style={styles.contentContainer}>
          <View style={styles.listHeader}>
             <Text style={styles.listTitle}>{filteredShops.length} places found</Text>
             <TouchableOpacity><Text style={styles.resetText}>Reset</Text></TouchableOpacity>
          </View>
          {loading ? <ActivityIndicator color={COLORS.primary} style={{marginTop: 50}} /> : (
            filteredShops.map(shop => <ShopCard key={shop.id} item={shop} />)
          )}
        </View>

      </ScrollView>

      {/* --- BOTTOM NAVIGATION (Rounded Top) --- */}
      <View style={styles.bottomNavContainer}>
        <View style={styles.navItemsRow}>
            {/* Home Tab */}
            <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab('Home')}>
                <View style={[styles.navIconWrapper, activeTab === 'Home' && styles.navPillActive]}>
                    <Ionicons name="home" size={22} color={activeTab === 'Home' ? COLORS.primary : COLORS.textGray} />
                    {activeTab === 'Home' && <Text style={styles.navTextActive}>Home</Text>}
                </View>
                {activeTab !== 'Home' && <Text style={styles.navText}>Home</Text>}
            </TouchableOpacity>

            <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab('Basket')}>
                <View style={styles.navIconWrapper}>
                    <View>
                        <Ionicons name="basket-outline" size={24} color={COLORS.secondary} />
                        <View style={styles.navBadge}><Text style={styles.navBadgeText}>3</Text></View>
                    </View>
                </View>
                <Text style={styles.navText}>Basket</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab('Orders')}>
                <View style={styles.navIconWrapper}>
                    <Ionicons name="receipt-outline" size={24} color={COLORS.secondary} />
                </View>
                <Text style={styles.navText}>Orders</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab('Profile')}>
                <View style={styles.navIconWrapper}>
                    <Ionicons name="person-circle-outline" size={26} color={COLORS.secondary} />
                </View>
                <Text style={styles.navText}>Profile</Text>
            </TouchableOpacity>
        </View>
      </View>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },

  // --- HEADER ---
  topHeader: {
    backgroundColor: '#FFF', paddingHorizontal: 20, paddingVertical: 12,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  logoRow: { flexDirection: 'row', alignItems: 'center' },
  logoCircle: {
    width: 28, height: 28, borderRadius: 8, backgroundColor: COLORS.primary,
    justifyContent: 'center', alignItems: 'center', marginRight: 8
  },
  logoLetter: { color: '#FFF', fontWeight: '900', fontSize: 16 },
  logoText: { fontSize: 20, fontWeight: '800', color: '#333', letterSpacing: 0.5 },
  settingsBtn: { padding: 4 },

  // --- STICKY SEARCH ---
  stickySearchWrapper: { backgroundColor: COLORS.bg, paddingBottom: 10, paddingTop: 5 },
  searchContainer: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF',
    marginHorizontal: 15, paddingHorizontal: 12, height: 46, borderRadius: 14,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 3, elevation: 1
  },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 15, color: '#333' },

  // --- BANNERS ---
  bannerContainer: { marginBottom: 20 },
  bannerWrapper: { marginRight: 12 },
  bannerImage: { width: 310, height: 150, borderRadius: 16, resizeMode: 'cover' },

  // --- CATEGORIES ---
  categoriesContainer: { marginBottom: 20 },
  categoriesWrapper: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: 12 },
  catItem: { alignItems: 'center', width: 64 },
  catCircle: {
    width: 58, height: 58, borderRadius: 29, backgroundColor: '#FFF',
    justifyContent: 'center', alignItems: 'center', marginBottom: 6,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1
  },
  catCircleActive: { borderWidth: 2, borderColor: COLORS.primary, backgroundColor: '#FFF5EE' },
  catText: { fontSize: 11, color: '#555', textAlign: 'center', fontWeight: '500' },
  catTextActive: { color: COLORS.primary, fontWeight: '700' },

  // --- STICKY FILTERS ---
  stickyFiltersWrapper: { backgroundColor: COLORS.bg, paddingBottom: 10 },
  filterChip: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF',
    paddingVertical: 8, paddingHorizontal: 14, borderRadius: 12, marginRight: 8,
    borderWidth: 1, borderColor: '#EEE',
  },
  filterText: { fontSize: 12, fontWeight: '600', color: '#333', marginLeft: 4 },

  // --- CONTENT ---
  contentContainer: { paddingHorizontal: 15, paddingTop: 5 },
  listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  listTitle: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  resetText: { fontSize: 13, color: COLORS.primary, fontWeight: '600' },

  // SHOP CARD
  shopCard: {
    backgroundColor: '#FFF', borderRadius: 20, marginBottom: 20, overflow: 'hidden',
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2
  },
  shopImageContainer: { height: 180, width: '100%', position: 'relative' },
  shopImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  badgeLeft: {
    position: 'absolute', top: 15, left: 15, backgroundColor: '#FF4081',
    flexDirection: 'row', alignItems: 'center', paddingVertical: 4, paddingHorizontal: 8, borderRadius: 8
  },
  badgeRight: {
    position: 'absolute', bottom: 15, right: 15, backgroundColor: 'rgba(0,0,0,0.7)',
    paddingVertical: 4, paddingHorizontal: 8, borderRadius: 8
  },
  badgeText: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },
  shopContent: { padding: 16 },
  shopHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  shopTitle: { fontSize: 18, fontWeight: 'bold', color: '#222' },
  ratingContainer: { flexDirection: 'row', alignItems: 'center' },
  ratingNum: { fontSize: 14, fontWeight: 'bold', marginLeft: 4 },
  shopSubtitle: { fontSize: 13, color: '#888' },

  // --- BOTTOM NAV ---
  bottomNavContainer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    height: 90, 
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 30, // Circular Top Corners
    borderTopRightRadius: 30,
    shadowColor: "#000", shadowOffset: { width: 0, height: -5 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 10,
    paddingBottom: 20 
  },
  navItemsRow: { flex: 1, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingTop: 10 },
  navItem: { alignItems: 'center', justifyContent: 'center', minWidth: 60 },
  navIconWrapper: {
    height: 36, justifyContent: 'center', alignItems: 'center', borderRadius: 18, paddingHorizontal: 0
  },
  navPillActive: {
    flexDirection: 'row', backgroundColor: COLORS.primaryLight, paddingHorizontal: 16, height: 40,
  },
  navText: { fontSize: 10, marginTop: 4, color: COLORS.textGray, fontWeight: '500' },
  navTextActive: { fontSize: 12, color: COLORS.primary, fontWeight: '700', marginLeft: 6 },
  navBadge: {
    position: 'absolute', top: -4, right: -6, backgroundColor: '#FF4081',
    width: 16, height: 16, borderRadius: 8, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#FFF'
  },
  navBadgeText: { color: '#FFF', fontSize: 9, fontWeight: 'bold' }
});