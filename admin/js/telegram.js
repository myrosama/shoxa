// Telegram Bot API for Image Upload
const TelegramAPI = {
    // Upload file to Telegram channel
    async uploadFile(file) {
        const formData = new FormData();
        formData.append('chat_id', TELEGRAM_CONFIG.channelId);
        formData.append('photo', file);

        try {
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
