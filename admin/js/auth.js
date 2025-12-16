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
                await this.handlePostLogin();
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
            const doc = await db.collection('users').doc(this.currentUser.uid).get();
            if (doc.exists) {
                this.userData = { id: doc.id, ...doc.data() };
            }
        } catch (error) {
            console.error('Load user data error:', error);
        }
    },

    // Handle post-login flow
    async handlePostLogin() {
        hideLoading();

        // Check if user needs onboarding
        const needsOnboarding = await Onboarding.checkOnboardingStatus();

        if (needsOnboarding) {
            this.showOnboarding();
        } else {
            this.showDashboard();
        }
    },

    // Register new user (simplified - no shop type, goes to onboarding)
    async register(name, email, password) {
        showLoading();
        try {
            // Create auth user
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;

            // Create user document
            await db.collection('users').doc(user.uid).set({
                email: email,
                name: name,
                role: 'owner',
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            showToast('Account created! Let\'s set up your business.');
            // Auth state change will trigger onboarding
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
        document.getElementById('onboarding-container').classList.add('hidden');
        document.getElementById('dashboard-container').classList.add('hidden');
        hideLoading();
    },

    // Show onboarding
    showOnboarding() {
        document.getElementById('auth-container').classList.add('hidden');
        document.getElementById('onboarding-container').classList.remove('hidden');
        document.getElementById('dashboard-container').classList.add('hidden');

        // Initialize onboarding
        Onboarding.init();
    },

    // Show dashboard
    showDashboard() {
        document.getElementById('auth-container').classList.add('hidden');
        document.getElementById('onboarding-container').classList.add('hidden');
        document.getElementById('dashboard-container').classList.remove('hidden');

        // Initialize dashboard with business type
        const businessType = Onboarding.selectedBusinessType || 'shop';
        const shopMode = Onboarding.selectedShopMode || 'manual';
        Dashboard.init(businessType, shopMode);
    }
};

// Setup auth form listeners
document.addEventListener('DOMContentLoaded', () => {
    // Login form
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;
            await Auth.login(email, password);
        });
    }

    // Register form (simplified - no shop type selection)
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('register-name').value;
            const email = document.getElementById('register-email').value;
            const password = document.getElementById('register-password').value;
            await Auth.register(name, email, password);
        });
    }

    // Toggle between login/register
    const showRegister = document.getElementById('show-register');
    if (showRegister) {
        showRegister.addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('login-page').classList.add('hidden');
            document.getElementById('register-page').classList.remove('hidden');
        });
    }

    const showLogin = document.getElementById('show-login');
    if (showLogin) {
        showLogin.addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('register-page').classList.add('hidden');
            document.getElementById('login-page').classList.remove('hidden');
        });
    }

    // Logout buttons
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => Auth.logout());
    }

    const mobileLogout = document.getElementById('mobile-logout');
    if (mobileLogout) {
        mobileLogout.addEventListener('click', () => Auth.logout());
    }

    // Initialize auth
    Auth.init();
});
