import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, Image, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Dimensions, Animated, Linking, Platform, Alert
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
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
  green: '#4CAF50',
  red: '#E53935',
  storyGradient: ['#FF6B6B', '#FFE66D', '#4ECDC4', '#45B7D1', '#96E6A1'],
};

import { getTelegramImageUrl } from '@/configs/AppConfig';

// Get open/closed status
const getOpenStatus = (openingHours: any): { isOpen: boolean; statusText: string; statusColor: string } => {
  if (!openingHours) return { isOpen: false, statusText: 'Hours not set', statusColor: COLORS.gray };

  const now = new Date();
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const today = days[now.getDay()];
  const currentTime = now.getHours() * 60 + now.getMinutes(); // minutes since midnight

  const todayHours = openingHours[today];
  if (!todayHours || !todayHours.open || !todayHours.close) {
    return { isOpen: false, statusText: 'Closed today', statusColor: COLORS.red };
  }

  const [openHour, openMin] = todayHours.open.split(':').map(Number);
  const [closeHour, closeMin] = todayHours.close.split(':').map(Number);
  const openTime = openHour * 60 + openMin;
  const closeTime = closeHour * 60 + closeMin;

  if (currentTime >= openTime && currentTime < closeTime) {
    const minsUntilClose = closeTime - currentTime;
    if (minsUntilClose <= 60) {
      return { isOpen: true, statusText: `Closes in ${minsUntilClose}min`, statusColor: '#FF9800' };
    }
    return { isOpen: true, statusText: `Open · Closes ${todayHours.close}`, statusColor: COLORS.green };
  } else if (currentTime < openTime) {
    return { isOpen: false, statusText: `Closed · Opens ${todayHours.open}`, statusColor: COLORS.red };
  } else {
    // Find next open day
    for (let i = 1; i <= 7; i++) {
      const nextDay = days[(now.getDay() + i) % 7];
      if (openingHours[nextDay]?.open) {
        return { isOpen: false, statusText: `Closed · Opens ${nextDay.charAt(0).toUpperCase() + nextDay.slice(1)}`, statusColor: COLORS.red };
      }
    }
    return { isOpen: false, statusText: 'Closed', statusColor: COLORS.red };
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
  const [isFollowing, setIsFollowing] = useState(false);
  const [cart, setCart] = useState<{ [key: string]: number }>({});
  const [openStatus, setOpenStatus] = useState({ isOpen: false, statusText: '', statusColor: COLORS.gray });

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
      const shopRef = doc(db, 'shops', id as string);
      const shopSnap = await getDoc(shopRef);

      if (shopSnap.exists()) {
        const shopData = { id: shopSnap.id, ...shopSnap.data() };
        setShop(shopData);
        setOpenStatus(getOpenStatus(shopData.openingHours));

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

  const toggleFollow = () => {
    setIsFollowing(!isFollowing);
    // TODO: Save to Firebase
  };

  const addToCart = (productId: string) => {
    setCart(prev => ({
      ...prev,
      [productId]: (prev[productId] || 0) + 1
    }));
  };

  const getCartTotal = () => {
    return Object.values(cart).reduce((sum, qty) => sum + qty, 0);
  };

  const getCartTotalPrice = () => {
    return products.reduce((sum, p) => {
      const qty = cart[p.id] || 0;
      const price = p.discountPrice || p.price || 0;
      return sum + (qty * price);
    }, 0);
  };

  const openProductView = (product: any) => {
    // Navigate to product detail view
    router.push({
      pathname: '/product/[id]',
      params: { id: product.id, shopId: id as string }
    });
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
            colors={['transparent', 'rgba(0,0,0,0.8)']}
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

          {/* Shop Name on Banner */}
          <View style={styles.bannerInfo}>
            <Text style={styles.bannerShopName}>{shop.name || 'Unnamed Shop'}</Text>
            <Text style={styles.bannerShopType}>{shop.type || 'Shop'}</Text>
          </View>
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

          {/* Stats & Follow Button */}
          <View style={styles.statsAndFollow}>
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

            {/* Follow Button */}
            <TouchableOpacity
              style={[styles.followBtn, isFollowing && styles.followingBtn]}
              onPress={toggleFollow}
            >
              <Ionicons
                name={isFollowing ? 'checkmark' : 'add'}
                size={18}
                color={isFollowing ? COLORS.primary : COLORS.white}
              />
              <Text style={[styles.followBtnText, isFollowing && styles.followingBtnText]}>
                {isFollowing ? 'Following' : 'Follow'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Open/Closed Status */}
        <View style={styles.statusBar}>
          <View style={[styles.statusDot, { backgroundColor: openStatus.statusColor }]} />
          <Text style={[styles.statusText, { color: openStatus.statusColor }]}>
            {openStatus.statusText}
          </Text>
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
                  <TouchableOpacity
                    key={item.id}
                    style={styles.productCard}
                    onPress={() => openProductView(item)}
                  >
                    <Image
                      source={{ uri: item.imageUrl || 'https://via.placeholder.com/150?text=Product' }}
                      style={styles.productImage}
                    />
                    {/* Add to Cart Button */}
                    <TouchableOpacity
                      style={styles.addToCartBtn}
                      onPress={(e) => { e.stopPropagation(); addToCart(item.id); }}
                    >
                      <Ionicons name="add" size={20} color={COLORS.white} />
                    </TouchableOpacity>
                    {cart[item.id] > 0 && (
                      <View style={styles.cartBadge}>
                        <Text style={styles.cartBadgeText}>{cart[item.id]}</Text>
                      </View>
                    )}
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

      {/* Floating Cart Button */}
      {getCartTotal() > 0 && (
        <TouchableOpacity style={styles.floatingCart}>
          <Ionicons name="cart" size={24} color={COLORS.white} />
          <View style={styles.floatingCartBadge}>
            <Text style={styles.floatingCartBadgeText}>{getCartTotal()}</Text>
          </View>
          <Text style={styles.floatingCartText}>{getCartTotalPrice().toLocaleString()} UZS</Text>
          <Ionicons name="chevron-forward" size={20} color={COLORS.white} />
        </TouchableOpacity>
      )}
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
    height: 220,
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
    height: 150,
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
  bannerInfo: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
  },
  bannerShopName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.white,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  bannerShopType: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    textTransform: 'capitalize',
    marginTop: 2,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  // Profile Section
  profileSection: {
    marginTop: -40,
    paddingHorizontal: 16,
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
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: COLORS.white,
    padding: 3,
  },
  avatarBorderStory: {
    padding: 4,
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 45,
  },
  statsAndFollow: {
    flex: 1,
    marginLeft: 16,
    paddingBottom: 8,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 10,
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
    fontSize: 11,
    color: COLORS.gray,
  },

  // Follow Button
  followBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 4,
  },
  followingBtn: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  followBtnText: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: 14,
  },
  followingBtnText: {
    color: COLORS.primary,
  },

  // Status Bar
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '500',
  },

  // Location Bar
  locationBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
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
    marginTop: 16,
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
    position: 'relative',
  },
  productImage: {
    width: '100%',
    height: 120,
    resizeMode: 'cover',
  },
  addToCartBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  cartBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.red,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartBadgeText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: 'bold',
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
    color: COLORS.red,
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

  // Floating Cart
  floatingCart: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingHorizontal: 20,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  floatingCartBadge: {
    backgroundColor: COLORS.red,
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: -4,
    marginRight: 8,
  },
  floatingCartBadgeText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
  floatingCartText: {
    flex: 1,
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
});