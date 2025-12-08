import React, { useState, useEffect, useRef } from 'react';
import { 
  View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, 
  Image, FlatList, Dimensions, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { db } from '@/configs/FirebaseConfig';

const COLORS = {
  background: '#FDF6E3',
  primary: '#C67C43',
  secondary: '#A0522D',
  dark: '#333333',
  white: '#FFFFFF',
  gray: '#B0B0B0',
};

const CATEGORIES = [
  { id: 'All', label: 'All', icon: 'grid-outline' },
  { id: 'Shop', label: 'Shops', icon: 'cart-outline' },
  { id: 'Restaurant', label: 'Food', icon: 'fast-food-outline' },
  { id: 'Hospital', label: 'Hospital', icon: 'medkit-outline' },
  { id: 'Service', label: 'Services', icon: 'construct-outline' },
];

const POPULAR_KEYWORDS = ["Lavash", "Paracetamol", "Milk", "Iphone", "Somsa", "Coffee"];

export default function SearchScreen() {
  const router = useRouter();
  const inputRef = useRef<TextInput>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [shops, setShops] = useState<any[]>([]);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(query(collection(db, 'artifacts', 'default-app-id', 'public', 'data', 'shops')), (snapshot) => {
      setShops(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  const filteredShops = shops.filter(shop => {
    const matchesSearch = shop.name_uz?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          shop.type?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = activeCategory === 'All' || shop.type === activeCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        
        {/* Custom Header with Back Button & Search Input */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={COLORS.dark} />
          </TouchableOpacity>
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color={COLORS.primary} style={{ marginRight: 8 }} />
            <TextInput
              ref={inputRef}
              placeholder="Search stores, dishes, products..."
              style={styles.input}
              value={searchTerm}
              onChangeText={setSearchTerm}
              placeholderTextColor="#999"
            />
            {searchTerm.length > 0 && (
              <TouchableOpacity onPress={() => setSearchTerm('')}>
                <Ionicons name="close-circle" size={20} color={COLORS.gray} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Categories */}
        <View style={styles.categoriesContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{paddingHorizontal: 15}}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity 
                key={cat.id} 
                style={[styles.catPill, activeCategory === cat.id && styles.catPillActive]}
                onPress={() => setActiveCategory(cat.id)}
              >
                <Text style={[styles.catText, activeCategory === cat.id && {color: COLORS.white}]}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Content */}
        <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
          {searchTerm.length === 0 ? (
            <View style={{padding: 20}}>
              <Text style={styles.sectionTitle}>Popular Searches</Text>
              <View style={styles.keywordsGrid}>
                {POPULAR_KEYWORDS.map(word => (
                  <TouchableOpacity key={word} style={styles.keywordChip} onPress={() => setSearchTerm(word)}>
                    <Text style={{color: COLORS.dark}}>{word}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ) : (
            <View style={{padding: 15}}>
              <Text style={styles.resultText}>Found {filteredShops.length} results</Text>
              {filteredShops.map(shop => (
                <TouchableOpacity 
                  key={shop.id} 
                  style={styles.resultItem}
                  onPress={() => router.push(`/shop/${shop.id}`)}
                >
                  <Image source={{ uri: shop.profilePicUrl || 'https://via.placeholder.com/50' }} style={styles.resultImage} />
                  <View>
                    <Text style={styles.resultTitle}>{shop.name_uz}</Text>
                    <Text style={styles.resultSubtitle}>{shop.type} • 1.2 km</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={COLORS.gray} style={{marginLeft: 'auto'}} />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  safeArea: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, paddingVertical: 10 },
  backButton: { marginRight: 10, padding: 5 },
  searchContainer: { 
    flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, 
    borderRadius: 12, paddingHorizontal: 10, height: 45 
  },
  input: { flex: 1, color: COLORS.dark, fontSize: 16 },
  categoriesContainer: { paddingVertical: 10 },
  catPill: { 
    paddingVertical: 8, paddingHorizontal: 20, borderRadius: 20, backgroundColor: COLORS.white, 
    marginRight: 8, borderWidth: 1, borderColor: '#eee' 
  },
  catPillActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  catText: { fontSize: 13, color: COLORS.dark, fontWeight: '600' },
  content: { flex: 1 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 15, color: COLORS.dark },
  keywordsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  keywordChip: { backgroundColor: '#EFEFEF', paddingVertical: 8, paddingHorizontal: 15, borderRadius: 8 },
  resultText: { fontSize: 14, color: COLORS.gray, marginBottom: 10 },
  resultItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, padding: 10, borderRadius: 12, marginBottom: 10 },
  resultImage: { width: 40, height: 40, borderRadius: 20, marginRight: 12 },
  resultTitle: { fontWeight: 'bold', fontSize: 15 },
  resultSubtitle: { fontSize: 12, color: COLORS.gray }
});