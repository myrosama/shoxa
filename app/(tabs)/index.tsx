import React, { useState } from 'react';
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
  Platform,
  StatusBar
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

// --- THEME & COLORS (Extracted from your Upgraded Design) ---
const COLORS = {
  bg: '#FFF9F2',        // Very light cream (Photo 3 background)
  primary: '#E86A33',   // The specific Orange from your button/banner
  secondary: '#2D2D2D', // Dark text
  textGray: '#888888',
  cardBg: '#FFFFFF',
  surface: '#FFEBCD',   // Light orange for Banner background
};

const { width } = Dimensions.get('window');

// --- DUMMY DATA ---
const CATEGORIES = [
  { id: '1', name: 'All', icon: 'grid-outline', type: 'all' },
  { id: '2', name: 'Shops', icon: 'cart-outline', type: 'shop' },
  { id: '3', name: 'Food', icon: 'fast-food-outline', type: 'food' },
  { id: '4', name: 'Hospital', icon: 'medkit-outline', type: 'hospital' },
  { id: '5', name: 'Services', icon: 'construct-outline', type: 'service' },
];

const PLACES = [
  {
    id: '1',
    title: 'Korzinka Supermarket',
    type: 'shop',
    categoryLabel: 'Grocery',
    rating: 4.8,
    distance: '1.2 km',
    image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=1000&auto=format&fit=crop',
  },
  {
    id: '2',
    title: 'City Med Center',
    type: 'hospital',
    categoryLabel: 'Hospital',
    rating: 4.9,
    distance: '2.5 km',
    image: 'https://images.unsplash.com/photo-1538108149393-fbbd81895907?q=80&w=1000&auto=format&fit=crop',
  },
  {
    id: '3',
    title: 'Oq Tep Lavash',
    type: 'food',
    categoryLabel: 'Fast Food',
    rating: 4.5,
    distance: '0.5 km',
    image: 'https://images.unsplash.com/photo-1561758033-d8f19662cb23?q=80&w=1000&auto=format&fit=crop',
  },
  {
    id: '4',
    title: 'Nike Store',
    type: 'shop',
    categoryLabel: 'Clothing',
    rating: 4.7,
    distance: '3.1 km',
    image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=1000&auto=format&fit=crop',
  },
];

