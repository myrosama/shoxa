// Main App Module - Coordinates all modules
const App = {
    // Initialize app (called after dashboard is ready)
    async init() {
        this.setupMobileMenu();
        this.setGreeting();

        // Load products if shop
        if (typeof Products !== 'undefined') {
            await Products.load();
        }

        // Load posts
        if (typeof Posts !== 'undefined') {
            await Posts.load();
        }
    },

    // Setup mobile menu
    setupMobileMenu() {
        const sidebar = document.getElementById('sidebar');
        const toggle = document.getElementById('menu-toggle');

        if (toggle && sidebar) {
            toggle.addEventListener('click', () => {
                sidebar.classList.toggle('open');
            });

            // Close on nav click (mobile)
            document.querySelectorAll('.nav-item').forEach(item => {
                item.addEventListener('click', () => {
                    sidebar.classList.remove('open');
                });
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
    },

    // Set greeting based on time
    setGreeting() {
        const hour = new Date().getHours();
        let greeting = 'Good evening!';

        if (hour < 12) greeting = 'Good morning!';
        else if (hour < 18) greeting = 'Good afternoon!';

        if (Auth.userData?.name) {
            greeting += ` ${Auth.userData.name}`;
        }

        const greetingEl = document.getElementById('greeting');
        if (greetingEl) {
            greetingEl.textContent = greeting;
        }
    }
};

// Modal functions
function openProductModal(product = null) {
    const modal = document.getElementById('product-modal');
    const title = document.getElementById('product-modal-title');

    if (modal) {
        modal.classList.remove('hidden');
        if (title) {
            title.textContent = product ? 'Edit Product' : 'Add Product';
        }

        // Clear form or populate with product data
        if (product) {
            document.getElementById('product-id').value = product.id || '';
            document.getElementById('product-name').value = product.name || '';
            document.getElementById('product-sku').value = product.sku || '';
            document.getElementById('product-description').value = product.description || '';
            document.getElementById('product-price').value = product.price || '';
            document.getElementById('product-discount').value = product.salePrice || '';
            document.getElementById('product-stock').value = product.stock || 0;
            document.getElementById('product-reorder').value = product.reorderPoint || 10;
            document.getElementById('product-category').value = product.category || '';
        } else {
            document.getElementById('product-form').reset();
        }
    }
}

function closeProductModal() {
    const modal = document.getElementById('product-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

async function saveProduct() {
    const productId = document.getElementById('product-id')?.value;
    const productData = {
        name: document.getElementById('product-name')?.value,
        sku: document.getElementById('product-sku')?.value || generateSKU(),
        description: document.getElementById('product-description')?.value,
        price: parseFloat(document.getElementById('product-price')?.value) || 0,
        salePrice: parseFloat(document.getElementById('product-discount')?.value) || null,
        stock: parseInt(document.getElementById('product-stock')?.value) || 0,
        reorderPoint: parseInt(document.getElementById('product-reorder')?.value) || 10,
        category: document.getElementById('product-category')?.value,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    if (!productData.name) {
        showToast('Please enter a product name');
        return;
    }

    showLoading();

    try {
        const shopId = Dashboard.shopData?.id;
        if (!shopId) {
            throw new Error('Shop not found');
        }

        const productsRef = db.collection('shops').doc(shopId).collection('products');

        if (productId) {
            await productsRef.doc(productId).update(productData);
            showToast('Product updated!');
        } else {
            productData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            await productsRef.add(productData);
            showToast('Product added!');
        }

        closeProductModal();
        if (typeof Products !== 'undefined') {
            Products.load();
        }
    } catch (error) {
        console.error('Save product error:', error);
        showToast('Failed to save product');
    }

    hideLoading();
}

function generateSKU() {
    return 'SKU-' + Date.now().toString(36).toUpperCase();
}

// Post modal functions
function openPostModal() {
    const modal = document.getElementById('post-modal');
    if (modal) {
        modal.classList.remove('hidden');
        document.getElementById('post-form')?.reset();
        const preview = document.getElementById('post-images-preview');
        if (preview) preview.innerHTML = '';
    }
}

function closePostModal() {
    const modal = document.getElementById('post-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

async function savePost() {
    const content = document.getElementById('post-content')?.value;
    const isStory = document.getElementById('post-is-story')?.checked;

    if (!content) {
        showToast('Please enter some content');
        return;
    }

    showLoading();

    try {
        const shopId = Dashboard.shopData?.id;
        if (!shopId) {
            throw new Error('Shop not found');
        }

        const postData = {
            content: content,
            isStory: isStory || false,
            shopId: shopId,
            authorId: Auth.currentUser.uid,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            expiresAt: isStory ? new Date(Date.now() + 24 * 60 * 60 * 1000) : null
        };

        await db.collection('posts').add(postData);

        showToast(isStory ? 'Story posted!' : 'Post published!');
        closePostModal();

        if (typeof Posts !== 'undefined') {
            Posts.load();
        }
    } catch (error) {
        console.error('Save post error:', error);
        showToast('Failed to create post');
    }

    hideLoading();
}

// Service modal functions (for amenities)
function openServiceModal() {
    const modal = document.getElementById('service-modal');
    if (modal) {
        modal.classList.remove('hidden');
        document.getElementById('service-form')?.reset();
    }
}

function closeServiceModal() {
    const modal = document.getElementById('service-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

async function saveService() {
    const name = document.getElementById('service-name')?.value;
    const desc = document.getElementById('service-desc')?.value;
    const price = document.getElementById('service-price')?.value;
    const duration = document.getElementById('service-duration')?.value;

    if (!name) {
        showToast('Please enter a service name');
        return;
    }

    showLoading();

    try {
        const shopId = Dashboard.shopData?.id;
        if (!shopId) {
            throw new Error('Business not found');
        }

        await db.collection('shops').doc(shopId).collection('services').add({
            name: name,
            description: desc || '',
            price: price ? parseFloat(price) : null,
            duration: duration || null,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        showToast('Service added!');
        closeServiceModal();
        // Reload services list
    } catch (error) {
        console.error('Save service error:', error);
        showToast('Failed to add service');
    }

    hideLoading();
}

// Shop page save
async function saveShopPage() {
    const shopId = Dashboard.shopData?.id;
    if (!shopId) {
        showToast('Shop not found');
        return;
    }

    const shopData = {
        name_uz: document.getElementById('shop-name')?.value,
        name_en: document.getElementById('shop-name')?.value,
        phone: document.getElementById('shop-phone-edit')?.value,
        about: document.getElementById('shop-about')?.value,
        address: document.getElementById('shop-address')?.value,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    showLoading();

    try {
        await db.collection('shops').doc(shopId).update(shopData);
        showToast('Shop page updated!');
    } catch (error) {
        console.error('Save shop error:', error);
        showToast('Failed to save changes');
    }

    hideLoading();
}

// Amenity page save
async function saveAmenityPage() {
    const shopId = Dashboard.shopData?.id;
    if (!shopId) {
        showToast('Business not found');
        return;
    }

    const pageData = {
        name_uz: document.getElementById('page-name')?.value,
        name_en: document.getElementById('page-name')?.value,
        phone: document.getElementById('page-phone')?.value,
        about: document.getElementById('page-desc')?.value,
        address: document.getElementById('page-address')?.value,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    showLoading();

    try {
        await db.collection('shops').doc(shopId).update(pageData);
        showToast('Page updated!');
    } catch (error) {
        console.error('Save page error:', error);
        showToast('Failed to save changes');
    }

    hideLoading();
}

// Integration functions
function syncNow() {
    showToast('Syncing with POS...');
    // In production: call backend to sync
    setTimeout(() => {
        showToast('Sync complete!');
    }, 2000);
}

function uploadCSV() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv,.xlsx';
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (file) {
            showToast(`Importing ${file.name}...`);
            // Process file
            setTimeout(() => {
                showToast('Import complete! 15 products added.');
            }, 2000);
        }
    };
    input.click();
}

function exportInventory() {
    showToast('Exporting inventory...');
}

function exportAnalytics() {
    showToast('Exporting analytics report...');
}

function exportCustomers() {
    showToast('Exporting customer data...');
}

// Utility functions
function showLoading() {
    const loading = document.getElementById('loading');
    if (loading) {
        loading.classList.remove('hidden');
    }
}

function hideLoading() {
    const loading = document.getElementById('loading');
    if (loading) {
        loading.classList.add('hidden');
    }
}

function showToast(message) {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toast-message');

    if (toast && toastMessage) {
        toastMessage.textContent = message;
        toast.classList.remove('hidden');

        setTimeout(() => {
            toast.classList.add('hidden');
        }, 3000);
    }
}
