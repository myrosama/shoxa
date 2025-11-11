import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, Compass, ShoppingCart, Bell, User, Home, Map } from 'lucide-react';

// Firebase Imports (using standard module imports for React)
import { initializeApp } from 'firebase/app';
import { 
  getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged 
} from 'firebase/auth';
import { 
  getFirestore, collection, query, onSnapshot, doc, setDoc, getDoc 
} from 'firebase/firestore';

// --- Global Variables (Provided by Canvas Environment) ---
// We must always declare these to use the provided Firebase setup
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-shoxa-app';
const firebaseConfig = typeof __firebase_config !== 'undefined' ? 
  JSON.parse(__firebase_config) : {};
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? 
  __initial_auth_token : null;
// --------------------------------------------------------

// Autumn Vibe Color Palette
const Colors = {
  primary: 'bg-[#C67C43]',  // Rich Autumn Orange/Brown
  secondary: 'bg-[#A0522D]', // Sienna Brown
  background: 'bg-[#FDF6E3]', // Creamy Off-White (Paper)
  text: 'text-gray-800',
  accent: 'text-[#4B5320]', // Olive Green (Branch Green)
};

// Mock Data for the Autumn Vibe
const mockShops = [
  { id: 1, name: 'Tandir Uz', category: 'Bakery', status: 'Open', image: 'https://placehold.co/120x80/964B00/ffffff?text=Bread' },
  { id: 2, name: 'Osh Center', category: 'Restaurant', status: '20 min', image: 'https://placehold.co/120x80/A0522D/ffffff?text=Plov' },
  { id: 3, name: 'Kitob Dunyosi', category: 'Bookshop', status: 'Closed', image: 'https://placehold.co/120x80/6B8E23/ffffff?text=Books' },
  { id: 4, name: 'Sog`liq Clinic', category: 'Hospital', status: 'Open 24/7', image: 'https://placehold.co/120x80/8B4513/ffffff?text=Health' },
];

const ShopCard = ({ shop }) => (
  <div className="flex-shrink-0 w-44 rounded-xl shadow-lg overflow-hidden bg-white border border-gray-100">
    <img 
      src={shop.image} 
      alt={shop.name} 
      className="w-full h-24 object-cover"
      onError={(e) => { e.target.onerror = null; e.target.src = "https://placehold.co/120x80/D2B48C/000?text=Shop" }}
    />
    <div className="p-3">
      <h3 className={`font-semibold text-base ${Colors.text}`}>{shop.name}</h3>
      <p className="text-xs text-gray-500">{shop.category}</p>
      <div className={`mt-1 text-sm font-medium ${shop.status.includes('Open') ? Colors.accent : 'text-red-500'}`}>
        {shop.status}
      </div>
    </div>
  </div>
);

const NearbyCategory = ({ title, icon: Icon }) => (
  <div className="flex flex-col items-center flex-shrink-0 w-16">
    <div className={`${Colors.primary} p-3 rounded-full shadow-md`}>
      <Icon className="w-6 h-6 text-white" />
    </div>
    <p className="mt-2 text-xs font-medium text-center text-gray-700">{title}</p>
  </div>
);

