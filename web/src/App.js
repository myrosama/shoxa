import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, Compass, ShoppingCart, Bell, User, Home, Map, 
  X, ChevronDown, Clock, MapPin, Tag, Building
} from 'lucide-react';

// Firebase Imports
import { initializeApp } from 'firebase/app';
import { 
  getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged 
} from 'firebase/auth';
import { 
  getFirestore, collection, query, onSnapshot, doc
} from 'firebase/firestore';

// --- Local & Global Configuration ---
const LOCAL_FIREBASE_CONFIG = {
  apiKey: "AIzaSyDd0PkrXLPT8NDKEJuwTUmFb1o0SPuHN7U",
  authDomain: "shoxabranch.firebaseapp.com",
  projectId: "shoxabranch",
  storageBucket: "shoxabranch.firebasestorage.app",
  messagingSenderId: "274790573053",
  appId: "1:274790573053:web:7f0df0f443e27c22bcef94",
  measurementId: "G-DYXYK6NCYK"
};

// Use environment variables if they exist, otherwise use local fallback
const appId = typeof __app_id !== 'undefined' ? __app_id : LOCAL_FIREBASE_CONFIG.appId;

const firebaseConfig = typeof __firebase_config !== 'undefined' ? 
  JSON.parse(__firebase_config) : LOCAL_FIREBASE_CONFIG;
  
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? 
  __initial_auth_token : null;
// --------------------------------------------------------

// Autumn Vibe Color Palette
const Colors = {
  primary: '#C67C43',  // Rich Autumn Orange/Brown
  secondary: '#A0522D', // Sienna Brown
  background: '#FDF6E3', // Creamy Off-White (Paper)
  text: '#333333', // Darker text for readability
  accent: '#4B5320', // Olive Green (Branch Green)
};

// --- Sub-Components ---

/**
 * Renders a single shop card in the grid.
 * Now uses a 2-column grid layout.
 */
const ShopCard = ({ shop, onClick }) => {
  const shopName = shop.name_uz || shop.name_en || 'Shop Branch';
  const category = shop.type || 'General';
  const shopImage = shop.image || "https://placehold.co/150x100/D2B48C/000?text=Shop";

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
      </div>
    </button>
  );
};

/**
 * Renders a single category icon.
 * Now handles filter selection and fits screen.
 */
const NearbyCategory = ({ title, icon: Icon, onFilterSelect, isSelected }) => (
  <button 
    onClick={onFilterSelect} 
    className="flex flex-col items-center w-1/5 group focus:outline-none" // Uses 1/5 width to fit 5
  >
    <div className={`p-3 rounded-full shadow-md transition-all duration-300 ease-in-out ${isSelected ? 'bg-white border-2 border-[#C67C43]' : `bg-[${Colors.primary}] group-hover:opacity-80`}`}>
      <Icon className={`w-6 h-6 ${isSelected ? 'text-[#C67C43]' : 'text-white'}`} />
    </div>
    <p className={`mt-2 text-xs font-medium text-center ${isSelected ? 'text-[#C67C43]' : 'text-gray-700'}`}>{title}</p>
  </button>
);

/**
 * Renders the navigation item in the sticky footer.
 */
const NavItem = ({ icon: Icon, label, active }) => (
  <button className="flex flex-col items-center text-xs group focus:outline-none">
    <Icon className={`w-6 h-6 transition duration-150 ${active ? 'text-[#C67C43]' : 'text-gray-500 group-hover:text-[#C67C43]'}`} />
    <span className={`mt-1 font-medium ${active ? 'text-[#C67C43]' : 'text-gray-500'}`}>{label}</span>
  </button>
);

/**
 * Renders a card for the new "Featured Products" section.
 */
const ProductCard = ({ product }) => (
  <div className="flex-shrink-0 w-36 rounded-lg shadow-md overflow-hidden bg-white border border-gray-100">
    <img src={product.image} alt={product.name} className="w-full h-24 object-cover" />
    <div className="p-2">
      <h4 className="text-sm font-semibold truncate">{product.name}</h4>
      <p className="text-xs text-gray-500 truncate">{product.shopName}</p>
      <p className="text-sm font-bold mt-1 text-gray-800">{product.price} UZS</p>
    </div>
  </div>
);

/**
 * The Modal that slides up to show Shop Details and Products.
 */
