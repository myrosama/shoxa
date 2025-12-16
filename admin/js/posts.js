// Posts & Stories Management Module
const Posts = {
    posts: [],

    // Load posts
    async load() {
        const shopId = Dashboard.shopData?.id;
        if (!shopId) return;

        try {
            const snapshot = await db.collection('posts')
                .where('shopId', '==', shopId)
                .orderBy('createdAt', 'desc')
                .get();

            this.posts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            this.render();
        } catch (error) {
            console.error('Load posts error:', error);
        }
    },

    // Render posts grid
    render() {
        const grid = document.getElementById('posts-grid');
        if (!grid) return;

        if (this.posts.length === 0) {
            grid.innerHTML = `
                <div class="empty-state">
                    <i class="ri-image-line"></i>
                    <p>No posts yet</p>
                    <button class="btn btn-primary" onclick="openPostModal()">Create Your First Post</button>
                </div>
            `;
            return;
        }

        grid.innerHTML = this.posts.map(post => {
            const isStory = post.isStory;
            const isExpired = isStory && post.expiresAt && new Date(post.expiresAt.toDate()) < new Date();

            return `
                <div class="post-card ${isExpired ? 'expired' : ''}">
                    ${post.imageUrl ? `<img src="${post.imageUrl}" alt="Post image">` : ''}
                    <div class="post-content">
                        ${isStory ? `
                            <span class="post-badge ${isExpired ? 'expired' : 'story'}">
                                ${isExpired ? 'EXPIRED' : 'STORY'}
                            </span>
                        ` : ''}
                        <p class="post-text">${post.content || 'No caption'}</p>
                        <div class="post-meta">
                            <span>${post.createdAt ? this.formatDate(post.createdAt) : ''}</span>
                            <button class="btn-icon" onclick="Posts.delete('${post.id}')" style="color: var(--error);">
                                <i class="ri-delete-bin-line"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    },

    // Format date
    formatDate(timestamp) {
        if (!timestamp) return '';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    },

    // Delete post
    async delete(id) {
        if (!confirm('Are you sure you want to delete this post?')) return;

        showLoading();
        try {
            await db.collection('posts').doc(id).delete();
            await this.load();
            showToast('Post deleted');
        } catch (error) {
            console.error('Delete post error:', error);
            showToast('Failed to delete post');
        }
        hideLoading();
    },

    // Save post
    async save() {
        const shopId = Dashboard.shopData?.id;
        if (!shopId) {
            showToast('Shop not found');
            return;
        }

        showLoading();

        try {
            const isStory = document.getElementById('post-is-story')?.checked;
            const content = document.getElementById('post-content')?.value;

            // Upload images if any
            const imageInput = document.getElementById('post-image-input');
            let imageUrl = null;

            if (imageInput?.files[0] && typeof TelegramAPI !== 'undefined') {
                const result = await TelegramAPI.uploadFile(imageInput.files[0]);
                if (result.success) {
                    imageUrl = await TelegramAPI.getFileUrl(result.fileId);
                }
            }

            const postData = {
                shopId: shopId,
                authorId: Auth.currentUser.uid,
                isStory: isStory || false,
                content: content || '',
                imageUrl: imageUrl,
                likes: 0,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            // Stories expire in 24 hours
            if (isStory) {
                const expiresAt = new Date();
                expiresAt.setHours(expiresAt.getHours() + 24);
                postData.expiresAt = firebase.firestore.Timestamp.fromDate(expiresAt);
            }

            await db.collection('posts').add(postData);

            await this.load();
            closePostModal();
            showToast(isStory ? 'Story created!' : 'Post published!');
        } catch (error) {
            console.error('Save post error:', error);
            showToast('Failed to create post');
        }

        hideLoading();
    }
};

// Setup listeners when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Post images preview
    const imageInput = document.getElementById('post-image-input');
    if (imageInput) {
        imageInput.addEventListener('change', (e) => {
            const preview = document.getElementById('post-images-preview');
            if (!preview) return;

            preview.innerHTML = '';

            Array.from(e.target.files).forEach(file => {
                const reader = new FileReader();
                reader.onload = (evt) => {
                    const img = document.createElement('img');
                    img.src = evt.target.result;
                    img.className = 'preview-thumb';
                    preview.appendChild(img);
                };
                reader.readAsDataURL(file);
            });
        });
    }
});
