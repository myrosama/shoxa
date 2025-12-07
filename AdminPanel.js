import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  deleteDoc,
  writeBatch
} from 'firebase/firestore';
import { 
  getStorage, 
  ref, 
  uploadBytesResumable, 
  getDownloadURL 
} from 'firebase/storage';
import { initializeApp } from 'firebase/app';
import { 
  User, Lock, Building, Upload, Plus, Trash2, LogOut, Loader2, Image as ImageIcon, 
  MapPin, Tag, ClockIcon, Edit, X, Save, Settings, ShoppingBag, List, AlertCircle, Edit3
} from 'lucide-react';
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api';

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
// --------------------------------------------------------

// Initialize Firebase
let app;
try {
  app = initializeApp(firebaseConfig);
} catch (e) {
  console.error("Firebase initialization failed:", e);
  // We'll let the component render an error
}

const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Autumn Vibe Color Palette
const Colors = {
  primary: '#C67C43',
  background: '#FDF6E3',
  text: '#333333',
};

// --- Reusable Components ---

const InputField = React.forwardRef(({ icon: Icon, label, type, placeholder, value, onChange, name, error }, ref) => (
  <div className="mb-4">
    <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
    <div className="relative">
      {Icon && <Icon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />}
      <input
        type={type}
        name={name}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        ref={ref}
        className={`w-full py-3 ${Icon ? 'pl-10' : 'pl-4'} pr-4 rounded-lg border-2 ${error ? 'border-red-500' : 'border-gray-200'} focus:outline-none focus:border-[#C67C43] transition duration-200 bg-white text-gray-800`}
      />
    </div>
    {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
  </div>
));

const TextareaField = ({ label, placeholder, value, onChange, name, rows = 4 }) => (
  <div className="mb-4">
    <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
    <textarea
      name={name}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      rows={rows}
      className="w-full py-3 px-4 rounded-lg border-2 border-gray-200 focus:outline-none focus:border-[#C67C43] transition duration-200 bg-white text-gray-800 resize-none"
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
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
        setNotification('Account created! Please log in.');
        setIsLogin(true);
      }
    } catch (error) {
      setNotification(error.message);
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
        <InputField icon={User} label="Email" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <InputField icon={Lock} label="Password" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
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

// --- Map Location Picker ---
const MapPicker = ({ location, onLocationChange }) => {
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-admin-script',
    googleMapsApiKey: GOOGLE_MAPS_API_KEY || ""
  });

  const [marker, setMarker] = useState(location);
  const mapContainerStyle = { width: '100%', height: '300px' };
  const center = location || { lat: 41.2995, lng: 69.2401 }; // Tashkent

  const onMapClick = useCallback((e) => {
    const newLocation = { lat: e.latLng.lat(), lng: e.latLng.lng() };
    setMarker(newLocation);
    onLocationChange(newLocation);
  }, [onLocationChange]);

  if (loadError) return <div>Error loading maps. Check API Key.</div>;
  if (!isLoaded) return <div>Loading Map...</div>;

  return (
    <GoogleMap
      mapContainerStyle={mapContainerStyle}
      center={center}
      zoom={13}
      onClick={onMapClick}
    >
      {marker && <Marker position={marker} />}
    </GoogleMap>
  );
};

