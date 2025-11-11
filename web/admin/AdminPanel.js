import React, { useState, useEffect } from 'react';
import { LogIn, UserPlus, Save, Store, XCircle } from 'lucide-react';

// Firebase Imports
import { initializeApp } from 'firebase/app';
import { 
  getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, 
  onAuthStateChanged, signOut 
} from 'firebase/auth';
import { 
  getFirestore, doc, setDoc, collection, query, where, getDocs 
} from 'firebase/firestore';

// --- Global Variables (Provided by Canvas Environment) ---
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-shoxa-app';
const firebaseConfig = typeof __firebase_config !== 'undefined' ? 
  JSON.parse(__firebase_config) : {};
// Note: We don't use the initialAuthToken here as this is for shop-owner sign-in
// --------------------------------------------------------

// Autumn Vibe Color Palette
const Colors = {
  primary: 'bg-[#C67C43]', 
  background: 'bg-[#FDF6E3]',
  buttonText: 'text-white',
  inputBorder: 'border-gray-300 focus:border-[#C67C43]',
};

// --- AUTHENTICATION COMPONENT ---
const AuthForm = ({ auth, onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    try {
      if (isRegistering) {
        await createUserWithEmailAndPassword(auth, email, password);
        setMessage('Registration successful! Please log in.');
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        onLoginSuccess();
      }
    } catch (error) {
      console.error("Auth error:", error);
      setMessage(`Error: ${error.message.substring(0, 50)}...`);
    }
  };

  return (
    <div className="p-8 bg-white rounded-xl shadow-2xl w-full max-w-sm">
      <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">
        {isRegistering ? 'Register Shop Owner' : 'Shop Owner Login'}
      </h2>
      {message && (
        <p className="mb-4 p-2 text-sm rounded text-red-700 bg-red-100">{message}</p>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="email"
          placeholder="Email (e.g., shopname@shoxa.uz)"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={`w-full p-3 rounded-lg border-2 ${Colors.inputBorder}`}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={`w-full p-3 rounded-lg border-2 ${Colors.inputBorder}`}
          required
        />
        <button
          type="submit"
          className={`w-full py-3 rounded-full ${Colors.primary} font-semibold ${Colors.buttonText} shadow-md transition duration-200 hover:opacity-90 flex items-center justify-center space-x-2`}
        >
          {isRegistering ? <UserPlus className="w-5 h-5" /> : <LogIn className="w-5 h-5" />}
          <span>{isRegistering ? 'Register' : 'Login'}</span>
        </button>
      </form>
      <button 
        onClick={() => { setIsRegistering(!isRegistering); setMessage(''); }}
        className="mt-4 text-center w-full text-sm text-gray-600 hover:text-[#C67C43] transition"
      >
        {isRegistering ? 'Already have an account? Login' : 'Need to register your shop?'}
      </button>
    </div>
  );
};

// --- SHOP MANAGEMENT FORM ---
const ShopManagement = ({ db, auth, shopData, setShopData, message, setMessage }) => {
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setShopData(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveShop = async () => {
    if (!shopData.name_uz || !shopData.type) {
        setMessage('Shop name and type are required.');
        return;
    }
    setLoading(true);
    setMessage('');
    try {
        const ownerUid = auth.currentUser.uid;
        
        // Use the shop ID if it exists, otherwise generate a new one
        const shopId = shopData.id || doc(collection(db, 'artifacts', appId, 'public', 'data', 'shops')).id;

        const shopRef = doc(db, 'artifacts', appId, 'public', 'data', 'shops', shopId);

        // Prepare data for saving
        const dataToSave = {
            ...shopData,
            owner_uid: ownerUid,
            id: shopId, // Ensure the ID is saved within the document
            // Example of converting string location to GeoPoint (if you collect it this way)
            // location: new firebase.firestore.GeoPoint(parseFloat(lat), parseFloat(lng)) 
        };
        delete dataToSave.id; // Firestore automatically uses the document ID

        await setDoc(shopRef, dataToSave, { merge: true });

        setMessage(`Shop "${shopData.name_uz}" saved successfully!`);
        setShopData(prev => ({...prev, id: shopId})); // Update state with the ID
    } catch (error) {
        console.error("Error saving shop:", error);
        setMessage(`Failed to save shop: ${error.message.substring(0, 50)}...`);
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-xl shadow-2xl w-full max-w-lg space-y-4">
      <h2 className="text-2xl font-bold text-gray-800 flex items-center space-x-2">
        <Store className="w-6 h-6 text-[#C67C43]" />
        <span>Manage Your Branch</span>
      </h2>
      {message && (
        <p className={`mb-4 p-2 text-sm rounded ${message.includes('saved') ? 'text-green-700 bg-green-100' : 'text-red-700 bg-red-100'}`}>
          {message}
        </p>
      )}

      {/* Basic Shop Information Form */}
      <div className="space-y-3">
        <input
          name="name_uz"
          placeholder="Shop Name (Uzbek)"
          value={shopData.name_uz || ''}
          onChange={handleChange}
          className={`w-full p-3 rounded-lg border-2 ${Colors.inputBorder}`}
          required
        />
        <input
          name="name_en"
          placeholder="Shop Name (English)"
          value={shopData.name_en || ''}
          onChange={handleChange}
          className={`w-full p-3 rounded-lg border-2 ${Colors.inputBorder}`}
        />
        <select
          name="type"
          value={shopData.type || ''}
          onChange={handleChange}
          className={`w-full p-3 rounded-lg border-2 ${Colors.inputBorder}`}
          required
        >
          <option value="">Select Shop Type...</option>
          <option value="Restaurant">Restaurant</option>
          <option value="Hospital">Hospital/Clinic</option>
          <option value="Shop">Retail Shop/Market</option>
          <option value="Service">Service</option>
        </select>
        <input
          name="address"
          placeholder="Physical Address"
          value={shopData.address || ''}
          onChange={handleChange}
          className={`w-full p-3 rounded-lg border-2 ${Colors.inputBorder}`}
        />
      </div>

      <button
        onClick={handleSaveShop}
        disabled={loading}
        className={`w-full py-3 rounded-full ${Colors.primary} font-semibold ${Colors.buttonText} shadow-md transition duration-200 hover:opacity-90 flex items-center justify-center space-x-2 disabled:opacity-50`}
      >
        {loading ? (
          <span>Saving...</span>
        ) : (
          <>
            <Save className="w-5 h-5" />
            <span>Save Shop Details</span>
          </>
        )}
      </button>

      <p className="text-sm text-gray-500 mt-4">
        Your shop ID: <span className="font-mono text-xs text-gray-600">{shopData.id || 'Not Yet Saved'}</span>
      </p>
    </div>
  );
};

// --- MAIN ADMIN APPLICATION ---
const AdminApp = () => {
  const [db, setDb] = useState(null);
  const [auth, setAuth] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [shopData, setShopData] = useState({});
  const [message, setMessage] = useState('');
  
  // 1. Initialize Firebase
  useEffect(() => {
    try {
      if (Object.keys(firebaseConfig).length === 0) return;
      
      const app = initializeApp(firebaseConfig);
      setDb(getFirestore(app));
      const firebaseAuth = getAuth(app);
      setAuth(firebaseAuth);

      const unsubscribe = onAuthStateChanged(firebaseAuth, async (currentUser) => {
        setUser(currentUser);
        setLoading(false);
        if (currentUser) {
            // 2. Fetch the user's existing shop data upon successful login
            await fetchOwnerShop(getFirestore(app), currentUser.uid);
        } else {
            setShopData({}); // Clear shop data if logged out
        }
      });
      return () => unsubscribe();
    } catch (e) {
      console.error("Admin Initialization Error:", e);
      setLoading(false);
      setMessage("Initialization failed. Check console for details.");
    }
  }, []);

  // Fetch the shop tied to the current user's UID
  const fetchOwnerShop = async (firestore, ownerUid) => {
    setMessage("Fetching your shop...");
    try {
      // Query the public shops collection for a document where owner_uid matches the logged-in user's UID
      const shopsRef = collection(firestore, 'artifacts', appId, 'public', 'data', 'shops');
      const q = query(shopsRef, where('owner_uid', '==', ownerUid));
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        // Found the shop (should only be one per owner)
        const doc = snapshot.docs[0];
        setShopData({ id: doc.id, ...doc.data() });
        setMessage(`Welcome back, managing shop: ${doc.data().name_uz || doc.data().name_en}`);
      } else {
        setShopData({}); // New owner, no shop yet
        setMessage("Welcome! Please register your shop details below.");
      }
    } catch (error) {
        console.error("Error fetching owner shop:", error);
        setMessage("Error fetching shop data. You may be a new owner.");
    }
  };

  const handleLogout = () => {
    if (auth) {
      signOut(auth);
      setMessage("Logged out successfully.");
    }
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${Colors.background}`}>
        <p className="text-gray-700">Loading Admin Panel...</p>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 ${Colors.background}`}>
      {!user ? (
        <AuthForm auth={auth} onLoginSuccess={() => setMessage('Login successful! Welcome.')} />
      ) : (
        <div className="w-full max-w-lg space-y-6">
          <div className="flex justify-between items-center p-4 bg-white rounded-xl shadow-lg">
            <h1 className="text-xl font-bold text-[#C67C43]">SHOXA Admin</h1>
            <button 
              onClick={handleLogout}
              className="text-sm text-red-600 hover:text-red-800 transition flex items-center space-x-1"
            >
              <XCircle className="w-4 h-4"/>
              <span>Logout ({user.email || 'UID'})</span>
            </button>
          </div>
          
          <ShopManagement 
            db={db} 
            auth={auth} 
            shopData={shopData} 
            setShopData={setShopData}
            message={message}
            setMessage={setMessage}
          />
          <div className="text-xs text-center text-gray-500 p-2">
            Owner UID: {user.uid}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminApp;