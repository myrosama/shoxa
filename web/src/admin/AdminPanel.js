import React, { useState, useEffect, useCallback } from 'react';
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  onAuthStateChanged,
  signOut
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc,
  collection,
  addDoc,
  query,
  where,
  onSnapshot,
  deleteDoc
} from 'firebase/firestore';
import { 
  getStorage, 
  ref, 
  uploadBytesResumable, 
  getDownloadURL 
} from 'firebase/storage';
import { initializeApp } from 'firebase/app';
import { 
  User, Lock, Building, Upload, Plus, Trash2, LogOut, Loader2, Image as ImageIcon, MapPin, Tag, ClockIcon 
} from 'lucide-react';

// --- Local & Global Configuration ---
// Manually set for local admin panel development
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
// --------------------------------------------------------

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Autumn Vibe Color Palette
const Colors = {
  primary: '#C67C43',
  background: '#FDF6E3',
  text: '#333333',
};

// --- Reusable Input Component ---
const InputField = ({ icon: Icon, type, placeholder, value, onChange }) => (
  <div className="relative mb-4">
    <Icon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      className="w-full py-3 pl-10 pr-4 rounded-lg border-2 border-gray-200 focus:outline-none focus:border-[#C67C43] transition duration-200 bg-white text-gray-800"
    />
  </div>
);

// --- Authentication Page ---
const AuthPage = ({ setNotification }) => {
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
        setNotification({ type: 'success', message: 'Logged in successfully!' });
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
        setNotification({ type: 'success', message: 'Account created! Please log in.' });
        setIsLogin(true); // Switch to login view after registration
      }
    } catch (error) {
      setNotification({ type: 'error', message: error.message });
      console.error("Auth error:", error);
    }
    setLoading(false);
  };

  return (
    <div className="w-full max-w-md p-8 bg-white rounded-2xl shadow-xl">
      <h2 className="text-3xl font-bold text-center mb-2" style={{ color: Colors.primary }}>
        SHOXA Admin
      </h2>
      <p className="text-center text-gray-500 mb-6">
        {isLogin ? 'Welcome back, Shop Owner!' : 'Create your Admin Account'}
      </p>
      <form onSubmit={handleSubmit}>
        <InputField icon={User} type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <InputField icon={Lock} type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-lg text-white font-semibold transition-all duration-300 ease-in-out flex items-center justify-center"
          style={{ backgroundColor: Colors.primary, opacity: loading ? 0.7 : 1 }}
        >
          {loading ? <Loader2 className="animate-spin" /> : (isLogin ? 'Log In' : 'Register')}
        </button>
      </form>
      <button
        onClick={() => setIsLogin(!isLogin)}
        className="w-full mt-4 text-sm text-center text-[#C67C43] hover:underline"
      >
        {isLogin ? "Don't have an account? Register" : "Already have an account? Log In"}
      </button>
    </div>
  );
};

