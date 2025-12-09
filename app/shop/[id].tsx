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
import { getTelegramImageUrl } from '@/configs/AppConfig';

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
  cream: '#FFF8F0',
  storyGradient: ['#FF6B6B', '#FFE66D', '#4ECDC4', '#45B7D1', '#96E6A1'] as const,
};

// Get open/closed status
const getOpenStatus = (openingHours: any): { isOpen: boolean; statusText: string; statusColor: string } => {
  if (!openingHours) return { isOpen: false, statusText: 'Hours not set', statusColor: COLORS.gray };

  const now = new Date();
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const today = days[now.getDay()];
  const currentTime = now.getHours() * 60 + now.getMinutes();

  const todayHours = openingHours[today];
  if (!todayHours || !todayHours.open || !todayHours.close) {
    return { isOpen: false, statusText: 'Closed today', statusColor: COLORS.red };
  }

  const [openHour, openMin] = todayHours.open.split(':').map(Number);
  const [closeHour, closeMin] = todayHours.close.split(':').map(Number);
  const openTime = openHour * 60 + openMin;
  const closeTime = closeHour * 60 + closeMin;

  if (currentTime >= openTime && currentTime < closeTime) {
    const closeHourFormatted = closeHour > 12 ? `${closeHour - 12} PM` : `${closeHour} AM`;
    return { isOpen: true, statusText: `Open until ${closeHourFormatted}`, statusColor: COLORS.green };
  } else if (currentTime < openTime) {
    return { isOpen: false, statusText: `Opens ${todayHours.open}`, statusColor: COLORS.red };
  } else {
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
  const [isFavorite, setIsFavorite] = useState(false);
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
  };

  const toggleFavorite = () => {
    setIsFavorite(!isFavorite);
  };

  const addToCart = (productId: string, productName: string) => {
    setCart(prev => ({
      ...prev,
      [productId]: (prev[productId] || 0) + 1
    }));
    // Optional: Show quick feedback
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

      <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
        {/* Banner Section */}
        <View style={styles.bannerSection}>
          <Image
            source={{ uri: bannerUrl || 'https://via.placeholder.com/600x300?text=No+Banner' }}
            style={styles.bannerImage}
          />

          {/* Back Button */}
          <TouchableOpacity style={styles.headerBackBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color={COLORS.white} />
          </TouchableOpacity>

          {/* Favorite Button */}
          <TouchableOpacity style={styles.headerFavoriteBtn} onPress={toggleFavorite}>
            <Ionicons
              name={isFavorite ? 'heart' : 'heart-outline'}
              size={22}
              color={isFavorite ? COLORS.red : COLORS.white}
            />
          </TouchableOpacity>
        </View>

        {/* Floating Info Card */}
        <View style={styles.infoCard}>
          {/* Logo & Name Row */}
          <View style={styles.infoCardTop}>
            {/* Logo with Story Glow */}
            <Animated.View style={[styles.logoContainer, { transform: [{ scale: storyPulse }] }]}>
              {hasStory && (
                <LinearGradient
                  colors={COLORS.storyGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.storyRing}
                />
              )}
              <View style={[styles.logoBorder, hasStory && styles.logoBorderStory]}>
                <Image
                  source={{ uri: logoUrl || 'https://via.placeholder.com/100?text=Logo' }}
                  style={styles.logo}
                />
              </View>
            </Animated.View>

            {/* Shop Name */}
            <View style={styles.shopNameContainer}>
              <Text style={styles.shopName}>{shop.name || 'Unnamed Shop'}</Text>
              {shop.isVerified && (
                <Ionicons name="checkmark-circle" size={18} color="#1DA1F2" style={{ marginLeft: 4 }} />
              )}
            </View>

            {/* Follow Button */}
            <TouchableOpacity
              style={[styles.followBtn, isFollowing && styles.followingBtn]}
              onPress={toggleFollow}
            >
              <Text style={[styles.followBtnText, isFollowing && styles.followingBtnText]}>
                {isFollowing ? 'Following' : 'Follow'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Status Row */}
          <View style={styles.statusRow}>
            {/* Open Status */}
            <View style={styles.statusItem}>
              <View style={[styles.statusDot, { backgroundColor: openStatus.statusColor }]} />
              <Text style={[styles.statusText, { color: openStatus.statusColor }]}>
                {openStatus.statusText}
              </Text>
            </View>

            {/* Location with tap to navigate */}
            <TouchableOpacity style={styles.statusItem} onPress={openMaps}>
              <Ionicons name="location" size={16} color={COLORS.gray} />
              <Text style={styles.distanceText}>1.2 km</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Tab Navigation */}
        <View style={styles.tabBar}>
          {TABS.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tabItem, activeTab === tab.key && styles.tabItemActive]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
                {tab.label}
              </Text>
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
            <>
              <Text style={styles.sectionTitle}>Available Products</Text>
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
                      <View style={styles.productImageContainer}>
                        <Image
                          source={{ uri: item.imageUrl || 'https://via.placeholder.com/150?text=Product' }}
                          style={styles.productImage}
                        />
                        {/* Add to Cart Button */}
                        <TouchableOpacity
                          style={styles.addToCartBtn}
                          onPress={(e) => { e.stopPropagation(); addToCart(item.id, item.name); }}
                        >
                          <Ionicons name="add" size={18} color={COLORS.white} />
                        </TouchableOpacity>
                        {cart[item.id] > 0 && (
                          <View style={styles.cartBadge}>
                            <Text style={styles.cartBadgeText}>{cart[item.id]}</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
                      <View style={styles.priceRow}>
                        {item.discountPrice ? (
                          <>
                            <Text style={styles.originalPrice}>{item.price?.toLocaleString()}</Text>
                            <Text style={styles.discountPrice}>{item.discountPrice?.toLocaleString()}</Text>
                          </>
                        ) : (
                          <Text style={styles.productPrice}>{item.price?.toLocaleString()} UZS</Text>
                        )}
                      </View>
                    </TouchableOpacity>
                  ))
                )}
              </View>
            </>
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

              {/* Location Card */}
              <TouchableOpacity style={styles.aboutCard} onPress={openMaps}>
                <Text style={styles.aboutTitle}>Location</Text>
                <View style={styles.locationRow}>
                  <Ionicons name="location" size={20} color={COLORS.primary} />
                  <Text style={styles.locationAddressText}>{shop.location?.address || 'Tap to navigate'}</Text>
                </View>
              </TouchableOpacity>
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
  headerBackBtn: {
    position: 'absolute',
    top: 50,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerFavoriteBtn: {
    position: 'absolute',
    top: 50,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Floating Info Card
  infoCard: {
    backgroundColor: COLORS.cream,
    marginHorizontal: 16,
    marginTop: -40,
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  infoCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoContainer: {
    position: 'relative',
  },
  storyRing: {
    position: 'absolute',
    top: -3,
    left: -3,
    right: -3,
    bottom: -3,
    borderRadius: 35,
  },
  logoBorder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.white,
    padding: 2,
  },
  logoBorderStory: {
    padding: 3,
  },
  logo: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
  },
  shopNameContainer: {
    flex: 1,
    marginLeft: 12,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  shopName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.dark,
  },
  followBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  followingBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
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

  // Status Row
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 16,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
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
  distanceText: {
    fontSize: 13,
    color: COLORS.gray,
  },

  // Tab Bar
  tabBar: {
    flexDirection: 'row',
    marginTop: 16,
    marginHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    position: 'relative',
  },
  tabItemActive: {
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.gray,
  },
  tabTextActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  newBadge: {
    position: 'absolute',
    top: 6,
    right: 8,
    backgroundColor: COLORS.red,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  newBadgeText: {
    color: COLORS.white,
    fontSize: 7,
    fontWeight: 'bold',
  },

  // Tab Content
  tabContent: {
    minHeight: 300,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.dark,
    marginBottom: 16,
  },
  emptyText: {
    textAlign: 'center',
    color: COLORS.gray,
    marginTop: 40,
    fontSize: 16,
  },

  // Products Grid - 3 columns
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  productCard: {
    width: (width - 52) / 3,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    overflow: 'hidden',
  },
  productImageContainer: {
    position: 'relative',
    width: '100%',
    aspectRatio: 1,
    backgroundColor: COLORS.lightGray,
    borderRadius: 12,
    overflow: 'hidden',
  },
  productImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  addToCartBtn: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  cartBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
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
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.dark,
    marginTop: 6,
    lineHeight: 16,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  productPrice: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  originalPrice: {
    fontSize: 10,
    color: COLORS.gray,
    textDecorationLine: 'line-through',
  },
  discountPrice: {
    fontSize: 12,
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
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  locationAddressText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.dark,
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