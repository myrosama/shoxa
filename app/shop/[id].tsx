import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, Image, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Dimensions, Animated, Linking, Platform
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { doc, getDoc, collection, getDocs, query, orderBy, where } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { db } from '@/configs/FirebaseConfig';

const { width } = Dimensions.get('window');

const COLORS = {
  background: '#FDF6E3',
  primary: '#C67C43',
  primaryLight: '#E5A067',
  primaryDark: '#A05A2C',
  dark: '#333333',
  gray: '#888888',
  lightGray: '#F5F5F5',
  white: '#FFFFFF',
  storyGradient: ['#FF6B6B', '#FFE66D', '#4ECDC4', '#45B7D1', '#96E6A1'],
};

// Telegram Bot Token for image URLs  
const TELEGRAM_BOT_TOKEN = '8471215089:AAHyG6JFoh2yn5jzKVmhz_IQrRkG0EpNqCY';

const getTelegramImageUrl = async (fileId: string): Promise<string | null> => {
  try {
    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getFile?file_id=${fileId}`);
    const data = await response.json();
    if (data.ok) {
      return `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${data.result.file_path}`;
    }
    return null;
  } catch (error) {
    return null;
  }
};

type TabType = 'products' | 'posts' | 'contacts' | 'about';

export default function ShopDetails() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [shop, setShop] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('products');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [hasStory, setHasStory] = useState(false);
  const [hasNewPosts, setHasNewPosts] = useState(false);

  const storyPulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (hasStory) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(storyPulse, { toValue: 1.08, duration: 1000, useNativeDriver: true }),
          Animated.timing(storyPulse, { toValue: 1, duration: 1000, useNativeDriver: true }),
        ])
      ).start();
    }
  }, [hasStory]);

  useEffect(() => {
    if (!id) return;
    fetchShopData();
  }, [id]);

  const fetchShopData = async () => {
    try {
      // Fetch shop data
      const shopRef = doc(db, 'shops', id as string);
      const shopSnap = await getDoc(shopRef);

      if (shopSnap.exists()) {
        const shopData = { id: shopSnap.id, ...shopSnap.data() };
        setShop(shopData);

        // Get images from Telegram
        if (shopData.logoFileId) {
          const url = await getTelegramImageUrl(shopData.logoFileId);
          setLogoUrl(url);
        }
        if (shopData.bannerFileId) {
          const url = await getTelegramImageUrl(shopData.bannerFileId);
          setBannerUrl(url);
        }

        // Fetch products
        const productsRef = collection(db, 'shops', id as string, 'products');
        const productsSnap = await getDocs(productsRef);
        const productsList = await Promise.all(
          productsSnap.docs.map(async (d) => {
            const data = d.data();
            let imageUrl = null;
            if (data.imageFileId) {
              imageUrl = await getTelegramImageUrl(data.imageFileId);
            }
            return { id: d.id, ...data, imageUrl };
          })
        );
        setProducts(productsList);

        // Fetch posts
        const postsRef = collection(db, 'shops', id as string, 'posts');
        const postsSnap = await getDocs(postsRef);
        const postsList = await Promise.all(
          postsSnap.docs.map(async (d) => {
            const data = d.data();
            let imageUrl = null;
            if (data.mediaFileIds?.[0]) {
              imageUrl = await getTelegramImageUrl(data.mediaFileIds[0]);
            }
            return { id: d.id, ...data, imageUrl };
          })
        );
        setPosts(postsList);

        // Check for recent posts (< 24 hours = has story)
        const now = Date.now();
        const recentPosts = postsList.filter((p: any) => {
          const createdAt = p.createdAt?.toDate?.()?.getTime() || 0;
          return now - createdAt < 24 * 60 * 60 * 1000;
        });
        setHasStory(recentPosts.length > 0);
        setHasNewPosts(recentPosts.length > 0);
      }
    } catch (e) {
      console.error("Error fetching shop:", e);
    } finally {
      setLoading(false);
    }
  };

  const openMaps = () => {
    if (!shop?.location?.lat || !shop?.location?.lng) return;
    const url = Platform.select({
      ios: `maps:?daddr=${shop.location.lat},${shop.location.lng}`,
      android: `geo:${shop.location.lat},${shop.location.lng}?q=${shop.location.lat},${shop.location.lng}`,
    });
    if (url) Linking.openURL(url);
  };

  const TABS: { key: TabType; label: string; icon: string }[] = [
    { key: 'products', label: 'Products', icon: 'grid-outline' },
    { key: 'posts', label: 'Posts', icon: 'images-outline' },
    { key: 'contacts', label: 'Contacts', icon: 'call-outline' },
    { key: 'about', label: 'About', icon: 'information-circle-outline' },
  ];

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!shop) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Shop not found</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Banner Section */}
        <View style={styles.bannerSection}>
          <Image
            source={{ uri: bannerUrl || 'https://via.placeholder.com/600x300?text=No+Banner' }}
            style={styles.bannerImage}
          />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.7)']}
            style={styles.bannerGradient}
          />

          {/* Back Button */}
          <TouchableOpacity style={styles.headerBackBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color={COLORS.white} />
          </TouchableOpacity>

          {/* Share Button */}
          <TouchableOpacity style={styles.headerShareBtn}>
            <Ionicons name="share-outline" size={22} color={COLORS.white} />
          </TouchableOpacity>
        </View>

        {/* Profile Section */}
        <View style={styles.profileSection}>
          {/* Avatar with Story Glow */}
          <Animated.View style={[styles.avatarContainer, { transform: [{ scale: storyPulse }] }]}>
            {hasStory && (
              <LinearGradient
                colors={COLORS.storyGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.storyRing}
              />
            )}
            <View style={[styles.avatarBorder, hasStory && styles.avatarBorderStory]}>
              <Image
                source={{ uri: logoUrl || 'https://via.placeholder.com/100?text=Logo' }}
                style={styles.avatar}
              />
            </View>
          </Animated.View>

          {/* Shop Info */}
          <View style={styles.shopInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.shopName}>{shop.name || 'Unnamed Shop'}</Text>
              {shop.isVerified && (
                <Ionicons name="checkmark-circle" size={20} color="#1DA1F2" style={{ marginLeft: 6 }} />
              )}
            </View>
            <Text style={styles.shopType}>{shop.type || 'Shop'}</Text>

            {/* Stats Row */}
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{products.length}</Text>
                <Text style={styles.statLabel}>Products</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{posts.length}</Text>
                <Text style={styles.statLabel}>Posts</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{shop.rating?.toFixed(1) || '4.5'}</Text>
                <Text style={styles.statLabel}>Rating</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Location Bar */}
        <View style={styles.locationBar}>
          <View style={styles.locationInfo}>
            <Ionicons name="location-sharp" size={18} color={COLORS.primary} />
            <Text style={styles.locationText} numberOfLines={1}>
              {shop.location?.address || 'Location not set'}
            </Text>
          </View>
          <TouchableOpacity style={styles.navigateBtn} onPress={openMaps}>
            <Ionicons name="navigate" size={18} color={COLORS.white} />
          </TouchableOpacity>
        </View>

        {/* Tab Navigation */}
        <View style={styles.tabBar}>
          {TABS.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tabItem, activeTab === tab.key && styles.tabItemActive]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Ionicons
                name={tab.icon as any}
                size={22}
                color={activeTab === tab.key ? COLORS.primary : COLORS.gray}
              />
              {tab.key === 'posts' && hasNewPosts && (
                <View style={styles.newBadge}>
                  <Text style={styles.newBadgeText}>NEW</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Tab Content */}
        <View style={styles.tabContent}>
          {activeTab === 'products' && (
            <View style={styles.productsGrid}>
              {products.length === 0 ? (
                <Text style={styles.emptyText}>No products yet</Text>
              ) : (
                products.map((item) => (
                  <TouchableOpacity key={item.id} style={styles.productCard}>
                    <Image
                      source={{ uri: item.imageUrl || 'https://via.placeholder.com/150?text=Product' }}
                      style={styles.productImage}
                    />
                    <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
                    <View style={styles.priceRow}>
                      {item.discountPrice ? (
                        <>
                          <Text style={styles.originalPrice}>{item.price?.toLocaleString()}</Text>
                          <Text style={styles.discountPrice}>{item.discountPrice?.toLocaleString()} UZS</Text>
                        </>
                      ) : (
                        <Text style={styles.productPrice}>{item.price?.toLocaleString()} UZS</Text>
                      )}
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </View>
          )}

          {activeTab === 'posts' && (
            <View style={styles.postsGrid}>
              {posts.length === 0 ? (
                <Text style={styles.emptyText}>No posts yet</Text>
              ) : (
                posts.map((post) => (
                  <TouchableOpacity key={post.id} style={styles.postCard}>
                    <Image
                      source={{ uri: post.imageUrl || 'https://via.placeholder.com/150?text=Post' }}
                      style={styles.postImage}
                    />
                  </TouchableOpacity>
                ))
              )}
            </View>
          )}

          {activeTab === 'contacts' && (
            <View style={styles.contactsSection}>
              <TouchableOpacity style={styles.contactItem}>
                <View style={[styles.contactIcon, { backgroundColor: '#25D366' }]}>
                  <Ionicons name="logo-whatsapp" size={24} color={COLORS.white} />
                </View>
                <Text style={styles.contactLabel}>WhatsApp</Text>
                <Ionicons name="chevron-forward" size={20} color={COLORS.gray} />
              </TouchableOpacity>

              <TouchableOpacity style={styles.contactItem}>
                <View style={[styles.contactIcon, { backgroundColor: '#0088CC' }]}>
                  <Ionicons name="paper-plane" size={22} color={COLORS.white} />
                </View>
                <Text style={styles.contactLabel}>Telegram</Text>
                <Ionicons name="chevron-forward" size={20} color={COLORS.gray} />
              </TouchableOpacity>

              <TouchableOpacity style={styles.contactItem}>
                <View style={[styles.contactIcon, { backgroundColor: COLORS.primary }]}>
                  <Ionicons name="call" size={22} color={COLORS.white} />
                </View>
                <Text style={styles.contactLabel}>Phone</Text>
                <Ionicons name="chevron-forward" size={20} color={COLORS.gray} />
              </TouchableOpacity>

              <View style={styles.messagingComing}>
                <Ionicons name="chatbubbles-outline" size={32} color={COLORS.gray} />
                <Text style={styles.comingSoonText}>In-app messaging coming soon!</Text>
              </View>
            </View>
          )}

          {activeTab === 'about' && (
            <View style={styles.aboutSection}>
              {shop.description && (
                <View style={styles.aboutCard}>
                  <Text style={styles.aboutTitle}>Description</Text>
                  <Text style={styles.aboutText}>{shop.description}</Text>
                </View>
              )}

              {shop.about && (
                <View style={styles.aboutCard}>
                  <Text style={styles.aboutTitle}>About</Text>
                  <Text style={styles.aboutText}>{shop.about}</Text>
                </View>
              )}

              <View style={styles.aboutCard}>
                <Text style={styles.aboutTitle}>Opening Hours</Text>
                {shop.openingHours && Object.entries(shop.openingHours).map(([day, hours]: [string, any]) => (
                  <View key={day} style={styles.hoursRow}>
                    <Text style={styles.dayLabel}>{day.charAt(0).toUpperCase() + day.slice(1)}</Text>
                    <Text style={styles.hoursText}>{hours.open} - {hours.close}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  errorText: {
    fontSize: 16,
    color: COLORS.gray,
    marginBottom: 20,
  },
  backButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
  },
  backButtonText: {
    color: COLORS.white,
    fontWeight: '600',
  },

  // Banner
  bannerSection: {
    height: 200,
    position: 'relative',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  bannerGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
  },
  headerBackBtn: {
    position: 'absolute',
    top: 50,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerShareBtn: {
    position: 'absolute',
    top: 50,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Profile Section
  profileSection: {
    marginTop: -50,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  avatarContainer: {
    position: 'relative',
  },
  storyRing: {
    position: 'absolute',
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    borderRadius: 54,
  },
  avatarBorder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.white,
    padding: 3,
  },
  avatarBorderStory: {
    padding: 4,
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 50,
  },
  shopInfo: {
    flex: 1,
    marginLeft: 16,
    paddingBottom: 10,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  shopName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.dark,
  },
  shopType: {
    fontSize: 14,
    color: COLORS.gray,
    marginTop: 2,
    textTransform: 'capitalize',
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.dark,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.gray,
  },

  // Location Bar
  locationBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  locationInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: COLORS.dark,
  },
  navigateBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Tab Bar
  tabBar: {
    flexDirection: 'row',
    marginTop: 20,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E5E5E5',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    position: 'relative',
  },
  tabItemActive: {
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary,
  },
  newBadge: {
    position: 'absolute',
    top: 8,
    right: '25%',
    backgroundColor: '#FF3B30',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  newBadgeText: {
    color: COLORS.white,
    fontSize: 8,
    fontWeight: 'bold',
  },

  // Tab Content
  tabContent: {
    minHeight: 300,
    padding: 16,
  },
  emptyText: {
    textAlign: 'center',
    color: COLORS.gray,
    marginTop: 40,
    fontSize: 16,
  },

  // Products Grid
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  productCard: {
    width: (width - 44) / 2,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  productImage: {
    width: '100%',
    height: 120,
    resizeMode: 'cover',
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.dark,
    padding: 10,
    paddingBottom: 4,
  },
  priceRow: {
    paddingHorizontal: 10,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  productPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  originalPrice: {
    fontSize: 12,
    color: COLORS.gray,
    textDecorationLine: 'line-through',
  },
  discountPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#E53935',
  },

  // Posts Grid
  postsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 2,
  },
  postCard: {
    width: (width - 36) / 3,
    aspectRatio: 1,
  },
  postImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },

  // Contacts
  contactsSection: {
    gap: 12,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    padding: 16,
    borderRadius: 12,
  },
  contactIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  contactLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.dark,
  },
  messagingComing: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  comingSoonText: {
    marginTop: 12,
    color: COLORS.gray,
    fontSize: 14,
  },

  // About
  aboutSection: {
    gap: 16,
  },
  aboutCard: {
    backgroundColor: COLORS.white,
    padding: 16,
    borderRadius: 12,
  },
  aboutTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.dark,
    marginBottom: 10,
  },
  aboutText: {
    fontSize: 14,
    color: COLORS.dark,
    lineHeight: 22,
  },
  hoursRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  dayLabel: {
    fontSize: 14,
    color: COLORS.gray,
  },
  hoursText: {
    fontSize: 14,
    color: COLORS.dark,
    fontWeight: '500',
  },
});