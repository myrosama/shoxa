// Posts & Stories Management Module
const Posts = {
    posts: [],

    // Load posts
    async load() {
        if (!Auth.userData?.shopId) return;

        try {
            const snapshot = await db.collection(COLLECTIONS.SHOPS)
                .doc(Auth.userData.shopId)
                .collection(COLLECTIONS.POSTS)
                .orderBy('createdAt', 'desc')
                .get();

            this.posts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            this.render();
            this.updateStats();
        } catch (error) {
            console.error('Load posts error:', error);
            showToast('Failed to load posts');
        }
    },

    // Render posts grid
    render() {
        const grid = document.getElementById('posts-grid');

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
            const isStory = post.type === 'story';
            const isExpired = isStory && post.expiresAt && new Date(post.expiresAt.toDate()) < new Date();

            return `
        <div class="post-card ${isExpired ? 'expired' : ''}">
          ${post.imageUrl ? `<img src="${post.imageUrl}" alt="Post image">` : ''}
          <div class="post-content">
            ${isStory ? `
              <span style="display: inline-block; background: linear-gradient(45deg, #f09433, #dc2743); color: white; padding: 2px 8px; border-radius: 4px; font-size: 11px; margin-bottom: 8px;">
                ${isExpired ? 'EXPIRED STORY' : 'STORY'}
              </span>
            ` : ''}
            <p>${post.content || 'No caption'}</p>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 12px; font-size: 12px; color: var(--text-muted);">
              <span>${post.createdAt ? new Date(post.createdAt.toDate()).toLocaleDateString() : ''}</span>
              <button class="btn btn-ghost" onclick="Posts.delete('${post.id}')" style="color: var(--error); padding: 4px 8px;">
                <i class="ri-delete-bin-line"></i>
              </button>
            </div>
          </div>
        </div>
      `;
        }).join('');
    },

    // Update stats
    updateStats() {
        document.getElementById('stat-posts').textContent = this.posts.length;
    },

    // Delete post
    async delete(id) {
        if (!confirm('Are you sure you want to delete this post?')) return;

        showLoading();
        try {
            await db.collection(COLLECTIONS.SHOPS)
                .doc(Auth.userData.shopId)
                .collection(COLLECTIONS.POSTS)
                .doc(id)
                .delete();

            await this.load();
            hideLoading();
            showToast('Post deleted');
        } catch (error) {
            hideLoading();
            console.error('Delete post error:', error);
            showToast('Failed to delete post');
        }
    },

    // Save post
    async save() {
        showLoading();

        try {
            const isStory = document.getElementById('post-is-story').checked;

            // Upload images
            const imageInput = document.getElementById('post-image-input');
            let imageUrl = null;
            let imageFileId = null;

            if (imageInput.files[0]) {
                const result = await TelegramAPI.uploadFile(imageInput.files[0]);
                if (result.success) {
                    imageFileId = result.fileId;
                    imageUrl = await TelegramAPI.getFileUrl(result.fileId);
                }
            }

            const postData = {
                type: isStory ? 'story' : 'post',
                content: document.getElementById('post-content').value,
                imageFileId: imageFileId,
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

            await db.collection(COLLECTIONS.SHOPS)
                .doc(Auth.userData.shopId)
                .collection(COLLECTIONS.POSTS)
                .add(postData);

            await this.load();
            closePostModal();
            hideLoading();
            showToast(isStory ? 'Story created!' : 'Post published!');
        } catch (error) {
            hideLoading();
            console.error('Save post error:', error);
            showToast('Failed to create post');
        }
    }
};

// Modal functions
function openPostModal() {
    document.getElementById('post-modal').classList.remove('hidden');
}

function closePostModal() {
    document.getElementById('post-modal').classList.add('hidden');
    document.getElementById('post-form').reset();
    document.getElementById('post-images-preview').innerHTML = '';
}

function savePost() {
    Posts.save();
}

// Setup listeners
document.addEventListener('DOMContentLoaded', () => {
    // Add post button
    document.getElementById('add-post-btn').addEventListener('click', openPostModal);

    // Post images preview
    document.getElementById('post-image-input').addEventListener('change', (e) => {
        const preview = document.getElementById('post-images-preview');
        preview.innerHTML = '';

        Array.from(e.target.files).forEach(file => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = document.createElement('img');
                img.src = e.target.result;
                img.style.width = '80px';
                img.style.height = '80px';
                img.style.objectFit = 'cover';
                img.style.borderRadius = '8px';
                preview.appendChild(img);
            };
            reader.readAsDataURL(file);
        });
    });
});
