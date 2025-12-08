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
  Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';

// --- THEME COLORS ---
const COLORS = {
  background: '#FAF3E9', // Cream from logo background
  primary: '#DC6515',    // Orange from leaves
  dark: '#4E3320',       // Brown from branch
  white: '#FFFFFF',
  gray: '#B0B0B0',
  lightGray: '#F0F0F0',
};

const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const [searchQuery, setSearchQuery] = useState('');

  // Dummy Data for Categories
  const categories = [
    { id: '1', name: 'All', icon: 'grid-outline' },
    { id: '2', name: 'Shops', icon: 'cart-outline' },
    { id: '3', name: 'Food', icon: 'fast-food-outline' },
    { id: '4', name: 'Hospitals', icon: 'medkit-outline' },
    { id: '5', name: 'Airports', icon: 'airplane-outline' },
  ];

  // Dummy Data for Recommendations (Replace with Firebase data later)
  const places = [
    {
      id: '1',
      title: 'Korzinka Supermarket',
      type: 'Grocery',
      distance: '1.2 km',
      image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=1000&auto=format&fit=crop',
    },
    {
      id: '2',
      title: 'City Med Center',
      type: 'Hospital',
      distance: '2.5 km',
      image: 'https://images.unsplash.com/photo-1538108149393-fbbd81895907?q=80&w=1000&auto=format&fit=crop',
    },
    {
      id: '3',
      title: 'Oq Tep Lavash',
      type: 'Restaurant',
      distance: '0.8 km',
      image: 'https://images.unsplash.com/photo-1561758033-d8f19662cb23?q=80&w=1000&auto=format&fit=crop',
    },
  ];

  const renderCategory = ({ item, index }) => (
    <TouchableOpacity style={[styles.categoryBtn, index === 0 && styles.categoryBtnActive]}>
      <Ionicons 
        name={item.icon} 
        size={20} 
        color={index === 0 ? COLORS.white : COLORS.dark} 
      />
      <Text style={[styles.categoryText, index === 0 && styles.categoryTextActive]}>
        {item.name}
      </Text>
    </TouchableOpacity>
  );

  const renderPlace = ({ item }) => (
    <TouchableOpacity style={styles.card}>
      <Image source={{ uri: item.image }} style={styles.cardImage} />
      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>{item.title}</Text>
          <View style={styles.ratingContainer}>
            <Ionicons name="star" size={14} color="#FFD700" />
            <Text style={styles.ratingText}>4.8</Text>
          </View>
        </View>
        <Text style={styles.cardType}>{item.type}</Text>
        <View style={styles.cardFooter}>
          <View style={styles.distanceContainer}>
            <Ionicons name="location-sharp" size={14} color={COLORS.primary} />
            <Text style={styles.distanceText}>{item.distance}</Text>
          </View>
          <TouchableOpacity style={styles.addButton}>
            <Ionicons name="add" size={20} color={COLORS.white} />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        
        {/* HEADER */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Good Morning,</Text>
            <Text style={styles.appName}>Welcome to SHOXA</Text>
          </View>
          <Image 
            // Using a placeholder avatar or your logo here
            source={{ uri: 'https://cdn-icons-png.flaticon.com/512/149/149071.png' }} 
            style={styles.profileImage} 
          />
        </View>

        {/* SEARCH BAR */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={COLORS.gray} style={styles.searchIcon} />
          <TextInput 
            placeholder="Search stores, items, or hospitals..." 
            style={styles.input}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          <TouchableOpacity style={styles.filterBtn}>
            <Ionicons name="options" size={20} color={COLORS.white} />
          </TouchableOpacity>
        </View>

        {/* MAP BANNER (Autumn Vibe) */}
        <View style={styles.bannerContainer}>
          <View style={styles.bannerTextContainer}>
            <Text style={styles.bannerTitle}>Explore Nearby</Text>
            <Text style={styles.bannerSubtitle}>Find the best spots in Tashkent</Text>
            <TouchableOpacity style={styles.bannerBtn}>
              <Text style={styles.bannerBtnText}>Open Map</Text>
            </TouchableOpacity>
          </View>
          <Image 
            // Placeholder for the Map Image - replace with your local asset later
            source={{ uri: 'https://img.freepik.com/free-vector/map-navigation-concept_23-2147983944.jpg' }} 
            style={styles.bannerImage} 
          />
        </View>

        {/* CATEGORIES */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Categories</Text>
        </View>
        <FlatList
          horizontal
          data={categories}
          renderItem={renderCategory}
          keyExtractor={item => item.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesList}
        />

        {/* RECOMMENDATIONS GRID */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recommended for you</Text>
          <TouchableOpacity>
            <Text style={styles.seeAllText}>See all</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.gridContainer}>
          {places.map((place) => (
            <View key={place.id} style={styles.gridWrapper}>
              {renderPlace({ item: place })}
            </View>
          ))}
        </View>

        {/* BOTTOM SPACING */}
        <View style={{ height: 100 }} />

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingHorizontal: 20,
  },
  header: {
    marginTop: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: {
    fontSize: 16,
    color: COLORS.dark,
    opacity: 0.6,
  },
  appName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.dark,
  },
  profileImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  searchIcon: {
    position: 'absolute',
    left: 15,
    zIndex: 1,
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.white,
    height: 50,
    borderRadius: 15,
    paddingLeft: 45,
    fontSize: 16,
    color: COLORS.dark,
    elevation: 2, // Shadow for Android
    shadowColor: '#000', // Shadow for iOS
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  filterBtn: {
    backgroundColor: COLORS.primary,
    height: 50,
    width: 50,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  bannerContainer: {
    height: 150,
    backgroundColor: '#FCEAC6', // Lighter autumn tone
    borderRadius: 20,
    flexDirection: 'row',
    overflow: 'hidden',
    alignItems: 'center',
    marginBottom: 20,
  },
  bannerTextContainer: {
    flex: 1,
    padding: 20,
  },
  bannerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.dark,
  },
  bannerSubtitle: {
    fontSize: 12,
    color: COLORS.dark,
    marginVertical: 5,
  },
  bannerBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 5,
  },
  bannerBtnText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
  bannerImage: {
    width: 120,
    height: 150,
    resizeMode: 'cover',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.dark,
  },
  seeAllText: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  categoriesList: {
    paddingBottom: 20,
  },
  categoryBtn: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 30,
    marginRight: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EFEFEF',
  },
  categoryBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  categoryText: {
    marginLeft: 5,
    fontWeight: '600',
    color: COLORS.dark,
  },
  categoryTextActive: {
    color: COLORS.white,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  gridWrapper: {
    width: '48%', // 2 columns
    marginBottom: 15,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 15,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardImage: {
    width: '100%',
    height: 120,
    resizeMode: 'cover',
  },
  cardContent: {
    padding: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.dark,
    flex: 1,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 12,
    marginLeft: 2,
    color: COLORS.dark,
    fontWeight: 'bold',
  },
  cardType: {
    fontSize: 12,
    color: COLORS.gray,
    marginBottom: 10,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  distanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  distanceText: {
    fontSize: 12,
    color: COLORS.dark,
    marginLeft: 4,
  },
  addButton: {
    backgroundColor: COLORS.dark,
    padding: 5,
    borderRadius: 20,
  },
});