// Main Application Component
const App = () => {
  const [db, setDb] = useState(null);
  const [auth, setAuth] = useState(null);
  const [userId, setUserId] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [shops, setShops] = useState(mockShops);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // 1. Initialize Firebase and Authenticate
  useEffect(() => {
    try {
      if (Object.keys(firebaseConfig).length === 0) {
        console.error("Firebase config is missing.");
        return;
      }
      
      const app = initializeApp(firebaseConfig);
      const firestore = getFirestore(app);
      const firebaseAuth = getAuth(app);
      
      setDb(firestore);
      setAuth(firebaseAuth);

      // Listener for Auth state changes
      const unsubscribe = onAuthStateChanged(firebaseAuth, (user) => {
        if (user) {
          setUserId(user.uid);
          console.log(`User signed in: ${user.uid}`);
        } else {
          // If the custom token sign-in fails or is not available, sign in anonymously
          signInAnonymously(firebaseAuth).then((anonUser) => {
            setUserId(anonUser.user.uid);
            console.log(`Signed in anonymously: ${anonUser.user.uid}`);
          }).catch(err => {
            console.error("Anonymous sign-in failed:", err);
            setError("Authentication failed.");
          });
        }
        setIsAuthReady(true);
        setLoading(false);
      });

      // Attempt to sign in with the custom token immediately
      if (initialAuthToken) {
        signInWithCustomToken(firebaseAuth, initialAuthToken).catch(err => {
          console.error("Custom token sign-in failed, proceeding with anonymous sign-in.", err);
          // onAuthStateChanged will handle the fallback to anonymous sign-in
        });
      }

      return () => unsubscribe();
    } catch (e) {
      console.error("Firebase Initialization Error:", e);
      setError("Failed to initialize the app.");
      setLoading(false);
    }
  }, []);

  // 2. Fetch Real-time Data (MANDATORY onSnapshot setup)
  useEffect(() => {
    // Wait until auth is ready and we have a userId and db instance
    if (!isAuthReady || !userId || !db) return;

    // We will use a PUBLIC collection for store data
    // Path: /artifacts/{appId}/public/data/shops
    const shopsCollectionRef = collection(db, 'artifacts', appId, 'public', 'data', 'shops');
    
    // Set up a real-time listener for shops
    const unsubscribe = onSnapshot(shopsCollectionRef, (snapshot) => {
      const shopList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setShops(shopList);
      console.log('Fetched real-time shop data.');
      // Update loading state if this is the first successful fetch
      if (loading) setLoading(false); 
    }, (error) => {
      console.error("Firestore onSnapshot error:", error);
      setError("Failed to load shop data.");
    });

    return () => unsubscribe(); // Clean up the listener on unmount
  }, [isAuthReady, userId, db]); // Rerun when auth status/db instance changes

  // Filtered Shops based on Search Term
  const filteredShops = useMemo(() => {
    if (!searchTerm) return shops;
    const lowerCaseSearch = searchTerm.toLowerCase();
    return shops.filter(shop => 
      shop.name.toLowerCase().includes(lowerCaseSearch) ||
      shop.category.toLowerCase().includes(lowerCaseSearch) ||
      (shop.inventory && shop.inventory.some(item => item.toLowerCase().includes(lowerCaseSearch)))
    );
  }, [shops, searchTerm]);


  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-red-100 p-4">
        <p className="text-red-700 font-medium">Error: {error}</p>
      </div>
    );
  }

  return (
    <div className={`${Colors.background} min-h-screen font-sans flex flex-col items-center`}>
      {/* Mobile Frame Container */}
      <div className="w-full max-w-md h-full min-h-screen shadow-2xl bg-white flex flex-col overflow-y-auto">
        
        {/* Header/Status Bar Simulation */}
        <div className="h-10 flex justify-between items-center px-4 pt-2">
            <span className="font-bold text-lg">SHOXA</span>
            <div className="flex space-x-1">
                <Bell className="w-5 h-5 text-gray-500" />
                <span className="text-xs text-gray-500">
                  {loading ? 'Loading...' : (userId ? `User: ${userId.substring(0, 4)}...` : 'Anon')}
                </span>
            </div>
        </div>

        {/* 1. Dynamic Search Bar (Top) */}
        <div className="p-4 pt-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search Shops, Hospitals, or Products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full py-3 pl-10 pr-4 rounded-full border-2 border-gray-200 focus:outline-none focus:border-[#C67C43] transition duration-200 ${Colors.background} ${Colors.text}`}
            />
          </div>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-grow overflow-y-auto pb-20">

          {/* 2. Map Banner (Simulated Autumn Foliage) */}
          <div className={`mx-4 mb-6 h-48 rounded-xl overflow-hidden shadow-lg ${Colors.secondary} flex items-center justify-center relative`}>
            {/* Using a placeholder image for a map banner with an autumn aesthetic */}
            <img 
              src="https://placehold.co/400x192/964B00/D2B48C?text=Nearby+Locations+Map" 
              alt="Map Banner" 
              className="w-full h-full object-cover opacity-60"
            />
            <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-white">
              <h2 className="text-2xl font-black mb-1">Find Your Branch Now!</h2>
              <p className="text-sm font-light mb-4 text-center">See all {shops.length} sites near your location.</p>
              <button 
                className={`${Colors.primary} text-white px-5 py-2 rounded-full font-semibold shadow-md hover:opacity-90 transition`}
                onClick={() => alert("Simulating Map View transition...")}
              >
                Open Full Map
              </button>
            </div>
          </div>

          {/* 3. Nearby Categories (Circular Icons) */}
          <div className="px-4 mb-6">
            <h2 className={`text-lg font-bold mb-3 ${Colors.text}`}>Quick Access Categories</h2>
            <div className="flex space-x-4 overflow-x-auto pb-2">
              <NearbyCategory title="Shops" icon={ShoppingCart} />
              <NearbyCategory title="Restaurants" icon={Compass} />
              <NearbyCategory title="Hospitals" icon={User} />
              <NearbyCategory title="Markets" icon={Home} />
              <NearbyCategory title="Services" icon={Bell} />
            </div>
          </div>

          {/* 4. Recommended/Featured Shops */}
          <div className="px-4 mb-6">
            <h2 className={`text-lg font-bold mb-3 ${Colors.text}`}>{searchTerm ? `Search Results (${filteredShops.length})` : 'Recommended Shops Near You'}</h2>
            <div className="flex space-x-4 overflow-x-auto pb-2">
              {loading ? (
                <p className="text-gray-500">Fetching shop data...</p>
              ) : filteredShops.length > 0 ? (
                filteredShops.map((shop) => <ShopCard key={shop.id} shop={shop} />)
              ) : (
                <p className="text-gray-500">No sites found matching your criteria. Try "Tandir" or "Clinic".</p>
              )}
            </div>
          </div>

          {/* Other content block simulation */}
          <div className="p-4">
            <h2 className={`text-lg font-bold mb-3 ${Colors.text}`}>Recently Viewed</h2>
            <div className="h-20 w-full bg-gray-100 rounded-lg flex items-center justify-center text-gray-500">
              Your recent branches will appear here.
            </div>
            <div className={`mt-4 text-sm font-medium text-right ${Colors.primary} px-2 py-1 inline-block rounded-full text-white`}>
               {/* Displaying the full userId is MANDATORY for multi-user apps */}
               UID: {userId}
            </div>
          </div>


        </div> {/* End Scrollable Content */}
        

        {/* 5. Bottom Navigation Bar */}
        <div className="absolute bottom-0 w-full max-w-md bg-white border-t border-gray-200 shadow-2xl">
          <div className="flex justify-around py-3">
            <NavItem icon={Home} label="Home" active />
            <NavItem icon={Map} label="Map" />
            <NavItem icon={ShoppingCart} label="Delivery" />
            <NavItem icon={User} label="Profile" />
          </div>
        </div>

      </div> {/* End Mobile Frame */}
    </div>
  );
};

const NavItem = ({ icon: Icon, label, active }) => (
  <button className="flex flex-col items-center text-xs group focus:outline-none">
    <Icon className={`w-6 h-6 transition duration-150 ${active ? 'text-[#C67C43]' : 'text-gray-500 group-hover:text-[#C67C43]'}`} />
    <span className={`mt-1 font-medium ${active ? 'text-[#C67C43]' : 'text-gray-500'}`}>{label}</span>
  </button>
);

export default App;