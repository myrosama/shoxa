// Dashboard Module - Dynamically generates UI based on business type
const Dashboard = {
    businessType: null,  // 'shop' or 'amenity'
    shopMode: null,      // 'pos' or 'manual'
    currentPage: 'dashboard',
    charts: {},
    businessData: null,
    shopData: null,

    // Navigation configs for different business types
    navConfigs: {
        'shop-pos': [
            { id: 'dashboard', icon: 'ri-dashboard-3-line', label: 'Dashboard' },
            { id: 'orders', icon: 'ri-file-list-3-line', label: 'Orders', badge: true },
            { id: 'inventory', icon: 'ri-archive-line', label: 'Inventory' },
            { id: 'products', icon: 'ri-shopping-bag-line', label: 'Products' },
            { id: 'analytics', icon: 'ri-bar-chart-box-line', label: 'Analytics' },
            { id: 'customers', icon: 'ri-user-heart-line', label: 'Customers' },
            { id: 'posts', icon: 'ri-image-line', label: 'Posts' },
            { id: 'integrations', icon: 'ri-link', label: 'Integrations' },
            { id: 'shop', icon: 'ri-store-2-line', label: 'Shop Page' }
        ],
        'shop-manual': [
            { id: 'dashboard', icon: 'ri-dashboard-3-line', label: 'Dashboard' },
            { id: 'orders', icon: 'ri-file-list-3-line', label: 'Orders', badge: true },
            { id: 'products', icon: 'ri-shopping-bag-line', label: 'Products' },
            { id: 'inventory', icon: 'ri-archive-line', label: 'Stock' },
            { id: 'analytics', icon: 'ri-bar-chart-box-line', label: 'Analytics' },
            { id: 'posts', icon: 'ri-image-line', label: 'Posts' },
            { id: 'shop', icon: 'ri-store-2-line', label: 'Shop Page' }
        ],
        'amenity': [
            { id: 'dashboard', icon: 'ri-dashboard-3-line', label: 'Overview' },
            { id: 'services', icon: 'ri-list-check-2', label: 'Services' },
            { id: 'posts', icon: 'ri-image-line', label: 'Posts' },
            { id: 'reviews', icon: 'ri-star-line', label: 'Reviews' },
            { id: 'page', icon: 'ri-layout-4-line', label: 'My Page' },
            { id: 'settings', icon: 'ri-settings-3-line', label: 'Settings' }
        ]
    },

    // Initialize dashboard
    async init(businessType, shopMode) {
        this.businessType = businessType || 'shop';
        this.shopMode = shopMode || 'manual';

        console.log(`Initializing dashboard: ${businessType} / ${shopMode}`);

        // Load business data from Firestore
        await this.loadBusinessData();

        // Build navigation
        this.buildNavigation();

        // Build pages
        this.buildPages();

        // Setup event listeners
        this.setupEvents();

        // Load initial page
        this.navigateTo('dashboard');

        // Update user info in sidebar
        this.updateUserInfo();

        // Initialize charts after DOM is ready
        setTimeout(() => this.initCharts(), 100);
    },

    // Load business data from Firestore
    async loadBusinessData() {
        const userId = Auth.currentUser?.uid;
        if (!userId) return;

        try {
            // Get business config
            const businessDoc = await db.collection('businesses').doc(userId).get();
            if (businessDoc.exists) {
                this.businessData = businessDoc.data();
            }

            // Get shop data
            const shopsQuery = await db.collection('shops')
                .where('owner_uid', '==', userId)
                .limit(1)
                .get();

            if (!shopsQuery.empty) {
                this.shopData = {
                    id: shopsQuery.docs[0].id,
                    ...shopsQuery.docs[0].data()
                };
            }
        } catch (error) {
            console.error('Error loading business data:', error);
        }
    },

    // Build navigation based on business type
    buildNavigation() {
        const navContainer = document.getElementById('sidebar-nav');
        if (!navContainer) return;

        const navKey = this.businessType === 'amenity'
            ? 'amenity'
            : `shop-${this.shopMode}`;

        const navItems = this.navConfigs[navKey] || this.navConfigs['shop-manual'];

        navContainer.innerHTML = navItems.map(item => `
            <a href="#" class="nav-item" data-page="${item.id}">
                <i class="${item.icon}"></i>
                <span>${item.label}</span>
                ${item.badge ? '<span class="nav-badge" id="nav-badge-' + item.id + '">0</span>' : ''}
            </a>
        `).join('');

        // Re-bind click events
        navContainer.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                this.navigateTo(item.dataset.page);
            });
        });
    },

    // Build pages based on business type
    buildPages() {
        const mainContent = document.getElementById('main-content');
        if (!mainContent) return;

        if (this.businessType === 'amenity') {
            mainContent.innerHTML = this.getAmenityPages();
        } else {
            mainContent.innerHTML = this.getShopPages();
        }
    },

    // Get shop pages HTML
    getShopPages() {
        return `
            <!-- Dashboard Page -->
            ${this.getDashboardPage()}
            
            <!-- Orders Page -->
            ${this.getOrdersPage()}
            
            <!-- Products Page -->
            ${this.getProductsPage()}
            
            <!-- Inventory Page -->
            ${this.getInventoryPage()}
            
            <!-- Analytics Page -->
            ${this.getAnalyticsPage()}
            
            <!-- Customers Page -->
            ${this.shopMode === 'pos' ? this.getCustomersPage() : ''}
            
            <!-- Posts Page -->
            ${this.getPostsPage()}
            
            <!-- Integrations Page -->
            ${this.shopMode === 'pos' ? this.getIntegrationsPage() : ''}
            
            <!-- Shop Page Editor -->
            ${this.getShopEditorPage()}
        `;
    },

    // Get amenity pages HTML
    getAmenityPages() {
        return `
            <!-- Amenity Dashboard -->
            <div id="page-dashboard" class="page">
                <div class="page-header">
                    <div>
                        <h1>Overview</h1>
                        <p class="greeting" id="greeting">Welcome back!</p>
                    </div>
                </div>
                
                <div class="amenity-stats-grid">
                    <div class="stat-card">
                        <div class="stat-icon" style="background: #E3F2FD;">
                            <i class="ri-eye-line" style="color: #1976D2;"></i>
                        </div>
                        <div class="stat-info">
                            <span class="stat-value" id="stat-views">0</span>
                            <span class="stat-label">Page Views</span>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon" style="background: #E8F5E9;">
                            <i class="ri-star-line" style="color: #388E3C;"></i>
                        </div>
                        <div class="stat-info">
                            <span class="stat-value" id="stat-rating">4.5</span>
                            <span class="stat-label">Avg Rating</span>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon" style="background: #FFF3E0;">
                            <i class="ri-chat-3-line" style="color: #F57C00;"></i>
                        </div>
                        <div class="stat-info">
                            <span class="stat-value" id="stat-reviews">0</span>
                            <span class="stat-label">Reviews</span>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon" style="background: #FCE4EC;">
                            <i class="ri-heart-line" style="color: #C2185B;"></i>
                        </div>
                        <div class="stat-info">
                            <span class="stat-value" id="stat-saved">0</span>
                            <span class="stat-label">Saved</span>
                        </div>
                    </div>
                </div>
                
                <div class="dashboard-grid">
                    <div class="card">
                        <h3>Recent Reviews</h3>
                        <div id="recent-reviews" class="reviews-list">
                            <div class="empty-state small">
                                <i class="ri-chat-1-line"></i>
                                <p>No reviews yet</p>
                            </div>
                        </div>
                    </div>
                    <div class="card quick-actions">
                        <h3>Quick Actions</h3>
                        <div class="action-buttons">
                            <button class="action-btn" onclick="Dashboard.navigateTo('posts')">
                                <i class="ri-add-line"></i>
                                Create Post
                            </button>
                            <button class="action-btn" onclick="Dashboard.navigateTo('services')">
                                <i class="ri-list-check-2"></i>
                                Add Service
                            </button>
                            <button class="action-btn" onclick="Dashboard.navigateTo('page')">
                                <i class="ri-edit-line"></i>
                                Edit Page
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Services Page -->
            <div id="page-services" class="page">
                <div class="page-header">
                    <h1>Services</h1>
                    <button class="btn btn-primary" onclick="openServiceModal()">
                        <i class="ri-add-line"></i>
                        Add Service
                    </button>
                </div>
                <div id="services-list" class="services-grid">
                    <div class="empty-state">
                        <i class="ri-list-check-2"></i>
                        <p>No services added yet</p>
                        <button class="btn btn-primary" onclick="openServiceModal()">Add Your First Service</button>
                    </div>
                </div>
            </div>
            
            <!-- Posts Page -->
            ${this.getPostsPage()}
            
            <!-- Reviews Page -->
            <div id="page-reviews" class="page">
                <div class="page-header">
                    <h1>Reviews</h1>
                </div>
                <div id="all-reviews" class="reviews-grid">
                    <div class="empty-state">
                        <i class="ri-star-line"></i>
                        <p>No reviews yet</p>
                        <p class="text-muted">Reviews will appear here when customers rate your business</p>
                    </div>
                </div>
            </div>
            
            <!-- Page Editor -->
            <div id="page-page" class="page">
                <div class="page-header">
                    <h1>My Page</h1>
                    <button class="btn btn-primary" onclick="saveAmenityPage()">
                        <i class="ri-save-line"></i>
                        Save Changes
                    </button>
                </div>
                <div class="settings-grid">
                    <div class="card">
                        <h3>Basic Information</h3>
                        <div class="form-group">
                            <label>Business Name</label>
                            <input type="text" id="page-name" placeholder="Your business name">
                        </div>
                        <div class="form-group">
                            <label>Phone Number</label>
                            <input type="tel" id="page-phone" placeholder="+998 90 123 4567">
                        </div>
                        <div class="form-group">
                            <label>Description</label>
                            <textarea id="page-desc" rows="4" placeholder="What do you offer?"></textarea>
                        </div>
                    </div>
                    <div class="card">
                        <h3>Images</h3>
                        <div class="image-upload-group">
                            <div class="image-upload" id="amenity-logo-upload">
                                <input type="file" id="amenity-logo-input" accept="image/*" hidden>
                                <div class="upload-placeholder" onclick="document.getElementById('amenity-logo-input').click()">
                                    <i class="ri-image-add-line"></i>
                                    <span>Logo</span>
                                </div>
                                <img id="amenity-logo-preview" class="upload-preview hidden" alt="Logo">
                            </div>
                            <div class="image-upload banner" id="amenity-banner-upload">
                                <input type="file" id="amenity-banner-input" accept="image/*" hidden>
                                <div class="upload-placeholder" onclick="document.getElementById('amenity-banner-input').click()">
                                    <i class="ri-image-add-line"></i>
                                    <span>Banner</span>
                                </div>
                                <img id="amenity-banner-preview" class="upload-preview hidden" alt="Banner">
                            </div>
                        </div>
                    </div>
                    <div class="card full-width">
                        <h3>Location</h3>
                        <div class="form-group">
                            <label>Address</label>
                            <input type="text" id="page-address" placeholder="Street address">
                        </div>
                        <div id="page-map" class="map-container"></div>
                    </div>
                    <div class="card full-width">
                        <h3>Opening Hours</h3>
                        <div class="hours-grid" id="amenity-hours-grid"></div>
                    </div>
                </div>
            </div>
            
            <!-- Settings Page -->
            <div id="page-settings" class="page">
                <div class="page-header">
                    <h1>Settings</h1>
                </div>
                <div class="settings-list">
                    <div class="card">
                        <h3>Account</h3>
                        <div class="setting-row">
                            <span>Email</span>
                            <span id="setting-email">user@example.com</span>
                        </div>
                        <div class="setting-row">
                            <span>Password</span>
                            <button class="btn btn-ghost">Change Password</button>
                        </div>
                    </div>
                    <div class="card">
                        <h3>Notifications</h3>
                        <div class="setting-row">
                            <span>Email Notifications</span>
                            <label class="toggle">
                                <input type="checkbox" id="notif-email" checked>
                                <span class="slider"></span>
                            </label>
                        </div>
                        <div class="setting-row">
                            <span>Push Notifications</span>
                            <label class="toggle">
                                <input type="checkbox" id="notif-push" checked>
                                <span class="slider"></span>
                            </label>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    // Dashboard page HTML
    getDashboardPage() {
        const isPOS = this.shopMode === 'pos';

        return `
            <div id="page-dashboard" class="page">
                <div class="page-header">
                    <div>
                        <h1>Dashboard</h1>
                        <p class="greeting" id="greeting">Good morning!</p>
                    </div>
                    <div class="header-controls">
                        <select id="date-range" class="date-range-select">
                            <option value="today">Today</option>
                            <option value="7days" selected>Last 7 Days</option>
                            <option value="30days">Last 30 Days</option>
                        </select>
                    </div>
                </div>

                <div class="kpi-grid">
                    <div class="kpi-card revenue">
                        <div class="kpi-icon"><i class="ri-money-dollar-circle-line"></i></div>
                        <div class="kpi-content">
                            <span class="kpi-value" id="stat-revenue">0 UZS</span>
                            <span class="kpi-label">Total Revenue</span>
                            <span class="kpi-change positive" id="revenue-change">+0%</span>
                        </div>
                    </div>
                    <div class="kpi-card orders">
                        <div class="kpi-icon"><i class="ri-shopping-cart-2-line"></i></div>
                        <div class="kpi-content">
                            <span class="kpi-value" id="stat-orders">0</span>
                            <span class="kpi-label">Orders</span>
                            <span class="kpi-change positive" id="orders-change">+0%</span>
                        </div>
                    </div>
                    <div class="kpi-card pending">
                        <div class="kpi-icon"><i class="ri-time-line"></i></div>
                        <div class="kpi-content">
                            <span class="kpi-value" id="stat-pending">0</span>
                            <span class="kpi-label">Pending</span>
                        </div>
                    </div>
                    <div class="kpi-card lowstock">
                        <div class="kpi-icon"><i class="ri-error-warning-line"></i></div>
                        <div class="kpi-content">
                            <span class="kpi-value" id="stat-lowstock">0</span>
                            <span class="kpi-label">Low Stock</span>
                        </div>
                    </div>
                </div>

                <div class="dashboard-main-grid">
                    <div class="card chart-card">
                        <div class="card-header">
                            <h3>Sales Overview</h3>
                            <div class="chart-controls">
                                <button class="chart-btn active" data-period="7">7D</button>
                                <button class="chart-btn" data-period="30">30D</button>
                            </div>
                        </div>
                        <div class="chart-container">
                            <canvas id="sales-chart"></canvas>
                        </div>
                    </div>

                    <div class="card orders-card">
                        <div class="card-header">
                            <h3><span class="live-indicator"></span> Recent Orders</h3>
                            <a href="#" onclick="Dashboard.navigateTo('orders'); return false;" class="view-all">View All</a>
                        </div>
                        <div class="orders-list" id="live-orders-list">
                            <div class="empty-state small">
                                <i class="ri-inbox-line"></i>
                                <p>No orders yet</p>
                            </div>
                        </div>
                    </div>

                    <div class="card">
                        <div class="card-header">
                            <h3>Top Products</h3>
                        </div>
                        <div class="top-products-list" id="top-products-list">
                            <div class="empty-state small">
                                <i class="ri-bar-chart-horizontal-line"></i>
                                <p>No sales data</p>
                            </div>
                        </div>
                    </div>

                    <div class="card alerts-card">
                        <div class="card-header">
                            <h3><i class="ri-alarm-warning-line"></i> Stock Alerts</h3>
                        </div>
                        <div class="alerts-list" id="low-stock-list">
                            <div class="empty-state small">
                                <i class="ri-checkbox-circle-line"></i>
                                <p>All items in stock</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="quick-actions-bar">
                    <button class="quick-action" onclick="openProductModal()">
                        <i class="ri-add-circle-line"></i> Add Product
                    </button>
                    <button class="quick-action" onclick="openPostModal()">
                        <i class="ri-image-line"></i> Create Post
                    </button>
                    <button class="quick-action" onclick="Dashboard.navigateTo('inventory')">
                        <i class="ri-archive-line"></i> Update Stock
                    </button>
                    ${isPOS ? `<button class="quick-action" onclick="Dashboard.navigateTo('integrations')">
                        <i class="ri-link"></i> Sync POS
                    </button>` : ''}
                </div>
            </div>
        `;
    },

    // Orders page
    getOrdersPage() {
        return `
            <div id="page-orders" class="page">
                <div class="page-header">
                    <h1>Orders</h1>
                    <div class="orders-filter">
                        <button class="filter-btn active" data-status="all">All</button>
                        <button class="filter-btn" data-status="pending">Pending</button>
                        <button class="filter-btn" data-status="preparing">Preparing</button>
                        <button class="filter-btn" data-status="ready">Ready</button>
                        <button class="filter-btn" data-status="delivered">Delivered</button>
                    </div>
                </div>
                <div class="orders-board">
                    <div class="order-column">
                        <div class="column-header pending"><span class="status-dot"></span> Pending <span class="count">0</span></div>
                        <div class="column-content" id="pending-orders"></div>
                    </div>
                    <div class="order-column">
                        <div class="column-header preparing"><span class="status-dot"></span> Preparing <span class="count">0</span></div>
                        <div class="column-content" id="preparing-orders"></div>
                    </div>
                    <div class="order-column">
                        <div class="column-header ready"><span class="status-dot"></span> Ready <span class="count">0</span></div>
                        <div class="column-content" id="ready-orders"></div>
                    </div>
                    <div class="order-column">
                        <div class="column-header delivered"><span class="status-dot"></span> Delivered <span class="count">0</span></div>
                        <div class="column-content" id="delivered-orders"></div>
                    </div>
                </div>
            </div>
        `;
    },

    // Products page
    getProductsPage() {
        return `
            <div id="page-products" class="page">
                <div class="page-header">
                    <h1>Products</h1>
                    <button class="btn btn-primary" onclick="openProductModal()">
                        <i class="ri-add-line"></i> Add Product
                    </button>
                </div>
                <div class="products-toolbar">
                    <input type="text" id="product-search" placeholder="Search products..." class="search-input">
                    <select id="product-filter">
                        <option value="">All Categories</option>
                    </select>
                </div>
                <div id="products-grid" class="products-grid">
                    <div class="empty-state">
                        <i class="ri-shopping-bag-line"></i>
                        <p>No products yet</p>
                        <button class="btn btn-primary" onclick="openProductModal()">Add Your First Product</button>
                    </div>
                </div>
            </div>
        `;
    },

    // Inventory page
    getInventoryPage() {
        return `
            <div id="page-inventory" class="page">
                <div class="page-header">
                    <h1>Inventory</h1>
                    <div class="header-controls">
                        <button class="btn btn-ghost" onclick="exportInventory()">
                            <i class="ri-download-line"></i> Export
                        </button>
                    </div>
                </div>
                <div class="inventory-stats">
                    <div class="inv-stat-card">
                        <div class="inv-stat-icon total"><i class="ri-archive-2-line"></i></div>
                        <div class="inv-stat-info">
                            <span class="inv-stat-value" id="inv-total">0</span>
                            <span class="inv-stat-label">Total</span>
                        </div>
                    </div>
                    <div class="inv-stat-card">
                        <div class="inv-stat-icon stock"><i class="ri-checkbox-circle-line"></i></div>
                        <div class="inv-stat-info">
                            <span class="inv-stat-value" id="inv-instock">0</span>
                            <span class="inv-stat-label">In Stock</span>
                        </div>
                    </div>
                    <div class="inv-stat-card">
                        <div class="inv-stat-icon low"><i class="ri-error-warning-line"></i></div>
                        <div class="inv-stat-info">
                            <span class="inv-stat-value" id="inv-low">0</span>
                            <span class="inv-stat-label">Low</span>
                        </div>
                    </div>
                    <div class="inv-stat-card">
                        <div class="inv-stat-icon out"><i class="ri-close-circle-line"></i></div>
                        <div class="inv-stat-info">
                            <span class="inv-stat-value" id="inv-out">0</span>
                            <span class="inv-stat-label">Out</span>
                        </div>
                    </div>
                </div>
                <div class="card">
                    <table class="inventory-table">
                        <thead>
                            <tr>
                                <th>Product</th>
                                <th>SKU</th>
                                <th>Stock</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody id="inventory-table-body">
                            <tr><td colspan="5" class="empty-state">No products</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    },

    // Analytics page
    getAnalyticsPage() {
        return `
            <div id="page-analytics" class="page">
                <div class="page-header">
                    <h1>Analytics</h1>
                    <select id="analytics-period">
                        <option value="7">Last 7 Days</option>
                        <option value="30" selected>Last 30 Days</option>
                    </select>
                </div>
                <div class="analytics-kpi-grid">
                    <div class="analytics-kpi">
                        <span class="analytics-kpi-value" id="analytics-revenue">0 UZS</span>
                        <span class="analytics-kpi-label">Revenue</span>
                    </div>
                    <div class="analytics-kpi">
                        <span class="analytics-kpi-value" id="analytics-orders">0</span>
                        <span class="analytics-kpi-label">Orders</span>
                    </div>
                    <div class="analytics-kpi">
                        <span class="analytics-kpi-value" id="analytics-products">0</span>
                        <span class="analytics-kpi-label">Products Sold</span>
                    </div>
                    <div class="analytics-kpi">
                        <span class="analytics-kpi-value" id="analytics-avg">0 UZS</span>
                        <span class="analytics-kpi-label">Avg Order</span>
                    </div>
                </div>
                <div class="analytics-grid">
                    <div class="card">
                        <h3>Revenue Trend</h3>
                        <canvas id="revenue-chart"></canvas>
                    </div>
                    <div class="card">
                        <h3>Categories</h3>
                        <canvas id="category-chart"></canvas>
                    </div>
                </div>
            </div>
        `;
    },

    // Customers page
    getCustomersPage() {
        return `
            <div id="page-customers" class="page">
                <div class="page-header">
                    <h1>Customers</h1>
                </div>
                <div class="customer-segments">
                    <button class="segment-btn active">All <span>0</span></button>
                    <button class="segment-btn">VIP <span>0</span></button>
                    <button class="segment-btn">New <span>0</span></button>
                </div>
                <div class="card">
                    <table class="customers-table">
                        <thead>
                            <tr>
                                <th>Customer</th>
                                <th>Orders</th>
                                <th>Total Spent</th>
                                <th>Last Order</th>
                            </tr>
                        </thead>
                        <tbody id="customers-table-body">
                            <tr><td colspan="4" class="empty-state">No customers yet</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    },

    // Posts page
    getPostsPage() {
        return `
            <div id="page-posts" class="page">
                <div class="page-header">
                    <h1>Posts & Stories</h1>
                    <button class="btn btn-primary" onclick="openPostModal()">
                        <i class="ri-add-line"></i> Create Post
                    </button>
                </div>
                <div id="posts-grid" class="posts-grid">
                    <div class="empty-state">
                        <i class="ri-image-line"></i>
                        <p>No posts yet</p>
                        <button class="btn btn-primary" onclick="openPostModal()">Create Your First Post</button>
                    </div>
                </div>
            </div>
        `;
    },

    // Integrations page
    getIntegrationsPage() {
        const connected = this.businessData?.posConnected;
        const posSystem = this.businessData?.posSystem;

        return `
            <div id="page-integrations" class="page">
                <div class="page-header">
                    <h1>POS Integrations</h1>
                </div>
                
                ${connected ? `
                    <div class="connected-banner">
                        <i class="ri-check-double-line"></i>
                        <div>
                            <strong>${posSystem} Connected</strong>
                            <p>Your products are syncing automatically</p>
                        </div>
                        <button class="btn btn-ghost" onclick="syncNow()">Sync Now</button>
                    </div>
                ` : ''}
                
                <div class="integrations-grid">
                    <div class="integration-card">
                        <div class="integration-logo">
                            <i class="ri-square-fill" style="color: #006AFF; font-size: 40px;"></i>
                        </div>
                        <h3>Square</h3>
                        <p>Sync products, inventory, and orders</p>
                        <button class="btn ${posSystem === 'square' ? 'btn-ghost' : 'btn-primary'} btn-full">
                            ${posSystem === 'square' ? 'Connected' : 'Connect'}
                        </button>
                    </div>
                    <div class="integration-card">
                        <div class="integration-logo">
                            <i class="ri-leaf-fill" style="color: #4CAF50; font-size: 40px;"></i>
                        </div>
                        <h3>Clover</h3>
                        <p>Import catalog and transactions</p>
                        <button class="btn btn-outline btn-full" disabled>Coming Soon</button>
                    </div>
                    <div class="integration-card manual">
                        <div class="integration-logo">
                            <i class="ri-upload-cloud-2-line" style="color: #C67C43; font-size: 40px;"></i>
                        </div>
                        <h3>CSV Import</h3>
                        <p>Bulk upload products from file</p>
                        <button class="btn btn-ghost btn-full" onclick="uploadCSV()">
                            <i class="ri-upload-2-line"></i> Import
                        </button>
                    </div>
                </div>
            </div>
        `;
    },

    // Shop editor page
    getShopEditorPage() {
        return `
            <div id="page-shop" class="page">
                <div class="page-header">
                    <h1>Shop Page</h1>
                    <button class="btn btn-primary" onclick="saveShopPage()">
                        <i class="ri-save-line"></i> Save
                    </button>
                </div>
                <div class="settings-grid">
                    <div class="card">
                        <h3>Basic Info</h3>
                        <div class="form-group">
                            <label>Shop Name</label>
                            <input type="text" id="shop-name" value="${this.shopData?.name_uz || ''}">
                        </div>
                        <div class="form-group">
                            <label>Phone</label>
                            <input type="tel" id="shop-phone-edit" value="${this.shopData?.phone || ''}">
                        </div>
                        <div class="form-group">
                            <label>Description</label>
                            <textarea id="shop-about" rows="3">${this.shopData?.about || ''}</textarea>
                        </div>
                    </div>
                    <div class="card">
                        <h3>Images</h3>
                        <div class="image-upload-group">
                            <div class="image-upload">
                                <input type="file" id="logo-input" accept="image/*" hidden>
                                <div class="upload-placeholder" onclick="document.getElementById('logo-input').click()">
                                    <i class="ri-image-add-line"></i>
                                    <span>Logo</span>
                                </div>
                                <img id="logo-preview" class="upload-preview hidden" alt="Logo">
                            </div>
                            <div class="image-upload banner">
                                <input type="file" id="banner-input" accept="image/*" hidden>
                                <div class="upload-placeholder" onclick="document.getElementById('banner-input').click()">
                                    <i class="ri-image-add-line"></i>
                                    <span>Banner</span>
                                </div>
                                <img id="banner-preview" class="upload-preview hidden" alt="Banner">
                            </div>
                        </div>
                    </div>
                    <div class="card full-width">
                        <h3>Location</h3>
                        <div class="form-group">
                            <label>Address</label>
                            <input type="text" id="shop-address" value="${this.shopData?.address || ''}">
                        </div>
                        <div id="location-map" class="map-container"></div>
                    </div>
                    <div class="card full-width">
                        <h3>Hours</h3>
                        <div class="hours-grid" id="hours-grid"></div>
                    </div>
                </div>
            </div>
        `;
    },

    // Setup event listeners
    setupEvents() {
        // Chart period buttons
        document.querySelectorAll('.chart-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.chart-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });

        // Filter buttons
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });
    },

    // Navigate to page
    navigateTo(page) {
        // Update nav
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.page === page);
        });

        // Show page
        document.querySelectorAll('.page').forEach(p => {
            p.classList.toggle('active', p.id === `page-${page}`);
        });

        this.currentPage = page;

        // Page-specific init
        if (page === 'shop' || page === 'page') {
            setTimeout(() => this.initMap(), 100);
        }
    },

    // Initialize charts
    initCharts() {
        const salesCtx = document.getElementById('sales-chart');
        if (salesCtx) {
            this.charts.sales = new Chart(salesCtx, {
                type: 'line',
                data: {
                    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                    datasets: [{
                        label: 'Revenue',
                        data: [0, 0, 0, 0, 0, 0, 0],
                        borderColor: '#C67C43',
                        backgroundColor: 'rgba(198, 124, 67, 0.1)',
                        fill: true,
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } }
                }
            });
        }
    },

    // Initialize map
    initMap() {
        const mapContainer = document.getElementById('location-map') || document.getElementById('page-map');
        if (!mapContainer || mapContainer._leaflet_id) return;

        const lat = this.shopData?.location?.lat || 41.2995;
        const lng = this.shopData?.location?.lng || 69.2401;

        const map = L.map(mapContainer).setView([lat, lng], 15);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

        const marker = L.marker([lat, lng], { draggable: true }).addTo(map);

        marker.on('dragend', (e) => {
            const pos = e.target.getLatLng();
            console.log('New location:', pos.lat, pos.lng);
        });

        map.on('click', (e) => {
            marker.setLatLng(e.latlng);
        });
    },

    // Update user info in sidebar
    updateUserInfo() {
        const userInfo = document.getElementById('user-info');
        if (!userInfo) return;

        const name = this.shopData?.name_uz || this.businessData?.name || 'My Business';
        const typeLabel = this.businessType === 'amenity'
            ? 'Amenity'
            : (this.shopMode === 'pos' ? 'Shop • POS' : 'Shop • Manual');

        userInfo.innerHTML = `
            <span class="user-name">${name}</span>
            <span class="user-type">${typeLabel}</span>
        `;
    }
};

// Make navigateTo available globally
function navigateTo(page) {
    Dashboard.navigateTo(page);
}
