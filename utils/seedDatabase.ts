import { collection, addDoc, GeoPoint } from 'firebase/firestore';
import { db } from '@/configs/FirebaseConfig';

const SHOPS_DATA = [
  // --- RESTAURANTS (3) ---
  {
    name_uz: "Oqtepa Lavash",
    type: "Restaurant",
    address: "Amir Temur Avenue, 15, Tashkent",
    phone: "+998 78 150 00 30",
    about: "Famous for the best Lavash in town. Fast service and halal food.",
    hours: { Mon: "10:00-23:00" },
    location: new GeoPoint(41.3111, 69.2797), // Near Amir Temur Square
    rating: 4.8,
    profilePicUrl: "https://placehold.co/100x100/orange/white?text=OL",
    bannerUrl: "https://placehold.co/600x300/orange/white?text=Oqtepa+Banner"
  },
  {
    name_uz: "Rayhon Milliy Taomlar",
    type: "Restaurant",
    address: "Bunyodkor Ave, Tashkent",
    phone: "+998 71 200 55 55",
    about: "Traditional Uzbek cuisine: Plov, Somsa, and Shashlik.",
    hours: { Mon: "09:00-22:00" },
    location: new GeoPoint(41.2858, 69.2040), // Chilonzor area
    rating: 4.5,
    profilePicUrl: "https://placehold.co/100x100/green/white?text=Rayhon",
    bannerUrl: "https://placehold.co/600x300/green/white?text=Rayhon+Banner"
  },
  {
    name_uz: "Bon!",
    type: "Restaurant",
    address: "Shota Rustaveli St, 22, Tashkent",
    phone: "+998 90 350 22 11",
    about: "French style bakery and coffee shop. Great for breakfast.",
    hours: { Mon: "08:00-21:00" },
    location: new GeoPoint(41.2930, 69.2680), // Grand Mir area
    rating: 4.7,
    profilePicUrl: "https://placehold.co/100x100/brown/white?text=Bon",
    bannerUrl: "https://placehold.co/600x300/brown/white?text=Bon+Banner"
  },

  // --- SHOPS (3) ---
  {
    name_uz: "Korzinka Supermarket",
    type: "Shop",
    address: "Sebzar St, Tashkent",
    phone: "+998 78 140 14 14",
    about: "Your daily grocery needs. Fresh fruits and vegetables.",
    hours: { Mon: "08:00-00:00" },
    location: new GeoPoint(41.3385, 69.2655), // Sebzar
    rating: 4.6,
    profilePicUrl: "https://placehold.co/100x100/red/white?text=Korzinka",
    bannerUrl: "https://placehold.co/600x300/red/white?text=Korzinka+Banner"
  },
  {
    name_uz: "Makro Supermarket",
    type: "Shop",
    address: "Navoi St, Tashkent",
    phone: "+998 71 205 12 34",
    about: "Wide range of household items and groceries.",
    hours: { Mon: "24 Hours" },
    location: new GeoPoint(41.3260, 69.2285), // Chorsu area
    rating: 4.3,
    profilePicUrl: "https://placehold.co/100x100/green/white?text=Makro",
    bannerUrl: "https://placehold.co/600x300/green/white?text=Makro+Banner"
  },
  {
    name_uz: "MediaPark",
    type: "Shop",
    address: "Qatortol St, Tashkent",
    phone: "+998 71 203 33 33",
    about: "Electronics, smartphones, and home appliances.",
    hours: { Mon: "10:00-20:00" },
    location: new GeoPoint(41.2815, 69.2120), // Qatortol
    rating: 4.5,
    profilePicUrl: "https://placehold.co/100x100/blue/white?text=MP",
    bannerUrl: "https://placehold.co/600x300/blue/white?text=MediaPark"
  },

  // --- PHARMACY (3) ---
  {
    name_uz: "Dori-Darmon",
    type: "Hospital", // Using Hospital type for Pharmacy based on your filter categories
    address: "Mustaqillik Ave, Tashkent",
    phone: "1002",
    about: "State pharmacy chain. Affordable medicines.",
    hours: { Mon: "24 Hours" },
    location: new GeoPoint(41.3130, 69.2800), // Center
    rating: 4.0,
    profilePicUrl: "https://placehold.co/100x100/blue/white?text=DD",
    bannerUrl: "https://placehold.co/600x300/blue/white?text=Pharmacy"
  },
  {
    name_uz: "OxyMed",
    type: "Hospital",
    address: "Oybek St, Tashkent",
    phone: "+998 71 200 00 03",
    about: "Wide selection of imported medicines and cosmetics.",
    hours: { Mon: "08:00-23:00" },
    location: new GeoPoint(41.2960, 69.2750), // Oybek
    rating: 4.9,
    profilePicUrl: "https://placehold.co/100x100/purple/white?text=Oxy",
    bannerUrl: "https://placehold.co/600x300/purple/white?text=OxyMed"
  },
  {
    name_uz: "Grand Pharm",
    type: "Hospital",
    address: "Nukus St, Tashkent",
    phone: "+998 90 123 45 67",
    about: "Reliable pharmacy network.",
    hours: { Mon: "24 Hours" },
    location: new GeoPoint(41.2880, 69.2550), // Nukus street
    rating: 4.2,
    profilePicUrl: "https://placehold.co/100x100/teal/white?text=GP",
    bannerUrl: "https://placehold.co/600x300/teal/white?text=GrandPharm"
  },

  // --- SERVICE (1) ---
  {
    name_uz: "Yandex Go Point",
    type: "Service",
    address: "Tashkent City",
    phone: "-",
    about: "Pickup and delivery point.",
    hours: { Mon: "09:00-21:00" },
    location: new GeoPoint(41.3150, 69.2500), // Tashkent City
    rating: 4.8,
    profilePicUrl: "https://placehold.co/100x100/yellow/black?text=Ya",
    bannerUrl: "https://placehold.co/600x300/yellow/black?text=Yandex"
  }
];

export const seedDatabase = async () => {
  try {
    const appId = "default-app-id"; // Ensure this matches your usage in other files
    const collectionRef = collection(db, 'artifacts', appId, 'public', 'data', 'shops');
    
    console.log("Starting seed...");
    for (const shop of SHOPS_DATA) {
      await addDoc(collectionRef, {
        ...shop,
        owner_uid: 'admin_seed', // Dummy owner ID
        createdAt: new Date()
      });
      console.log(`Added ${shop.name_uz}`);
    }
    console.log("Database seeded successfully!");
    alert("Database seeded with 10 dummy shops!");
  } catch (e) {
    console.error("Error seeding database:", e);
    alert("Error seeding database: " + e.message);
  }
};