// --- Image Uploader ---
const ImageUploader = ({ onUploadSuccess, path, userId }) => {
  const [imageFile, setImageFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [preview, setPreview] = useState(null);

  const handleImageChange = (e) => {
    if (e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleUpload = () => {
    if (!imageFile) return;
    setIsUploading(true);
    // Use the full path prop, which now includes the user ID
    const storageRef = ref(storage, path);
    const uploadTask = uploadBytesResumable(storageRef, imageFile);

    uploadTask.on('state_changed', 
      (snapshot) => setUploadProgress((snapshot.bytesTransferred / snapshot.totalBytes) * 100),
      (error) => {
        setIsUploading(false);
        console.error("Upload failed:", error);
      },
      async () => {
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
        onUploadSuccess(downloadURL); // Send the URL back
        setIsUploading(false);
        setImageFile(null);
        setPreview(null);
        setUploadProgress(0);
      }
    );
  };

  return (
    <div>
      <input type="file" accept="image/*" onChange={handleImageChange} className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[#C67C43] file:text-white hover:file:opacity-90" />
      {preview && <img src={preview} alt="Preview" className="w-32 h-32 object-cover rounded-lg my-2" />}
      {isUploading && (
        <div className="w-full bg-gray-200 rounded-full h-2.5 my-2">
          <div className="h-2.5 rounded-full" style={{ width: `${uploadProgress}%`, backgroundColor: Colors.primary }}></div>
        </div>
      )}
      <button
        type="button"
        onClick={handleUpload}
        disabled={isUploading || !imageFile}
        className="py-2 px-4 rounded-lg text-white font-semibold transition-all"
        style={{ backgroundColor: Colors.primary, opacity: (isUploading || !imageFile) ? 0.7 : 1 }}
      >
        {isUploading ? 'Uploading...' : 'Confirm Upload'}
      </button>
    </div>
  );
};

// --- Product "Amazon-style" Modal ---
const ProductModal = ({ isOpen, onClose, shopId, product, setNotification, userId }) => {
  const [formData, setFormData] = useState({
    name: '', description: '', price: '', salePrice: '', stock: '', variants: ''
  });
  const [productImageFile, setProductImageFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || '',
        description: product.description || '',
        price: product.price || '',
        salePrice: product.salePrice || '',
        stock: product.stock || '',
        variants: product.variants ? product.variants.join(', ') : '',
      });
      setPreview(product.imageUrl || null);
    } else {
      setFormData({ name: '', description: '', price: '', salePrice: '', stock: '', variants: '' });
      setPreview(null);
    }
    setProductImageFile(null);
    setUploadProgress(0);
  }, [product, isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e) => {
    if (e.target.files[0]) {
      const file = e.target.files[0];
      setProductImageFile(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsUploading(true);

    let imageUrl = product?.imageUrl || ''; // Keep old image if not uploading a new one

    // Step 1: Upload image if one is selected
    if (productImageFile) {
      const filePath = `images/${userId}/products/${Date.now()}_${productImageFile.name}`;
      const storageRef = ref(storage, filePath);
      const uploadTask = uploadBytesResumable(storageRef, productImageFile);

      try {
        await new Promise((resolve, reject) => {
          uploadTask.on('state_changed',
            (snapshot) => setUploadProgress((snapshot.bytesTransferred / snapshot.totalBytes) * 100),
            (error) => reject(error),
            async () => {
              imageUrl = await getDownloadURL(uploadTask.snapshot.ref);
              resolve();
            }
          );
        });
      } catch (error) {
        console.error("Image upload failed:", error);
        setNotification("Image upload failed. Product not saved.");
        setIsUploading(false);
        return;
      }
    }

    // Step 2: Save product data to Firestore
    try {
      const productData = {
        name: formData.name,
        description: formData.description,
        price: Number(formData.price),
        salePrice: formData.salePrice ? Number(formData.salePrice) : null,
        stock: Number(formData.stock),
        variants: formData.variants.split(',').map(v => v.trim()).filter(v => v),
        imageUrl: imageUrl,
      };

      const inventoryRef = collection(db, 'artifacts', appId, 'public', 'data', 'shops', shopId, 'inventory');
      
      if (product) {
        // Update existing product
        await setDoc(doc(inventoryRef, product.id), productData);
        setNotification("Product updated successfully!");
      } else {
        // Add new product
        await addDoc(inventoryRef, productData);
        setNotification("Product added successfully!");
      }
      
      setIsUploading(false);
      onClose();
    } catch (error) {
      console.error("Error saving product:", error);
      setNotification("Error saving product data.");
      setIsUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold">{product ? 'Edit Product' : 'Add New Product'}</h3>
          <button onClick={onClose}><X /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <InputField label="Product Name" name="name" value={formData.name} onChange={handleChange} />
          <TextareaField label="Description" name="description" value={formData.description} onChange={handleChange} />
          <div className="grid grid-cols-2 gap-4">
            <InputField label="Price (UZS)" name="price" type="number" value={formData.price} onChange={handleChange} />
            <InputField label="Sale Price (Optional)" name="salePrice" type="number" value={formData.salePrice} onChange={handleChange} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <InputField label="Stock" name="stock" type="number" value={formData.stock} onChange={handleChange} />
            <InputField label="Variants (comma-separated)" name="variants" placeholder="e.g., S, M, L" value={formData.variants} onChange={handleChange} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Product Image</label>
            <input type="file" accept="image/*" onChange={handleImageChange} className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[#C67C43] file:text-white hover:file:opacity-90" />
            {preview && <img src={preview} alt="Preview" className="w-32 h-32 object-cover rounded-lg my-2" />}
            {isUploading && <p>Uploading: {Math.round(uploadProgress)}%</p>}
          </div>
          <div className="mt-6 flex justify-end space-x-3">
            <button type="button" onClick={onClose} className="py-2 px-4 rounded-lg border border-gray-300">Cancel</button>
            <button type="submit" disabled={isUploading} className="py-2 px-4 rounded-lg text-white" style={{ backgroundColor: Colors.primary }}>{isUploading ? 'Saving...' : 'Save Product'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

// --- Product List Component ---
const ProductList = ({ shopId, setNotification, userId }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  useEffect(() => {
    const productsRef = collection(db, 'artifacts', appId, 'public', 'data', 'shops', shopId, 'inventory');
    const q = query(productsRef);
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (error) => {
      console.error("Error fetching products:", error);
      setNotification('Failed to fetch products.');
      setLoading(false);
    });
    return () => unsubscribe();
  }, [shopId, setNotification]);

  const handleEdit = (product) => {
    setSelectedProduct(product);
    setModalOpen(true);
  };

  const handleAddNew = () => {
    setSelectedProduct(null);
    setModalOpen(true);
  };

  const handleDelete = async (productId) => {
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'shops', shopId, 'inventory', productId));
      setNotification("Product deleted.");
    } catch (error) {
      setNotification("Error deleting product.");
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-semibold">Manage Products</h3>
        <button onClick={handleAddNew} className="py-2 px-4 rounded-lg text-white flex items-center" style={{ backgroundColor: Colors.primary }}>
          <Plus className="w-5 h-5 mr-1" /> Add Product
        </button>
      </div>
      {loading ? <Loader2 className="animate-spin" /> : (
        <div className="space-y-3">
          {products.map(product => (
            <div key={product.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <img src={product.imageUrl || 'https://placehold.co/50x50/D2B48C/000?text=Img'} alt={product.name} className="w-12 h-12 rounded-lg object-cover" />
                <div>
                  <p className="font-semibold">{product.name}</p>
                  <p className="text-sm text-gray-500">{product.price} UZS</p>
                </div>
              </div>
              <div className="flex space-x-2">
                <button onClick={() => handleEdit(product)} className="p-2 text-blue-600 hover:bg-blue-100 rounded-full"><Edit className="w-5 h-5" /></button>
                <button onClick={() => handleDelete(product.id)} className="p-2 text-red-600 hover:bg-red-100 rounded-full"><Trash2 className="w-5 h-5" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
      <ProductModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        shopId={shopId}
        product={selectedProduct}
        setNotification={setNotification}
        userId={userId}
      />
    </div>
  );
};

// --- Shop Settings Page ---
const ShopSettings = ({ shop, shopId, user, setNotification }) => {
  const [formData, setFormData] = useState({
    nameUz: '', nameEn: '', address: '', phone: '', type: 'Shop', hours: '09:00-18:00', about: ''
  });
  const [location, setLocation] = useState(null);
  // Separate states for image URLs to avoid saving old URLs
  const [profilePicUrl, setProfilePicUrl] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');

  useEffect(() => {
    if (shop) {
      setFormData({
        nameUz: shop.name_uz || '',
        nameEn: shop.name_en || '',
        address: shop.address || '',
        phone: shop.phone || '',
        type: shop.type || 'Shop',
        hours: shop.hours?.Mon || '09:00-18:00',
        about: shop.about || '',
      });
      setLocation(shop.location || null);
      setProfilePicUrl(shop.profilePicUrl || '');
      setBannerUrl(shop.bannerUrl || '');
    }
  }, [shop]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleLocationChange = (newLocation) => {
    setLocation(newLocation);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    
    const shopData = {
      ...formData,
      name_uz: formData.nameUz,
      name_en: formData.nameEn,
      hours: { Mon: formData.hours, Tue: formData.hours, Wed: formData.hours, Thu: formData.hours, Fri: formData.hours, Sat: formData.hours, Sun: formData.hours },
      location: location,
      owner_uid: user.uid,
      profilePicUrl: profilePicUrl, // Use the state variable
      bannerUrl: bannerUrl,     // Use the state variable
    };
    
    try {
      const shopRef = doc(db, 'artifacts', appId, 'public', 'data', 'shops', shopId);
      await setDoc(shopRef, shopData, { merge: true });
      setNotification("Shop details saved successfully!");
    } catch (error) {
      console.error("Error saving shop:", error);
      setNotification("Error saving shop details.");
    }
  };

  return (
    <form onSubmit={handleSave} className="p-6 bg-white rounded-lg shadow space-y-6">
      <h3 className="text-xl font-semibold">Shop Details</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <InputField label="Uzbek Name" name="nameUz" value={formData.nameUz} onChange={handleChange} />
        <InputField label="English Name" name="nameEn" value={formData.nameEn} onChange={handleChange} />
      </div>
      <InputField label="Phone Number" name="phone" placeholder="+998 90 123 4567" value={formData.phone} onChange={handleChange} />
      <TextareaField label="About Your Shop" name="about" placeholder="Describe what makes your shop special..." value={formData.about} onChange={handleChange} />
      
      <h3 className="text-lg font-semibold mt-4">Images</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Profile Picture</label>
          {profilePicUrl && <img src={profilePicUrl} alt="Current profile" className="w-32 h-32 object-cover rounded-lg mt-2" />}
          <ImageUploader 
            onUploadSuccess={(url) => setProfilePicUrl(url)} 
            path={`images/${user.uid}/profilePic.jpg`}
            userId={user.uid}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Banner Image</label>
          {bannerUrl && <img src={bannerUrl} alt="Current banner" className="w-full h-32 object-cover rounded-lg mt-2" />}
          <ImageUploader 
            onUploadSuccess={(url) => setBannerUrl(url)} 
            path={`images/${user.uid}/banner.jpg`}
            userId={user.uid}
          />
        </div>
      </div>

      <h3 className="text-lg font-semibold mt-4">Location & Hours</h3>
      <InputField label="Address" name="address" placeholder="Amir Temur St, 15, Tashkent" value={formData.address} onChange={handleChange} />
      <div className="grid grid-cols-2 gap-4">
        <InputField label="Hours (Mon-Sun)" name="hours" placeholder="09:00-18:00" value={formData.hours} onChange={handleChange} />
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
          <select name="type" value={formData.type} onChange={handleChange} className="w-full mt-1 py-3 px-4 rounded-lg border-2 border-gray-200 focus:outline-none focus:border-[#C67C43] bg-white">
            <option>Shop</option><option>Restaurant</option><option>Hospital</option><option>Market</option><option>Service</option>
          </select>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Set Location on Map</label>
        <MapPicker location={location} onLocationChange={handleLocationChange} />
        <p className="text-xs text-gray-500 mt-1">Click on the map to set your shop's exact location.</p>
      </div>

      <button
        type="submit"
        className="w-full py-3 rounded-lg text-white font-semibold transition-all"
        style={{ backgroundColor: Colors.primary }}
      >
        <Save className="w-5 h-5 inline-block mr-2" /> Save Changes
      </button>
    </form>
  );
};

// --- Initial "Create Shop" Onboarding ---
const CreateShopOnboarding = ({ user, setNotification, onShopCreated }) => {
  const [shopName, setShopName] = useState('');
  const [shopType, setShopType] = useState('Shop');
  const [loading, setLoading] = useState(false);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!shopName) {
      setNotification("Please enter a shop name.");
      return;
    }
    setLoading(true);
    
    const shopData = {
      name_uz: shopName,
      type: shopType,
      owner_uid: user.uid,
      createdAt: new Date(),
    };
    
    try {
      // Create the shop doc
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'shops'), shopData);
      setNotification("Shop created! Now set up your details.");
      onShopCreated(); // This will trigger a re-fetch in the parent
    } catch (error) {
      console.error("Error creating shop:", error);
      setNotification("Error creating shop.");
    }
    setLoading(false);
  };
  
  return (
    <div className="w-full max-w-lg p-8 bg-white rounded-2xl shadow-xl">
      <h2 className="text-3xl font-bold text-center mb-2" style={{ color: Colors.primary }}>
        Welcome to SHOXA!
      </h2>
      <p className="text-center text-gray-500 mb-6">Let's create your shop page. You can add more details later.</p>
      <form onSubmit={handleSubmit}>
        <InputField icon={Building} label="Your Shop's Name" value={shopName} onChange={(e) => setShopName(e.target.value)} />
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Shop Type</label>
          <select value={shopType} onChange={(e) => setShopType(e.target.value)} className="w-full mt-1 py-3 px-4 rounded-lg border-2 border-gray-200 focus:outline-none focus:border-[#C67C43] bg-white">
            <option>Shop</option><option>Restaurant</option><option>Hospital</option><option>Market</option><option>Service</option>
          </select>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 mt-6 rounded-lg text-white font-semibold transition-all"
          style={{ backgroundColor: Colors.primary, opacity: loading ? 0.7 : 1 }}
        >
          {loading ? <Loader2 className="animate-spin" /> : 'Create My Shop'}
        </button>
      </form>
    </div>
  );
};

// --- Main Admin Dashboard ---
const AdminDashboard = ({ user, setNotification }) => {
  const [shop, setShop] = useState(null);
  const [shopId, setShopId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('shop'); // shop, products, posts
  
  const fetchShopData = useCallback(() => {
    setLoading(true);
    const shopsRef = collection(db, 'artifacts', appId, 'public', 'data', 'shops');
    const q = query(shopsRef, where("owner_uid", "==", user.uid));
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      if (querySnapshot.empty) {
        setShop(null); // Will show onboarding
        setShopId(null);
      } else {
        const shopDoc = querySnapshot.docs[0];
        setShop(shopDoc.data());
        setShopId(shopDoc.id);
      }
      setLoading(false);
    }, (error) => {
      console.error("Error fetching shop data:", error);
      setNotification('Failed to fetch shop data.');
      setLoading(false);
    });
    return unsubscribe;
  }, [user.uid, setNotification]);

  useEffect(() => {
    const unsubscribe = fetchShopData();
    return () => unsubscribe();
  }, [fetchShopData]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="w-12 h-12 animate-spin" style={{ color: Colors.primary }} />
      </div>
    );
  }

  // Onboarding: If no shop, force creation
  if (!shop) {
    return (
      <CreateShopOnboarding 
        user={user} 
        setNotification={setNotification} 
        onShopCreated={fetchShopData} // Re-fetch data after creation
      />
    );
  }

  // Main Dashboard
  return (
    <div className="flex w-full max-w-7xl h-[90vh] bg-white rounded-2xl shadow-xl overflow-hidden">
      {/* Sidebar Navigation */}
      <nav className="w-64 bg-gray-50 border-r border-gray-200 p-4 flex flex-col">
        <div className="flex items-center space-x-2 mb-8">
          <img src={shop.profilePicUrl || 'https://placehold.co/40x40/C67C43/ffffff?text=S'} alt="Shop" className="w-10 h-10 rounded-full object-cover" />
          <div>
            <p className="font-semibold text-gray-800 truncate">{shop.name_uz}</p>
            <p className="text-xs text-gray-500 truncate">{user.email}</p>
          </div>
        </div>
        
        <div className="space-y-2">
          <TabButton icon={Settings} label="Shop Page" active={activeTab === 'shop'} onClick={() => setActiveTab('shop')} />
          <TabButton icon={ShoppingBag} label="Products" active={activeTab === 'products'} onClick={() => setActiveTab('products')} />
          <TabButton icon={Edit3} label="Posts (Soon)" active={activeTab === 'posts'} onClick={() => {}} disabled />
        </div>
        
        <button
          onClick={() => signOut(auth)}
          className="mt-auto flex items-center text-sm font-medium text-red-500 hover:bg-red-100 p-2 rounded-lg"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Log Out
        </button>
      </nav>
      
      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-8">
        {activeTab === 'shop' && <ShopSettings shop={shop} shopId={shopId} user={user} setNotification={setNotification} />}
        {activeTab === 'products' && <ProductList shopId={shopId} setNotification={setNotification} userId={user.uid} />}
        {activeTab === 'posts' && <p>Post management coming soon!</p>}
      </main>
    </div>
  );
};

const TabButton = ({ icon: Icon, label, active, onClick, disabled = false }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`flex items-center w-full p-3 rounded-lg text-left font-medium transition-all ${
      active ? `bg-[${Colors.primary}] text-white shadow-lg` : `text-gray-600 hover:bg-gray-100`
    } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
  >
    <Icon className="w-5 h-5 mr-3" />
    {label}
  </button>
);

// --- Notification Component ---
const Notification = ({ message, onClear, isError }) => {
  useEffect(() => {
    if (message) {
      const timer = setTimeout(onClear, 3000);
      return () => clearTimeout(timer);
    }
  }, [message, onClear]);

  if (!message) return null;
  return (
    <div className={`fixed top-5 right-5 p-4 rounded-lg shadow-lg text-white ${isError ? 'bg-red-500' : 'bg-green-500'} z-50`}>
      {message}
    </div>
  );
};

// --- Main Admin App ---
const AdminPanel = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState('');

  useEffect(() => {
    // Check if Firebase initialized correctly
    if (!app) {
      setNotification("Error: Firebase failed to initialize. Check your .env config.");
      setLoading(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen" style={{ backgroundColor: Colors.background }}>
        <Loader2 className="w-12 h-12 animate-spin" style={{ color: Colors.primary }} />
      </div>
    );
  }

  return (
    <div className="flex justify-center items-center min-h-screen p-4" style={{ backgroundColor: Colors.background }}>
      <Notification message={notification} onClear={() => setNotification('')} isError={notification.includes('Error') || notification.includes('failed')} />
      {user ? (
        <AdminDashboard user={user} setNotification={setNotification} />
      ) : (
        <AuthPage setNotification={setNotification} />
      )}
    </div>
  );
};

export default AdminPanel;