// Telegram Bot API for Image Upload
const TelegramAPI = {
    // Compress image before upload
    async compressImage(file, maxWidth = 1280, quality = 0.8) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;

                    // Scale down if too large
                    if (width > maxWidth) {
                        height = (height * maxWidth) / width;
                        width = maxWidth;
                    }

                    canvas.width = width;
                    canvas.height = height;

                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    canvas.toBlob((blob) => {
                        resolve(new File([blob], file.name, { type: 'image/jpeg' }));
                    }, 'image/jpeg', quality);
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        });
    },

    // Upload file to Telegram channel
    async uploadFile(file) {
        try {
            // Compress image first
            console.log('Compressing image...');
            const compressedFile = await this.compressImage(file);
            console.log('Original size:', file.size, 'Compressed size:', compressedFile.size);

            const formData = new FormData();
            formData.append('chat_id', TELEGRAM_CONFIG.channelId);
            formData.append('photo', compressedFile);

            const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_CONFIG.botToken}/sendPhoto`, {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (data.ok) {
                // Get the largest photo size
                const photo = data.result.photo[data.result.photo.length - 1];
                return {
                    success: true,
                    fileId: photo.file_id,
                    fileUniqueId: photo.file_unique_id
                };
            } else {
                console.error('Telegram upload failed:', data);
                return { success: false, error: data.description };
            }
        } catch (error) {
            console.error('Telegram upload error:', error);
            return { success: false, error: error.message };
        }
    },

    // Get file URL from file_id
    async getFileUrl(fileId) {
        try {
            const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_CONFIG.botToken}/getFile?file_id=${fileId}`);
            const data = await response.json();

            if (data.ok) {
                return `https://api.telegram.org/file/bot${TELEGRAM_CONFIG.botToken}/${data.result.file_path}`;
            }
            return null;
        } catch (error) {
            console.error('Get file URL error:', error);
            return null;
        }
    },

    // Upload document (for larger files)
    async uploadDocument(file) {
        const formData = new FormData();
        formData.append('chat_id', TELEGRAM_CONFIG.channelId);
        formData.append('document', file);

        try {
            const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_CONFIG.botToken}/sendDocument`, {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (data.ok) {
                return {
                    success: true,
                    fileId: data.result.document.file_id,
                    fileUniqueId: data.result.document.file_unique_id
                };
            } else {
                return { success: false, error: data.description };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
};
