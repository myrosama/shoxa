// Products Management Module
const Products = {
    products: [],
    categories: new Set(),
    editingId: null,

    // Load products
    async load() {
        if (!Auth.userData?.shopId) return;

        try {
            const snapshot = await db.collection(COLLECTIONS.SHOPS)
                .doc(Auth.userData.shopId)
                .collection(COLLECTIONS.PRODUCTS)
                .orderBy('createdAt', 'desc')
                .get();

            this.products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            // Extract categories
            this.categories.clear();
            this.products.forEach(p => {
                if (p.category) this.categories.add(p.category);
            });

            this.render();
            this.updateStats();
            this.populateCategoryFilter();
        } catch (error) {
            console.error('Load products error:', error);
            showToast('Failed to load products');
        }
    },

    // Render products grid
    render(filter = '') {
        const grid = document.getElementById('products-grid');
        let filtered = this.products;

        // Apply search filter
        const search = document.getElementById('product-search').value.toLowerCase();
        if (search) {
            filtered = filtered.filter(p => p.name.toLowerCase().includes(search));
        }

        // Apply category filter
        if (filter) {
            filtered = filtered.filter(p => p.category === filter);
        }

        if (filtered.length === 0) {
            grid.innerHTML = `
        <div class="empty-state">
          <i class="ri-shopping-bag-line"></i>
          <p>No products found</p>
          <button class="btn btn-primary" onclick="openProductModal()">Add Product</button>
        </div>
      `;
            return;
        }

        grid.innerHTML = filtered.map(product => `
      <div class="product-card">
        <img src="${product.imageUrl || 'https://via.placeholder.com/280x180?text=No+Image'}" alt="${product.name}">
        <div class="product-info">
          <div class="product-name">${product.name}</div>
          ${product.category ? `<span style="font-size: 12px; color: var(--text-muted);">${product.category}</span>` : ''}
          <div class="product-price">
            ${product.discountPrice ? `
              <span style="text-decoration: line-through; color: var(--text-muted); font-weight: 400; margin-right: 8px;">$${product.price}</span>
              $${product.discountPrice}
            ` : `$${product.price}`}
          </div>
          ${!product.inStock ? '<span style="color: var(--error); font-size: 12px;">Out of stock</span>' : ''}
          <div class="product-actions">
            <button class="btn btn-ghost" onclick="Products.edit('${product.id}')">
              <i class="ri-edit-line"></i> Edit
            </button>
            <button class="btn btn-ghost" onclick="Products.delete('${product.id}')" style="color: var(--error);">
              <i class="ri-delete-bin-line"></i>
            </button>
          </div>
        </div>
      </div>
    `).join('');
    },

    // Update stats on dashboard
    updateStats() {
        document.getElementById('stat-products').textContent = this.products.length;
    },

    // Populate category filter
    populateCategoryFilter() {
        const select = document.getElementById('product-filter');
        select.innerHTML = '<option value="">All Categories</option>';
        this.categories.forEach(cat => {
            select.innerHTML += `<option value="${cat}">${cat}</option>`;
        });
    },

    // Edit product
    async edit(id) {
        const product = this.products.find(p => p.id === id);
        if (!product) return;

        this.editingId = id;
        document.getElementById('product-modal-title').textContent = 'Edit Product';
        document.getElementById('product-id').value = id;
        document.getElementById('product-name').value = product.name;
        document.getElementById('product-description').value = product.description || '';
        document.getElementById('product-price').value = product.price;
        document.getElementById('product-discount').value = product.discountPrice || '';
        document.getElementById('product-category').value = product.category || '';
        document.getElementById('product-in-stock').checked = product.inStock !== false;

        // Show image if exists
        if (product.imageUrl) {
            const preview = document.getElementById('product-image-preview');
            preview.src = product.imageUrl;
            preview.classList.remove('hidden');
            document.querySelector('.product-image-upload .upload-placeholder').classList.add('hidden');
        }

        openProductModal();
    },

    // Delete product
    async delete(id) {
        if (!confirm('Are you sure you want to delete this product?')) return;

        showLoading();
        try {
            await db.collection(COLLECTIONS.SHOPS)
                .doc(Auth.userData.shopId)
                .collection(COLLECTIONS.PRODUCTS)
                .doc(id)
                .delete();

            await this.load();
            hideLoading();
            showToast('Product deleted');
        } catch (error) {
            hideLoading();
            console.error('Delete product error:', error);
            showToast('Failed to delete product');
        }
    },

    // Save product (create or update)
    async save() {
        showLoading();

        try {
            // Upload image if selected
            let imageUrl = null;
            let imageFileId = null;

            const imageInput = document.getElementById('product-image-input');
            if (imageInput.files[0]) {
                const result = await TelegramAPI.uploadFile(imageInput.files[0]);
                if (result.success) {
                    imageFileId = result.fileId;
                    imageUrl = await TelegramAPI.getFileUrl(result.fileId);
                }
            }

            const productData = {
                name: document.getElementById('product-name').value,
                description: document.getElementById('product-description').value,
                price: parseFloat(document.getElementById('product-price').value),
                discountPrice: document.getElementById('product-discount').value ?
                    parseFloat(document.getElementById('product-discount').value) : null,
                category: document.getElementById('product-category').value,
                inStock: document.getElementById('product-in-stock').checked,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            // Add image if uploaded
            if (imageFileId) {
                productData.imageFileId = imageFileId;
                productData.imageUrl = imageUrl;
            }

            const productsRef = db.collection(COLLECTIONS.SHOPS)
                .doc(Auth.userData.shopId)
                .collection(COLLECTIONS.PRODUCTS);

            if (this.editingId) {
                // Update existing
                await productsRef.doc(this.editingId).update(productData);
            } else {
                // Create new
                productData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
                await productsRef.add(productData);
            }

            await this.load();
            closeProductModal();
            hideLoading();
            showToast(this.editingId ? 'Product updated!' : 'Product added!');
            this.editingId = null;
        } catch (error) {
            hideLoading();
            console.error('Save product error:', error);
            showToast('Failed to save product');
        }
    }
};

// Modal functions
function openProductModal() {
    document.getElementById('product-modal').classList.remove('hidden');
}

function closeProductModal() {
    document.getElementById('product-modal').classList.add('hidden');
    document.getElementById('product-form').reset();
    document.getElementById('product-id').value = '';
    document.getElementById('product-modal-title').textContent = 'Add Product';
    document.getElementById('product-image-preview').classList.add('hidden');
    document.querySelector('.product-image-upload .upload-placeholder').classList.remove('hidden');
    Products.editingId = null;
}

function saveProduct() {
    Products.save();
}

// Setup listeners
document.addEventListener('DOMContentLoaded', () => {
    // Search
    document.getElementById('product-search').addEventListener('input', () => {
        Products.render(document.getElementById('product-filter').value);
    });

    // Category filter
    document.getElementById('product-filter').addEventListener('change', (e) => {
        Products.render(e.target.value);
    });

    // Add product button
    document.getElementById('add-product-btn').addEventListener('click', openProductModal);

    // Product image preview
    document.getElementById('product-image-input').addEventListener('change', (e) => {
        if (e.target.files[0]) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const preview = document.getElementById('product-image-preview');
                preview.src = e.target.result;
                preview.classList.remove('hidden');
                document.querySelector('.product-image-upload .upload-placeholder').classList.add('hidden');
            };
            reader.readAsDataURL(e.target.files[0]);
        }
    });
});
