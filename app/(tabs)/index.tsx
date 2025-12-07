import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  Platform,
  Animated // Import Animation Library
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
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

// --- CONFIG ---
const firebaseConfig = {
  apiKey: "AIzaSy...", // PASTE KEY
  authDomain: "shoxa-app.firebaseapp.com",
  projectId: "shoxa-app",
  storageBucket: "shoxa-app.appspot.com",
  messagingSenderId: "SENDER_ID",
  appId: "APP_ID"
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
  bg: '#FFF9F2',
  primary: '#E86A33',
  secondary: '#2D2D2D',
  textGray: '#888888',
  inputBg: '#F2F4F8', // Slightly gray for the simplified search
  glass: 'rgba(255, 255, 255, 0.9)', // Glassmorphism effect
};

const { width } = Dimensions.get('window');

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
  const [activeTab, setActiveTab] = useState('Home'); 
  const [activeCategory, setActiveCategory] = useState('1'); 
  const [searchQuery, setSearchQuery] = useState('');
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  // --- ANIMATION STATE ---
  const scrollY = useRef(new Animated.Value(0)).current;
  const headerTranslateY = useRef(new Animated.Value(-150)).current; // Start hidden
  const lastScrollY = useRef(0);
  const [isStickyVisible, setIsStickyVisible] = useState(false);

  // --- DATA FETCHING ---
  useEffect(() => {
    if (!auth || !db) return;
    const unsubAuth = onAuthStateChanged(auth, (u) => setUser(u));
    const shopsRef = collection(db, 'artifacts', firebaseConfig.appId || 'shoxa_app', 'public', 'data', 'shops');
    const unsubShops = onSnapshot(query(shopsRef), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setShops(data);
      setLoading(false);
    }, (error) => {
      console.log("Firestore Error:", error.message);
      setLoading(false);
    });
    return () => { unsubAuth(); unsubShops(); };
  }, []);

  // --- FILTERING ---
  const filteredShops = useMemo(() => {
    let result = shops;
    if (result.length === 0 && !loading) {
       // Dummy Data fallback
       result = [
         { id: '1', name_uz: 'Korzinka', type: 'Shop', rating: 4.8 },
         { id: '2', name_uz: 'Oq Tep Lavash', type: 'Restaurant', rating: 4.5 },
         { id: '3', name_uz: 'City Med', type: 'Hospital', rating: 4.9 },
         { id: '4', name_uz: 'Makro', type: 'Shop', rating: 4.2 },
         { id: '5', name_uz: 'Evos', type: 'Restaurant', rating: 4.6 },
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

  // --- SCROLL HANDLER (THE MAGIC) ---
  const handleScroll = (event) => {
    const currentY = event.nativeEvent.contentOffset.y;
    const diff = currentY - lastScrollY.current;
    
    // Logic: 
    // 1. If we are at the very top (y < 80), hide sticky header
    // 2. If we scroll DOWN (diff > 0), hide sticky header
    // 3. If we scroll UP (diff < 0) AND we are deep in page (y > 100), show sticky header

    if (currentY < 100) {
      // At the top
      if (isStickyVisible) {
        setIsStickyVisible(false);
        Animated.timing(headerTranslateY, { toValue: -200, duration: 300, useNativeDriver: true }).start();
      }
    } else if (diff > 0) {
      // Scrolling Down
      if (isStickyVisible) {
        setIsStickyVisible(false);
        Animated.timing(headerTranslateY, { toValue: -200, duration: 300, useNativeDriver: true }).start();
      }
    } else if (diff < -5) {
      // Scrolling Up
      if (!isStickyVisible) {
        setIsStickyVisible(true);
        Animated.timing(headerTranslateY, { toValue: 0, duration: 300, useNativeDriver: true }).start();
      }
    }

    lastScrollY.current = currentY;
  };

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

  const ShopCard = ({ item }) => (
    <TouchableOpacity style={styles.card}>
      <View style={styles.cardImageContainer}>
        <Image 
          source={{ uri: item.profilePicUrl || item.image || 'https://placehold.co/400x300/C67C43/FFFFFF/png' }} 
          style={styles.cardImage} 
        />
        <View style={styles.ratingBadge}>
          <Ionicons name="star" size={10} color="#FFD700" />
          <Text style={styles.ratingText}>{item.rating}</Text>
        </View>
      </View>
      <View style={styles.cardContent}>
        <View style={{flex: 1}}>
            <Text style={styles.cardTitle} numberOfLines={1}>{item.name_uz || item.name_en || 'Shop Name'}</Text>
            <Text style={styles.cardCategory}>{item.type}</Text>
        </View>
        <TouchableOpacity style={styles.addButton}>
            <Ionicons name="arrow-forward" size={18} color="#FFF" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const CategoryPill = ({ item, isActive, onPress, small }) => (
    <TouchableOpacity 
      onPress={onPress} 
      style={[
        small ? styles.pillSmall : styles.categoryPill, 
        isActive ? styles.categoryPillActive : styles.categoryPillInactive
      ]}
    >
      {!small && <Ionicons name={item.icon} size={18} color={isActive ? '#FFF' : COLORS.secondary} />}
      <Text style={[
        styles.categoryText, 
        isActive ? { color: '#FFF' } : { color: COLORS.secondary },
        small && { marginLeft: 0 }
      ]}>
        {item.name}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />
      
      {/* 1. STICKY SIMPLIFIED HEADER (Hidden initially) */}
      <Animated.View style={[styles.stickyHeader, { transform: [{ translateY: headerTranslateY }] }]}>
        <SafeAreaView edges={['top']}>
          <View style={styles.stickyContent}>
            {/* Logo/Title */}
            <View style={styles.stickyTopRow}>
                <Text style={styles.stickyLogo}>SHOXA</Text>
                <View style={styles.stickyAvatar}>
                    <Ionicons name="person" color={COLORS.primary} />
                </View>
            </View>
            
            {/* Input */}
            <View style={styles.stickyInputContainer}>
                <Ionicons name="search" size={18} color={COLORS.textGray} />
                <TextInput 
                    placeholder="Search shops & restaurants..." 
                    style={styles.stickyInput}
                    placeholderTextColor={COLORS.textGray}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
            </View>

            {/* Horizontal Filter Pills */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
                {CATEGORIES.map((cat) => (
                    <CategoryPill 
                        key={cat.id} 
                        item={cat} 
                        small
                        isActive={activeCategory === cat.id}
                        onPress={() => setActiveCategory(cat.id)}
                    />
                ))}
            </ScrollView>
          </View>
        </SafeAreaView>
      </Animated.View>

      {/* 2. MAIN SCROLL CONTENT */}
      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={{ paddingBottom: 120 }}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        
        {/* ORIGINAL HEADER (Disappears on scroll) */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greetingText}>Good Morning,</Text>
            <Text style={styles.welcomeText}>Welcome to SHOXA</Text>
          </View>
          <Image source={{ uri: 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png' }} style={styles.avatar} />
        </View>

        {/* ORIGINAL SEARCH BAR */}
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

        {/* PROMOTIONS (Rectangular) */}
        <View style={styles.sectionContainer}>
          <FlatList 
            horizontal
            data={PROMOTIONS}
            keyExtractor={item => item.id}
            renderItem={({ item }) => <PromotionCard item={item} />}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20 }}
          />
        </View>

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

        {/* RECOMMENDED SHOPS */}
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

      {/* 3. NEW STICKY BOTTOM NAVIGATION (Glassmorphism) */}
      <View style={styles.bottomNavContainer}>
        {/* Background Blur Simulation using opacity */}
        <View style={styles.glassBackground} />
        
        <View style={styles.navItemsRow}>
            <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab('Home')}>
                <Ionicons name={activeTab === 'Home' ? "home" : "home-outline"} size={24} color={activeTab === 'Home' ? COLORS.primary : COLORS.secondary} />
                <Text style={[styles.navText, activeTab === 'Home' && {color: COLORS.primary}]}>Home</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab('Amenities')}>
                <Ionicons name={activeTab === 'Amenities' ? "grid" : "grid-outline"} size={24} color={activeTab === 'Amenities' ? COLORS.primary : COLORS.secondary} />
                <Text style={[styles.navText, activeTab === 'Amenities' && {color: COLORS.primary}]}>Amenities</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.navItemCart} onPress={() => setActiveTab('Cart')}>
                <View style={styles.cartCircle}>
                    <Ionicons name="cart" size={24} color="#FFF" />
                </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab('Map')}>
                <Ionicons name={activeTab === 'Map' ? "map" : "map-outline"} size={24} color={activeTab === 'Map' ? COLORS.primary : COLORS.secondary} />
                <Text style={[styles.navText, activeTab === 'Map' && {color: COLORS.primary}]}>Map</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab('Profile')}>
                <Ionicons name={activeTab === 'Profile' ? "person" : "person-outline"} size={24} color={activeTab === 'Profile' ? COLORS.primary : COLORS.secondary} />
                <Text style={[styles.navText, activeTab === 'Profile' && {color: COLORS.primary}]}>Profile</Text>
            </TouchableOpacity>
        </View>
      </View>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  
  // --- STICKY HEADER (The New Part) ---
  stickyHeader: {
    position: 'absolute', top: 0, left: 0, right: 0,
    backgroundColor: 'rgba(255, 249, 242, 0.98)', // High opacity cream
    zIndex: 100,
    borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)',
    shadowColor: "#000", shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.1, shadowRadius: 10, elevation: 5
  },
  stickyContent: { padding: 15, paddingTop: 10 },
  stickyTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  stickyLogo: { fontSize: 20, fontWeight: '900', color: COLORS.primary, letterSpacing: 1 },
  stickyAvatar: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#eee' },
  stickyInputContainer: { 
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.inputBg, 
    borderRadius: 12, paddingHorizontal: 12, height: 44 
  },
  stickyInput: { flex: 1, marginLeft: 8, fontSize: 14, color: COLORS.secondary },
  
  // --- ORIGINAL HEADER ---
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
    marginHorizontal: 20, marginBottom: 25, height: 150,
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

  // Promotions
  promoCard: {
    width: 140, height: 70, borderRadius: 12, padding: 12, marginRight: 12, justifyContent: 'center',
    elevation: 2, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 3,
  },
  promoTitle: { fontSize: 14, fontWeight: 'bold', color: '#3E2723' },
  promoSubtitle: { fontSize: 11, color: '#5D4037', marginTop: 2 },

  // Categories / Pills
  categoryPill: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 16,
    borderRadius: 20, marginRight: 10, backgroundColor: '#FFF',
    borderWidth: 1, borderColor: 'transparent',
    elevation: 2, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 3,
  },
  pillSmall: {
    paddingVertical: 6, paddingHorizontal: 14, borderRadius: 16, marginRight: 8,
    backgroundColor: '#FFF', borderWidth: 1, borderColor: '#eee', marginBottom: 5
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

  // --- BOTTOM NAV (Glassmorphism) ---
  bottomNavContainer: {
    position: 'absolute', bottom: 20, left: 20, right: 20,
    height: 70, borderRadius: 35,
    overflow: 'hidden', // Keeps the blur inside
    elevation: 10, shadowColor: "#000", shadowOffset: {width: 0, height: 5}, shadowOpacity: 0.2, shadowRadius: 10,
  },
  glassBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.glass,
    opacity: 0.95,
  },
  navItemsRow: {
    flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 15
  },
  navItem: { alignItems: 'center', flex: 1 },
  navItemCart: { alignItems: 'center', flex: 1, top: -15 }, // Floating cart
  navText: { fontSize: 10, marginTop: 4, color: COLORS.secondary, fontWeight: '500' },
  cartCircle: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: COLORS.primary,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 4, borderColor: '#FFF9F2', // Matches bg to look floating
    elevation: 5, shadowColor: COLORS.primary, shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.4, shadowRadius: 5
  }
});