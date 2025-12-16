// SHOXA Admin - Simplified App
// Wrapped in IIFE to avoid naming conflicts with config.js
(function () {
    'use strict';

    // Local variables (won't conflict with globals in config.js)
    let db, auth, storage;
    let shopData = null;
    let businessData = null;
    let charts = {};

    // Initialize Firebase
    document.addEventListener('DOMContentLoaded', () => {
        console.log('DOM loaded, initializing...');

        // Firebase config (loaded from config.js) - MUST be first!
        if (typeof firebaseConfig !== 'undefined') {
            console.log('Firebase config found, initializing Firebase...');
            firebase.initializeApp(firebaseConfig);
            db = firebase.firestore();
            auth = firebase.auth();
            storage = firebase.storage();
            console.log('Firebase initialized successfully');

            // Setup UI AFTER Firebase is ready
            setupAuthForms();
            setupNavigation();
            setupMobileMenu();
            setupImageUploads();
            setupContactMethods();
            setupOtherFieldToggles();
            console.log('UI setup complete');

            // Auth state listener
            auth.onAuthStateChanged(handleAuthState);
        } else {
            console.error('Firebase config not found! Make sure config.js is loaded.');
            // Still setup basic UI toggle even without Firebase
            setupAuthForms();
            hideLoading();
        }
    });

    // Handle auth state
    async function handleAuthState(user) {
        if (user) {
            // Check if setup is complete
            const needsSetup = await checkSetupStatus(user.uid);

            if (needsSetup) {
                showSetup();
            } else {
                await loadBusinessData(user.uid);
                showDashboard();
            }
        } else {
            showAuth();
        }
        hideLoading();
    }

    // Check if user needs setup
    async function checkSetupStatus(uid) {
        try {
            const doc = await db.collection('businesses').doc(uid).get();
            return !doc.exists || !doc.data()?.name;
        } catch (e) {
            console.error('Check setup error:', e);
            return true;
        }
    }

    // Load business data
    async function loadBusinessData(uid) {
        try {
            const businessDoc = await db.collection('businesses').doc(uid).get();
            if (businessDoc.exists) {
                businessData = { id: businessDoc.id, ...businessDoc.data() };
            }

            // Load shop data
            const shopQuery = await db.collection('shops')
                .where('owner_uid', '==', uid)
                .limit(1)
                .get();

            if (!shopQuery.empty) {
                shopData = { id: shopQuery.docs[0].id, ...shopQuery.docs[0].data() };
            }
        } catch (e) {
            console.error('Load business error:', e);
        }
    }

    // Show/hide containers
    function showAuth() {
        document.getElementById('auth-container').classList.remove('hidden');
        document.getElementById('setup-container').classList.add('hidden');
        document.getElementById('dashboard-container').classList.add('hidden');
    }

    function showSetup() {
        document.getElementById('auth-container').classList.add('hidden');
        document.getElementById('setup-container').classList.remove('hidden');
        document.getElementById('dashboard-container').classList.add('hidden');
    }

    function showDashboard() {
        document.getElementById('auth-container').classList.add('hidden');
        document.getElementById('setup-container').classList.add('hidden');
        document.getElementById('dashboard-container').classList.remove('hidden');

        initDashboard();
    }

    // Initialize dashboard
    function initDashboard() {
        setGreeting();
        updateHomeStats();
        initHoursEditor();
        loadProducts();
        loadPosts();
        loadMessages();

        // Init charts after short delay
        setTimeout(() => {
            initCharts();
        }, 100);
    }

    // Set greeting
    function setGreeting() {
        const hour = new Date().getHours();
        let greeting = 'Good evening!';
        if (hour < 12) greeting = 'Good morning!';
        else if (hour < 18) greeting = 'Good afternoon!';

        const el = document.getElementById('greeting');
        if (el) el.textContent = greeting;

        const nameEl = document.getElementById('home-shop-name');
        if (nameEl && businessData?.name) {
            nameEl.textContent = businessData.name;
        }
    }

    // Update home stats with real data
    async function updateHomeStats() {
        // Get real counts from Firestore
        let productsCount = 0;
        let messagesCount = 0;
        let viewsCount = 0;
        let followersCount = 0;

        if (shopData?.id) {
            try {
                // Count products
                const productsSnap = await db.collection('shops').doc(shopData.id)
                    .collection('products').get();
                productsCount = productsSnap.size;

                // Count messages
                const messagesSnap = await db.collection('messages')
                    .where('shopId', '==', shopData.id)
                    .get();
                messagesCount = messagesSnap.size;

                // Views and followers from shop data
                viewsCount = shopData.views || 0;
                followersCount = shopData.followers || 0;
            } catch (e) {
                console.error('Error fetching stats:', e);
            }
        }

        document.getElementById('home-views').textContent = viewsCount;
        document.getElementById('home-followers').textContent = followersCount;
        document.getElementById('home-products').textContent = productsCount;
        document.getElementById('home-messages').textContent = messagesCount;
    }

    // Initialize charts
    function initCharts() {
        initViewsChart();
        initSourcesChart();
        initHoursChart();
    }

    function initViewsChart() {
        const ctx = document.getElementById('views-chart');
        if (!ctx) return;

        const gradient = ctx.getContext('2d').createLinearGradient(0, 0, 0, 250);
        gradient.addColorStop(0, 'rgba(198, 124, 67, 0.3)');
        gradient.addColorStop(1, 'rgba(198, 124, 67, 0.02)');

        charts.views = new Chart(ctx, {
            type: 'line',
            data: {
                labels: getLast30Days(),
                datasets: [{
                    label: 'Views',
                    data: generateDemoData(30, 10, 50),
                    borderColor: '#C67C43',
                    backgroundColor: gradient,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0,
                    pointHoverRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { grid: { display: false } },
                    y: { beginAtZero: true, grid: { color: '#eee' } }
                }
            }
        });
    }

    function initSourcesChart() {
        const ctx = document.getElementById('sources-chart');
        if (!ctx) return;

        charts.sources = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Map Discovery', 'Search', 'Direct Link', 'Posts'],
                datasets: [{
                    data: [45, 30, 15, 10],
                    backgroundColor: ['#C67C43', '#2196F3', '#4CAF50', '#FF9800'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { position: 'bottom', labels: { padding: 16 } }
                },
                cutout: '60%'
            }
        });
    }

    function initHoursChart() {
        const ctx = document.getElementById('hours-chart');
        if (!ctx) return;

        charts.hours = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['6am', '8am', '10am', '12pm', '2pm', '4pm', '6pm', '8pm', '10pm'],
                datasets: [{
                    label: 'Visits',
                    data: [5, 12, 18, 35, 28, 22, 42, 38, 15],
                    backgroundColor: '#C67C43',
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                plugins: { legend: { display: false } },
                scales: {
                    x: { grid: { display: false } },
                    y: { beginAtZero: true }
                }
            }
        });
    }

    // Navigation
    function setupNavigation() {
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const page = item.dataset.page;
                if (page) navigateTo(page);
            });
        });
    }

    function navigateTo(page) {
        // Update nav
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.page === page);
        });

        // Show page
        document.querySelectorAll('.page').forEach(p => {
            p.classList.toggle('active', p.id === `page-${page}`);
        });

        // Page-specific init
        if (page === 'page') {
            setTimeout(initLocationMap, 100);
            loadPageData();
        }

        if (page === 'stats') {
            setTimeout(() => {
                if (charts.views) charts.views.update();
                if (charts.sources) charts.sources.update();
                if (charts.hours) charts.hours.update();
            }, 100);
        }

        // Close mobile menu
        document.getElementById('sidebar')?.classList.remove('open');
    }

    // Mobile menu
    function setupMobileMenu() {
        const toggle = document.getElementById('menu-toggle');
        const sidebar = document.getElementById('sidebar');

        if (toggle && sidebar) {
            toggle.addEventListener('click', () => {
                sidebar.classList.toggle('open');
            });

            // Close on outside click
            document.addEventListener('click', (e) => {
                if (window.innerWidth <= 768 &&
                    !sidebar.contains(e.target) &&
                    !toggle.contains(e.target)) {
                    sidebar.classList.remove('open');
                }
            });
        }
    }

    // Auth forms
    function setupAuthForms() {
        console.log('setupAuthForms called');

        // Login
        const loginForm = document.getElementById('login-form');
        console.log('Login form found:', !!loginForm);

        loginForm?.addEventListener('submit', async (e) => {
            e.preventDefault();
            console.log('Login form submitted');

            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;
            console.log('Email:', email, 'Password length:', password.length);

            if (!auth) {
                console.error('Auth is not initialized!');
                showToast('Authentication not ready. Please refresh the page.');
                return;
            }

            showLoading();
            try {
                console.log('Attempting sign in...');
                await auth.signInWithEmailAndPassword(email, password);
                console.log('Sign in successful!');
                showToast('Welcome back!');
            } catch (error) {
                console.error('Login error:', error);
                showToast(error.message);
                hideLoading();
            }
        });

        // Register
        const registerForm = document.getElementById('register-form');
        console.log('Register form found:', !!registerForm);

        registerForm?.addEventListener('submit', async (e) => {
            e.preventDefault();
            console.log('Register form submitted');

            const name = document.getElementById('register-name').value;
            const email = document.getElementById('register-email').value;
            const password = document.getElementById('register-password').value;
            console.log('Name:', name, 'Email:', email, 'Password length:', password.length);

            if (!auth || !db) {
                console.error('Firebase not initialized! auth:', !!auth, 'db:', !!db);
                showToast('Service not ready. Please refresh the page.');
                return;
            }

            showLoading();
            try {
                console.log('Creating user...');
                const cred = await auth.createUserWithEmailAndPassword(email, password);
                console.log('User created with UID:', cred.user.uid);

                // Create user doc
                console.log('Creating user document in Firestore...');
                await db.collection('users').doc(cred.user.uid).set({
                    name: name,
                    email: email,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                console.log('User document created');

                showToast('Account created!');
            } catch (error) {
                console.error('Register error:', error);
                showToast(error.message);
                hideLoading();
            }
        });

        // Setup form
        document.getElementById('setup-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const type = document.getElementById('setup-type').value;
            const name = document.getElementById('setup-name').value;
            const phone = document.getElementById('setup-phone').value;

            if (!type || !name) {
                showToast('Please fill in all required fields');
                return;
            }

            showLoading();
            try {
                const uid = auth.currentUser.uid;

                // Create business
                await db.collection('businesses').doc(uid).set({
                    type: type,
                    name: name,
                    phone: phone || null,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });

                // Create shop
                await db.collection('shops').add({
                    owner_uid: uid,
                    name_uz: name,
                    name_en: name,
                    type: type,
                    phone: phone || null,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });

                showToast('Setup complete!');
                await loadBusinessData(uid);
                showDashboard();
            } catch (error) {
                showToast(error.message);
            }
            hideLoading();
        });

        // Toggle auth views
        document.getElementById('show-register')?.addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('login-page').classList.add('hidden');
            document.getElementById('register-page').classList.remove('hidden');
        });

        document.getElementById('show-login')?.addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('register-page').classList.add('hidden');
            document.getElementById('login-page').classList.remove('hidden');
        });

        // Logout
        document.getElementById('logout-btn')?.addEventListener('click', () => {
            auth.signOut();
            showToast('Logged out');
        });
    }

    // Hours editor
    function initHoursEditor() {
        const container = document.getElementById('hours-editor');
        if (!container) return;

        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

        container.innerHTML = days.map(day => `
        <div class="hours-row">
            <label>${day.slice(0, 3)}</label>
            <input type="time" value="09:00" class="hour-start">
            <input type="time" value="18:00" class="hour-end">
            <label class="closed-toggle">
                <input type="checkbox" class="hour-closed">
                Closed
            </label>
        </div>
    `).join('');
    }

    // Location map
    let locationMap = null;
    let locationMarker = null;

    function initLocationMap() {
        const container = document.getElementById('location-map');
        if (!container || locationMap) return;

        const lat = businessData?.location?.lat || 41.2995;
        const lng = businessData?.location?.lng || 69.2401;

        locationMap = L.map(container).setView([lat, lng], 15);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(locationMap);

        locationMarker = L.marker([lat, lng], { draggable: true }).addTo(locationMap);

        locationMap.on('click', (e) => {
            locationMarker.setLatLng(e.latlng);
        });
    }

    // Use current location (geolocation)
    window.useCurrentLocation = function () {
        if (!navigator.geolocation) {
            showToast('Geolocation is not supported by your browser');
            return;
        }

        showToast('Getting your location...');
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                if (locationMap && locationMarker) {
                    locationMap.setView([latitude, longitude], 16);
                    locationMarker.setLatLng([latitude, longitude]);
                    showToast('Location updated!');
                }
            },
            (error) => {
                console.error('Geolocation error:', error);
                showToast('Could not get your location. Please enable location access.');
            },
            { enableHighAccuracy: true }
        );
    };

    // Load page data
    function loadPageData() {
        if (!businessData) return;

        // Basic info
        document.getElementById('page-name').value = businessData.name || '';
        document.getElementById('page-type').value = businessData.type || '';
        document.getElementById('page-phone').value = businessData.phone || '';
        document.getElementById('page-description').value = businessData.description || '';
        document.getElementById('page-address').value = businessData.address || '';

        // Load contact methods
        loadContactMethods(businessData.contactMethods || []);

        // Amenities
        document.getElementById('page-wifi').checked = businessData.amenities?.wifi || false;
        document.getElementById('page-parking').checked = businessData.amenities?.parking || false;
        document.getElementById('page-delivery').checked = businessData.amenities?.delivery || false;
        document.getElementById('page-takeaway').checked = businessData.amenities?.takeaway || false;

        // Payment methods
        document.getElementById('page-pay-cash').checked = businessData.payments?.cash !== false;
        document.getElementById('page-pay-uzcard').checked = businessData.payments?.uzcard || false;
        document.getElementById('page-pay-humo').checked = businessData.payments?.humo || false;
        document.getElementById('page-pay-visa').checked = businessData.payments?.visa || false;
        document.getElementById('page-pay-other').checked = businessData.payments?.other || false;
        if (businessData.payments?.otherName) {
            document.getElementById('page-pay-other-name').value = businessData.payments.otherName;
        }
        toggleOtherField('page-pay-other', 'other-payment-field');

        // Languages
        document.getElementById('page-lang-uz').checked = businessData.languages?.uz !== false;
        document.getElementById('page-lang-ru').checked = businessData.languages?.ru || false;
        document.getElementById('page-lang-en').checked = businessData.languages?.en || false;
        document.getElementById('page-lang-other').checked = businessData.languages?.other || false;
        if (businessData.languages?.otherName) {
            document.getElementById('page-lang-other-name').value = businessData.languages.otherName;
        }
        toggleOtherField('page-lang-other', 'other-language-field');
    }

    // Contact methods management
    let contactMethods = [];

    function loadContactMethods(methods) {
        contactMethods = methods || [];
        renderContactMethods();
    }

    function renderContactMethods() {
        const list = document.getElementById('contact-methods-list');
        console.log('renderContactMethods called, list element:', list);
        console.log('contactMethods to render:', contactMethods);

        if (!list) {
            console.error('contact-methods-list element not found!');
            return;
        }

        if (contactMethods.length === 0) {
            list.innerHTML = '<p style="color: var(--text-muted); font-size: 14px;">No contact methods added yet. Select one above.</p>';
            return;
        }

        list.innerHTML = contactMethods.map((method, index) => {
            const icons = {
                phone: '📞', whatsapp: '💬', telegram: '✈️', instagram: '📷',
                facebook: '📘', tiktok: '🎵', website: '🌐', email: '📧', other: '🔗'
            };
            const labels = {
                phone: 'Phone', whatsapp: 'WhatsApp', telegram: 'Telegram', instagram: 'Instagram',
                facebook: 'Facebook', tiktok: 'TikTok', website: 'Website', email: 'Email', other: method.label || 'Other'
            };
            const isOther = method.type === 'other';

            return `
                <div class="contact-method-item ${isOther ? 'other' : ''}" data-index="${index}">
                    <div class="contact-method-icon">${icons[method.type] || '🔗'}</div>
                    <div class="contact-method-info">
                        ${isOther ? `<input type="text" class="contact-method-name-input" value="${method.label || ''}" placeholder="Name" onchange="updateContactLabel(${index}, this.value)">` : `<div class="contact-method-label">${labels[method.type]}</div>`}
                        <input type="text" class="contact-method-value" value="${method.value || ''}" placeholder="${getPlaceholder(method.type)}" onchange="updateContactValue(${index}, this.value)">
                    </div>
                    <button type="button" class="contact-method-delete" onclick="removeContactMethod(${index})">
                        <i class="ri-close-line"></i>
                    </button>
                </div>
            `;
        }).join('');

        console.log('Rendered HTML:', list.innerHTML);
    }

    function getPlaceholder(type) {
        const placeholders = {
            phone: '+998 90 123 4567',
            whatsapp: '+998 90 123 4567',
            telegram: '@username or link',
            instagram: '@username',
            facebook: 'facebook.com/yourpage',
            tiktok: '@username',
            website: 'https://your-website.com',
            email: 'contact@business.com',
            other: 'Enter link or value'
        };
        return placeholders[type] || 'Enter value';
    }

    window.addContactMethod = function (type) {
        console.log('addContactMethod called with type:', type);
        if (!type) return;

        // Add new contact method to array
        contactMethods.push({
            type: type,
            value: '',
            label: type === 'other' ? '' : undefined
        });

        console.log('contactMethods array:', contactMethods);

        // Re-render the list
        renderContactMethods();

        // Reset the dropdown
        const select = document.getElementById('contact-type-select');
        if (select) select.value = '';
    };

    window.removeContactMethod = function (index) {
        contactMethods.splice(index, 1);
        renderContactMethods();
    };

    window.updateContactValue = function (index, value) {
        if (contactMethods[index]) {
            contactMethods[index].value = value;
        }
    };

    window.updateContactLabel = function (index, label) {
        if (contactMethods[index]) {
            contactMethods[index].label = label;
        }
    };

    // Toggle Other field visibility
    function toggleOtherField(checkboxId, fieldId) {
        const checkbox = document.getElementById(checkboxId);
        const field = document.getElementById(fieldId);
        if (checkbox && field) {
            if (checkbox.checked) {
                field.classList.remove('hidden');
            } else {
                field.classList.add('hidden');
            }
        }
    }

    // Save page
    async function savePage() {
        const uid = auth.currentUser?.uid;
        if (!uid) return;

        const data = {
            name: document.getElementById('page-name').value,
            type: document.getElementById('page-type').value,
            phone: document.getElementById('page-phone').value,
            description: document.getElementById('page-description').value,
            address: document.getElementById('page-address').value,

            // Contact methods array
            contactMethods: contactMethods.filter(m => m.value),

            // Amenities
            amenities: {
                wifi: document.getElementById('page-wifi').checked,
                parking: document.getElementById('page-parking').checked,
                delivery: document.getElementById('page-delivery').checked,
                takeaway: document.getElementById('page-takeaway').checked
            },

            // Payment methods
            payments: {
                cash: document.getElementById('page-pay-cash').checked,
                uzcard: document.getElementById('page-pay-uzcard').checked,
                humo: document.getElementById('page-pay-humo').checked,
                visa: document.getElementById('page-pay-visa').checked,
                other: document.getElementById('page-pay-other').checked,
                otherName: document.getElementById('page-pay-other-name')?.value || ''
            },

            // Languages
            languages: {
                uz: document.getElementById('page-lang-uz').checked,
                ru: document.getElementById('page-lang-ru').checked,
                en: document.getElementById('page-lang-en').checked,
                other: document.getElementById('page-lang-other').checked,
                otherName: document.getElementById('page-lang-other-name')?.value || ''
            },

            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        if (locationMarker) {
            const pos = locationMarker.getLatLng();
            data.location = { lat: pos.lat, lng: pos.lng };
        }

        showLoading();
        try {
            await db.collection('businesses').doc(uid).update(data);

            if (shopData?.id) {
                await db.collection('shops').doc(shopData.id).update({
                    name_uz: data.name,
                    name_en: data.name,
                    type: data.type,
                    phone: data.phone,
                    about: data.description,
                    address: data.address,
                    location: data.location,
                    contactMethods: data.contactMethods,
                    amenities: data.amenities,
                    payments: data.payments,
                    languages: data.languages
                });
            }

            businessData = { ...businessData, ...data };
            showToast('Page saved!');
        } catch (error) {
            showToast('Failed to save');
            console.error(error);
        }
        hideLoading();
    }

    // Products
    let products = [];

    async function loadProducts() {
        if (!shopData?.id) return;

        try {
            const snapshot = await db.collection('shops').doc(shopData.id)
                .collection('products').orderBy('createdAt', 'desc').get();

            products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            renderProducts();
        } catch (e) {
            console.error('Load products error:', e);
        }
    }

    function renderProducts() {
        const grid = document.getElementById('products-grid');
        if (!grid) return;

        if (products.length === 0) {
            grid.innerHTML = `
            <div class="empty-state">
                <i class="ri-shopping-bag-line"></i>
                <h3>No products yet</h3>
                <p>Add your products so customers can see what you offer</p>
                <button class="btn btn-primary" onclick="openProductModal()">Add Your First Product</button>
            </div>
        `;
            return;
        }

        grid.innerHTML = products.map(p => `
        <div class="product-card">
            ${p.imageUrl
                ? `<img src="${p.imageUrl}" class="product-image" alt="${p.name}">`
                : `<div class="product-image-placeholder"><i class="ri-image-line"></i></div>`
            }
            <div class="product-info">
                <div class="product-name">${p.name}</div>
                ${p.category ? `<div class="product-category">${p.category}</div>` : ''}
                <div class="product-price">
                    ${formatPrice(p.salePrice || p.price)}
                    ${p.salePrice ? `<span class="product-sale-price">${formatPrice(p.price)}</span>` : ''}
                </div>
                <div class="product-actions">
                    <button class="btn btn-ghost" onclick="editProduct('${p.id}')">
                        <i class="ri-edit-line"></i>
                    </button>
                    <button class="btn btn-ghost" onclick="deleteProduct('${p.id}')">
                        <i class="ri-delete-bin-line"></i>
                    </button>
                </div>
            </div>
        </div>
    `).join('');
    }

    function filterProducts() {
        // Implement search/filter
    }

    function openProductModal(product = null) {
        document.getElementById('product-modal').classList.remove('hidden');
        document.getElementById('product-modal-title').textContent = product ? 'Edit Product' : 'Add Product';

        if (product) {
            document.getElementById('product-id').value = product.id;
            document.getElementById('product-name').value = product.name || '';
            document.getElementById('product-category').value = product.category || '';
            document.getElementById('product-description').value = product.description || '';
            document.getElementById('product-price').value = product.price || '';
            document.getElementById('product-sale-price').value = product.salePrice || '';
        } else {
            document.getElementById('product-form').reset();
            document.getElementById('product-id').value = '';
        }
    }

    function closeProductModal() {
        document.getElementById('product-modal').classList.add('hidden');
    }

    async function saveProduct() {
        const id = document.getElementById('product-id').value;
        const data = {
            name: document.getElementById('product-name').value,
            category: document.getElementById('product-category').value,
            description: document.getElementById('product-description').value,
            price: parseFloat(document.getElementById('product-price').value) || 0,
            salePrice: parseFloat(document.getElementById('product-sale-price').value) || null,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        if (!data.name || !data.price) {
            showToast('Name and price are required');
            return;
        }

        showLoading();
        try {
            const ref = db.collection('shops').doc(shopData.id).collection('products');

            if (id) {
                await ref.doc(id).update(data);
            } else {
                data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
                await ref.add(data);
            }

            closeProductModal();
            loadProducts();
            showToast(id ? 'Product updated!' : 'Product added!');
        } catch (e) {
            showToast('Failed to save product');
            console.error(e);
        }
        hideLoading();
    }

    function editProduct(id) {
        const product = products.find(p => p.id === id);
        if (product) openProductModal(product);
    }

    async function deleteProduct(id) {
        if (!confirm('Delete this product?')) return;

        showLoading();
        try {
            await db.collection('shops').doc(shopData.id).collection('products').doc(id).delete();
            loadProducts();
            showToast('Product deleted');
        } catch (e) {
            showToast('Failed to delete');
        }
        hideLoading();
    }

    function importProducts() {
        navigateTo('settings');
    }

    // Posts
    let posts = [];

    async function loadPosts() {
        if (!shopData?.id) return;

        try {
            const snapshot = await db.collection('posts')
                .where('shopId', '==', shopData.id)
                .orderBy('createdAt', 'desc')
                .get();

            posts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            renderPosts();
        } catch (e) {
            console.error('Load posts error:', e);
        }
    }

    function renderPosts() {
        const grid = document.getElementById('posts-grid');
        if (!grid) return;

        if (posts.length === 0) {
            grid.innerHTML = `
            <div class="empty-state">
                <i class="ri-image-line"></i>
                <h3>No posts yet</h3>
                <p>Share updates, promotions, and news with your customers</p>
                <button class="btn btn-primary" onclick="openPostModal()">Create Your First Post</button>
            </div>
        `;
            return;
        }

        grid.innerHTML = posts.map(post => {
            const isStory = post.isStory;
            const isExpired = isStory && post.expiresAt && post.expiresAt.toDate() < new Date();

            return `
            <div class="post-card">
                ${post.imageUrl ? `<img src="${post.imageUrl}" class="post-image" alt="Post">` : ''}
                <div class="post-content">
                    ${isStory ? `<span class="post-badge ${isExpired ? 'expired' : 'story'}">${isExpired ? 'Expired' : 'Story'}</span>` : ''}
                    <p class="post-text">${post.content || 'No caption'}</p>
                    <div class="post-meta">
                        <span>${formatDate(post.createdAt)}</span>
                        <button class="btn-icon" onclick="deletePost('${post.id}')">
                            <i class="ri-delete-bin-line"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
        }).join('');
    }

    function openPostModal() {
        document.getElementById('post-modal').classList.remove('hidden');
        document.getElementById('post-content').value = '';
        document.getElementById('post-is-story').checked = false;
        document.getElementById('post-image-preview').innerHTML = '';
    }

    function closePostModal() {
        document.getElementById('post-modal').classList.add('hidden');
    }

    async function savePost() {
        const content = document.getElementById('post-content').value;
        const isStory = document.getElementById('post-is-story').checked;

        if (!content) {
            showToast('Please enter some content');
            return;
        }

        showLoading();
        try {
            const data = {
                shopId: shopData.id,
                content: content,
                isStory: isStory,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            if (isStory) {
                const expires = new Date();
                expires.setHours(expires.getHours() + 24);
                data.expiresAt = firebase.firestore.Timestamp.fromDate(expires);
            }

            await db.collection('posts').add(data);

            closePostModal();
            loadPosts();
            showToast(isStory ? 'Story posted!' : 'Post published!');
        } catch (e) {
            showToast('Failed to create post');
            console.error(e);
        }
        hideLoading();
    }

    async function deletePost(id) {
        if (!confirm('Delete this post?')) return;

        showLoading();
        try {
            await db.collection('posts').doc(id).delete();
            loadPosts();
            showToast('Post deleted');
        } catch (e) {
            showToast('Failed to delete');
        }
        hideLoading();
    }

    // Messages
    let messages = [];

    async function loadMessages() {
        if (!shopData?.id) return;

        try {
            const snapshot = await db.collection('messages')
                .where('shopId', '==', shopData.id)
                .orderBy('createdAt', 'desc')
                .limit(50)
                .get();

            messages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            renderMessages();
            renderRecentMessages();
            updateMessageBadge();
        } catch (e) {
            console.error('Load messages error:', e);
        }
    }

    function renderMessages() {
        const list = document.getElementById('messages-list');
        if (!list) return;

        if (messages.length === 0) {
            list.innerHTML = `
            <div class="empty-state">
                <i class="ri-message-3-line"></i>
                <h3>No messages yet</h3>
                <p>When customers contact you, their messages will appear here</p>
            </div>
        `;
            return;
        }

        list.innerHTML = messages.map(msg => `
        <div class="message-list-item ${msg.unread ? 'unread' : ''}" onclick="openMessage('${msg.id}')">
            <div class="message-avatar">${(msg.customerName || 'C')[0]}</div>
            <div class="message-content">
                <div class="message-name">${msg.customerName || 'Customer'}</div>
                <div class="message-text">${msg.text || ''}</div>
            </div>
            <div class="message-time">${formatDate(msg.createdAt)}</div>
        </div>
    `).join('');
    }

    function renderRecentMessages() {
        const container = document.getElementById('recent-messages');
        if (!container) return;

        const recent = messages.slice(0, 3);

        if (recent.length === 0) {
            container.innerHTML = `
            <div class="empty-state small">
                <i class="ri-chat-1-line"></i>
                <p>No messages yet</p>
            </div>
        `;
            return;
        }

        container.innerHTML = recent.map(msg => `
        <div class="message-preview-item" onclick="navigateTo('messages')">
            <div class="message-avatar">${(msg.customerName || 'C')[0]}</div>
            <div class="message-content">
                <div class="message-name">${msg.customerName || 'Customer'}</div>
                <div class="message-text">${msg.text || ''}</div>
            </div>
            <div class="message-time">${formatDate(msg.createdAt)}</div>
        </div>
    `).join('');
    }

    function updateMessageBadge() {
        const unread = messages.filter(m => m.unread).length;
        const badge = document.getElementById('messages-badge');
        if (badge) {
            badge.textContent = unread;
            badge.style.display = unread > 0 ? 'block' : 'none';
        }
    }

    function openMessage(id) {
        // Open message detail
        document.getElementById('message-detail')?.classList.remove('hidden');
    }

    function closeMessageDetail() {
        document.getElementById('message-detail')?.classList.add('hidden');
    }

    function sendReply() {
        const input = document.getElementById('reply-input');
        if (input?.value) {
            showToast('Reply sent!');
            input.value = '';
        }
    }

    // Image uploads
    function setupImageUploads() {
        // Product image
        document.getElementById('product-image')?.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (ev) => {
                    const preview = document.getElementById('product-image-preview');
                    if (preview) {
                        preview.src = ev.target.result;
                        preview.classList.remove('hidden');
                    }
                };
                reader.readAsDataURL(file);
            }
        });

        // Post image
        document.getElementById('post-image')?.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (ev) => {
                    const preview = document.getElementById('post-image-preview');
                    if (preview) {
                        preview.innerHTML = `<img src="${ev.target.result}" class="preview-thumb" alt="Preview">`;
                    }
                };
                reader.readAsDataURL(file);
            }
        });
    }

    // CSV Import
    function importCSV() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.csv,.xlsx';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                showToast(`Importing ${file.name}...`);
                // Parse and import
                setTimeout(() => {
                    showToast('Import complete!');
                }, 2000);
            }
        };
        input.click();
    }

    // Utility functions
    function formatPrice(price) {
        return new Intl.NumberFormat('en-US').format(price) + ' UZS';
    }

    function formatDate(timestamp) {
        if (!timestamp) return '';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        const now = new Date();
        const diff = now - date;

        if (diff < 60000) return 'Just now';
        if (diff < 3600000) return Math.floor(diff / 60000) + 'm ago';
        if (diff < 86400000) return Math.floor(diff / 3600000) + 'h ago';
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    function getLast30Days() {
        const result = [];
        for (let i = 29; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            result.push(d.getDate());
        }
        return result;
    }

    function generateDemoData(count, min, max) {
        return Array(count).fill(0).map(() => Math.floor(Math.random() * (max - min) + min));
    }

    function showLoading() {
        document.getElementById('loading')?.classList.remove('hidden');
    }

    function hideLoading() {
        document.getElementById('loading')?.classList.add('hidden');
    }

    function showToast(message) {
        const toast = document.getElementById('toast');
        const msg = document.getElementById('toast-message');
        if (toast && msg) {
            msg.textContent = message;
            toast.classList.remove('hidden');
            setTimeout(() => toast.classList.add('hidden'), 3000);
        }
    }

    // Setup contact methods dropdown
    function setupContactMethods() {
        const select = document.getElementById('contact-type-select');
        console.log('setupContactMethods called, select element:', select);
        if (select) {
            select.addEventListener('change', (e) => {
                console.log('Contact select changed:', e.target.value);
                addContactMethod(e.target.value);
            });
            console.log('Contact methods event listener attached');
        } else {
            console.error('contact-type-select element not found!');
        }
    }

    // Setup Other field toggles
    function setupOtherFieldToggles() {
        // Payment Other toggle
        const payOther = document.getElementById('page-pay-other');
        if (payOther) {
            payOther.addEventListener('change', () => {
                toggleOtherField('page-pay-other', 'other-payment-field');
            });
        }

        // Language Other toggle
        const langOther = document.getElementById('page-lang-other');
        if (langOther) {
            langOther.addEventListener('change', () => {
                toggleOtherField('page-lang-other', 'other-language-field');
            });
        }
    }

})(); // End of IIFE
