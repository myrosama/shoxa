import { getTelegramImageUrl } from '@/configs/AppConfig';
import { db } from '@/configs/FirebaseConfig';
import { useAuth } from '@/contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    Dimensions,
    FlatList,
    Image,
    RefreshControl,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

const COLORS = {
    background: '#FDF6E3',
    primary: '#C67C43',
    primaryLight: '#F5D6BA',
    dark: '#333333',
    gray: '#888888',
    lightGray: '#E0E0E0',
    white: '#FFFFFF',
    red: '#E53935',
};

interface Story {
    id: string;
    shopId: string;
    shopName: string;
    shopLogo: string;
    imageUrl: string;
    caption: string;
    createdAt: any;
    hasNew: boolean;
}

interface Post {
    id: string;
    shopId: string;
    shopName: string;
    shopLogo: string;
    imageUrl: string;
    caption: string;
    likes: number;
    createdAt: any;
}

type FeedTab = 'foryou' | 'following';

export default function Feed() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { isAuthenticated, userProfile } = useAuth();

    const [activeTab, setActiveTab] = useState<FeedTab>('foryou');
    const [stories, setStories] = useState<Story[]>([]);
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const tabIndicator = useRef(new Animated.Value(0)).current;

    // Animate tab indicator
    useEffect(() => {
        Animated.spring(tabIndicator, {
            toValue: activeTab === 'foryou' ? 0 : 1,
            useNativeDriver: true,
            tension: 68,
            friction: 12,
        }).start();
    }, [activeTab]);

    // Load feed data
    useEffect(() => {
        loadFeedData();
    }, [activeTab, userProfile?.following]);

    const loadFeedData = async () => {
        try {
            setLoading(true);

            // Get all shops (or just followed ones for Following tab)
            let shopsQuery = query(collection(db, 'shops'));

            const shopsSnapshot = await getDocs(shopsQuery);
            const shopsData: any[] = [];

            for (const shopDoc of shopsSnapshot.docs) {
                const shopData = shopDoc.data();

                // For Following tab, filter to only followed shops
                if (activeTab === 'following') {
                    if (!userProfile?.following?.includes(shopDoc.id)) {
                        continue;
                    }
                }

                let logoUrl = null;
                if (shopData.logoFileId) {
                    logoUrl = await getTelegramImageUrl(shopData.logoFileId);
                }

                shopsData.push({
                    id: shopDoc.id,
                    name: shopData.name || 'Shop',
                    logoUrl,
                    ...shopData,
                });
            }

            // Load stories from shops (posts marked as stories or < 24h old)
            const allStories: Story[] = [];
            const allPosts: Post[] = [];

            for (const shop of shopsData) {
                try {
                    // Get posts from this shop
                    const postsSnapshot = await getDocs(
                        query(collection(db, 'shops', shop.id, 'posts'), orderBy('createdAt', 'desc'))
                    );

                    for (const postDoc of postsSnapshot.docs) {
                        const postData = postDoc.data();
                        let imageUrl = null;

                        if (postData.imageFileId) {
                            imageUrl = await getTelegramImageUrl(postData.imageFileId);
                        }

                        const post: Post = {
                            id: postDoc.id,
                            shopId: shop.id,
                            shopName: shop.name,
                            shopLogo: shop.logoUrl,
                            imageUrl: imageUrl || 'https://via.placeholder.com/400',
                            caption: postData.caption || '',
                            likes: postData.likes || 0,
                            createdAt: postData.createdAt,
                        };

                        // Check if it's a story (< 24 hours old)
                        const createdAt = postData.createdAt?.toDate?.() || new Date();
                        const hoursAgo = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60);

                        if (hoursAgo < 24 && postData.isStory !== false) {
                            allStories.push({
                                ...post,
                                hasNew: hoursAgo < 1, // New if less than 1 hour
                            });
                        }

                        allPosts.push(post);
                    }
                } catch (e) {
                    console.error('Error loading posts for shop', shop.id);
                }
            }

            // Dedupe stories by shop (show only latest per shop)
            const storyByShop = new Map<string, Story>();
            allStories.forEach(story => {
                if (!storyByShop.has(story.shopId) || story.hasNew) {
                    storyByShop.set(story.shopId, story);
                }
            });

            setStories(Array.from(storyByShop.values()));
            setPosts(allPosts);
        } catch (error) {
            console.error('Feed load error:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        loadFeedData();
    };

    // Story circle component
    const StoryCircle = ({ story }: { story: Story }) => (
        <TouchableOpacity
            style={styles.storyItem}
            onPress={() => router.push(`/shop/${story.shopId}`)}
        >
            <View style={[styles.storyRing, story.hasNew && styles.storyRingNew]}>
                <Image
                    source={{ uri: story.shopLogo || 'https://via.placeholder.com/60' }}
                    style={styles.storyImage}
                />
            </View>
            <Text style={styles.storyName} numberOfLines={1}>{story.shopName}</Text>
        </TouchableOpacity>
    );

    // Post card component
    const PostCard = ({ post }: { post: Post }) => (
        <View style={styles.postCard}>
            {/* Post Header */}
            <TouchableOpacity
                style={styles.postHeader}
                onPress={() => router.push(`/shop/${post.shopId}`)}
            >
                <Image
                    source={{ uri: post.shopLogo || 'https://via.placeholder.com/40' }}
                    style={styles.postAvatar}
                />
                <View style={styles.postHeaderText}>
                    <Text style={styles.postShopName}>{post.shopName}</Text>
                    <Text style={styles.postTime}>
                        {post.createdAt?.toDate?.()
                            ? formatTimeAgo(post.createdAt.toDate())
                            : 'Recently'}
                    </Text>
                </View>
                <TouchableOpacity style={styles.postMoreBtn}>
                    <Ionicons name="ellipsis-horizontal" size={20} color={COLORS.gray} />
                </TouchableOpacity>
            </TouchableOpacity>

            {/* Post Image */}
            <Image
                source={{ uri: post.imageUrl }}
                style={styles.postImage}
                resizeMode="cover"
            />

            {/* Post Actions */}
            <View style={styles.postActions}>
                <View style={styles.postActionsLeft}>
                    <TouchableOpacity style={styles.actionBtn}>
                        <Ionicons name="heart-outline" size={26} color={COLORS.dark} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionBtn}>
                        <Ionicons name="chatbubble-outline" size={24} color={COLORS.dark} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionBtn}>
                        <Ionicons name="paper-plane-outline" size={24} color={COLORS.dark} />
                    </TouchableOpacity>
                </View>
                <TouchableOpacity>
                    <Ionicons name="bookmark-outline" size={24} color={COLORS.dark} />
                </TouchableOpacity>
            </View>

            {/* Likes */}
            {post.likes > 0 && (
                <Text style={styles.postLikes}>{post.likes} likes</Text>
            )}

            {/* Caption */}
            {post.caption && (
                <View style={styles.postCaption}>
                    <Text style={styles.captionShop}>{post.shopName} </Text>
                    <Text style={styles.captionText}>{post.caption}</Text>
                </View>
            )}
        </View>
    );

    // Format time ago
    const formatTimeAgo = (date: Date) => {
        const hours = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60));
        if (hours < 1) return 'Just now';
        if (hours < 24) return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        if (days < 7) return `${days}d ago`;
        return date.toLocaleDateString();
    };

    // Empty state for Following tab when not logged in
    const renderEmptyFollowing = () => (
        <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={64} color={COLORS.gray} />
            <Text style={styles.emptyTitle}>
                {isAuthenticated ? 'No posts yet' : 'Sign in to see updates'}
            </Text>
            <Text style={styles.emptySubtitle}>
                {isAuthenticated
                    ? "Follow shops to see their posts here"
                    : "Follow your favorite shops and get personalized updates"}
            </Text>
            {!isAuthenticated && (
                <TouchableOpacity
                    style={styles.signInBtn}
                    onPress={() => router.push('/auth/login')}
                >
                    <Text style={styles.signInBtnText}>Sign In</Text>
                </TouchableOpacity>
            )}
        </View>
    );

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Feed</Text>
                <TouchableOpacity onPress={() => router.push('/search')}>
                    <Ionicons name="search" size={24} color={COLORS.dark} />
                </TouchableOpacity>
            </View>

            {/* Tab Bar */}
            <View style={styles.tabBar}>
                <TouchableOpacity
                    style={styles.tab}
                    onPress={() => setActiveTab('foryou')}
                >
                    <Text style={[styles.tabText, activeTab === 'foryou' && styles.tabTextActive]}>
                        For You
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.tab}
                    onPress={() => setActiveTab('following')}
                >
                    <Text style={[styles.tabText, activeTab === 'following' && styles.tabTextActive]}>
                        Following
                    </Text>
                </TouchableOpacity>

                {/* Animated indicator */}
                <Animated.View
                    style={[
                        styles.tabIndicator,
                        {
                            transform: [{
                                translateX: tabIndicator.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [0, width / 2 - 40],
                                })
                            }]
                        }
                    ]}
                />
            </View>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                </View>
            ) : (
                <FlatList
                    data={posts}
                    keyExtractor={(item) => `${item.shopId}-${item.id}`}
                    ListHeaderComponent={() => (
                        <>
                            {/* Stories Row */}
                            {stories.length > 0 && (
                                <ScrollView
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    contentContainerStyle={styles.storiesContainer}
                                >
                                    {stories.map((story) => (
                                        <StoryCircle key={`${story.shopId}-story`} story={story} />
                                    ))}
                                </ScrollView>
                            )}
                        </>
                    )}
                    renderItem={({ item }) => <PostCard post={item} />}
                    ListEmptyComponent={activeTab === 'following' ? renderEmptyFollowing : null}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            tintColor={COLORS.primary}
                        />
                    }
                    contentContainerStyle={styles.feedContent}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 12,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: COLORS.dark,
    },
    tabBar: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.lightGray,
        position: 'relative',
    },
    tab: {
        flex: 1,
        paddingVertical: 14,
        alignItems: 'center',
    },
    tabText: {
        fontSize: 16,
        fontWeight: '500',
        color: COLORS.gray,
    },
    tabTextActive: {
        color: COLORS.dark,
        fontWeight: '700',
    },
    tabIndicator: {
        position: 'absolute',
        bottom: 0,
        left: 20,
        width: width / 2 - 40,
        height: 3,
        backgroundColor: COLORS.primary,
        borderRadius: 2,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    feedContent: {
        paddingBottom: 100,
    },

    // Stories
    storiesContainer: {
        paddingHorizontal: 15,
        paddingVertical: 15,
        gap: 15,
    },
    storyItem: {
        alignItems: 'center',
        width: 75,
    },
    storyRing: {
        width: 68,
        height: 68,
        borderRadius: 34,
        borderWidth: 2,
        borderColor: COLORS.lightGray,
        padding: 3,
        marginBottom: 6,
    },
    storyRingNew: {
        borderColor: COLORS.primary,
        borderWidth: 3,
    },
    storyImage: {
        width: '100%',
        height: '100%',
        borderRadius: 30,
    },
    storyName: {
        fontSize: 12,
        color: COLORS.dark,
        textAlign: 'center',
    },

    // Posts
    postCard: {
        backgroundColor: COLORS.white,
        marginBottom: 12,
    },
    postHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
    },
    postAvatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        marginRight: 10,
    },
    postHeaderText: {
        flex: 1,
    },
    postShopName: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.dark,
    },
    postTime: {
        fontSize: 12,
        color: COLORS.gray,
        marginTop: 2,
    },
    postMoreBtn: {
        padding: 4,
    },
    postImage: {
        width: '100%',
        aspectRatio: 1,
        backgroundColor: COLORS.lightGray,
    },
    postActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    postActionsLeft: {
        flexDirection: 'row',
        gap: 16,
    },
    actionBtn: {
        padding: 2,
    },
    postLikes: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.dark,
        paddingHorizontal: 12,
        marginBottom: 6,
    },
    postCaption: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: 12,
        paddingBottom: 12,
    },
    captionShop: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.dark,
    },
    captionText: {
        fontSize: 14,
        color: COLORS.dark,
        flex: 1,
    },

    // Empty state
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
        paddingTop: 60,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: COLORS.dark,
        marginTop: 20,
        marginBottom: 10,
    },
    emptySubtitle: {
        fontSize: 15,
        color: COLORS.gray,
        textAlign: 'center',
        lineHeight: 22,
    },
    signInBtn: {
        backgroundColor: COLORS.primary,
        paddingHorizontal: 32,
        paddingVertical: 14,
        borderRadius: 25,
        marginTop: 24,
    },
    signInBtnText: {
        color: COLORS.white,
        fontSize: 16,
        fontWeight: '600',
    },
});