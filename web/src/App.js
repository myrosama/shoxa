import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { 
  Search, Compass, ShoppingCart, Bell, User, Home, Map as MapIcon, 
  X, ChevronDown, Clock, MapPin, Tag, Building, ArrowLeft, Star, Heart, Share2, Phone,
  Rss, MessageCircle, Loader2, Plus, Minus, CreditCard, Navigation, Briefcase
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
const LOCAL_FIREBASE_CONFIG = {
  apiKey: process.env.REACT_APP_API_KEY,
  authDomain: process.env.REACT_APP_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_PROJECT_ID,
  storageBucket: process.env.REACT_APP_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_APP_ID,
  measurementId: process.env.REACT_APP_MEASUREMENT_ID
};
const GOOGLE_MAPS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;

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
  if (!date || !date.toDate) return '...'; // Add check for toDate
  const seconds = Math.floor((new Date() - date.toDate()) / 1000);
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
    if (userLocation && shop.location && shop.location.lat && shop.location.lng) {
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

const NavItem = ({ icon: Icon, label, active, onClick, count }) => (
  <button onClick={onClick} className="flex flex-col items-center text-xs group focus:outline-none w-1/5 relative">
    {count > 0 && (
      <div className="absolute -top-1 w-4 h-4 rounded-full bg-red-500 text-white text-xs flex items-center justify-center" style={{ right: 'calc(50% - 18px)'}}>
        {count}
      </div>
    )}
    <Icon className={`w-6 h-6 transition duration-150 ${active ? 'text-[#C67C43]' : 'text-gray-500 group-hover:text-[#C67C43]'}`} />
    <span className={`mt-1 font-medium ${active ? 'text-[#C67C43]' : 'text-gray-500'}`}>{label}</span>
  </button>
);

// RE-ADDED from V1.2: For the *infinite* carousel
const ProductCarouselCard = ({ product, onClick }) => (
  <button onClick={onClick} className="flex-shrink-0 w-36 rounded-lg shadow-md overflow-hidden bg-white border border-gray-100 mx-2 text-left">
    <img src={product.imageUrl || 'https://placehold.co/150x100/D2B48C/000?text=Product'} alt={product.name} className="w-full h-24 object-cover" />
    <div className="p-2">
      <h4 className="text-sm font-semibold truncate">{product.name}</h4>
      <p className="text-xs text-gray-500 truncate">{product.shopName || 'From SHOXA'}</p>
      {product.salePrice ? (
          <div>
            <p className="text-sm font-bold text-red-600">{product.salePrice} UZS</p>
            <p className="text-xs text-gray-500 line-through">{product.price} UZS</p>
          </div>
        ) : (
          <p className="text-sm font-bold mt-1 text-gray-800">{product.price} UZS</p>
        )}
    </div>
  </button>
);

// For the *shop page* grid
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
    googleMapsApiKey: GOOGLE_MAPS_API_KEY || ""
  });
  const mapContainerStyle = { width: '100%', height: '100%' };
  const center = userLocation || { lat: 41.2995, lng: 69.2401 };
  const [selectedShop, setSelectedShop] = useState(null);

  const getIcon = (type) => {
    let iconUrl = "https://maps.google.com/mapfiles/ms/icons/red-dot.png";
    switch (type) {
      case 'Restaurant': iconUrl = "https://maps.google.com/mapfiles/ms/icons/orange-dot.png"; break;
      case 'Shop': iconUrl = "https://maps.google.com/mapfiles/ms/icons/blue-dot.png"; break;
      case 'Hospital': iconUrl = "https://maps.google.com/mapfiles/ms/icons/green-dot.png"; break;
      default: iconUrl = "https://maps.google.com/mapfiles/ms/icons/purple-dot.png";
    }
    return { url: iconUrl, scaledSize: new window.google.maps.Size(32, 32) };
  };

  if (loadError) return <div>Error loading maps. Check API Key.</div>;
  if (!isLoaded) return <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin" style={{ color: Colors.primary }} /></div>;

  return (
    <GoogleMap mapContainerStyle={mapContainerStyle} center={center} zoom={13} options={{ disableDefaultUI: true, zoomControl: true }}>
      {userLocation && <Marker position={userLocation} title="Your Location" />}
      {shops.map(shop => (
        shop.location && shop.location.lat && shop.location.lng && (
          <Marker
            key={shop.id}
            position={shop.location}
            title={shop.name_uz}
            icon={getIcon(shop.type)}
            onClick={() => setSelectedShop(shop)}
          />
        )
      ))}
      {selectedShop && (
        <InfoWindow position={selectedShop.location} onCloseClick={() => setSelectedShop(null)}>
          <div className="text-gray-800 p-1">
            <h4 className="font-bold">{selectedShop.name_uz}</h4>
            <p className="text-sm">{selectedShop.type}</p>
            <button onClick={() => onShopClick(selectedShop)} className="text-blue-600 hover:underline text-sm font-medium">
              View Details
            </button>
          </div>
        </InfoWindow>
      )}
    </GoogleMap>
  );
};

