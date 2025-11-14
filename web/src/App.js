import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { 
  Search, Compass, ShoppingCart, Bell, User, Home, Map as MapIcon, 
  X, ChevronDown, Clock, MapPin, Tag, Building, ArrowLeft, Star, Heart, Share2, Phone,
  Rss, MessageCircle, Loader2 // <-- THE FIX IS HERE
} from 'lucide-react';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api';

// Firebase Imports
import { initializeApp } from 'firebase/app';
import { 
  getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged,
  createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut
} from 'firebase/auth';
import { 
  getFirestore, collection, query, onSnapshot, doc, getDoc,
  collectionGroup, where, orderBy, setDoc, deleteDoc
} from 'firebase/firestore';

// --- Local & Global Configuration ---
// NEW: We now read from the .env file
const LOCAL_FIREBASE_CONFIG = {
  apiKey: process.env.REACT_APP_API_KEY,
  authDomain: process.env.REACT_APP_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_PROJECT_ID,
  storageBucket: process.env.REACT_APP_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_APP_ID,
  measurementId: process.env.REACT_APP_MEASUREMENT_ID
};
// NEW: Read the Maps API key from .env
const GOOGLE_MAPS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;

// This logic stays the same, but now it's cleaner!
const appId = typeof __app_id !== 'undefined' ? __app_id : LOCAL_FIREBASE_CONFIG.appId;
const firebaseConfig = typeof __firebase_config !== 'undefined' ? 
  JSON.parse(__firebase_config) : LOCAL_FIREBASE_CONFIG;
  
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? 
  __initial_auth_token : null;
// --------------------------------------------------------

// Autumn Vibe Color Palette
const Colors = {
  primary: '#C67C43',
  secondary: '#A0522D',
  background: '#FDF6E3',
  text: '#333333',
  accent: '#4B5320',
};

// --- Haversine Distance (for "meters away") ---
function getDistance(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c; // distance in km
  return distance * 1000; // distance in meters
}

// --- Time Ago Function ---
function timeAgo(date) {
  const seconds = Math.floor((new Date() - date) / 1000);
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + "y ago";
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + "mo ago";
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + "d ago";
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + "h ago";
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + "m ago";
  return Math.floor(seconds) + "s ago";
}

// --- Reusable Components ---

const ShopCard = ({ shop, onClick, userLocation }) => {
  const shopName = shop.name_uz || shop.name_en || 'Shop Branch';
  const category = shop.type || 'General';
  const shopImage = shop.profilePicUrl || `https://placehold.co/150x100/D2B48C/000?text=${encodeURIComponent(shopName)}`;
  
  const [distance, setDistance] = useState(null);

  useEffect(() => {
    if (userLocation && shop.location) {
      const dist = getDistance(
        userLocation.lat,
        userLocation.lng,
        shop.location.lat,
        shop.location.lng
      );
      if (dist < 1000) {
        setDistance(`${Math.round(dist)} m`);
      } else {
        setDistance(`${(dist / 1000).toFixed(1)} km`);
      }
    }
  }, [userLocation, shop.location]);

  return (
    <button
      onClick={onClick}
      className="rounded-xl shadow-lg overflow-hidden bg-white border border-gray-100 text-left transition-all duration-300 ease-in-out hover:shadow-xl hover:scale-105"
    >
      <img 
        src={shopImage} 
        alt={shopName} 
        className="w-full h-28 object-cover"
        onError={(e) => { e.target.onerror = null; e.target.src = "https://placehold.co/150x100/D2B48C/000?text=Error" }}
      />
      <div className="p-3">
        <h3 className="font-semibold text-base text-gray-800 truncate">{shopName}</h3>
        <p className="text-xs text-gray-500">{category}</p>
        {distance && (
          <p className="text-xs font-bold mt-1" style={{ color: Colors.accent }}>{distance} away</p>
        )}
      </div>
    </button>
  );
};

const NearbyCategory = ({ title, icon: Icon, onFilterSelect, isSelected }) => (
  <button 
    onClick={onFilterSelect} 
    className="flex flex-col items-center w-1/5 group focus:outline-none"
  >
    <div className={`p-3 rounded-full shadow-md transition-all duration-300 ease-in-out ${isSelected ? 'bg-white border-2 border-[#C67C43]' : `bg-[${Colors.primary}] group-hover:opacity-80`}`}>
      <Icon className={`w-6 h-6 ${isSelected ? 'text-[#C67C43]' : 'text-white'}`} />
    </div>
    <p className={`mt-2 text-xs font-medium text-center ${isSelected ? 'text-[#C67C43]' : 'text-gray-700'}`}>{title}</p>
  </button>
);

const NavItem = ({ icon: Icon, label, active, onClick }) => (
  <button onClick={onClick} className="flex flex-col items-center text-xs group focus:outline-none w-1/5">
    <Icon className={`w-6 h-6 transition duration-150 ${active ? 'text-[#C67C43]' : 'text-gray-500 group-hover:text-[#C67C43]'}`} />
    <span className={`mt-1 font-medium ${active ? 'text-[#C67C43]' : 'text-gray-500'}`}>{label}</span>
  </button>
);

const ProductCard = ({ product, onClick }) => (
  <button onClick={onClick} className="text-left w-full">
    <div className="rounded-lg shadow-md overflow-hidden bg-white border border-gray-100">
      <img src={product.imageUrl || 'https://placehold.co/150x100/D2B48C/000?text=Product'} alt={product.name} className="w-full h-24 object-cover" />
      <div className="p-2">
        <h4 className="text-sm font-semibold truncate">{product.name}</h4>
        {product.salePrice ? (
          <div>
            <p className="text-sm font-bold text-red-600">{product.salePrice} UZS</p>
            <p className="text-xs text-gray-500 line-through">{product.price} UZS</p>
          </div>
        ) : (
          <p className="text-sm font-bold mt-1 text-gray-800">{product.price} UZS</p>
        )}
        <p className="text-xs text-gray-500">Stock: {product.stock}</p>
      </div>
    </div>
  </button>
);

// --- Google Map Component ---
const MapView = ({ shops, userLocation, onShopClick }) => {
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: GOOGLE_MAPS_API_KEY || "" // Fallback for safety
  });

  const mapContainerStyle = {
    width: '100%',
    height: '100%',
  };

  const center = userLocation || { lat: 41.2995, lng: 69.2401 }; // Tashkent default
  const [selectedShop, setSelectedShop] = useState(null);

  const getIcon = (type) => {
    let iconUrl = "https://maps.google.com/mapfiles/ms/icons/red-dot.png"; // Default
    switch (type) {
      case 'Restaurant':
        iconUrl = "https://maps.google.com/mapfiles/ms/icons/orange-dot.png";
        break;
      case 'Shop':
        iconUrl = "https://maps.google.com/mapfiles/ms/icons/blue-dot.png";
        break;
      case 'Hospital':
        iconUrl = "https://maps.google.com/mapfiles/ms/icons/green-dot.png";
        break;
      default:
        iconUrl = "https://maps.google.com/mapfiles/ms/icons/purple-dot.png";
    }
    return {
      url: iconUrl,
      scaledSize: new window.google.maps.Size(32, 32),
    };
  };

  if (loadError) return <div>Error loading maps. Make sure your Google Maps API Key is correct in .env and you've installed @react-google-maps/api.</div>;
  if (!isLoaded) return <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin" style={{ color: Colors.primary }} /></div>;

  return (
    <GoogleMap
      mapContainerStyle={mapContainerStyle}
      center={center}
      zoom={13}
      options={{ disableDefaultUI: true, zoomControl: true }}
    >
      {userLocation && (
        <Marker 
          position={userLocation} 
          title="Your Location"
        />
      )}
      {shops.map(shop => (
        shop.location && shop.location.lat && shop.location.lng && (
          <Marker
            key={shop.id}
            position={shop.location} // Assumes {lat: ..., lng: ...}
            title={shop.name_uz}
            icon={getIcon(shop.type)}
            onClick={() => setSelectedShop(shop)}
          />
        )
      ))}
      {selectedShop && (
        <InfoWindow
          position={selectedShop.location}
          onCloseClick={() => setSelectedShop(null)}
        >
          <div className="text-gray-800 p-1">
            <h4 className="font-bold">{selectedShop.name_uz}</h4>
            <p className="text-sm">{selectedShop.type}</p>
            <button 
              onClick={() => onShopClick(selectedShop)}
              className="text-blue-600 hover:underline text-sm font-medium"
            >
              View Details
            </button>
          </div>
        </InfoWindow>
      )}
    </GoogleMap>
  );
};

