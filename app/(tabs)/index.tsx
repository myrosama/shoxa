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
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
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

// --- FIREBASE CONFIG ---
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
// We keep the SHOXA colors but apply the Uzum Layout
const COLORS = {
  bg: '#F5F5F5',       // Light Gray bg like Uzum
  headerBg: '#FFFFFF',
  primary: '#E86A33',  // SHOXA Orange
  secondary: '#2D2D2D',
  textGray: '#888888',
  glass: 'rgba(255, 255, 255, 0.95)',
  badgeBlack: 'rgba(0,0,0,0.7)',
  purple: '#7B61FF',   // For "Aksiyalar" badge
  yellow: '#FFD700',   // For "Top" badge
};

const { width } = Dimensions.get('window');

// --- DATA ---
const BANNERS = [
  { id: '1', image: 'https://img.freepik.com/free-psd/food-menu-restaurant-web-banner-template_23-2148962365.jpg', title: 'Pepsi Combo' },
  { id: '2', image: 'https://img.freepik.com/free-psd/horizontal-banner-template-big-sale-with-woman-shopping-bags_23-2148786755.jpg', title: 'Sale 50%' },
  { id: '3', image: 'https://img.freepik.com/free-vector/flat-supermarket-twitch-banner_23-2149356079.jpg', title: 'Market' },
];

const CATEGORIES = [
  { id: '1', name: 'Lavash', image: 'https://cdn-icons-png.flaticon.com/512/3014/3014520.png', type: 'fastfood' },
  { id: '2', name: 'Shops', image: 'https://cdn-icons-png.flaticon.com/512/3081/3081559.png', type: 'shop' },
  { id: '3', name: 'Burger', image: 'https://cdn-icons-png.flaticon.com/512/3075/3075977.png', type: 'burger' },
  { id: '4', name: 'National', image: 'https://cdn-icons-png.flaticon.com/512/1065/1065715.png', type: 'national' },
  { id: '5', name: 'Pizza', image: 'https://cdn-icons-png.flaticon.com/512/1404/1404945.png', type: 'pizza' },
];