// --- Product Management Component ---
const ProductManager = ({ shopId, setNotification }) => {
  const [products, setProducts] = useState([]);
  const [productName, setProductName] = useState('');
  const [productPrice, setProductPrice] = useState('');
  const [loading, setLoading] = useState(true);

  // Get products for this shop
  useEffect(() => {
    const productsRef = collection(db, 'artifacts', appId, 'public', 'data', 'shops', shopId, 'inventory');
    const q = query(productsRef);
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const productList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProducts(productList);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching products:", error);
      setNotification({ type: 'error', message: 'Failed to fetch products.' });
      setLoading(false);
    });

    return () => unsubscribe();
  }, [shopId, setNotification]);

  const handleAddProduct = async (e) => {
    e.preventDefault();
    if (!productName || !productPrice) {
      setNotification({ type: 'error', message: 'Please enter product name and price.' });
      return;
    }
    
    try {
      const productsRef = collection(db, 'artifacts', appId, 'public', 'data', 'shops', shopId, 'inventory');
      await addDoc(productsRef, {
        name: productName,
        price: Number(productPrice),
      });
      setNotification({ type: 'success', message: 'Product added!' });
      setProductName('');
      setProductPrice('');
    } catch (error) {
      console.error("Error adding product:", error);
      setNotification({ type: 'error', message: 'Failed to add product.' });
    }
  };

  const handleDeleteProduct = async (productId) => {
    // We are not using window.confirm
    const confirmDelete = true; // Simulating confirm
    if (!confirmDelete) return;
    
    try {
      const productRef = doc(db, 'artifacts', appId, 'public', 'data', 'shops', shopId, 'inventory', productId);
      await deleteDoc(productRef);
      setNotification({ type: 'success', message: 'Product deleted.' });
    } catch (error) {
      console.error("Error deleting product:", error);
      setNotification({ type: 'error', message: 'Failed to delete product.' });
    }
  };

  return (
    <div className="mt-8">
      <h3 className="text-xl font-semibold mb-4 text-gray-800">Manage Your Products</h3>
      <form onSubmit={handleAddProduct} className="flex flex-col sm:flex-row gap-4 mb-4">
        <input
          type="text"
          placeholder="Product Name (e.g., Non)"
          value={productName}
          onChange={(e) => setProductName(e.target.value)}
          className="flex-grow py-2 px-4 rounded-lg border-2 border-gray-200 focus:outline-none focus:border-[#C67C43]"
        />
        <input
          type="number"
          placeholder="Price (e.g., 5000)"
          value={productPrice}
          onChange={(e) => setProductPrice(e.target.value)}
          className="w-full sm:w-32 py-2 px-4 rounded-lg border-2 border-gray-200 focus:outline-none focus:border-[#C67C43]"
        />
        <button
          type="submit"
          className="py-2 px-6 rounded-lg text-white font-semibold transition-all duration-300 ease-in-out flex items-center justify-center"
          style={{ backgroundColor: Colors.primary }}
        >
          <Plus className="w-4 h-4 mr-1" /> Add
        </button>
      </form>
      
      {loading ? (
        <Loader2 className="animate-spin" />
      ) : (
        <div className="space-y-2">
          {products.length > 0 ? (
            products.map(product => (
              <div key={product.id} className="flex justify-between items-center bg-white p-3 rounded-lg border border-gray-100 shadow-sm">
                <div>
                  <p className="font-medium text-gray-800">{product.name}</p>
                  <p className="text-sm text-gray-500">{product.price} UZS</p>
                </div>
                <button
                  onClick={() => handleDeleteProduct(product.id)}
                  className="p-2 text-red-500 hover:bg-red-100 rounded-full"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            ))
          ) : (
            <p className="text-gray-500 text-center py-4">You have not added any products yet.</p>
          )}
        </div>
      )}
    </div>
  );
};