// --- Shop Detail Page Component ---
const ShopDetailPage = ({ shop, onClose, db, appId, userLocation, onFollow, isFollowing }) => {
  const [inventory, setInventory] = useState([]);
  const [loadingInventory, setLoadingInventory] = useState(true);

  // Fetch this shop's specific inventory sub-collection
  useEffect(() => {
    if (!shop || !db) return;
    setLoadingInventory(true);
    const inventoryRef = collection(db, 'artifacts', appId, 'public', 'data', 'shops', shop.id, 'inventory');
    
    const unsubscribe = onSnapshot(inventoryRef, (snapshot) => {
      const productList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setInventory(productList);
      setLoadingInventory(false);
    }, (error) => console.error("Error fetching inventory: ", error));

    return () => unsubscribe();
  }, [shop, db, appId]);
  
  const [distance, setDistance] = useState(null);
  useEffect(() => {
    if (userLocation && shop.location) {
      const dist = getDistance(
        userLocation.lat,
        userLocation.lng,
        shop.location.lat,
        shop.location.lng
      );
      if (dist < 1000) {
        setDistance(`${Math.round(dist)} m`);
      } else {
        setDistance(`${(dist / 1000).toFixed(1)} km`);
      }
    }
  }, [userLocation, shop.location]);

  return (
    <div className="absolute inset-0 flex flex-col bg-white z-20 animate-slideIn">
      {/* Header */}
      <header className="sticky top-0 bg-white z-10">
        <div className="h-16 flex justify-between items-center px-4 pt-2">
            <button onClick={onClose} className="flex items-center text-[#C67C43] p-2">
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div className="flex space-x-2">
              <button 
                onClick={() => onFollow(shop.id)} 
                className={`p-2 rounded-full transition-colors ${isFollowing ? 'bg-red-100 text-red-500' : 'bg-gray-100 text-gray-600'}`}
              >
                <Heart className={`w-5 h-5 ${isFollowing ? 'fill-current' : ''}`} />
              </button>
              <button className="p-2 rounded-full bg-gray-100 text-gray-600"><Share2 className="w-5 h-5" /></button>
            </div>
        </div>
      </header>

      {/* Scrollable Body */}
      <main className="flex-grow overflow-y-auto pb-24">
        {/* Banner Image */}
        <img 
          src={shop.bannerUrl || 'https://placehold.co/600x200/A0522D/ffffff?text=SHOXA'} 
          alt="Shop Banner" 
          className="w-full h-40 object-cover"
        />
        {/* Profile Pic & Title */}
        <div className="px-4 -mt-12">
          <div className="flex items-end space-x-4">
            <img 
              src={shop.profilePicUrl || 'https://placehold.co/100x100/D2B48C/000?text=Shop'}
              alt="Shop Profile"
              className="w-24 h-24 rounded-full border-4 border-white shadow-lg object-cover"
            />
            <div className="pb-2">
              <h1 className="text-2xl font-bold text-gray-800">{shop.name_uz}</h1>
              <p className="text-sm text-gray-500">{shop.type}</p>
            </div>
          </div>
        </div>

        {/* Info Section */}
        <div className="p-4 space-y-3 text-gray-700 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <MapPin className="w-5 h-5 text-[#C67C43]" />
            <span>{shop.address || 'Address not available'} {distance && `(${distance} away)`}</span>
          </div>
          <div className="flex items-center space-x-2">
            <Clock className="w-5 h-5 text-[#C67C43]" />
            <span>{shop.hours?.Mon || 'Hours not specified'} (Today)</span>
          </div>
          <div className="flex items-center space-x-2">
            <Phone className="w-5 h-5 text-[#C67C43]" />
            <a href={`tel:${shop.phone || ''}`} className="text-blue-600">{shop.phone || 'No phone number'}</a>
          </div>
        </div>
        
        {/* About Section */}
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-800 mb-2">About</h2>
          <p className="text-sm text-gray-600 whitespace-pre-wrap">
            {shop.about || 'This shop has not provided a description yet.'}
          </p>
        </div>

        {/* Products Section */}
        <div className="p-4">
          <h2 className="text-lg font-bold text-gray-800 mb-3">Products</h2>
          {loadingInventory ? (
            <p className="text-gray-500">Loading products...</p>
          ) : inventory.length > 0 ? (
            <div className="grid grid-cols-2 gap-4">
              {inventory.map(product => (
                <ProductCard key={product.id} product={product} onClick={() => console.log('Product clicked')} />
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No products listed for this shop yet.</p>
          )}
        </div>
      </main>
    </div>
  );
};

// --- NEW: Feed Post Component ---
const FeedPost = ({ post, shop }) => {
  if (!shop) return null; // Don't render post if shop data isn't loaded
  
  return (
    <div className="bg-white border-b border-gray-200">
      {/* Post Header */}
      <div className="flex items-center p-3">
        <img 
          src={shop.profilePicUrl || 'https://placehold.co/40x40/D2B48C/000?text=S'} 
          alt={shop.name_uz}
          className="w-10 h-10 rounded-full object-cover"
        />
        <div className="ml-3">
          <p className="font-semibold text-sm">{shop.name_uz}</p>
          <p className="text-xs text-gray-500">{timeAgo(post.createdAt.toDate())}</p>
        </div>
      </div>
      
      {/* Post Image */}
      {post.imageUrl && (
        <img src={post.imageUrl} alt="Post" className="w-full" />
      )}
      
      {/* Post Content */}
      <div className="p-3">
        <p className="text-sm">{post.text}</p>
      </div>

      {/* Post Actions */}
      <div className="flex space-x-4 p-2 border-t border-gray-100">
        <button className="flex items-center space-x-1 text-gray-600 hover:text-red-500">
          <Heart className="w-5 h-5" /> <span className="text-sm">Like</span>
        </button>
        <button className="flex items-center space-x-1 text-gray-600 hover:text-blue-500">
          <MessageCircle className="w-5 h-5" /> <span className="text-sm">Comment</span>
        </button>
      </div>
    </div>
  );
};

// --- NEW: Feed Page ---
const FeedPage = ({ db, appId, followingList, allShops }) => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Create a quick lookup map for shop data
  const shopsMap = useMemo(() => {
    return allShops.reduce((acc, shop) => {
      acc[shop.id] = shop;
      return acc;
    }, {});
  }, [allShops]);

  useEffect(() => {
    if (!followingList) {
        setLoading(false);
        setPosts([]);
        return;
    }
    if (followingList.length === 0) {
      setLoading(false);
      setPosts([]);
      return;
    }
    
    setLoading(true);
    // This is the collectionGroup query.
    // It requires the index we created in Firestore.
    const postsQuery = query(
      collectionGroup(db, 'posts'),
      where('shopId', 'in', followingList),
      orderBy('createdAt', 'desc')
    );
    
    const unsubscribe = onSnapshot(postsQuery, (snapshot) => {
      const postList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPosts(postList);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching feed posts:", error);
      // This error often means the Firestore Index is missing or still building.
      setLoading(false);
    });

    return () => unsubscribe();
  }, [db, appId, followingList]);

  if (loading) {
    return <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin" style={{ color: Colors.primary }} /></div>;
  }

  if (followingList.length === 0) {
    return <div className="text-center p-8 text-gray-500">Your feed is empty. Follow some shops to see their posts here!</div>;
  }

  return (
    <div className="flex-grow overflow-y-auto pb-24 bg-gray-100">
      {posts.length > 0 ? (
        posts.map(post => (
          <FeedPost key={post.id} post={post} shop={shopsMap[post.shopId]} />
        ))
      ) : (
        <div className="text-center p-8 text-gray-500">The shops you follow haven't posted anything yet.</div>
      )}
    </div>
  );
};

// --- Optional Login Modal ---
const AuthModal = ({ onClose, auth, setNotification }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setNotification('');
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
        setNotification('Logged in!');
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
        setNotification('Account created!');
      }
      onClose(); // Close modal on success
    } catch (error) {
      setNotification(error.message);
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex items-center justify-center" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl p-8 w-11/12 max-w-sm" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-3xl font-bold text-center mb-2" style={{ color: Colors.primary }}>
          {isLogin ? 'Welcome Back!' : 'Join SHOXA'}
        </h2>
        <p className="text-center text-gray-500 mb-6">
          {isLogin ? 'Log in to see your favorites.' : 'Create an account to save shops.'}
        </p>
        <form onSubmit={handleSubmit}>
          <div className="relative mb-4">
            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full py-3 pl-10 pr-4 rounded-lg border-2 border-gray-200 focus:outline-none focus:border-[#C67C43] transition duration-200 bg-gray-50 text-gray-800" />
          </div>
          <div className="relative mb-4">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full py-3 pl-10 pr-4 rounded-lg border-2 border-gray-200 focus:outline-none focus:border-[#C67C43] transition duration-200 bg-gray-50 text-gray-800" />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg text-white font-semibold transition-all duration-300 ease-in-out flex items-center justify-center"
            style={{ backgroundColor: Colors.primary, opacity: loading ? 0.7 : 1 }}
          >
            {loading ? <Loader2 className="animate-spin" /> : (isLogin ? 'Log In' : 'Sign Up')}
          </button>
        </form>
        <button
          onClick={() => setIsLogin(!isLogin)}
          className="w-full mt-4 text-sm text-center text-[#C67C43] hover:underline"
        >
          {isLogin ? "Need an account? Sign Up" : "Already have an account? Log In"}
        </button>
      </div>
    </div>
  );
};

// --- Notification Component ---
const Notification = ({ message, onClear }) => {
  useEffect(() => {
    if (message) {
      const timer = setTimeout(onClear, 3000);
      return () => clearTimeout(timer);
    }
  }, [message, onClear]);

  if (!message) return null;
  return (
    <div className="fixed top-5 right-5 p-4 rounded-lg shadow-lg text-white bg-green-500 z-50">
      {message}
    </div>
  );
};

// --- Main Application Component ---
const App = () => {
  // Firebase State
  const [db, setDb] = useState(null);
  const [auth, setAuth] = useState(null);
  const [authUser, setAuthUser] = useState(null); // Full auth user object
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null); // Stores anonymous or logged-in UID
  
  // Data State
  const [allShops, setAllShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [followingList, setFollowingList] = useState([]); // List of shop IDs user follows

  // UI/Interaction State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState(null);
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [selectedShop, setSelectedShop] = useState(null); // For the detail page
  const [activeTab, setActiveTab] = useState('Home'); // Home, Feed, Map, Delivery, Profile
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [notification, setNotification] = useState('');
  
  // Location State
  const [userLocation, setUserLocation] = useState(null); // { lat, lng }

  // 1. Initialize Firebase and Authenticate
  useEffect(() => {
    try {
      if (!firebaseConfig || !firebaseConfig.apiKey) {
        throw new Error("Firebase config is missing or incomplete. Check your .env file.");
      }
      
      const app = initializeApp(firebaseConfig);
      const firestore = getFirestore(app);
      const firebaseAuth = getAuth(app);
      
      setDb(firestore);
      setAuth(firebaseAuth);

      const unsubscribe = onAuthStateChanged(firebaseAuth, (user) => {
        if (user) {
          // User is signed in (either logged-in or anonymous)
          setAuthUser(user);
          setCurrentUserId(user.uid);
          setIsAuthReady(true);
          console.log(`User signed in: ${user.uid} (Anon: ${user.isAnonymous})`);
        } else {
          // No user, sign in anonymously for browsing
          signInAnonymously(firebaseAuth).catch(err => console.error("Anon sign-in failed:", err));
        }
      });
      return () => unsubscribe();
    } catch (e) {
      console.error("Firebase Initialization Error:", e);
      setError("Failed to initialize the app. Check your .env file and Firebase setup.");
    }
  }, []);

  // 2. Fetch User's Geolocation
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.error("Error getting geolocation:", error);
          setUserLocation({ lat: 41.2995, lng: 69.2401 }); // Default to Tashkent
        },
        { enableHighAccuracy: true }
      );
    } else {
      setUserLocation({ lat: 41.2995, lng: 69.2401 }); // Default to Tashkent
    }
  }, []);

  // 3. Fetch Real-time Data (Shops & Following List)
  useEffect(() => {
    if (!isAuthReady || !db || !currentUserId) return;
    
    // Fetch Shops
    setLoading(true);
    const shopsCollectionRef = collection(db, 'artifacts', appId, 'public', 'data', 'shops');
    const shopsUnsub = onSnapshot(shopsCollectionRef, (snapshot) => {
      const shopList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAllShops(shopList);
      setLoading(false);
    }, (error) => {
      console.error("Firestore onSnapshot error (Shops):", error);
      setError("Failed to load shop data. Check Firebase Rules.");
      setLoading(false);
    });

    // Fetch User's Following List
    // This is a private path: .../users/{userId}/following
    const followingCollectionRef = collection(db, 'artifacts', appId, 'users', currentUserId, 'following');
    const followingUnsub = onSnapshot(followingCollectionRef, (snapshot) => {
      const shopIdList = snapshot.docs.map(doc => doc.id);
      setFollowingList(shopIdList);
      console.log("Updated following list:", shopIdList);
    }, (error) => {
      console.error("Firestore onSnapshot error (Following):", error);
      setError("Failed to load user data. Check Firebase Rules.");
    });

    return () => {
      shopsUnsub();
      followingUnsub();
    };
  }, [isAuthReady, db, currentUserId, appId]); // Rerun when user logs in/out

  // 4. Memoized Filtering Logic
  const filteredShops = useMemo(() => {
    let shops = allShops;
    if (filterCategory) {
      shops = shops.filter(shop => shop.type && shop.type.toLowerCase() === filterCategory.toLowerCase());
    }
    if (isSearchActive && searchTerm) {
      const lowerCaseSearch = searchTerm.toLowerCase();
      shops = shops.filter(shop => 
        (shop.name_uz && shop.name_uz.toLowerCase().includes(lowerCaseSearch)) ||
        (shop.name_en && shop.name_en.toLowerCase().includes(lowerCaseSearch))
      );
    }
    return shops;
  }, [allShops, filterCategory, searchTerm, isSearchActive]);

  // --- Event Handlers ---
  const handleSearchFocus = () => setIsSearchActive(true);
  const handleSearchCancel = () => {
    setSearchTerm('');
    setIsSearchActive(false);
  };
  const handleFilterSelect = (category) => {
    setFilterCategory(prev => prev === category ? null : category);
  };
  
  // NEW: Follow/Unfollow Logic
  const handleFollow = async (shopId) => {
    if (!currentUserId || !db) return;
    
    const followRef = doc(db, 'artifacts', appId, 'users', currentUserId, 'following', shopId);
    
    if (followingList.includes(shopId)) {
      // Unfollow
      try {
        await deleteDoc(followRef);
        setNotification("Unfollowed shop.");
      } catch (e) {
        console.error("Error unfollowing:", e);
        setNotification("Error unfollowing shop.");
      }
    } else {
      // Follow
      try {
        await setDoc(followRef, { followedAt: new Date() });
        setNotification("Followed shop!");
      } catch (e) {
        console.error("Error following:", e);
        setNotification("Error following shop.");
      }
    }
  };

  const getPageTitle = () => {
    if (isSearchActive) return "Search Results";
    if (filterCategory) return `${filterCategory}s`;
    return "Recommended Shops";
  };

  const showDefaultView = !isSearchActive && !filterCategory;
  
  // --- Loading / Error State ---
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-red-100 p-4 text-center">
        <p className="text-red-700 font-medium">Error: {error}. Make sure you created the Firestore Index for 'posts'.</p>
      </div>
    );
  }

  // --- Main Render ---
  return (
    <div style={{ backgroundColor: Colors.background }} className={`min-h-screen font-sans flex flex-col items-center`}>
      <Notification message={notification} onClear={() => setNotification('')} />
      {showAuthModal && <AuthModal auth={auth} onClose={() => setShowAuthModal(false)} setNotification={setNotification} />}

      <div className="w-full max-w-md h-full min-h-screen shadow-2xl bg-white flex flex-col relative overflow-hidden">
        
        {/* Page Content: Conditionally render pages */}
        <div className="flex-grow flex flex-col">
          
          {/* --- Home Tab --- */}
          <div className={`flex-grow flex flex-col ${activeTab === 'Home' ? '' : 'hidden'}`}>
            <header className="bg-white border-b border-gray-100 z-10 sticky top-0">
              <div className="h-10 flex justify-between items-center px-4 pt-4">
                  <span className="font-bold text-lg" style={{ color: Colors.primary }}>SHOXA</span>
                  <div className="flex space-x-2 items-center">
                      <Bell className="w-5 h-5 text-gray-500" />
                      <span className="text-xs text-gray-400">
                        Tashkent
                      </span>
                  </div>
              </div>
              <div className="p-4 pt-2">
                <div className="relative flex items-center space-x-2">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder={filterCategory ? `Search in ${filterCategory}s...` : "Search Shops, Products..."}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onFocus={handleSearchFocus}
                    className={`w-full py-3 pl-10 pr-4 rounded-full border-2 border-gray-200 focus:outline-none focus:border-[#C67C43] transition-all duration-300 ${Colors.background} text-gray-800`}
                  />
                  {isSearchActive && (
                    <button onClick={handleSearchCancel} className="text-sm font-medium text-[#C67C43]">Cancel</button>
                  )}
                </div>
              </div>
            </header>
            <main className="flex-grow overflow-y-auto pb-24">
              <div className={`px-4 transition-all duration-300 ease-in-out ${showDefaultView ? 'opacity-100 h-52 mb-6' : 'opacity-0 h-0 invisible'}`}>
                {/* ... Map Banner ... */}
              </div>
              <div className={`px-4 mb-6 transition-all duration-300 ease-in-out ${isSearchActive ? 'opacity-0 h-0 invisible' : 'opacity-100'}`}>
                <h2 className={`text-lg font-bold mb-3 ${Colors.text}`}>Quick Access</h2>
                <div className="flex justify-around pb-2">
                  <NearbyCategory title="Shops" icon={ShoppingCart} isSelected={filterCategory === 'Shop'} onFilterSelect={() => handleFilterSelect('Shop')} />
                  <NearbyCategory title="Restaurants" icon={Compass} isSelected={filterCategory === 'Restaurant'} onFilterSelect={() => handleFilterSelect('Restaurant')} />
                  <NearbyCategory title="Hospitals" icon={User} isSelected={filterCategory === 'Hospital'} onFilterSelect={() => handleFilterSelect('Hospital')} />
                  <NearbyCategory title="Markets" icon={Home} isSelected={filterCategory === 'Market'} onFilterSelect={() => handleFilterSelect('Market')} />
                  <NearbyCategory title="Services" icon={Bell} isSelected={filterCategory === 'Service'} onFilterSelect={() => handleFilterSelect('Service')} />
                </div>
              </div>
              <div className="px-4 mb-6">
                <h2 className={`text-lg font-bold mb-3 ${Colors.text}`}>{getPageTitle()} ({filteredShops.length})</h2>
                {loading ? (
                  <p className="text-gray-500">Fetching shop data...</p>
                ) : filteredShops.length > 0 ? (
                  <div className="grid grid-cols-2 gap-4">
                    {filteredShops.map((shop) => (
                      <ShopCard key={shop.id} shop={shop} onClick={() => setSelectedShop(shop)} userLocation={userLocation} />
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">No sites found.</p>
                )}
              </div>
            </main>
          </div>
          
          {/* --- NEW: Feed Tab --- */}
          <div className={`flex-grow flex flex-col ${activeTab === 'Feed' ? '' : 'hidden'}`}>
             <header className="bg-white border-b border-gray-100 z-10 sticky top-0 p-4">
                <h2 className="text-xl font-bold text-center" style={{ color: Colors.primary }}>Your Feed</h2>
             </header>
             <FeedPage db={db} appId={appId} followingList={followingList} allShops={allShops} />
          </div>

          {/* --- Map Tab --- */}
          <div className={`flex-grow ${activeTab === 'Map' ? '' : 'hidden'}`}>
            <MapView 
              shops={allShops} 
              userLocation={userLocation}
              onShopClick={(shop) => {
                setSelectedShop(shop);
                setActiveTab('Home'); // Switch back to home to see detail
              }}
            />
          </div>

          {/* --- Delivery Tab (Placeholder) --- */}
          <div className={`flex-grow flex items-center justify-center ${activeTab === 'Delivery' ? '' : 'hidden'}`}>
            <p className="text-gray-500">Delivery features coming soon!</p>
          </div>
          
          {/* --- Profile Tab --- */}
          <div className={`flex-grow flex flex-col p-4 ${activeTab === 'Profile' ? '' : 'hidden'}`}>
            {authUser && !authUser.isAnonymous ? (
              <div>
                <h2 className="text-2xl font-bold">Welcome!</h2>
                <p className="text-gray-600 mb-4">{authUser.email}</p>
                <button 
                  onClick={() => {
                    signOut(auth);
                    setNotification('Logged out.');
                  }}
                  className="w-full py-3 rounded-lg text-white font-semibold" style={{backgroundColor: Colors.primary}}>
                  Log Out
                </button>
              </div>
            ) : (
              <div>
                <h2 className="text-2xl font-bold mb-2">Join SHOXA</h2>
                <p className="text-gray-600 mb-4">Log in or Sign Up to save your favorite shops and get personalized recommendations.</p>
                <button 
                  onClick={() => setShowAuthModal(true)}
                  className="w-full py-3 rounded-lg text-white font-semibold" style={{backgroundColor: Colors.primary}}>
                  Log In / Sign Up
                </button>
              </div>
            )}
          </div>
        </div>

        {/* --- Sticky Bottom Navigation Bar (5 TABS) --- */}
        <footer className="sticky bottom-0 w-full max-w-md mx-auto bg-white border-t border-gray-200 shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.05)] z-10">
          <div className="flex justify-around py-3">
            <NavItem icon={Home} label="Home" active={activeTab === 'Home'} onClick={() => setActiveTab('Home')} />
            <NavItem icon={Rss} label="Feed" active={activeTab === 'Feed'} onClick={() => setActiveTab('Feed')} />
            <NavItem icon={MapIcon} label="Map" active={activeTab === 'Map'} onClick={() => setActiveTab('Map')} />
            <NavItem icon={ShoppingCart} label="Delivery" active={activeTab === 'Delivery'} onClick={() => setActiveTab('Delivery')} />
            {/* THIS IS THE FIX: */}
            <NavItem icon={User} label="Profile" active={activeTab === 'Profile'} onClick={() => setActiveTab('Profile')} />
          </div>
        </footer>

        {/* --- Shop Detail Page (Renders on top) --- */}
        {selectedShop && (
          <ShopDetailPage 
            shop={selectedShop} 
            onClose={() => setSelectedShop(null)} 
            db={db}
            appId={appId}
            userLocation={userLocation}
            onFollow={handleFollow}
            isFollowing={followingList.includes(selectedShop.id)}
          />
        )}

      </div> {/* End Mobile Frame */}
      
      {/* Animation CSS */}
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .animate-slideIn {
          animation: slideIn 0.2s ease-out;
        }
      `}</style>
    </div>
  );
};

export default App;