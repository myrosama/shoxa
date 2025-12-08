// Shop Management Module
const Shop = {
    currentShop: null,
    map: null,
    marker: null,

    // Load shop data
    async load() {
        if (!Auth.userData?.shopId) return;

        try {
            const doc = await db.collection(COLLECTIONS.SHOPS).doc(Auth.userData.shopId).get();
            if (doc.exists) {
                this.currentShop = { id: doc.id, ...doc.data() };
                this.populateForm();
                this.updatePreview();
            }
        } catch (error) {
            console.error('Load shop error:', error);
            showToast('Failed to load shop data');
        }
    },

    // Populate form with shop data
    populateForm() {
        if (!this.currentShop) return;

        document.getElementById('shop-name').value = this.currentShop.name || '';
        document.getElementById('shop-description').value = this.currentShop.description || '';
        document.getElementById('shop-about').value = this.currentShop.about || '';
        document.getElementById('shop-address').value = this.currentShop.location?.address || '';

        if (this.currentShop.location?.lat && this.currentShop.location?.lng) {
            document.getElementById('shop-lat').value = this.currentShop.location.lat;
            document.getElementById('shop-lng').value = this.currentShop.location.lng;
            // Only update marker if map is already initialized
            if (this.map) {
                this.updateMapMarker(this.currentShop.location.lat, this.currentShop.location.lng);
            }
        }

        // Load images
        this.loadImages();

        // Populate hours
        this.populateHours();
    },

    // Load shop images from Telegram
    async loadImages() {
        if (this.currentShop.logoFileId) {
            const logoUrl = await TelegramAPI.getFileUrl(this.currentShop.logoFileId);
            if (logoUrl) {
                const logoPreview = document.getElementById('logo-preview');
                logoPreview.src = logoUrl;
                logoPreview.classList.remove('hidden');
                document.querySelector('#logo-upload .upload-placeholder').classList.add('hidden');
            }
        }

        if (this.currentShop.bannerFileId) {
            const bannerUrl = await TelegramAPI.getFileUrl(this.currentShop.bannerFileId);
            if (bannerUrl) {
                const bannerPreview = document.getElementById('banner-preview');
                bannerPreview.src = bannerUrl;
                bannerPreview.classList.remove('hidden');
                document.querySelector('#banner-upload .upload-placeholder').classList.add('hidden');
            }
        }
    },

    // Populate opening hours
    populateHours() {
        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        const grid = document.getElementById('hours-grid');

        grid.innerHTML = days.map(day => {
            const hours = this.currentShop.openingHours?.[day.toLowerCase()] || { open: '09:00', close: '18:00' };
            return `
        <div class="hour-row">
          <span class="day">${day}</span>
          <input type="time" id="hours-${day.toLowerCase()}-open" value="${hours.open}">
          <span>to</span>
          <input type="time" id="hours-${day.toLowerCase()}-close" value="${hours.close}">
        </div>
      `;
        }).join('');
    },

    // Initialize map
    initMap() {
        if (this.map) return;

        // Default to Tashkent
        const defaultLat = 41.2995;
        const defaultLng = 69.2401;

        this.map = L.map('location-map').setView([defaultLat, defaultLng], 13);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(this.map);

        // Add marker on click
        this.map.on('click', (e) => {
            this.updateMapMarker(e.latlng.lat, e.latlng.lng);
            document.getElementById('shop-lat').value = e.latlng.lat;
            document.getElementById('shop-lng').value = e.latlng.lng;

            // Reverse geocode
            this.reverseGeocode(e.latlng.lat, e.latlng.lng);
        });

        // If shop has location, center on it
        if (this.currentShop?.location?.lat) {
            this.map.setView([this.currentShop.location.lat, this.currentShop.location.lng], 15);
            this.updateMapMarker(this.currentShop.location.lat, this.currentShop.location.lng);
        }
    },

    // Update map marker
    updateMapMarker(lat, lng) {
        if (this.marker) {
            this.marker.setLatLng([lat, lng]);
        } else {
            this.marker = L.marker([lat, lng]).addTo(this.map);
        }
    },

    // Reverse geocode
    async reverseGeocode(lat, lng) {
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
            const data = await response.json();
            if (data.display_name) {
                document.getElementById('shop-address').value = data.display_name;
            }
        } catch (error) {
            console.error('Geocode error:', error);
        }
    },

    // Save shop data
    async save() {
        console.log('=== SAVE SHOP STARTED ===');
        console.log('Auth.userData:', Auth.userData);

        if (!Auth.userData?.shopId) {
            console.error('No shopId found!');
            showToast('Error: No shop ID found. Please log out and log in again.');
            return;
        }

        showLoading();

        try {
            // Collect hours
            const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
            const openingHours = {};
            days.forEach(day => {
                openingHours[day] = {
                    open: document.getElementById(`hours-${day}-open`)?.value || '09:00',
                    close: document.getElementById(`hours-${day}-close`)?.value || '18:00'
                };
            });
            console.log('Opening hours collected:', openingHours);

            // Upload images if changed
            let logoFileId = this.currentShop?.logoFileId || null;
            let bannerFileId = this.currentShop?.bannerFileId || null;

            const logoInput = document.getElementById('logo-input');
            if (logoInput.files && logoInput.files[0]) {
                console.log('Uploading logo to Telegram...');
                const result = await TelegramAPI.uploadFile(logoInput.files[0]);
                console.log('Logo upload result:', result);
                if (result.success) {
                    logoFileId = result.fileId;
                } else {
                    console.error('Logo upload failed:', result.error);
                }
            }

            const bannerInput = document.getElementById('banner-input');
            if (bannerInput.files && bannerInput.files[0]) {
                console.log('Uploading banner to Telegram...');
                const result = await TelegramAPI.uploadFile(bannerInput.files[0]);
                console.log('Banner upload result:', result);
                if (result.success) {
                    bannerFileId = result.fileId;
                } else {
                    console.error('Banner upload failed:', result.error);
                }
            }

            const shopData = {
                name: document.getElementById('shop-name').value,
                description: document.getElementById('shop-description').value,
                about: document.getElementById('shop-about').value,
                location: {
                    lat: parseFloat(document.getElementById('shop-lat').value) || null,
                    lng: parseFloat(document.getElementById('shop-lng').value) || null,
                    address: document.getElementById('shop-address').value
                },
                openingHours: openingHours,
                logoFileId: logoFileId,
                bannerFileId: bannerFileId,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            console.log('Saving to Firestore:', shopData);
            console.log('Shop ID:', Auth.userData.shopId);

            // Update shop document
            await db.collection(COLLECTIONS.SHOPS).doc(Auth.userData.shopId).update(shopData);

            console.log('=== SAVE SUCCESSFUL ===');

            await this.load();
            hideLoading();
            showToast('Shop saved successfully!');
        } catch (error) {
            hideLoading();
            console.error('Save shop error:', error);
            console.error('Error code:', error.code);
            console.error('Error message:', error.message);
            showToast('Failed to save: ' + error.message);
        }
    },

    // Update dashboard preview
    updatePreview() {
        const preview = document.getElementById('shop-preview-content');
        if (!this.currentShop?.name) {
            preview.innerHTML = '<p class="empty-state">Complete your shop setup to see preview</p>';
            return;
        }

        preview.innerHTML = `
      <div style="text-align: center;">
        <h4>${this.currentShop.name}</h4>
        <p style="color: var(--text-muted); font-size: 13px;">${this.currentShop.type || 'Shop'}</p>
        ${this.currentShop.description ? `<p style="margin-top: 8px;">${this.currentShop.description}</p>` : ''}
      </div>
    `;
    }
};

// Setup image preview handlers
document.addEventListener('DOMContentLoaded', () => {
    // Logo preview
    document.getElementById('logo-input').addEventListener('change', (e) => {
        if (e.target.files[0]) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const preview = document.getElementById('logo-preview');
                preview.src = e.target.result;
                preview.classList.remove('hidden');
                document.querySelector('#logo-upload .upload-placeholder').classList.add('hidden');
            };
            reader.readAsDataURL(e.target.files[0]);
        }
    });

    // Banner preview
    document.getElementById('banner-input').addEventListener('change', (e) => {
        if (e.target.files[0]) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const preview = document.getElementById('banner-preview');
                preview.src = e.target.result;
                preview.classList.remove('hidden');
                document.querySelector('#banner-upload .upload-placeholder').classList.add('hidden');
            };
            reader.readAsDataURL(e.target.files[0]);
        }
    });

    // Save shop button
    document.getElementById('save-shop-btn').addEventListener('click', () => Shop.save());
});