const ShopDetailModal = ({ shop, onClose, db, appId }) => {
  const [inventory, setInventory] = useState([]);
  const [loadingInventory, setLoadingInventory] = useState(true);

  // Fetch this shop's specific inventory sub-collection
  useEffect(() => {
    if (!shop || !db) return;

    setLoadingInventory(true);
    // Path: /artifacts/{appId}/public/data/shops/{shopId}/inventory
    const inventoryRef = collection(db, 'artifacts', appId, 'public', 'data', 'shops', shop.id, 'inventory');
    
    const unsubscribe = onSnapshot(inventoryRef, (snapshot) => {
      const productList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setInventory(productList);
      setLoadingInventory(false);
    }, (error) => {
      console.error("Error fetching inventory: ", error);
      setLoadingInventory(false);
    });

    return () => unsubscribe();
  }, [shop, db, appId]);

  if (!shop) return null;

  return (
    // Backdrop
    <div 
      onClick={onClose} 
      className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity duration-300 ease-in-out"
    >
      {/* Modal Content */}
      <div
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking modal content
        className={`fixed bottom-0 left-0 right-0 w-full max-w-md mx-auto h-[70vh] bg-white rounded-t-2xl shadow-2xl z-50 p-4 pt-2 transition-transform duration-300 ease-in-out transform translate-y-0`}
      >
        {/* Drag Handle */}
        <div className="w-16 h-1.5 bg-gray-300 rounded-full mx-auto mb-4" />
        
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-800">{shop.name_uz || shop.name_en}</h2>
          <button onClick={onClose} className="p-2 rounded-full bg-gray-100 text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="h-[calc(70vh-100px)] overflow-y-auto">
          {/* Info Section */}
          <div className="space-y-3 text-gray-700">
            <div className="flex items-center space-x-2">
              <Building className="w-5 h-5 text-[#C67C43]" />
              <span>{shop.type || 'Shop'}</span>
            </div>
            <div className="flex items-center space-x-2">
              <MapPin className="w-5 h-5 text-[#C67C43]" />
              <span>{shop.address || 'Address not available'}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-[#C67C43]" />
              <span>{shop.hours?.Mon || 'Hours not specified'} (Today)</span>
            </div>
          </div>

          {/* Products Section */}
          <h3 className="text-lg font-bold text-gray-800 mt-6 mb-3">Products</h3>
          {loadingInventory ? (
            <p className="text-gray-500">Loading products...</p>
          ) : inventory.length > 0 ? (
            <div className="grid grid-cols-2 gap-4">
              {inventory.map(product => (
                <div key={product.id} className="border border-gray-200 rounded-lg p-3">
                  <h4 className="font-semibold">{product.name}</h4>
                  <p className="text-sm text-gray-600">{product.price} UZS</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No products listed for this shop yet.</p>
          )}
        </div>
      </div>
    </div>
  );
};


// --- Main Application Component ---
const App = () => {
  // Firebase State
  const [db, setDb] = useState(null);
  const [auth, setAuth] = useState(null);
  const [userId, setUserId] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  
  // Data State
  const [allShops, setAllShops] = useState([]); // Master list of all shops
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // UI/Interaction State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState(null); // e.g., 'Restaurant'
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [selectedShop, setSelectedShop] = useState(null); // For the modal

  // Mock Products for the new section
  const mockFeaturedProducts = [
    { id: 'p1', name: 'Kuk Somsa (Spring)', shopName: 'Tandir Somsa', price: '7,000', image: 'https://placehold.co/150x100/964B00/ffffff?text=Somsa' },
    { id: 'p2', name: 'To\'y Oshi (Plov)', shopName: 'Osh Center', price: '28,000', image: 'https://placehold.co/150x100/A0522D/ffffff?text=Plov' },
    { id: 'p3', name: 'Freshly Baked Non', shopName: 'Tandir Bakery', price: '4,000', image: 'https://placehold.co/150x100/D2B48C/000?text=Bread' },
  ];
  
  // 1. Initialize Firebase and Authenticate
  useEffect(() => {
    try {
      if (!firebaseConfig.apiKey) {
        throw new Error("Firebase config is completely empty after checking local fallback.");
      }
      
      const app = initializeApp(firebaseConfig);
      const firestore = getFirestore(app);
      const firebaseAuth = getAuth(app);
      
      setDb(firestore);
      setAuth(firebaseAuth);

      const unsubscribe = onAuthStateChanged(firebaseAuth, (user) => {
        if (user) {
          setUserId(user.uid);
          setIsAuthReady(true);
          console.log(`User signed in: ${user.uid}`);
        } else if (initialAuthToken) {
          signInWithCustomToken(firebaseAuth, initialAuthToken)
            .catch(err => {
              console.error("Custom token sign-in failed, falling back to anonymous.", err);
              signInAnonymously(firebaseAuth);
            });
        } else {
          signInAnonymously(firebaseAuth)
            .catch(err => {
              console.error("Anonymous sign-in failed:", err);
              setError("Authentication failed.");
            });
        }
        
        // This second listener ensures auth state is fully resolved before we proceed
        const authReadyUnsubscribe = onAuthStateChanged(firebaseAuth, (finalUser) => {
            if(finalUser) {
                setUserId(finalUser.uid);
                setIsAuthReady(true);
            }
            authReadyUnsubscribe(); // Remove this listener after it runs once
        });

      });

      return () => unsubscribe();
    } catch (e) {
      console.error("Firebase Initialization Error:", e);
      setError("Failed to initialize the app.");
      setLoading(false);
    }
  }, []);

  // 2. Fetch Real-time Data
  useEffect(() => {
    if (!isAuthReady || !userId || !db) return;

    setLoading(true);
    // Correct Firestore path
    const shopsCollectionRef = collection(db, 'artifacts', appId, 'public', 'data', 'shops');
    
    const unsubscribe = onSnapshot(shopsCollectionRef, (snapshot) => {
      const shopList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setAllShops(shopList);
      setLoading(false);
      console.log(`Fetched real-time shop data. Total shops: ${shopList.length}`);
    }, (error) => {
      console.error("Firestore onSnapshot error:", error);
      setError("Failed to load shop data. Check Firebase Rules.");
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isAuthReady, userId, db]); // Rerun when auth is ready

  // 3. Memoized Filtering Logic
  const filteredShops = useMemo(() => {
    let shops = allShops;

    // First, apply category filter if one is selected
    if (filterCategory) {
      shops = shops.filter(shop => 
        shop.type && shop.type.toLowerCase() === filterCategory.toLowerCase()
      );
    }

    // Then, apply search term to the (potentially) filtered list
    if (isSearchActive && searchTerm) {
      const lowerCaseSearch = searchTerm.toLowerCase();
      shops = shops.filter(shop => 
        (shop.name_uz && shop.name_uz.toLowerCase().includes(lowerCaseSearch)) ||
        (shop.name_en && shop.name_en.toLowerCase().includes(lowerCaseSearch)) ||
        (shop.type && shop.type.toLowerCase().includes(lowerCaseSearch))
      );
    }
    
    return shops;
  }, [allShops, filterCategory, searchTerm, isSearchActive]);

  // --- Event Handlers ---

  const handleSearchFocus = () => {
    setIsSearchActive(true);
    // Don't clear filter, allow searching *within* a filter
  };

  const handleSearchCancel = () => {
    setSearchTerm('');
    setIsSearchActive(false);
  };

  const handleFilterSelect = (category) => {
    // If clicking the same filter, clear it (toggle off).
    if (filterCategory === category) {
      setFilterCategory(null);
    } else {
      setFilterCategory(category);
      // We can keep search active if we want, or clear it.
      // Let's keep it, so user can filter then search.
    }
  };
  
  const handleOpenModal = (shop) => {
    setSelectedShop(shop);
  };

  const handleCloseModal = () => {
    setSelectedShop(null);
  };
  
  const getPageTitle = () => {
    if (isSearchActive) return "Search Results";
    if (filterCategory) return `${filterCategory}s`; // e.g., "Restaurants"
    return "Recommended Shops";
  };

  // Determine if the default view (Map + Promotions) should be shown
  const showDefaultView = !isSearchActive && !filterCategory;
  
  // --- Loading / Error State ---
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-red-100 p-4 text-center">
        <p className="text-red-700 font-medium">Error: {error}</p>
      </div>
    );
  }

  // --- Main Render ---
  return (
    <div style={{ backgroundColor: Colors.background }} className={`min-h-screen font-sans flex flex-col items-center`}>
      {/* Mobile Frame Container */}
      <div className="w-full max-w-md h-full min-h-screen shadow-2xl bg-white flex flex-col relative overflow-hidden">
        
        {/* --- Header Area (Stays at Top) --- */}
        <header className="bg-white border-b border-gray-100 z-10 sticky top-0">
          {/* Header/Status Bar Simulation (Added padding) */}
          <div className="h-10 flex justify-between items-center px-4 pt-4">
              <span className="font-bold text-lg" style={{ color: Colors.primary }}>SHOXA</span>
              <div className="flex space-x-2 items-center">
                  <Bell className="w-5 h-5 text-gray-500" />
                  <span className="text-xs text-gray-400">
                    {userId ? `UID: ${userId.substring(0, 6)}...` : 'Connecting...'}
                  </span>
              </div>
          </div>

          {/* 1. Dynamic Search Bar (Top) */}
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
              {/* Show Cancel button only in search mode */}
              <div 
                className={`transition-all duration-300 ease-in-out ${isSearchActive ? 'opacity-100 w-auto' : 'opacity-0 w-0'}`}
              >
                <button 
                  onClick={handleSearchCancel} 
                  className="text-sm font-medium text-[#C67C43] overflow-hidden"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* --- Scrollable Content Area --- */}
        <main className="flex-grow overflow-y-auto pb-24">
          
          {/* 2. Map Banner (Fades out in search/filter mode) */}
          <div 
            className={`px-4 transition-all duration-300 ease-in-out ${showDefaultView ? 'opacity-100 h-52 mb-6' : 'opacity-0 h-0 invisible'}`}
          >
            <div 
              style={{ backgroundColor: Colors.secondary }}
              className={`h-48 rounded-xl overflow-hidden shadow-lg flex items-center justify-center relative`}
            >
              <img 
                src="https://placehold.co/400x192/964B00/D2B48C?text=Nearby+Locations+Map" 
                alt="Map Banner" 
                className="w-full h-full object-cover opacity-60"
              />
              <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-white">
                <h2 className="text-2xl font-black mb-1">Find Your Branch Now!</h2>
                <p className="text-sm font-light mb-4 text-center">See all {allShops.length} sites near you.</p>
                <button 
                  style={{ backgroundColor: Colors.primary }}
                  className={`text-white px-5 py-2 rounded-full font-semibold shadow-md hover:opacity-90 transition`}
                  onClick={() => console.log("Map View transition...")} 
                >
                  Open Full Map
                </button>
              </div>
            </div>
          </div>
          
          {/* 3. Nearby Categories (Fixed bug - no scrollbar) */}
          <div 
            className={`px-4 mb-6 transition-all duration-300 ease-in-out ${isSearchActive ? 'opacity-0 h-0 invisible' : 'opacity-100'}`}
          >
            <h2 className={`text-lg font-bold mb-3 ${Colors.text}`}>
              Quick Access
            </h2>
            {/* Using flex and justify-around to fit all 5 icons */}
            <div className="flex justify-around pb-2">
              <NearbyCategory title="Shops" icon={ShoppingCart} isSelected={filterCategory === 'Shop'} onFilterSelect={() => handleFilterSelect('Shop')} />
              <NearbyCategory title="Restaurants" icon={Compass} isSelected={filterCategory === 'Restaurant'} onFilterSelect={() => handleFilterSelect('Restaurant')} />
              <NearbyCategory title="Hospitals" icon={User} isSelected={filterCategory === 'Hospital'} onFilterSelect={() => handleFilterSelect('Hospital')} />
              <NearbyCategory title="Markets" icon={Home} isSelected={filterCategory === 'Market'} onFilterSelect={() => handleFilterSelect('Market')} />
              <NearbyCategory title="Services" icon={Bell} isSelected={filterCategory === 'Service'} onFilterSelect={() => handleFilterSelect('Service')} />
            </div>
          </div>

          {/* 4. Main Shop Grid (2-columns) */}
          <div className="px-4 mb-6">
            <h2 className={`text-lg font-bold mb-3 ${Colors.text}`}>
              {getPageTitle()} ({filteredShops.length})
            </h2>
            {loading ? (
              <p className="text-gray-500">Fetching shop data...</p>
            ) : filteredShops.length > 0 ? (
              <div className="grid grid-cols-2 gap-4">
                {filteredShops.map((shop) => (
                  <ShopCard key={shop.id} shop={shop} onClick={() => handleOpenModal(shop)} />
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">
                {isSearchActive ? 'No sites found. Try a different search.' : (filterCategory ? 'No sites in this category.' : 'No shops available.')}
              </p>
            )}
          </div>
          
          {/* 5. Featured Products Section (Hides on search/filter) */}
          <div 
            className={`px-4 mb-6 transition-all duration-300 ease-in-out ${showDefaultView ? 'opacity-100' : 'opacity-0 h-0 invisible'}`}
          >
             <h2 className={`text-lg font-bold mb-3 ${Colors.text}`}>Promotions & Products</h2>
             <div className="flex space-x-4 overflow-x-auto pb-2">
              {mockFeaturedProducts.map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
             </div>
          </div>

        </main> {/* End Scrollable Content */}

        {/* --- 6. Sticky Bottom Navigation Bar --- */}
        <footer className="absolute bottom-0 left-0 right-0 w-full max-w-md mx-auto bg-white border-t border-gray-200 shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.05)] z-10">
          <div className="flex justify-around py-3">
            <NavItem icon={Home} label="Home" active />
            <NavItem icon={Map} label="Map" />
            <NavItem icon={ShoppingCart} label="Delivery" />
            <NavItem icon={User} label="Profile" />
          </div>
        </footer>

        {/* --- 7. Shop Detail Modal (Conditional) --- */}
        {selectedShop && (
          <ShopDetailModal 
            shop={selectedShop} 
            onClose={handleCloseModal} 
            db={db}
            appId={appId}
          />
        )}

      </div> {/* End Mobile Frame */}
    </div>
  );
};

export default App;