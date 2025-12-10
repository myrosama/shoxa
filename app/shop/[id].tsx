import { getTelegramImageUrl } from '@/configs/AppConfig';
import { db } from '@/configs/FirebaseConfig';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Image,
  Linking,
  Modal,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

const { width, height } = Dimensions.get('window');

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

type TabType = 'products' | 'posts' | 'info';

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
  const [showLocationModal, setShowLocationModal] = useState(false);

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
    setShowLocationModal(false);
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out ${shop?.name} on SHOXA!\n\n${shop?.location?.address || ''}\n\nhttps://shoxa.uz/shop/${id}`,
        title: shop?.name,
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  const toggleFollow = () => {
    setIsFollowing(!isFollowing);
  };

  // Track which cards have expanded controls
  const [expandedItems, setExpandedItems] = useState<{ [key: string]: boolean }>({});
  const cardTimers = useRef<{ [key: string]: ReturnType<typeof setTimeout> }>({});

  const collapseCard = (productId: string) => {
    setExpandedItems(prev => ({ ...prev, [productId]: false }));
  };

  const resetCardTimer = (productId: string) => {
    // Clear existing timer
    if (cardTimers.current[productId]) {
      clearTimeout(cardTimers.current[productId]);
    }
    // Set new 3-second timer to collapse
    cardTimers.current[productId] = setTimeout(() => {
      collapseCard(productId);
    }, 3000);
  };

  const addToCart = (productId: string) => {
    setCart(prev => ({
      ...prev,
      [productId]: (prev[productId] || 0) + 1
    }));
    setExpandedItems(prev => ({ ...prev, [productId]: true }));
    resetCardTimer(productId);
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => {
      const newQty = Math.max(0, (prev[productId] || 0) - 1);
      if (newQty === 0) {
        const { [productId]: removed, ...rest } = prev;
        return rest;
      }
      return { ...prev, [productId]: newQty };
    });
    resetCardTimer(productId);
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

  const TABS: { key: TabType; label: string }[] = [
    { key: 'products', label: 'Products' },
    { key: 'posts', label: 'Posts' },
    { key: 'info', label: 'Info' },
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

          {/* Share Button */}
          <TouchableOpacity style={styles.headerShareBtn} onPress={handleShare}>
            <Ionicons name="share-outline" size={22} color={COLORS.white} />
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

            {/* Shop Name & Address */}
            <View style={styles.shopNameContainer}>
              <View style={styles.nameRow}>
                <Text style={styles.shopName}>{shop.name || 'Unnamed Shop'}</Text>
                {shop.isVerified && (
                  <Ionicons name="checkmark-circle" size={18} color="#1DA1F2" style={{ marginLeft: 4 }} />
                )}
              </View>
              {/* Full Address Below Name */}
              <Text style={styles.shopAddress} numberOfLines={1}>
                {shop.location?.address || 'Location not set'}
              </Text>
            </View>

            {/* Action Buttons Column */}
            <View style={styles.actionButtons}>
              {/* Follow Button */}
              <TouchableOpacity
                style={[styles.followBtn, isFollowing && styles.followingBtn]}
                onPress={toggleFollow}
              >
                <Text style={[styles.followBtnText, isFollowing && styles.followingBtnText]}>
                  {isFollowing ? 'Following' : 'Follow'}
                </Text>
              </TouchableOpacity>

              {/* Location Button */}
              <TouchableOpacity
                style={styles.locationBtn}
                onPress={() => setShowLocationModal(true)}
              >
                <Ionicons name="navigate" size={18} color={COLORS.white} />
              </TouchableOpacity>
            </View>
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

            {/* Location with tap to open modal */}
            <TouchableOpacity style={styles.statusItem} onPress={() => setShowLocationModal(true)}>
              <Ionicons name="location" size={16} color={COLORS.primary} />
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
                  products.map((item) => {
                    // Calculate discount percentage
                    const hasDiscount = item.discountPrice && item.price && item.discountPrice < item.price;
                    const discountPercent = hasDiscount
                      ? Math.round((1 - item.discountPrice / item.price) * 100)
                      : 0;

                    return (
                      <TouchableOpacity
                        key={item.id}
                        style={styles.productCard}
                        onPress={() => openProductView(item)}
                        activeOpacity={0.95}
                      >
                        {/* Product Image */}
                        <View style={styles.productImageContainer}>
                          <Image
                            source={{ uri: item.imageUrl || 'https://via.placeholder.com/150?text=Product' }}
                            style={styles.productImage}
                          />

                          {/* Discount Badge */}
                          {hasDiscount && (
                            <View style={styles.discountBadge}>
                              <Text style={styles.discountBadgeText}>-{discountPercent}%</Text>
                            </View>
                          )}

                          {/* Cart Controls */}
                          {cart[item.id] > 0 && expandedItems[item.id] ? (
                            // Expanded: show - count +
                            <View style={styles.expandedCartControls}>
                              <TouchableOpacity
                                style={styles.cartControlBtn}
                                onPress={(e) => { e.stopPropagation(); removeFromCart(item.id); }}
                              >
                                <Ionicons name="remove" size={18} color={COLORS.primary} />
                              </TouchableOpacity>
                              <Text style={styles.cartControlCount}>{cart[item.id]}</Text>
                              <TouchableOpacity
                                style={styles.cartControlBtn}
                                onPress={(e) => { e.stopPropagation(); addToCart(item.id); }}
                              >
                                <Ionicons name="add" size={18} color={COLORS.primary} />
                              </TouchableOpacity>
                            </View>
                          ) : cart[item.id] > 0 ? (
                            // Collapsed: show count badge
                            <TouchableOpacity
                              style={styles.cartBadgeBtn}
                              onPress={(e) => {
                                e.stopPropagation();
                                setExpandedItems(prev => ({ ...prev, [item.id]: true }));
                                resetCardTimer(item.id);
                              }}
                            >
                              <Text style={styles.cartBadgeText}>{cart[item.id]}</Text>
                            </TouchableOpacity>
                          ) : (
                            // No items: show + button
                            <TouchableOpacity
                              style={styles.addToCartBtn}
                              onPress={(e) => { e.stopPropagation(); addToCart(item.id); }}
                            >
                              <Ionicons name="add" size={24} color={COLORS.primary} />
                            </TouchableOpacity>
                          )}
                        </View>

                        {/* Product Info */}
                        <View style={styles.productInfo}>
                          {/* Price Section */}
                          {hasDiscount ? (
                            <>
                              <Text style={styles.discountPrice}>
                                {item.discountPrice?.toLocaleString()} so'm
                              </Text>
                              <Text style={styles.originalPrice}>
                                {item.price?.toLocaleString()} so'm
                              </Text>
                            </>
                          ) : (
                            <Text style={styles.productPrice}>
                              {item.price?.toLocaleString()} so'm
                            </Text>
                          )}

                          {/* Product Name */}
                          <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })
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

          {activeTab === 'info' && (
            <View style={styles.infoSection}>
              {/* About Us */}
              <View style={styles.infoBlock}>
                <Text style={styles.infoTitle}>About Us</Text>
                <Text style={styles.infoText}>
                  {shop.about || shop.description || 'No description available.'}
                </Text>
              </View>

              {/* Store Hours */}
              <View style={styles.infoBlock}>
                <Text style={styles.infoTitle}>Store Hours</Text>
                {shop.openingHours ? (
                  Object.entries(shop.openingHours).map(([day, hours]: [string, any]) => (
                    <View key={day} style={styles.hoursRow}>
                      <Text style={styles.dayLabel}>{day.charAt(0).toUpperCase() + day.slice(1)}</Text>
                      <Text style={styles.hoursText}>{hours.open} - {hours.close}</Text>
                    </View>
                  ))
                ) : (
                  <Text style={styles.infoText}>Hours not set</Text>
                )}
              </View>

              {/* Contact & Location */}
              <View style={styles.infoBlock}>
                <Text style={styles.infoTitle}>Contact & Location</Text>

                <TouchableOpacity style={styles.contactRow} onPress={() => setShowLocationModal(true)}>
                  <View style={styles.contactIconSmall}>
                    <Ionicons name="location-outline" size={18} color={COLORS.primary} />
                  </View>
                  <Text style={styles.contactText} numberOfLines={2}>
                    {shop.location?.address || 'Location not set'}
                  </Text>
                </TouchableOpacity>

                {shop.phone && (
                  <TouchableOpacity style={styles.contactRow} onPress={() => Linking.openURL(`tel:${shop.phone}`)}>
                    <View style={styles.contactIconSmall}>
                      <Ionicons name="call-outline" size={18} color={COLORS.primary} />
                    </View>
                    <Text style={styles.contactText}>{shop.phone}</Text>
                  </TouchableOpacity>
                )}

                {shop.website && (
                  <TouchableOpacity style={styles.contactRow} onPress={() => Linking.openURL(shop.website)}>
                    <View style={styles.contactIconSmall}>
                      <Ionicons name="globe-outline" size={18} color={COLORS.primary} />
                    </View>
                    <Text style={styles.contactText}>{shop.website}</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Amenities */}
              <View style={styles.infoBlock}>
                <Text style={styles.infoTitle}>Amenities</Text>
                <View style={styles.amenitiesGrid}>
                  <View style={styles.amenityItem}>
                    <Ionicons name="car-outline" size={20} color={COLORS.primary} />
                    <Text style={styles.amenityText}>Parking{'\n'}Available</Text>
                  </View>
                  <View style={styles.amenityItem}>
                    <Ionicons name="accessibility-outline" size={20} color={COLORS.primary} />
                    <Text style={styles.amenityText}>Wheelchair{'\n'}Access</Text>
                  </View>
                  <View style={styles.amenityItem}>
                    <Ionicons name="wifi-outline" size={20} color={COLORS.primary} />
                    <Text style={styles.amenityText}>Free{'\n'}Wi-Fi</Text>
                  </View>
                  <View style={styles.amenityItem}>
                    <Ionicons name="card-outline" size={20} color={COLORS.primary} />
                    <Text style={styles.amenityText}>Contactless{'\n'}Pay</Text>
                  </View>
                </View>
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Location Preview Modal */}
      <Modal
        visible={showLocationModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowLocationModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.locationModal}>
            {/* Map Preview */}
            <View style={styles.mapPreview}>
              <Image
                source={{ uri: `https://api.mapbox.com/styles/v1/mapbox/streets-v11/static/${shop.location?.lng || 69.24},${shop.location?.lat || 41.3}/14/400x200@2x?access_token=pk.placeholder` }}
                style={styles.mapImage}
              />
              <View style={styles.mapPin}>
                <Ionicons name="location" size={32} color={COLORS.primary} />
              </View>
            </View>

            <Text style={styles.modalShopName}>{shop.name}</Text>
            <Text style={styles.modalAddress}>{shop.location?.address || 'Location not set'}</Text>
            <Text style={styles.modalDistance}>1.2 km away</Text>

            <TouchableOpacity style={styles.navigateBtn} onPress={openMaps}>
              <Ionicons name="navigate" size={20} color={COLORS.white} />
              <Text style={styles.navigateBtnText}>Navigate</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.closeModalBtn} onPress={() => setShowLocationModal(false)}>
              <Text style={styles.closeModalText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Floating Cart Bar - Uzum style */}
      {getCartTotal() > 0 && (
        <TouchableOpacity style={styles.floatingCart} activeOpacity={0.95}>
          <View style={styles.cartCountCircle}>
            <Text style={styles.cartCountCircleText}>{getCartTotal()}</Text>
          </View>
          <Text style={styles.goToCartText}>Savatga</Text>
          <Text style={styles.cartPriceText}>{getCartTotalPrice().toLocaleString()} so'm</Text>
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
  headerShareBtn: {
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
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  shopName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.dark,
  },
  shopAddress: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 2,
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
  actionButtons: {
    alignItems: 'center',
    gap: 8,
  },
  locationBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
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
    right: 16,
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
    width: '100%',
  },

  // Products Grid - 2 columns with better cards
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  productCard: {
    width: (width - 44) / 2,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  productImageContainer: {
    position: 'relative',
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#F8F8F8',
  },
  productImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  discountBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#FFE500',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  discountBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.dark,
  },
  addToCartBtn: {
    position: 'absolute',
    bottom: -20,
    right: 12,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  cartCountText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Expanded cart controls (- count +)
  expandedCartControls: {
    position: 'absolute',
    bottom: -20,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 22,
    paddingHorizontal: 4,
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  cartControlBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartControlCount: {
    minWidth: 24,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.dark,
  },
  // Collapsed badge button
  cartBadgeBtn: {
    position: 'absolute',
    bottom: -20,
    right: 12,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 5,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  cartBadgeText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  productInfo: {
    padding: 12,
    paddingTop: 16,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.dark,
  },
  discountPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  originalPrice: {
    fontSize: 13,
    color: COLORS.gray,
    textDecorationLine: 'line-through',
    marginTop: 2,
  },
  productName: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.dark,
    marginTop: 6,
    lineHeight: 18,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
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

  // Info Section (Combined About + Contact)
  infoSection: {
    gap: 0,
  },
  infoBlock: {
    marginBottom: 24,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.dark,
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: COLORS.dark,
    lineHeight: 22,
  },
  hoursRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  dayLabel: {
    fontSize: 14,
    color: COLORS.dark,
  },
  hoursText: {
    fontSize: 14,
    color: COLORS.gray,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 12,
  },
  contactIconSmall: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFF5EE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.dark,
  },
  amenitiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  amenityItem: {
    width: (width - 56) / 2,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    padding: 12,
    borderRadius: 12,
    gap: 10,
  },
  amenityText: {
    fontSize: 12,
    color: COLORS.dark,
    lineHeight: 16,
  },

  // Location Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  locationModal: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 40,
  },
  mapPreview: {
    height: 150,
    backgroundColor: COLORS.lightGray,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  mapPin: {
    position: 'absolute',
  },
  modalShopName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.dark,
    textAlign: 'center',
  },
  modalAddress: {
    fontSize: 14,
    color: COLORS.gray,
    textAlign: 'center',
    marginTop: 4,
  },
  modalDistance: {
    fontSize: 14,
    color: COLORS.primary,
    textAlign: 'center',
    marginTop: 4,
    fontWeight: '500',
  },
  navigateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 20,
    gap: 8,
  },
  navigateBtnText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  closeModalBtn: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 8,
  },
  closeModalText: {
    color: COLORS.gray,
    fontSize: 14,
  },

  // Floating Cart
  floatingCart: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    backgroundColor: '#7B2DFF', // Purple like Uzum
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    paddingHorizontal: 16,
    gap: 12,
    shadowColor: '#7B2DFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  cartCountCircle: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartCountCircleText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: 'bold',
  },
  goToCartText: {
    flex: 1,
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  cartPriceText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
});