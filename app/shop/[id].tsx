import React, { useEffect, useState } from 'react';
import { View, Text, Image, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import { db } from '@/configs/FirebaseConfig';

const COLORS = {
  background: '#FDF6E3',
  primary: '#C67C43',
  dark: '#333333',
  white: '#FFFFFF',
};

export default function ShopDetails() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [shop, setShop] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    const fetchShopData = async () => {
      try {
        const appId = "default-app-id"; // Replace with your logic
        // 1. Fetch Shop Info
        const shopRef = doc(db, 'artifacts', appId, 'public', 'data', 'shops', id as string);
        const shopSnap = await getDoc(shopRef);
        
        if (shopSnap.exists()) {
          setShop(shopSnap.data());
          
          // 2. Fetch Inventory
          const inventoryRef = collection(db, 'artifacts', appId, 'public', 'data', 'shops', id as string, 'inventory');
          const inventorySnap = await getDocs(inventoryRef);
          const inventoryList = inventorySnap.docs.map(d => ({ id: d.id, ...d.data() }));
          setProducts(inventoryList);
        }
      } catch (e) {
        console.error("Error fetching details:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchShopData();
  }, [id]);

  if (loading) return <View style={styles.center}><ActivityIndicator color={COLORS.primary} /></View>;
  if (!shop) return <View style={styles.center}><Text>Shop not found</Text></View>;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* Custom Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Image 
          source={{ uri: shop.bannerUrl || 'https://via.placeholder.com/600x300' }} 
          style={styles.banner} 
        />
        <View style={styles.headerOverlay} />
        <View style={styles.headerContent}>
          <Image 
            source={{ uri: shop.profilePicUrl || 'https://via.placeholder.com/100' }} 
            style={styles.profilePic} 
          />
          <Text style={styles.shopName}>{shop.name_uz}</Text>
          <Text style={styles.shopType}>{shop.type}</Text>
        </View>
      </View>

      <ScrollView style={styles.content}>
        {/* Info Section */}
        <View style={styles.infoSection}>
          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={20} color={COLORS.primary} />
            <Text style={styles.infoText}>{shop.hours?.Mon || '09:00 - 18:00'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={20} color={COLORS.primary} />
            <Text style={styles.infoText}>{shop.address || 'Tashkent, Uzbekistan'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="call-outline" size={20} color={COLORS.primary} />
            <Text style={styles.infoText}>{shop.phone || 'No phone'}</Text>
          </View>
        </View>

        {/* Products Grid */}
        <Text style={styles.sectionTitle}>Products ({products.length})</Text>
        <View style={styles.productsGrid}>
          {products.map((item) => (
            <View key={item.id} style={styles.productCard}>
              <Image 
                source={{ uri: item.imageUrl || 'https://via.placeholder.com/100' }} 
                style={styles.productImage} 
              />
              <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
              <Text style={styles.productPrice}>{item.price} UZS</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { height: 250, position: 'relative' },
  banner: { width: '100%', height: '100%', resizeMode: 'cover' },
  headerOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.3)' },
  backBtn: { position: 'absolute', top: 50, left: 20, zIndex: 10, padding: 8, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20 },
  headerContent: { position: 'absolute', bottom: 20, left: 20, right: 20, flexDirection: 'row', alignItems: 'flex-end' },
  profilePic: { width: 80, height: 80, borderRadius: 40, borderWidth: 3, borderColor: COLORS.white },
  shopName: { color: COLORS.white, fontSize: 24, fontWeight: 'bold', marginLeft: 15, marginBottom: 5 },
  shopType: { position: 'absolute', bottom: 5, left: 95, color: '#ddd', fontSize: 14 },
  
  content: { flex: 1 },
  infoSection: { backgroundColor: COLORS.white, padding: 20, margin: 15, borderRadius: 15, elevation: 2 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  infoText: { marginLeft: 10, color: COLORS.dark, fontSize: 15 },
  
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginLeft: 20, marginBottom: 10, color: COLORS.dark },
  productsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 10 },
  productCard: { width: '45%', backgroundColor: COLORS.white, margin: '2.5%', padding: 10, borderRadius: 15, elevation: 2 },
  productImage: { width: '100%', height: 100, borderRadius: 10, marginBottom: 5 },
  productName: { fontSize: 14, fontWeight: '600', color: COLORS.dark },
  productPrice: { fontSize: 14, fontWeight: 'bold', color: COLORS.primary, marginTop: 2 }
});