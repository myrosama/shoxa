// Authentication Module
const Auth = {
    currentUser: null,
    userData: null,

    // Initialize auth state listener
    init() {
        auth.onAuthStateChanged(async (user) => {
            if (user) {
                this.currentUser = user;
                await this.loadUserData();
                this.showDashboard();
            } else {
                this.currentUser = null;
                this.userData = null;
                this.showAuth();
            }
        });
    },

    // Load user data from Firestore
    async loadUserData() {
        try {
            const doc = await db.collection(COLLECTIONS.USERS).doc(this.currentUser.uid).get();
            if (doc.exists) {
                this.userData = { id: doc.id, ...doc.data() };
            }
        } catch (error) {
            console.error('Load user data error:', error);
        }
    },

    // Register new user
    async register(name, email, password, shopType) {
        showLoading();
        try {
            // Create auth user
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;

            // Create shop document
            const shopRef = await db.collection(COLLECTIONS.SHOPS).add({
                ownerId: user.uid,
                name: '',
                type: shopType,
                description: '',
                about: '',
                location: null,
                openingHours: {},
                logoFileId: null,
                bannerFileId: null,
                rating: 0,
                reviewCount: 0,
                isVerified: false,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            // Create user document
            await db.collection(COLLECTIONS.USERS).doc(user.uid).set({
                email: email,
                name: name,
                shopId: shopRef.id,
                role: 'owner',
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            showToast('Account created successfully!');
            return { success: true };
        } catch (error) {
            hideLoading();
            showToast(error.message);
            return { success: false, error: error.message };
        }
    },

    // Login user
    async login(email, password) {
        showLoading();
        try {
            await auth.signInWithEmailAndPassword(email, password);
            showToast('Welcome back!');
            return { success: true };
        } catch (error) {
            hideLoading();
            showToast(error.message);
            return { success: false, error: error.message };
        }
    },

    // Logout
    async logout() {
        try {
            await auth.signOut();
            showToast('Logged out successfully');
        } catch (error) {
            showToast(error.message);
        }
    },

    // Show auth container
    showAuth() {
        document.getElementById('auth-container').classList.remove('hidden');
        document.getElementById('dashboard-container').classList.add('hidden');
        hideLoading();
    },

    // Show dashboard
    showDashboard() {
        document.getElementById('auth-container').classList.add('hidden');
        document.getElementById('dashboard-container').classList.remove('hidden');
        hideLoading();

        // Initialize dashboard
        App.init();
    }
};

// Setup auth form listeners
document.addEventListener('DOMContentLoaded', () => {
    // Login form
    document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        await Auth.login(email, password);
    });

    // Register form
    document.getElementById('register-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('register-name').value;
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;
        const shopType = document.getElementById('shop-type').value;
        await Auth.register(name, email, password, shopType);
    });

    // Toggle between login/register
    document.getElementById('show-register').addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('login-page').classList.add('hidden');
        document.getElementById('register-page').classList.remove('hidden');
    });

    document.getElementById('show-login').addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('register-page').classList.add('hidden');
        document.getElementById('login-page').classList.remove('hidden');
    });

    // Logout buttons
    document.getElementById('logout-btn').addEventListener('click', () => Auth.logout());
    document.getElementById('mobile-logout').addEventListener('click', () => Auth.logout());

    // Initialize auth
    Auth.init();
});
