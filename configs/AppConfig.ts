// Shared configuration for SHOXA App
// Uses environment variables for sensitive data

export const Config = {
    // Telegram API
    telegramBotToken: process.env.EXPO_PUBLIC_TELEGRAM_BOT_TOKEN || '',
    telegramChannelId: process.env.EXPO_PUBLIC_TELEGRAM_CHANNEL_ID || '',
};

// Helper function to get Telegram image URL from file_id
export const getTelegramImageUrl = async (fileId: string): Promise<string | null> => {
    if (!Config.telegramBotToken) {
        console.error('Telegram bot token not configured');
        return null;
    }

    try {
        const response = await fetch(
            `https://api.telegram.org/bot${Config.telegramBotToken}/getFile?file_id=${fileId}`
        );
        const data = await response.json();

        if (data.ok) {
            return `https://api.telegram.org/file/bot${Config.telegramBotToken}/${data.result.file_path}`;
        }
        return null;
    } catch (error) {
        console.error('Error getting Telegram image URL:', error);
        return null;
    }
};