// --- Shop Detail Page Component ---
const ShopDetailPage = ({ shop, onClose, db, appId, userLocation, onFollow, isFollowing, onProductClick, onNavigateClick }) => {
  const [inventory, setInventory] = useState([]);
  const [loadingInventory, setLoadingInventory] = useState(true);

  useEffect(() => {
    if (!shop || !db) return;
    setLoadingInventory(true);
    const inventoryRef = collection(db, 'artifacts', appId, 'public', 'data', 'shops', shop.id, 'inventory');
    const unsubscribe = onSnapshot(inventoryRef, (snapshot) => {
      setInventory(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoadingInventory(false);
    }, (error) => console.error("Error fetching inventory: ", error));
    return () => unsubscribe();
  }, [shop, db, appId]);
  
  const [distance, setDistance] = useState(null);
  useEffect(() => {
    if (userLocation && shop.location && shop.location.lat && shop.location.lng) {
      const dist = getDistance(userLocation.lat, userLocation.lng, shop.location.lat, shop.location.lng);
      setDistance(dist < 1000 ? `${Math.round(dist)} m` : `${(dist / 1000).toFixed(1)} km`);
    }
  }, [userLocation, shop.location]);

  return (
    <div className="absolute inset-0 flex flex-col bg-white z-20 animate-slideIn">
      <header className="sticky top-0 bg-white z-10">
        <div className="h-16 flex justify-between items-center px-4 pt-2">
            <button onClick={onClose} className="flex items-center text-[#C67C43] p-2"><ArrowLeft className="w-6 h-6" /></button>
            <div className="flex space-x-2">
              <button onClick={() => onFollow(shop.id)} className={`p-2 rounded-full transition-colors ${isFollowing ? 'bg-red-100 text-red-500' : 'bg-gray-100 text-gray-600'}`}>
                <Heart className={`w-5 h-5 ${isFollowing ? 'fill-current' : ''}`} />
              </button>
              <button className="p-2 rounded-full bg-gray-100 text-gray-600"><Share2 className="w-5 h-5" /></button>
            </div>
        </div>
      </header>
      <main className="flex-grow overflow-y-auto pb-24">
        <img src={shop.bannerUrl || 'https://placehold.co/600x200/A0522D/ffffff?text=SHOXA'} alt="Shop Banner" className="w-full h-40 object-cover" />
        <div className="px-4 -mt-12">
          <div className="flex items-end space-x-4">
            <img src={shop.profilePicUrl || 'https://placehold.co/100x100/D2B48C/000?text=Shop'} alt="Shop Profile" className="w-24 h-24 rounded-full border-4 border-white shadow-lg object-cover" />
            <div className="pb-2">
              <h1 className="text-2xl font-bold text-gray-800">{shop.name_uz}</h1>
              <p className="text-sm text-gray-500">{shop.type}</p>
            </div>
          </div>
        </div>
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
          {/* NEW: Navigate Button */}
          <button 
            onClick={() => onNavigateClick(shop)}
            className="w-full py-2 px-4 rounded-lg text-white font-semibold flex items-center justify-center" 
            style={{backgroundColor: Colors.accent}}
          >
            <Navigation className="w-5 h-5 mr-2" /> Navigate
          </button>
        </div>
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-800 mb-2">About</h2>
          <p className="text-sm text-gray-600 whitespace-pre-wrap">{shop.about || 'No description provided.'}</p>
        </div>
        <div className="p-4">
          <h2 className="text-lg font-bold text-gray-800 mb-3">Products</h2>
          {loadingInventory ? <p className="text-gray-500">Loading products...</p> : inventory.length > 0 ? (
            <div className="grid grid-cols-2 gap-4">
              {inventory.map(product => (
                <ProductCard key={product.id} product={product} onClick={() => onProductClick(product, shop.id, shop.name_uz)} />
              ))}
            </div>
          ) : <p className="text-gray-500 text-center py-8">No products listed for this shop yet.</p>}
        </div>
      </main>
    </div>
  );
};

// --- NEW: Product Detail Page ("Amazon-style") ---
const ProductDetailPage = ({ product, shopId, shopName, onClose, onAddToCart }) => {
  const [quantity, setQuantity] = useState(1);
  const [selectedVariant, setSelectedVariant] = useState(product.variants ? product.variants[0] : null);

  const finalPrice = product.salePrice || product.price;

  const handleAddToCart = () => {
    onAddToCart({
      id: product.id,
      name: product.name,
      price: finalPrice,
      quantity: quantity,
      variant: selectedVariant,
      imageUrl: product.imageUrl,
      shopId: shopId,
      shopName: shopName
    });
    onClose();
  };

  return (
    <div className="absolute inset-0 flex flex-col bg-gray-100 z-30 animate-slideIn">
      <header className="sticky top-0 bg-white z-10">
        <div className="h-16 flex justify-between items-center px-4 pt-2">
            <button onClick={onClose} className="flex items-center text-[#C67C43] p-2"><ArrowLeft className="w-6 h-6" /></button>
            <h2 className="font-bold text-lg">Product Details</h2>
            <div className="w-10"></div>
        </div>
      </header>
      <main className="flex-grow overflow-y-auto pb-24">
        <img 
          src={product.imageUrl || 'https://placehold.co/600x400/D2B48C/000?text=Product'} 
          alt={product.name} 
          className="w-full h-64 object-cover"
        />
        <div className="p-4 bg-white">
          <p className="text-sm font-medium" style={{color: Colors.primary}}>{shopName}</p>
          <h1 className="text-2xl font-bold text-gray-800">{product.name}</h1>
          {product.salePrice ? (
            <div className="flex items-baseline space-x-2 mt-1">
              <p className="text-3xl font-bold text-red-600">{product.salePrice} UZS</p>
              <p className="text-xl text-gray-500 line-through">{product.price} UZS</p>
            </div>
          ) : (
            <p className="text-3xl font-bold mt-1 text-gray-800">{product.price} UZS</p>
          )}
          <div className="flex items-center space-x-1 text-sm text-gray-500 mt-1">
            <Star className="w-4 h-4 text-yellow-500 fill-current" />
            <span>4.8 (120 ratings)</span> {/* Mock ratings */}
          </div>
        </div>
        
        {product.variants && product.variants.length > 0 && (
          <div className="p-4 bg-white mt-2">
            <h3 className="text-sm font-medium text-gray-600 mb-2">Select {product.variantType || 'Option'}</h3>
            <div className="flex flex-wrap gap-2">
              {product.variants.map(v => (
                <button 
                  key={v}
                  onClick={() => setSelectedVariant(v)}
                  className={`py-2 px-4 rounded-full text-sm font-medium border-2 ${selectedVariant === v ? 'border-[#C67C43] bg-[#FDF6E3]' : 'border-gray-300 bg-white'}`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
        )}
        
        <div className="p-4 bg-white mt-2">
          <h3 className="text-lg font-bold text-gray-800 mb-2">Description</h3>
          <p className="text-sm text-gray-600 whitespace-pre-wrap">
            {product.description || 'No description available for this product.'}
          </p>
        </div>
      </main>
      
      {/* Bottom Add to Cart Bar */}
      <footer className="sticky bottom-0 w-full p-4 bg-white border-t border-gray-200 shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.05)] z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center border-2 border-gray-200 rounded-lg">
            <button onClick={() => setQuantity(q => Math.max(1, q - 1))} className="p-3"><Minus className="w-4 h-4" /></button>
            <span className="px-4 text-lg font-bold">{quantity}</span>
            <button onClick={() => setQuantity(q => q + 1)} className="p-3"><Plus className="w-4 h-4" /></button>
          </div>
          <button
            onClick={handleAddToCart}
            className="py-3 px-6 rounded-lg text-white font-semibold flex-1 ml-4" 
            style={{backgroundColor: Colors.primary}}
          >
            Add to Cart
          </button>
        </div>
      </footer>
    </div>
  );
};

// --- NEW: Cart Page ---
const CartPage = ({ cart, onUpdateQuantity, setNotification }) => {
  const [promoCode, setPromoCode] = useState('');

  const subtotal = useMemo(() => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  }, [cart]);
  
  // FIX: This hook MUST be called before any early returns (like the 'if cart is empty' check)
  // Group items by shop
  const groupedCart = useMemo(() => {
    return cart.reduce((acc, item) => {
      const shopId = item.shopId || 'shoxa';
      const shopName = item.shopName || 'SHOXA General Store';
      if (!acc[shopId]) {
        acc[shopId] = { shopName: shopName, items: [] };
      }
      acc[shopId].items.push(item);
      return acc;
    }, {});
  }, [cart]);

  const deliveryFee = 10000; // Mock delivery fee
  const total = subtotal + deliveryFee;

  const handleApplyPromo = () => {
    if (promoCode.toUpperCase() === 'SHOXA2025') {
      setNotification('Promo code applied! (Test)');
    } else {
      setNotification('Invalid promo code.');
    }
    setPromoCode('');
  };

  if (cart.length === 0) {
    return (
      <div className="flex-grow flex flex-col items-center justify-center text-center p-8 pb-24">
        <ShoppingCart className="w-24 h-24 text-gray-300" />
        <h2 className="text-xl font-bold mt-4">Your Cart is Empty</h2>
        <p className="text-gray-500">Looks like you haven't added anything to your cart yet.</p>
      </div>
    );
  }
  
  // DELETED: The duplicate 'groupedCart' declaration was here. This fixes the bug.

  return (
    <div className="flex-grow flex flex-col pb-24 bg-gray-100">
      <main className="flex-grow overflow-y-auto p-4 space-y-4">
        {Object.entries(groupedCart).map(([shopId, data]) => (
          <div key={shopId} className="bg-white rounded-lg shadow-sm overflow-hidden">
            <p className="font-bold p-3 border-b border-gray-100">{data.shopName}</p>
            {data.items.map(item => (
              <div key={`${item.id}-${item.variant}`} className="flex items-center p-3 border-b border-gray-100">
                <img src={item.imageUrl || 'https://placehold.co/100x100/D2B48C/000?text=Item'} alt={item.name} className="w-20 h-20 rounded-lg object-cover" />
                <div className="flex-grow mx-3">
                  <p className="font-semibold">{item.name}</p>
                  {item.variant && <p className="text-xs text-gray-500">{item.variant}</p>}
                  <p className="text-sm font-bold mt-1">{item.price} UZS</p>
                </div>
                <div className="flex flex-col items-center space-y-1">
                  <button onClick={() => onUpdateQuantity(item, 1)} className="p-1 bg-gray-100 rounded-full"><Plus className="w-4 h-4" /></button>
                  <span className="text-sm font-bold">{item.quantity}</span>
                  <button onClick={() => onUpdateQuantity(item, -1)} className="p-1 bg-gray-100 rounded-full"><Minus className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
          </div>
        ))}
      </main>
      <footer className="p-4 border-t border-gray-200 bg-white">
        <div className="flex space-x-2 mb-4">
          <input 
            type="text" 
            placeholder="Promo Code" 
            value={promoCode}
            onChange={(e) => setPromoCode(e.target.value)}
            className="flex-grow py-2 px-4 rounded-lg border-2 border-gray-200 focus:outline-none focus:border-[#C67C43]" 
          />
          <button 
            onClick={handleApplyPromo}
            className="py-2 px-4 rounded-lg text-white font-semibold" 
            style={{backgroundColor: Colors.accent}}
          >
            Apply
          </button>
        </div>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between"><p>Subtotal:</p> <p>{subtotal.toLocaleString()} UZS</p></div>
          <div className="flex justify-between"><p>Delivery Fee:</p> <p>{deliveryFee.toLocaleString()} UZS</p></div>
          {/* BUG FIX: Removed the extra `>` that caused the compile error */}
          <div className="flex justify-between font-bold text-lg mt-1"><p>Total:</p><p>{total.toLocaleString()} UZS</p></div>
        </div>
        <button className="w-full py-3 mt-4 rounded-lg text-white font-semibold text-lg flex items-center justify-center" style={{backgroundColor: Colors.primary}}>
          <CreditCard className="w-5 h-5 mr-2" /> Proceed to Checkout
        </button>
      </footer>
    </div>
  );
};

// --- NEW: Feed Post Component ---
const FeedPost = ({ post, shop }) => {
  if (!shop) return null;
  return (
    <div className="bg-white border-b border-gray-200">
      <div className="flex items-center p-3">
        <img src={shop.profilePicUrl || 'https://placehold.co/40x40/D2B48C/000?text=S'} alt={shop.name_uz} className="w-10 h-10 rounded-full object-cover" />
        <div className="ml-3">
          <p className="font-semibold text-sm">{shop.name_uz}</p>
          <p className="text-xs text-gray-500">{timeAgo(post.createdAt)}</p>
        </div>
      </div>
      {post.imageUrl && <img src={post.imageUrl} alt="Post" className="w-full" />}
      <div className="p-3"><p className="text-sm">{post.text}</p></div>
      <div className="flex space-x-4 p-2 border-t border-gray-100">
        <button className="flex items-center space-x-1 text-gray-600 hover:text-red-500"><Heart className="w-5 h-5" /> <span className="text-sm">Like</span></button>
        <button className="flex items-center space-x-1 text-gray-600 hover:text-blue-500"><MessageCircle className="w-5 h-5" /> <span className="text-sm">Comment</span></button>
      </div>
    </div>
  );
};

// --- NEW: Feed Page ---
const FeedPage = ({ db, appId, followingList, allShops }) => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const shopsMap = useMemo(() => allShops.reduce((acc, shop) => ({ ...acc, [shop.id]: shop }), {}), [allShops]);

  useEffect(() => {
    if (!followingList) { setLoading(false); setPosts([]); return; }
    if (followingList.length === 0) { setLoading(false); setPosts([]); return; }
    
    setLoading(true);
    const postsQuery = query(collectionGroup(db, 'posts'), where('shopId', 'in', followingList), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(postsQuery, (snapshot) => {
      setPosts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (error) => {
      console.error("Error fetching feed posts (Check Firestore Index):", error);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [db, appId, followingList]);

  if (loading) return <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin" style={{ color: Colors.primary }} /></div>;
  if (followingList.length === 0) return <div className="text-center p-8 text-gray-500">Your feed is empty. Follow some shops to see their posts here!</div>;

  return (
    <div className="flex-grow overflow-y-auto pb-24 bg-gray-100">
      {posts.length > 0 ? (
        posts.map(post => <FeedPost key={post.id} post={post} shop={shopsMap[post.shopId]} />)
      ) : <div className="text-center p-8 text-gray-500">The shops you follow haven't posted anything yet.</div>}
    </div>
  );
};

// --- Optional Login Modal ---
const AuthModal = ({ onClose, auth, setNotification, onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setNotification('');
    try {
      let userCredential;
      if (isLogin) {
        userCredential = await signInWithEmailAndPassword(auth, email, password);
        setNotification('Logged in!');
      } else {
        userCredential = await createUserWithEmailAndPassword(auth, email, password);
        setNotification('Account created!');
      }
      onLoginSuccess(userCredential.user);
      onClose();
    } catch (error) {
      setNotification(error.message);
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex items-center justify-center" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl p-8 w-11/12 max-w-sm" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-3xl font-bold text-center mb-2" style={{ color: Colors.primary }}>{isLogin ? 'Welcome Back!' : 'Join SHOXA'}</h2>
        <p className="text-center text-gray-500 mb-6">{isLogin ? 'Log in to see your favorites.' : 'Create an account to save shops.'}</p>
        <form onSubmit={handleSubmit}>
          {/* ... input fields ... */}
          <div className="relative mb-4">
            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full py-3 pl-10 pr-4 rounded-lg border-2 border-gray-200 focus:outline-none focus:border-[#C67C43] transition duration-200 bg-gray-50 text-gray-800" />
          </div>
          <div className="relative mb-4">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full py-3 pl-10 pr-4 rounded-lg border-2 border-gray-200 focus:outline-none focus:border-[#C67C43] transition duration-200 bg-gray-50 text-gray-800" />
          </div>
          <button type="submit" disabled={loading} className="w-full py-3 rounded-lg text-white font-semibold transition-all" style={{ backgroundColor: Colors.primary, opacity: loading ? 0.7 : 1 }}>
            {loading ? <Loader2 className="animate-spin mx-auto" /> : (isLogin ? 'Log In' : 'Sign Up')}
          </button>
        </form>
        <button onClick={() => setIsLogin(!isLogin)} className="w-full mt-4 text-sm text-center text-[#C67C43] hover:underline">
          {isLogin ? "Need an account? Sign Up" : "Already have an account? Log In"}
        </button>
      </div>
    </div>
  );
};

// --- NEW: Navigation Modal ---
const NavigationModal = ({ shop, userLocation, onClose }) => {
  const [distance, setDistance] = useState('...');
  const [duration, setDuration] = useState('...');

  useEffect(() => {
    if (userLocation && shop.location && shop.location.lat && shop.location.lng) {
      const dist = getDistance(userLocation.lat, userLocation.lng, shop.location.lat, shop.location.lng);
      setDistance((dist / 1000).toFixed(1));
      setDuration(Math.round((dist / 1000) * 5 + 5)); // Mock 5 min/km
    }
  }, [userLocation, shop.location]);

  const handleNavigateClick = () => {
    if (!shop.location) return;
    const { lat, lng } = shop.location;
    window.open(`https://maps.google.com/?daddr=${lat},${lng}`, '_blank');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex items-center justify-center" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl p-6 w-11/12 max-w-sm" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-xl font-bold text-gray-800 mb-4">Navigate to {shop.name_uz}</h2>
        <div className="flex justify-around mb-6 text-center">
          <div><p className="text-2xl font-bold" style={{color: Colors.primary}}>{distance}</p><p className="text-sm text-gray-500">km</p></div>
          <div><p className="text-2xl font-bold" style={{color: Colors.primary}}>{duration}</p><p className="text-sm text-gray-500">minutes</p></div>
        </div>
        <p className="text-xs text-gray-500 mb-4">Route overview is a simulation. Click below to open Google Maps for real-time navigation.</p>
        <button onClick={handleNavigateClick} className="w-full py-3 rounded-lg text-white font-semibold flex items-center justify-center" style={{backgroundColor: Colors.primary}}>
          <Navigation className="w-5 h-5 mr-2" /> Start Navigation
        </button>
      </div>
    </div>
  );
};

// --- NEW: Add Shop Modal ---
const AddShopModal = ({ onClose }) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex items-center justify-center" onClick={onClose}>
    <div className="bg-white rounded-2xl shadow-xl p-6 w-11/12 max-w-sm text-center" onClick={(e) => e.stopPropagation()}>
      <Briefcase className="w-16 h-16 mx-auto" style={{color: Colors.primary}} />
      <h2 className="text-xl font-bold text-gray-800 mt-4 mb-2">Add Your Shop</h2>
      <p className="text-sm text-gray-600 mb-6">To register your shop and manage products, please use our secure Admin Portal.</p>
      <a
        href="#" // We don't link directly, just give info
        onClick={() => alert("Please run 'npm run start-admin' to access the Admin Panel. In production, this will be admin.shoxa.uz.")}
        className="w-full block py-3 rounded-lg text-white font-semibold" 
        style={{backgroundColor: Colors.primary}}
      >
        Open Admin Portal
      </a>
      <button onClick={onClose} className="w-full mt-2 text-sm text-center text-gray-500 hover:underline">Maybe later</button>
    </div>
  </div>
);

// --- Notification Component ---
const Notification = ({ message, onClear }) => {
  useEffect(() => { if (message) { const t = setTimeout(onClear, 3000); return () => clearTimeout(t); } }, [message, onClear]);
  if (!message) return null;
  return <div className="fixed top-5 right-5 p-4 rounded-lg shadow-lg text-white bg-green-500 z-50">{message}</div>;
};

// --- Main Application Component ---
const App = () => {
  // Firebase State
  const [db, setDb] = useState(null);
  const [auth, setAuth] = useState(null);
  const [authUser, setAuthUser] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  
  // Data State
  const [allShops, setAllShops] = useState([]);
  const [allProducts, setAllProducts] = useState([]); // For carousel
  const [userShopId, setUserShopId] = useState(null); // For "View My Shop"
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [followingList, setFollowingList] = useState([]);

  // UI/Interaction State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState(null);
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [selectedShop, setSelectedShop] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null); // {product, shopId, shopName}
  const [activeTab, setActiveTab] = useState('Home'); // Home, Feed, Map, Cart, Profile
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showNavModal, setShowNavModal] = useState(null);
  const [showAddShopModal, setShowAddShopModal] = useState(false);
  const [notification, setNotification] = useState('');
  
  // Location State
  const [userLocation, setUserLocation] = useState(null);
  
  // E-commerce State
  const [cart, setCart] = useState([]);

  // RE-ADDED from V1.2: Page View State
  const [currentView, setCurrentView] = useState('home');
  const [allShopsSearchTerm, setAllShopsSearchTerm] = useState('');

  // 1. Initialize Firebase and Authenticate
  useEffect(() => {
    try {
      if (!firebaseConfig || !firebaseConfig.apiKey) throw new Error("Firebase config missing");
      const app = initializeApp(firebaseConfig);
      const firestore = getFirestore(app);
      const firebaseAuth = getAuth(app);
      setDb(firestore);
      setAuth(firebaseAuth);
      const unsub = onAuthStateChanged(firebaseAuth, (user) => {
        if (user) {
          setAuthUser(user);
          setCurrentUserId(user.uid);
          setIsAuthReady(true);
        } else {
          signInAnonymously(firebaseAuth).catch(err => console.error("Anon sign-in failed:", err));
        }
      });
      return () => unsub();
    } catch (e) { setError("Failed to initialize Firebase."); }
  }, []);

  // 2. Fetch User's Geolocation
  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setUserLocation({ lat: 41.2995, lng: 69.2401 })
    );
  }, []);

  // 3. Fetch Real-time Data
  useEffect(() => {
    if (!isAuthReady || !db || !currentUserId) return;
    setLoading(true);
    
    // Fetch Shops
    const shopsRef = collection(db, 'artifacts', appId, 'public', 'data', 'shops');
    const shopsUnsub = onSnapshot(query(shopsRef), (snapshot) => {
      const shopList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAllShops(shopList);
      
      const myShop = shopList.find(s => s.owner_uid === currentUserId);
      setUserShopId(myShop ? myShop.id : null);
    }, (err) => {
      setError("Failed to load shops. Check Rules.");
      setLoading(false);
    });

    // Fetch User's Following List
    const followingRef = collection(db, 'artifacts', appId, 'users', currentUserId, 'following');
    const followingUnsub = onSnapshot(followingRef, (snapshot) => {
      setFollowingList(snapshot.docs.map(doc => doc.id));
    }, (err) => {
      setError("Failed to load user data. Check Rules.");
    });
    
    // Fetch ALL products for carousel (MATCHING THE INDEX)
    const productsQuery = query(collectionGroup(db, 'inventory'), orderBy('name'));
    const productsUnsub = onSnapshot(productsQuery, (snapshot) => {
      const productList = snapshot.docs.map(doc => {
        const shopId = doc.ref.parent.parent.id;
        return { id: doc.id, shopId, ...doc.data() };
      });
      
      // We need allShops to be ready to map names
      if (allShops.length > 0) {
        const shopsMap = allShops.reduce((acc, shop) => ({ ...acc, [shop.id]: shop.name_uz }), {});
        const productsWithShopNames = productList.map(p => ({
          ...p,
          shopName: shopsMap[p.shopId] || 'SHOXA'
        }));
        setAllProducts(productsWithShopNames);
      } else {
        // Fallback if shops aren't loaded yet
        setAllProducts(productList);
      }

    }, (err) => { 
      console.warn("Product carousel query failed. Check Firestore index for 'inventory' (name, ascending).");
      // Don't set a hard error, just warn in console
    });
    
    setLoading(false);

    return () => { shopsUnsub(); followingUnsub(); productsUnsub(); };
  }, [isAuthReady, db, currentUserId, appId, allShops]); // re-run if allShops updates

  // 4. Memoized Filtering Logic
  const homeFilteredShops = useMemo(() => {
    let shops = allShops;
    if (filterCategory) {
      shops = shops.filter(s => s.type && s.type.toLowerCase() === filterCategory.toLowerCase());
    }
    // MERGED: Search also checks 'type'
    if (isSearchActive && searchTerm) {
      const s = searchTerm.toLowerCase();
      shops = shops.filter(s => 
        (s.name_uz && s.name_uz.toLowerCase().includes(s)) ||
        (s.name_en && s.name_en.toLowerCase().includes(s)) ||
        (s.type && s.type.toLowerCase().includes(s))
      );
    }
    return shops;
  }, [allShops, filterCategory, searchTerm, isSearchActive]);

  // RE-ADDED from V1.2: Filtering for the "All Shops" page
  const allShopsFiltered = useMemo(() => {
    let shops = allShops;
    if (!allShopsSearchTerm) return shops;
    const s = allShopsSearchTerm.toLowerCase();
    // MERGED: Search also checks 'type'
    return shops.filter(shop => 
      (shop.name_uz && shop.name_uz.toLowerCase().includes(s)) ||
      (shop.name_en && shop.name_en.toLowerCase().includes(s)) ||
      (shop.type && shop.type.toLowerCase().includes(s))
    );
  }, [allShops, allShopsSearchTerm]);

  // RE-ADDED from V1.2: Only show 4 recommended shops
  const recommendedShops = useMemo(() => homeFilteredShops.slice(0, 4), [homeFilteredShops]);


  // --- Event Handlers ---
  const handleSearchFocus = () => setIsSearchActive(true);
  const handleSearchCancel = () => { setSearchTerm(''); setIsSearchActive(false); };
  const handleFilterSelect = (cat) => setFilterCategory(prev => prev === cat ? null : cat);
  
  const handleFollow = async (shopId) => {
    if (!currentUserId || !db) return;
    const followRef = doc(db, 'artifacts', appId, 'users', currentUserId, 'following', shopId);
    if (followingList.includes(shopId)) {
      await deleteDoc(followRef); setNotification("Unfollowed shop.");
    } else {
      await setDoc(followRef, { followedAt: new Date() }); setNotification("Followed shop!");
    }
  };

  const getPageTitle = () => {
    if (isSearchActive) return "Search Results";
    if (filterCategory) return `${filterCategory}s`;
    return "Recommended"; // RE-ADDED from V1.2
  };

  const showDefaultView = !isSearchActive && !filterCategory;

  // --- E-commerce Handlers ---
  const handleAddToCart = (productToAdd) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.id === productToAdd.id && item.variant === productToAdd.variant);
      if (existingItem) {
        return prevCart.map(item => 
          item.id === productToAdd.id && item.variant === productToAdd.variant 
            ? { ...item, quantity: item.quantity + productToAdd.quantity } 
            : item
        );
      } else {
        return [...prevCart, productToAdd];
      }
    });
    setNotification("Added to cart!");
  };

  const handleUpdateQuantity = (itemToUpdate, amount) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.id === itemToUpdate.id && item.variant === itemToUpdate.variant);
      if (existingItem.quantity + amount <= 0) {
        return prevCart.filter(item => !(item.id === itemToUpdate.id && item.variant === itemToUpdate.variant));
      } else {
        return prevCart.map(item => 
          item.id === itemToUpdate.id && item.variant === itemToUpdate.variant 
            ? { ...item, quantity: item.quantity + amount }
            : item
        );
      }
    });
  };

  const cartTotalItems = useMemo(() => cart.reduce((total, item) => total + item.quantity, 0), [cart]);

  // --- Profile Page Handlers ---
  const handleViewMyShop = () => {
    if (!userShopId) return;
    const myShop = allShops.find(s => s.id === userShopId);
    if (myShop) {
      setSelectedShop(myShop);
      setCurrentView('home'); // Ensure we are on home view
      setActiveTab('Home'); // Ensure we are on home tab
    }
  };
  
  // --- Loading / Error State ---
  if (error) return <div className="flex items-center justify-center min-h-screen bg-red-100 p-4 text-center"><p className="text-red-700 font-medium">Error: {error}. Make sure you created all Firestore Indexes.</p></div>;
  if (loading && !isAuthReady) return <div className="flex items-center justify-center h-screen"><Loader2 className="w-12 h-12 animate-spin" style={{ color: Colors.primary }} /></div>;

  // --- Main Render ---
  return (
    <div style={{ backgroundColor: Colors.background }} className={`min-h-screen font-sans flex flex-col items-center`}>
      <Notification message={notification} onClear={() => setNotification('')} />
      {showAuthModal && <AuthModal auth={auth} onClose={() => setShowAuthModal(false)} setNotification={setNotification} onLoginSuccess={setAuthUser} />}
      {showNavModal && <NavigationModal shop={showNavModal} userLocation={userLocation} onClose={() => setShowNavModal(null)} />}
      {showAddShopModal && <AddShopModal onClose={() => setShowAddShopModal(false)} />}

      {/* Main container for page views */}
      <div className="w-full max-w-md h-screen shadow-2xl bg-white flex flex-col relative overflow-hidden">
        
        {/* --- View: Home Page (includes sub-pages) --- */}
        {/* This div logic ensures the sticky footer works */}
        <div className={`flex-grow w-full h-full transition-transform duration-300 ease-in-out ${currentView === 'home' ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="flex flex-col h-full">

            {/* --- Home Tab --- */}
            <div className={`flex flex-col h-full ${activeTab === 'Home' ? 'flex' : 'hidden'}`}>
              <header className="bg-white border-b border-gray-100 z-10 sticky top-0">
                <div className="h-10 flex justify-between items-center px-4 pt-4">
                    <span className="font-bold text-lg" style={{ color: Colors.primary }}>SHOXA</span>
                    <div className="flex space-x-2 items-center"><Bell className="w-5 h-5 text-gray-500" /><span className="text-xs text-gray-400">Tashkent</span></div>
                </div>
                <div className="p-4 pt-2">
                  <div className="relative flex items-center space-x-2">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input type="text" placeholder={filterCategory ? `Search in ${filterCategory}s...` : "Search Shops, Products..."} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} onFocus={handleSearchFocus} className={`w-full py-3 pl-10 pr-4 rounded-full border-2 border-gray-200 focus:outline-none focus:border-[#C67C43] transition-all duration-300 ${Colors.background} text-gray-800`} />
                    {isSearchActive && <button onClick={handleSearchCancel} className="text-sm font-medium text-[#C67C43]">Cancel</button>}
                  </div>
                </div>
              </header>
              <main className="flex-grow overflow-y-auto pb-24">
                <div className={`px-4 transition-all duration-300 ease-in-out ${showDefaultView ? 'opacity-100 h-52 mb-6' : 'opacity-0 h-0 invisible'}`}>
                  <div style={{ backgroundColor: Colors.secondary }} className={`h-48 rounded-xl overflow-hidden shadow-lg flex items-center justify-center relative`}>
                    <img src="https://placehold.co/400x192/964B00/D2B48C?text=Nearby+Locations+Map" alt="Map Banner" className="w-full h-full object-cover opacity-60"/>
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-white">
                      <h2 className="text-2xl font-black mb-1">Find Your Branch Now!</h2>
                      <p className="text-sm font-light mb-4 text-center">See all {allShops.length} sites near you.</p>
                      <button style={{ backgroundColor: Colors.primary }} className={`text-white px-5 py-2 rounded-full font-semibold shadow-md hover:opacity-90 transition`} onClick={() => setActiveTab('Map')}>
                        Open Full Map
                      </button>
                    </div>
                  </div>
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
                  <div className="flex justify-between items-center mb-3">
                    <h2 className={`text-lg font-bold ${Colors.text}`}>{getPageTitle()} ({homeFilteredShops.length})</h2>
                    {showDefaultView && <button onClick={() => setCurrentView('allShops')} className="text-sm font-medium text-[#C67C43]">See All</button>}
                  </div>
                  {loading ? <p className="text-gray-500">Fetching...</p> : homeFilteredShops.length > 0 ? (
                    <div className="grid grid-cols-2 gap-4">
                      {recommendedShops.map((shop) => (
                        <ShopCard key={shop.id} shop={shop} onClick={() => setSelectedShop(shop)} userLocation={userLocation} />
                      ))}
                    </div>
                  ) : <p className="text-gray-500 text-center py-8">No sites found.</p>}
                </div>
                <div className={`mb-6 transition-all duration-300 ease-in-out ${showDefaultView ? 'opacity-100' : 'opacity-0 h-0 invisible'}`}>
                  <h2 className={`text-lg font-bold mb-3 px-4 ${Colors.text}`}>Promotions & Products</h2>
                  <div className="relative w-full overflow-hidden h-48 group">
                    <div className="absolute top-0 left-0 flex animate-infinite-scroll group-hover:pause">
                      {allProducts.length > 0 ? (
                        [...allProducts, ...allProducts].map((product, index) => (
                          <ProductCarouselCard key={`${product.id}-${index}`} product={product} onClick={() => setSelectedProduct({product: product, shopId: product.shopId, shopName: product.shopName})} />
                        ))
                      ) : (
                        <p className="text-gray-500 px-4">No products available yet.</p>
                      )}
                    </div>
                  </div>
                </div>
              </main>
            </div>
            
            {/* --- NEW: Feed Tab --- */}
            <div className={`flex-grow flex flex-col h-full ${activeTab === 'Feed' ? 'flex' : 'hidden'}`}>
               <header className="bg-white border-b border-gray-100 z-10 sticky top-0 p-4">
                  <h2 className="text-xl font-bold text-center" style={{ color: Colors.primary }}>Your Feed</h2>
               </header>
               <FeedPage db={db} appId={appId} followingList={followingList} allShops={allShops} />
            </div>

            {/* --- Map Tab --- */}
            <div className={`flex-grow h-full ${activeTab === 'Map' ? 'flex' : 'hidden'}`}>
              <MapView shops={allShops} userLocation={userLocation} onShopClick={(shop) => { setSelectedShop(shop); setActiveTab('Home'); }} />
            </div>

            {/* --- NEW: Cart Tab --- */}
            <div className={`flex-grow flex flex-col h-full ${activeTab === 'Cart' ? 'flex' : 'hidden'}`}>
               <header className="bg-white border-b border-gray-100 z-10 sticky top-0 p-4">
                  <h2 className="text-xl font-bold text-center" style={{ color: Colors.primary }}>Your Cart ({cartTotalItems})</h2>
               </header>
               <CartPage cart={cart} onUpdateQuantity={handleUpdateQuantity} setNotification={setNotification} />
            </div>
            
            {/* --- Profile Tab --- */}
            <div className={`flex-grow flex flex-col p-4 pb-24 overflow-y-auto ${activeTab === 'Profile' ? 'flex' : 'hidden'}`}>
              {authUser && !authUser.isAnonymous ? (
                <div>
                  <h2 className="text-2xl font-bold">Welcome!</h2>
                  <p className="text-gray-600 mb-4">{authUser.email}</p>
                  {userShopId && (
                    <button onClick={handleViewMyShop} className="w-full py-3 mb-3 rounded-lg text-white font-semibold" style={{backgroundColor: Colors.accent}}>
                      <Briefcase className="w-5 h-5 inline-block mr-2" /> View My Shop
                    </button>
                  )}
                  <button onClick={() => { signOut(auth); setNotification('Logged out.'); }} className="w-full py-3 rounded-lg text-white font-semibold" style={{backgroundColor: Colors.primary}}>
                    Log Out
                  </button>
                </div>
              ) : (
                <div>
                  <h2 className="text-2xl font-bold mb-2">Join SHOXA</h2>
                  <p className="text-gray-600 mb-4">Log in or Sign Up to save your favorite shops and get personalized recommendations.</p>
                  <button onClick={() => setShowAuthModal(true)} className="w-full py-3 rounded-lg text-white font-semibold" style={{backgroundColor: Colors.primary}}>
                    Log In / Sign Up
                  </button>
                </div>
              )}
              <div className="mt-8 pt-8 border-t border-gray-200">
                <h3 className="text-lg font-bold">Are you a business owner?</h3>
                <p className="text-gray-600 mb-4 text-sm">Join SHOXA to get your shop listed and start selling today.</p>
                <button onClick={() => setShowAddShopModal(true)} className="w-full py-3 rounded-lg text-white font-semibold" style={{backgroundColor: Colors.accent}}>
                  Add Your Shop
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* --- RE-ADDED from V1.2: "All Shops" Page --- */}
        <div className={`absolute inset-0 flex flex-col bg-white transition-transform duration-300 ease-in-out ${currentView === 'allShops' ? 'translate-x-0' : 'translate-x-full'} z-30`}>
          <header className="bg-white border-b border-gray-100 z-10 sticky top-0">
            <div className="h-10 flex justify-between items-center px-4 pt-4">
                <button onClick={() => setCurrentView('home')} className="flex items-center text-[#C67C43]"><ArrowLeft className="w-5 h-5 mr-1" /> Back</button>
                <span className="font-bold text-lg text-gray-800">All Shops</span>
                <div className="w-16"></div>
            </div>
            <div className="p-4 pt-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input type="text" placeholder="Search all shops..." value={allShopsSearchTerm} onChange={(e) => setAllShopsSearchTerm(e.target.value)} className={`w-full py-3 pl-10 pr-4 rounded-full border-2 border-gray-200 focus:outline-none focus:border-[#C67C43] transition-all duration-300 ${Colors.background} text-gray-800`} />
              </div>
            </div>
          </header>
          <main className="flex-grow overflow-y-auto pb-24 px-4">
            <h2 className="text-lg font-bold mb-3 text-gray-800">Results ({allShopsFiltered.length})</h2>
            {allShopsFiltered.length > 0 ? (
              <div className="grid grid-cols-2 gap-4">
                {allShopsFiltered.map((shop) => (
                  <ShopCard key={shop.id} shop={shop} onClick={() => { setSelectedShop(shop); setCurrentView('home'); }} userLocation={userLocation} />
                ))}
              </div>
            ) : <p className="text-gray-500 text-center py-8">No shops found.</p>}
          </main>
        </div>

        {/* --- Shared Components (STICKY FOOTER) --- */}
        {/* FIX: The sticky footer is now outside the scrolling containers */}
        <footer className="sticky bottom-0 w-full max-w-md mx-auto bg-white border-t border-gray-200 shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.05)] z-10">
          <div className="flex justify-around py-3">
            <NavItem icon={Home} label="Home" active={activeTab === 'Home'} onClick={() => { setActiveTab('Home'); setCurrentView('home'); }} />
            <NavItem icon={Rss} label="Feed" active={activeTab === 'Feed'} onClick={() => setActiveTab('Feed')} />
            <NavItem icon={MapIcon} label="Map" active={activeTab === 'Map'} onClick={() => setActiveTab('Map')} />
            <NavItem icon={ShoppingCart} label="Cart" active={activeTab === 'Cart'} onClick={() => setActiveTab('Cart')} count={cartTotalItems} />
            <NavItem icon={User} label="Profile" active={activeTab === 'Profile'} onClick={() => setActiveTab('Profile')} />
          </div>
        </footer>

        {selectedShop && !selectedProduct && (
          <ShopDetailPage 
            shop={selectedShop} 
            onClose={() => setSelectedShop(null)} 
            db={db} appId={appId} userLocation={userLocation}
            onFollow={handleFollow} isFollowing={followingList.includes(selectedShop.id)}
            onProductClick={(product, shopId, shopName) => setSelectedProduct({product, shopId, shopName})}
            onNavigateClick={() => setShowNavModal(selectedShop)}
          />
        )}
        
        {selectedProduct && (
          <ProductDetailPage
            product={selectedProduct.product}
            shopId={selectedProduct.shopId}
            shopName={selectedProduct.shopName}
            onClose={() => setSelectedProduct(null)}
            onAddToCart={handleAddToCart}
          />
        )}

      </div> {/* End Mobile Frame */}
      
      {/* RE-ADDED from V1.2: CSS for Infinite Carousel */}
      <style>{`
        @keyframes scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-infinite-scroll {
          /* 10 products * (144px card + 16px margin) = 1600px. * 2 sets = 3200px */
          /* Adjust width based on your number of products */
          width: 3200px; 
          animation: scroll 60s linear infinite; /* Slower scroll */
        }
        .group-hover\\:pause:hover {
          animation-play-state: paused;
        }
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