export default function HomeScreen() {
  const [activeCategory, setActiveCategory] = useState('1'); // Default 'All'
  const [searchQuery, setSearchQuery] = useState('');

  // Filter Logic
  const filteredPlaces = activeCategory === '1' 
    ? PLACES 
    : PLACES.filter(p => p.type === CATEGORIES.find(c => c.id === activeCategory)?.type);

  // --- COMPONENT: Category Pill (Your Upgraded Design) ---
  const CategoryPill = ({ item, isActive, onPress }) => (
    <TouchableOpacity 
      onPress={onPress} 
      style={[
        styles.categoryPill, 
        isActive ? styles.categoryPillActive : styles.categoryPillInactive
      ]}
    >
      <Ionicons 
        name={item.icon} 
        size={20} 
        color={isActive ? '#FFF' : COLORS.secondary} 
      />
      <Text style={[
        styles.categoryText, 
        isActive ? { color: '#FFF' } : { color: COLORS.secondary }
      ]}>
        {item.name}
      </Text>
    </TouchableOpacity>
  );

  // --- COMPONENT: Shop Card (My Design - You liked this) ---
  const ShopCard = ({ item }) => (
    <TouchableOpacity style={styles.card}>
      <View style={styles.cardImageContainer}>
        <Image source={{ uri: item.image }} style={styles.cardImage} />
        <View style={styles.ratingBadge}>
          <Ionicons name="star" size={10} color="#FFD700" />
          <Text style={styles.ratingText}>{item.rating}</Text>
        </View>
      </View>
      
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.cardCategory}>{item.categoryLabel}</Text>
        
        <View style={styles.cardFooter}>
          <View style={styles.distanceTag}>
            <Ionicons name="location-sharp" size={12} color={COLORS.primary} />
            <Text style={styles.distanceText}>{item.distance}</Text>
          </View>
          <TouchableOpacity style={styles.addButton}>
            <Ionicons name="add" size={20} color="#FFF" />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />
      
      {/* WRAPPER */}
      <View style={styles.headerPadding}>
        {/* 1. HEADER */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greetingText}>Good Morning,</Text>
            <Text style={styles.welcomeText}>Welcome to SHOXA</Text>
          </View>
          {/* Avatar / Profile */}
          <View style={styles.avatarContainer}>
             <Image 
                source={{ uri: 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png' }} 
                style={styles.avatar} 
             />
             <View style={styles.notificationDot} />
          </View>
        </View>

        {/* 2. SEARCH BAR */}
        <View style={styles.searchRow}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={22} color={COLORS.textGray} />
            <TextInput 
              placeholder="Search stores, items, or hospitals..." 
              style={styles.searchInput}
              placeholderTextColor={COLORS.textGray}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          <TouchableOpacity style={styles.filterButton}>
            <Ionicons name="options-outline" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        
        {/* 3. BANNER (The "Upgraded" Look) */}
        <View style={styles.bannerContainer}>
          <View style={styles.bannerContent}>
            <Text style={styles.bannerTitle}>Explore Nearby</Text>
            <Text style={styles.bannerSubtitle}>Find the best spots in Tashkent</Text>
            <TouchableOpacity style={styles.bannerButton}>
              <Text style={styles.bannerButtonText}>Open Map</Text>
            </TouchableOpacity>
          </View>
          {/* Image positioned absolutely on the right to match design */}
          <Image 
            source={{ uri: 'https://img.freepik.com/free-photo/happy-woman-holding-laptop_23-2148002621.jpg' }} 
            style={styles.bannerImage}
          />
        </View>

        {/* 4. CATEGORIES */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionHeader}>Categories</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryScroll}
          >
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

        {/* 5. RECOMMENDED (Horizontal List) */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionHeader}>Recommended for you</Text>
            <TouchableOpacity>
              <Text style={styles.seeAllText}>See all</Text>
            </TouchableOpacity>
          </View>

          {/* We use a Horizontal FlatList inside the Vertical ScrollView */}
          <FlatList
            horizontal
            data={filteredPlaces}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <View style={{ width: width * 0.6, marginRight: 15 }}>
                <ShopCard item={item} />
              </View>
            )}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: 20 }}
          />
        </View>

        {/* 6. NEARBY (Vertical List - Extra layout to fill space) */}
        <View style={styles.sectionContainer}>
           <Text style={[styles.sectionHeader, { marginLeft: 20 }]}>All Shops Nearby</Text>
           <View style={{ paddingHorizontal: 20, marginTop: 10 }}>
              {filteredPlaces.map(item => (
                 <View key={item.id} style={{ marginBottom: 15 }}>
                    <TouchableOpacity style={[styles.card, { flexDirection: 'row', height: 100 }]}>
                        <Image source={{ uri: item.image }} style={{ width: 100, height: '100%' }} />
                        <View style={{ padding: 10, justifyContent: 'center', flex: 1 }}>
                           <Text style={styles.cardTitle}>{item.title}</Text>
                           <Text style={styles.cardCategory}>{item.categoryLabel}</Text>
                           <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 5 }}>
                              <Ionicons name="star" size={12} color="#FFD700" />
                              <Text style={{ fontSize: 12, marginLeft: 4, fontWeight: 'bold' }}>{item.rating}</Text>
                              <Text style={{ fontSize: 12, marginLeft: 10, color: COLORS.textGray }}>{item.distance}</Text>
                           </View>
                        </View>
                    </TouchableOpacity>
                 </View>
              ))}
           </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  headerPadding: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  // --- HEADER ---
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  greetingText: {
    fontSize: 14,
    color: COLORS.textGray,
    marginBottom: 4,
  },
  welcomeText: {
    fontSize: 22,
    fontWeight: '800', // Extra bold like design
    color: '#4E342E',  // Dark Coffee color
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: '#FFF',
  },
  notificationDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4CAF50', // Green active dot
    borderWidth: 2,
    borderColor: COLORS.bg,
  },

  // --- SEARCH ---
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    paddingHorizontal: 15,
    height: 50,
    // Soft Shadow
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 15,
    color: COLORS.secondary,
  },
  filterButton: {
    width: 50,
    height: 50,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },

  // --- BANNER ---
  bannerContainer: {
    marginHorizontal: 20,
    height: 160,
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    flexDirection: 'row',
    overflow: 'hidden',
    marginBottom: 25,
  },
  bannerContent: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    zIndex: 2,
  },
  bannerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4E342E',
  },
  bannerSubtitle: {
    fontSize: 12,
    color: '#8D6E63',
    marginTop: 4,
    marginBottom: 16,
  },
  bannerButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  bannerButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 12,
  },
  bannerImage: {
    width: 140,
    height: 180, // slightly larger to crop nicely
    resizeMode: 'cover',
    position: 'absolute',
    right: 0,
    bottom: 0,
  },

  // --- CATEGORIES ---
  sectionContainer: {
    marginBottom: 5,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4E342E',
    marginBottom: 15,
    marginLeft: 20,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 5,
  },
  seeAllText: {
    color: COLORS.primary,
    fontWeight: '600',
    fontSize: 14,
  },
  categoryScroll: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 30,
    marginRight: 12,
    borderWidth: 1,
  },
  categoryPillActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  categoryPillInactive: {
    backgroundColor: '#FFF',
    borderColor: '#FFF', // No border for cleaner look
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  categoryText: {
    marginLeft: 8,
    fontWeight: '600',
    fontSize: 14,
  },

  // --- CARDS ---
  card: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4, // Android shadow
  },
  cardImageContainer: {
    height: 130,
    width: '100%',
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  ratingBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#FFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  ratingText: {
    fontSize: 10,
    fontWeight: 'bold',
    marginLeft: 3,
  },
  cardContent: {
    padding: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  cardCategory: {
    fontSize: 12,
    color: COLORS.textGray,
    marginBottom: 10,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  distanceTag: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  distanceText: {
    fontSize: 12,
    color: '#333',
    marginLeft: 4,
    fontWeight: '600',
  },
  addButton: {
    backgroundColor: '#333', // Dark button from my previous design
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
});