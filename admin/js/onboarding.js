// Onboarding Flow Module
const Onboarding = {
    selectedBusinessType: null, // 'shop' or 'amenity'
    selectedShopMode: null,     // 'pos' or 'manual'
    selectedPOS: null,          // 'square', 'clover', etc.

    // Initialize onboarding
    init() {
        this.bindEvents();
    },

    // Bind event listeners
    bindEvents() {
        // Business type cards
        document.querySelectorAll('.business-type-card').forEach(card => {
            card.addEventListener('click', (e) => {
                const type = card.dataset.type;
                this.selectBusinessType(type);
            });
        });

        // Shop mode cards
        document.querySelectorAll('.shop-mode-card').forEach(card => {
            card.addEventListener('click', (e) => {
                const mode = card.dataset.mode;
                this.selectShopMode(mode);
            });
        });

        // POS selection cards
        document.querySelectorAll('.pos-select-card').forEach(card => {
            card.addEventListener('click', (e) => {
                const pos = card.dataset.pos;
                this.selectPOS(pos);
            });
        });
    },

    // Go to specific onboarding step
    goToStep(step) {
        document.querySelectorAll('.onboard-step').forEach(s => s.classList.remove('active'));

        const stepId = `onboard-step-${step}`;
        const stepEl = document.getElementById(stepId);
        if (stepEl) {
            stepEl.classList.add('active');
        }
    },

    // Select business type
    selectBusinessType(type) {
        this.selectedBusinessType = type;

        // Update UI
        document.querySelectorAll('.business-type-card').forEach(card => {
            card.classList.toggle('selected', card.dataset.type === type);
        });

        // Go to next step
        if (type === 'shop') {
            this.goToStep(2); // Shop mode selection
        } else if (type === 'amenity') {
            this.goToStep('3-amenity'); // Amenity details
        }
    },

    // Select shop mode (POS or Manual)
    selectShopMode(mode) {
        this.selectedShopMode = mode;

        // Update UI
        document.querySelectorAll('.shop-mode-card').forEach(card => {
            card.classList.toggle('selected', card.dataset.mode === mode);
        });

        // Go to next step
        if (mode === 'pos') {
            this.goToStep('3-pos'); // POS selection
        } else {
            this.goToStep(4); // Basic shop info
        }
    },

    // Select POS system
    selectPOS(pos) {
        this.selectedPOS = pos;

        // Update UI
        document.querySelectorAll('.pos-select-card').forEach(card => {
            card.classList.toggle('selected', card.dataset.pos === pos);
        });

        // Show API form
        const apiForm = document.getElementById('pos-api-form');
        const posName = document.getElementById('pos-name');

        if (apiForm) {
            apiForm.classList.remove('hidden');
        }

        // Update POS name in hint
        const posNames = {
            'square': 'Square',
            'clover': 'Clover',
            'toast': 'Toast',
            'iiko': 'iiko',
            'rkeeper': 'R-Keeper',
            'other': 'your POS'
        };

        if (posName) {
            posName.textContent = posNames[pos] || pos;
        }
    },

    // Connect POS system
    async connectPOS() {
        const apiKey = document.getElementById('pos-api-key')?.value;
        const locationId = document.getElementById('pos-location-id')?.value;

        if (!apiKey) {
            showToast('Please enter your API key');
            return;
        }

        showLoading();

        try {
            // Store POS credentials
            const userId = Auth.currentUser.uid;

            await db.collection('businesses').doc(userId).set({
                businessType: 'shop',
                shopMode: 'pos',
                posSystem: this.selectedPOS,
                posApiKey: apiKey, // In production, encrypt this!
                posLocationId: locationId || null,
                posConnected: true,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });

            // In production: Call backend to sync products from POS
            showToast('POS connected! Syncing products...');

            // Continue to shop info
            this.goToStep(4);

        } catch (error) {
            console.error('Error connecting POS:', error);
            showToast('Failed to connect. Please check your API key.');
        }

        hideLoading();
    },

    // Skip POS connection
    skipPOS() {
        // Mark as POS mode but not connected yet
        this.goToStep(4);
    },

    // Save amenity and continue
    async saveAmenityAndContinue() {
        const amenityType = document.getElementById('amenity-type')?.value;
        const name = document.getElementById('amenity-name')?.value;
        const phone = document.getElementById('amenity-phone')?.value;
        const desc = document.getElementById('amenity-desc')?.value;

        if (!amenityType || !name) {
            showToast('Please fill in the required fields');
            return;
        }

        showLoading();

        try {
            const userId = Auth.currentUser.uid;

            // Save to Firestore
            await db.collection('businesses').doc(userId).set({
                businessType: 'amenity',
                amenityType: amenityType,
                name: name,
                phone: phone || null,
                description: desc || null,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                onboardingComplete: true
            });

            // Also create the shop/amenity in public collection
            await db.collection('shops').add({
                name_uz: name,
                name_en: name,
                type: amenityType,
                phone: phone || null,
                about: desc || null,
                owner_uid: userId,
                isAmenity: true,
                hasProducts: false,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            showToast('Setup complete!');

            // Go to dashboard
            this.completeOnboarding();

        } catch (error) {
            console.error('Error saving amenity:', error);
            showToast('Failed to save. Please try again.');
        }

        hideLoading();
    },

    // Complete onboarding (save shop and go to dashboard)
    async completeOnboarding() {
        const shopName = document.getElementById('shop-onboard-name')?.value;
        const category = document.getElementById('shop-category')?.value;
        const phone = document.getElementById('shop-phone')?.value;

        // If coming from amenity flow, these might be empty
        if (this.selectedBusinessType === 'shop' && (!shopName || !category)) {
            showToast('Please fill in the required fields');
            return;
        }

        showLoading();

        try {
            const userId = Auth.currentUser.uid;

            if (this.selectedBusinessType === 'shop') {
                // Save business settings
                await db.collection('businesses').doc(userId).set({
                    businessType: 'shop',
                    shopMode: this.selectedShopMode,
                    posSystem: this.selectedPOS || null,
                    posConnected: this.selectedShopMode === 'pos' && this.selectedPOS,
                    name: shopName,
                    category: category,
                    phone: phone || null,
                    onboardingComplete: true,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                }, { merge: true });

                // Create shop in public collection
                await db.collection('shops').add({
                    name_uz: shopName,
                    name_en: shopName,
                    type: category,
                    phone: phone || null,
                    owner_uid: userId,
                    isAmenity: false,
                    hasProducts: true,
                    shopMode: this.selectedShopMode,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            }

            // Hide onboarding, show dashboard
            document.getElementById('onboarding-container').classList.add('hidden');
            document.getElementById('dashboard-container').classList.remove('hidden');

            // Initialize dashboard with correct mode
            Dashboard.init(this.selectedBusinessType, this.selectedShopMode);

            showToast('Welcome to SHOXA! 🎉');

        } catch (error) {
            console.error('Error completing onboarding:', error);
            showToast('Failed to complete setup. Please try again.');
        }

        hideLoading();
    },

    // Check if user needs onboarding
    async checkOnboardingStatus() {
        const userId = Auth.currentUser?.uid;
        if (!userId) return false;

        try {
            const doc = await db.collection('businesses').doc(userId).get();

            if (!doc.exists) {
                return true; // Needs onboarding
            }

            const data = doc.data();
            if (!data.onboardingComplete) {
                return true; // Needs to finish onboarding
            }

            // Store business info for dashboard
            this.selectedBusinessType = data.businessType;
            this.selectedShopMode = data.shopMode;
            this.selectedPOS = data.posSystem;

            return false; // Onboarding complete

        } catch (error) {
            console.error('Error checking onboarding:', error);
            return true;
        }
    }
};

// Global functions for onclick handlers
function selectBusinessType(type) {
    Onboarding.selectBusinessType(type);
}

function selectShopMode(mode) {
    Onboarding.selectShopMode(mode);
}

function selectPOS(pos) {
    Onboarding.selectPOS(pos);
}

function goToOnboardStep(step) {
    Onboarding.goToStep(step);
}

function connectPOS() {
    Onboarding.connectPOS();
}

function skipPOS() {
    Onboarding.skipPOS();
}

function saveAmenityAndContinue() {
    Onboarding.saveAmenityAndContinue();
}

function completeOnboarding() {
    Onboarding.completeOnboarding();
}

// Make selectedShopMode available globally for back button
let selectedShopMode = null;