// --- Main Dashboard Page ---
const AdminDashboard = ({ user, setNotification }) => {
  const [shop, setShop] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isCreatingShop, setIsCreatingShop] = useState(false);
  const [shopId, setShopId] = useState(null);

  // Shop form state
  const [nameUz, setNameUz] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [address, setAddress] = useState('');
  const [type, setType] = useState('Shop'); // Default type
  const [hours, setHours] = useState('09:00-18:00');
  
  // Image Upload State
  const [imageFile, setImageFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [imageUrl, setImageUrl] = useState(''); // From Firestore

  // Fetch shop data for this user
  const fetchShopData = useCallback(async () => {
    setLoading(true);
    setNotification('');
    try {
      // Find shop doc where owner_uid matches
      const shopsRef = collection(db, 'artifacts', appId, 'public', 'data', 'shops');
      const q = query(shopsRef, where("owner_uid", "==", user.uid));
      
      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        if (querySnapshot.empty) {
          setShop(null);
          setIsCreatingShop(true);
        } else {
          const shopDoc = querySnapshot.docs[0];
          const shopData = shopDoc.data();
          setShop(shopData);
          setShopId(shopDoc.id);
          
          // Pre-fill form
          setNameUz(shopData.name_uz || '');
          setNameEn(shopData.name_en || '');
          setAddress(shopData.address || '');
          setType(shopData.type || 'Shop');
          setHours(shopData.hours?.Mon || '09:00-18:00');
          setImageUrl(shopData.imageUrl || '');

          setIsCreatingShop(false);
        }
        setLoading(false);
      }, (error) => {
        console.error("Error fetching shop data:", error);
        setNotification({ type: 'error', message: 'Failed to fetch shop data.' });
        setLoading(false);
      });

      return unsubscribe; // Return unsubscribe function for cleanup

    } catch (error) {
      console.error("Error querying shop:", error);
      setNotification({ type: 'error', message: error.message });
      setLoading(false);
    }
  }, [user.uid, setNotification]);

  useEffect(() => {
    const unsubscribe = fetchShopData();
    // This is how you return a cleanup function from a useEffect that returns a promise
    return () => {
      unsubscribe.then(u => u && u());
    };
  }, [fetchShopData]);

  const handleImageChange = (e) => {
    if (e.target.files[0]) {
      setImageFile(e.target.files[0]);
    }
  };

  const handleImageUpload = (docId) => {
    if (!imageFile) return;

    setIsUploading(true);
    // Create a unique path for the image
    const filePath = `shop_images/${docId}/${imageFile.name}`;
    const storageRef = ref(storage, filePath);
    const uploadTask = uploadBytesResumable(storageRef, imageFile);

    uploadTask.on('state_changed', 
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setUploadProgress(progress);
      }, 
      (error) => {
        console.error("Upload failed:", error);
        setNotification({ type: 'error', message: `Image upload failed: ${error.message}` });
        setIsUploading(false);
      }, 
      async () => {
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
        
        // Now update the Firestore document with this new URL
        const shopRef = doc(db, 'artifacts', appId, 'public', 'data', 'shops', docId);
        await setDoc(shopRef, { imageUrl: downloadURL }, { merge: true });
        
        setImageUrl(downloadURL); // Update local state
        setIsUploading(false);
        setImageFile(null);
        setUploadProgress(0);
        setNotification({ type: 'success', message: 'Image uploaded successfully!' });
      }
    );
  };

  const handleSaveShop = async (e) => {
    e.preventDefault();
    if (!nameUz) {
      setNotification({ type: 'error', message: 'Uzbek Name is required.' });
      return;
    }

    const shopData = {
      name_uz: nameUz,
      name_en: nameEn,
      address: address,
      type: type,
      hours: { Mon: hours, Tue: hours, Wed: hours, Thu: hours, Fri: hours, Sat: hours, Sun: hours }, // Simplified hours
      owner_uid: user.uid,
      // imageUrl is only added if it already exists or after upload
    };

    try {
      let docRefId;
      if (isCreatingShop) {
        // Create a new shop document
        const newDoc = await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'shops'), shopData);
        docRefId = newDoc.id;
        setShopId(docRefId); // Save the new ID
        setNotification({ type: 'success', message: 'Shop created successfully!' });
      } else {
        // Update existing shop document
        docRefId = shopId;
        const shopRef = doc(db, 'artifacts', appId, 'public', 'data', 'shops', docRefId);
        await setDoc(shopRef, shopData, { merge: true }); // merge: true prevents overwriting imageUrl
        setNotification({ type: 'success', message: 'Shop updated successfully!' });
      }

      // After saving text, check if there's an image to upload
      if (imageFile) {
        handleImageUpload(docRefId);
      }
      
      setIsCreatingShop(false);
    } catch (error) {
      console.error("Error saving shop:", error);
      setNotification({ type: 'error', message: `Failed to save shop: ${error.message}` });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="w-12 h-12 animate-spin" style={{ color: Colors.primary }} />
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl p-8 bg-white rounded-2xl shadow-xl">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-gray-800">
          {isCreatingShop ? 'Create Your Shop' : 'Manage Your Shop'}
        </h2>
        <button
          onClick={() => signOut(auth)}
          className="flex items-center text-sm font-medium text-red-500 hover:underline"
        >
          <LogOut className="w-4 h-4 mr-1" />
          Log Out
        </button>
      </div>
      
      <form onSubmit={handleSaveShop} className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Column: Shop Details */}
        <div className="space-y-4">
          <div>
            <label className="font-medium text-gray-700">Uzbek Name (Required)</label>
            <InputField icon={Building} type="text" placeholder="e.g., Tandir Somsa Markazi" value={nameUz} onChange={(e) => setNameUz(e.target.value)} />
          </div>
          <div>
            <label className="font-medium text-gray-700">English Name</label>
            <InputField icon={Building} type="text" placeholder="e.g., Tandir Bakery Center" value={nameEn} onChange={(e) => setNameEn(e.target.value)} />
          </div>
          <div>
            <label className="font-medium text-gray-700">Address</label>
            <InputField icon={MapPin} type="text" placeholder="e.g., Amir Temur St, 15, Tashkent" value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="font-medium text-gray-700">Type</label>
              <select value={type} onChange={(e) => setType(e.target.value)} className="w-full mt-1 py-3 px-4 rounded-lg border-2 border-gray-200 focus:outline-none focus:border-[#C67C43] bg-white">
                <option>Shop</option>
                <option>Restaurant</option>
                <option>Hospital</option>
                <option>Market</option>
                <option>Service</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="font-medium text-gray-700">Hours (Mon-Sun)</label>
              <InputField icon={ClockIcon} type="text" placeholder="e.g., 09:00-18:00" value={hours} onChange={(e) => setHours(e.target.value)} />
            </div>
          </div>
        </div>

        {/* Right Column: Image Upload */}
        <div className="space-y-4">
          <div>
            <label className="font-medium text-gray-700">Shop Photo</label>
            <div className="mt-1 flex items-center">
              <div className="w-48 h-32 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center mr-4 overflow-hidden">
                {imageUrl && !imageFile && <img src={imageUrl} alt="Shop" className="w-full h-full object-cover" />}
                {imageFile && <img src={URL.createObjectURL(imageFile)} alt="Preview" className="w-full h-full object-cover" />}
                {!imageUrl && !imageFile && <ImageIcon className="w-12 h-12 text-gray-400" />}
              </div>
              <input
                type="file"
                id="file-upload"
                className="hidden"
                accept="image/png, image/jpeg"
                onChange={handleImageChange}
              />
              <label
                htmlFor="file-upload"
                className="cursor-pointer py-2 px-4 rounded-lg text-sm font-semibold text-white transition-all"
                style={{ backgroundColor: Colors.primary }}
              >
                <Upload className="w-4 h-4 inline-block mr-1" />
                {imageFile ? 'Change Photo' : 'Upload Photo'}
              </label>
            </div>
          </div>
          {isUploading && (
            <div>
              <p className="text-sm font-medium">Uploading...</p>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div 
                  className="h-2.5 rounded-full" 
                  style={{ width: `${uploadProgress}%`, backgroundColor: Colors.primary }}
                ></div>
              </div>
            </div>
          )}
        </div>

        {/* Save Button */}
        <div className="md:col-span-2">
          <button
            type="submit"
            disabled={isUploading}
            className="w-full py-3 rounded-lg text-white font-semibold transition-all duration-300 ease-in-out flex items-center justify-center"
            style={{ backgroundColor: Colors.primary, opacity: isUploading ? 0.7 : 1 }}
          >
            {isUploading ? 'Uploading Image...' : (isCreatingShop ? 'Create Shop' : 'Save Changes')}
          </button>
        </div>
      </form>

      {/* Product Manager (only shows if the shop exists) */}
      {!isCreatingShop && shopId && (
        <ProductManager shopId={shopId} setNotification={setNotification} />
      )}
    </div>
  );
};

// --- Notification Component ---
const Notification = ({ info }) => {
  if (!info.message) return null;
  const isError = info.type === 'error';
  return (
    <div className={`fixed top-5 right-5 p-4 rounded-lg shadow-lg text-white ${isError ? 'bg-red-500' : 'bg-green-500'}`}>
      {info.message}
    </div>
  );
};

// --- Main Admin App ---
const AdminPanel = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState({ type: '', message: '' });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (notification.message) {
      const timer = setTimeout(() => {
        setNotification({ type: '', message: '' });
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen" style={{ backgroundColor: Colors.background }}>
        <Loader2 className="w-12 h-12 animate-spin" style={{ color: Colors.primary }} />
      </div>
    );
  }

  return (
    <div className="flex justify-center items-center min-h-screen p-4" style={{ backgroundColor: Colors.background }}>
      <Notification info={notification} />
      {user ? (
        <AdminDashboard user={user} setNotification={setNotification} />
      ) : (
        <AuthPage setNotification={setNotification} />
      )}
    </div>
  );
};

export default AdminPanel;