const FILTERS = [
  { id: '1', label: '', icon: 'options-outline', width: 40 }, // Sort Icon
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
    }, (error) => {
      // Dummy data fallback if permission denied
      setLoading(false);
    });
    return () => unsubShops();
  }, []);

  // --- FILTERING LOGIC ---
  const filteredShops = useMemo(() => {
    let result = shops;
    if (result.length === 0 && !loading) {
       // High Quality Dummy Data matching Screenshots
       result = [
         { id: '1', name_uz: 'Oqtepa Lavash', type: 'Fast Food', rating: 4.7, time: '25-35 daq', badge: '1+1', image: 'https://images.unsplash.com/photo-1626804475297-411d0c285270?q=80&w=1000' },
         { id: '2', name_uz: 'Garage Burger', type: 'Burger', rating: 4.8, time: '30-40 daq', badge: '-20%', image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=1000' },
         { id: '3', name_uz: 'Fids Monro', type: 'Chicken', rating: 4.6, time: '35-45 daq', image: 'https://images.unsplash.com/photo-1513639776629-7b611d16326e?q=80&w=1000' },
         { id: '4', name_uz: 'KFC', type: 'Chicken', rating: 4.5, time: '20-30 daq', badge: 'Top', image: 'https://images.unsplash.com/photo-1513639776629-7b611d16326e?q=80&w=1000' },
       ];
    }
    if (searchQuery) {
      result = result.filter(s => s.name_uz.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    return result;
  }, [shops, searchQuery, loading]);

  // --- COMPONENTS ---

  const BannerItem = ({ item }) => (
    <View style={styles.bannerWrapper}>
      <Image source={{ uri: item.image }} style={styles.bannerImage} />
    </View>
  );

  const CircularCategory = ({ item, isActive, onPress }) => (
    <TouchableOpacity style={styles.catItem} onPress={onPress}>
      <View style={[styles.catCircle, isActive && styles.catCircleActive]}>
        <Image source={{ uri: item.image }} style={styles.catImage} />
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

  // The "Uzum-Style" Shop Card
  const ShopCard = ({ item }) => (
    <TouchableOpacity style={styles.shopCard}>
      <View style={styles.shopImageContainer}>
        <Image 
          source={{ uri: item.profilePicUrl || item.image }} 
          style={styles.shopImage} 
        />
        {/* Badges Overlaid on Image */}
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

      {/* FIXED TOP HEADER (Address) */}
      <View style={styles.topHeader}>
        <View style={styles.addressContainer}>
           <Ionicons name="home" size={18} color={COLORS.primary} />
           <Text style={styles.addressText} numberOfLines={1}>Sherodziy Ko'chasi, 1 • School</Text>
           <Ionicons name="chevron-down" size={16} color="#333" />
        </View>
        <TouchableOpacity style={styles.settingsBtn}>
          <Ionicons name="settings-outline" size={20} color="#333" />
        </TouchableOpacity>
      </View>

      {/* MAIN SCROLLVIEW */}
      {/* stickyHeaderIndices={[1]} makes the SECOND child (index 1) stick to top */}
      <ScrollView 
        stickyHeaderIndices={[1]} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        
        {/* Child 0: BANNERS (Scrolls away) */}
        <View style={styles.bannerContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 15 }}>
            {BANNERS.map(b => <BannerItem key={b.id} item={b} />)}
          </ScrollView>
        </View>

        {/* Child 1: STICKY HEADER (Search + Categories + Filters) */}
        <View style={styles.stickyContainer}>
          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#666" />
            <TextInput 
              placeholder="Taom va restoranlarni qidirish" 
              style={styles.searchInput} 
              placeholderTextColor="#999"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          {/* Circular Categories */}
          <View style={styles.categoriesContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 15 }}>
              {CATEGORIES.map(cat => (
                <CircularCategory 
                  key={cat.id} 
                  item={cat} 
                  isActive={activeCategory === cat.id}
                  onPress={() => setActiveCategory(activeCategory === cat.id ? null : cat.id)}
                />
              ))}
            </ScrollView>
          </View>

          {/* Secondary Filters (New addition) */}
          <View style={styles.filtersContainer}>
             <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 15 }}>
               {FILTERS.map(f => <FilterChip key={f.id} item={f} />)}
             </ScrollView>
          </View>
        </View>

        {/* Child 2: CONTENT (Shops) */}
        <View style={styles.contentContainer}>
          <View style={styles.listHeader}>
             <Text style={styles.listTitle}>{filteredShops.length} ta restoran topildi</Text>
             <TouchableOpacity><Text style={styles.resetText}>Qayta sozlash</Text></TouchableOpacity>
          </View>

          {loading ? <ActivityIndicator color={COLORS.primary} style={{marginTop: 50}} /> : (
            filteredShops.map(shop => <ShopCard key={shop.id} item={shop} />)
          )}
        </View>

      </ScrollView>

      {/* STICKY BOTTOM NAV (Glassmorphism) */}
      <View style={styles.bottomNavContainer}>
        <View style={styles.glassBackground} />
        <View style={styles.navItemsRow}>
            <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab('Home')}>
                <MaterialCommunityIcons name="silverware-fork-knife" size={24} color={activeTab === 'Home' ? COLORS.primary : COLORS.secondary} />
                <Text style={[styles.navText, activeTab === 'Home' && {color: COLORS.primary}]}>Restoranlar</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab('Cart')}>
                <View style={{alignItems: 'center'}}>
                    <Ionicons name="basket-outline" size={24} color={COLORS.secondary} />
                    {/* Badge */}
                    <View style={styles.navBadge}><Text style={styles.navBadgeText}>8</Text></View>
                </View>
                <Text style={styles.navText}>Savat</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab('Orders')}>
                <Ionicons name="receipt-outline" size={24} color={COLORS.secondary} />
                <Text style={styles.navText}>Buyurtmalar</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab('Profile')}>
                <Ionicons name="person-circle-outline" size={26} color={COLORS.secondary} />
                <Text style={styles.navText}>Profil</Text>
            </TouchableOpacity>
        </View>
      </View>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },

  // --- TOP HEADER ---
  topHeader: {
    backgroundColor: '#FFF', paddingHorizontal: 15, paddingVertical: 10,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'
  },
  addressContainer: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0F2F5',
    paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12, flex: 1, marginRight: 10
  },
  addressText: { fontSize: 13, fontWeight: '600', color: '#333', marginHorizontal: 8, flex: 1 },
  settingsBtn: { padding: 8 },

  // --- BANNERS ---
  bannerContainer: { backgroundColor: '#FFF', paddingVertical: 15 },
  bannerWrapper: { marginRight: 10 },
  bannerImage: { width: 300, height: 140, borderRadius: 16, resizeMode: 'cover' },

  // --- STICKY CONTAINER (Search + Cats + Filters) ---
  stickyContainer: { backgroundColor: '#FFF', paddingBottom: 10 },
  
  // Search
  searchContainer: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0F2F5',
    marginHorizontal: 15, paddingHorizontal: 12, height: 44, borderRadius: 12, marginBottom: 15
  },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 15, color: '#333' },

  // Circular Categories
  categoriesContainer: { marginBottom: 15 },
  catItem: { alignItems: 'center', marginRight: 18, width: 60 },
  catCircle: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: '#F5F5F5',
    justifyContent: 'center', alignItems: 'center', marginBottom: 6
  },
  catCircleActive: { backgroundColor: '#FFF0E6', borderWidth: 2, borderColor: COLORS.primary },
  catImage: { width: 32, height: 32, resizeMode: 'contain' },
  catText: { fontSize: 11, color: '#333', textAlign: 'center', fontWeight: '500' },
  catTextActive: { color: COLORS.primary, fontWeight: '700' },

  // Filter Chips
  filtersContainer: { },
  filterChip: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF',
    paddingVertical: 6, paddingHorizontal: 12, borderRadius: 12, marginRight: 8,
    borderWidth: 1, borderColor: '#EEE',
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1
  },
  filterText: { fontSize: 12, fontWeight: '600', color: '#333', marginLeft: 4 },

  // --- CONTENT ---
  contentContainer: { paddingHorizontal: 15, paddingTop: 15 },
  listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  listTitle: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  resetText: { fontSize: 13, color: COLORS.primary, fontWeight: '600', backgroundColor: '#FFF0E6', padding: 6, borderRadius: 8 },

  // SHOP CARD
  shopCard: {
    backgroundColor: '#FFF', borderRadius: 20, marginBottom: 20, overflow: 'hidden',
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 3
  },
  shopImageContainer: { height: 180, width: '100%', position: 'relative' },
  shopImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  badgeLeft: {
    position: 'absolute', top: 15, left: 15, backgroundColor: '#FF4081',
    flexDirection: 'row', alignItems: 'center', paddingVertical: 4, paddingHorizontal: 8, borderRadius: 8
  },
  badgeRight: {
    position: 'absolute', bottom: 15, right: 15, backgroundColor: 'rgba(0,0,0,0.6)',
    paddingVertical: 4, paddingHorizontal: 8, borderRadius: 8
  },
  badgeText: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },
  
  shopContent: { padding: 15 },
  shopHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  shopTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  ratingContainer: { flexDirection: 'row', alignItems: 'center' },
  ratingNum: { fontSize: 14, fontWeight: 'bold', marginLeft: 4 },
  shopSubtitle: { fontSize: 13, color: '#888' },

  // --- BOTTOM NAV ---
  bottomNavContainer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    height: 80, backgroundColor: '#FFF',
    borderTopWidth: 1, borderTopColor: '#EEE',
    paddingBottom: 20 // For iPhone home bar
  },
  glassBackground: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.95)' },
  navItemsRow: { flex: 1, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingTop: 10 },
  navItem: { alignItems: 'center' },
  navText: { fontSize: 10, marginTop: 4, color: '#888', fontWeight: '500' },
  navBadge: {
    position: 'absolute', top: -4, right: -6, backgroundColor: '#FF4081',
    width: 16, height: 16, borderRadius: 8, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#FFF'
  },
  navBadgeText: { color: '#FFF', fontSize: 9, fontWeight: 'bold' }
});