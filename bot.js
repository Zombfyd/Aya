const TelegramBot = require('node-telegram-bot-api');
const token = '7726659806:AAF0LR4s95SgbhtcFXjkt5IPCkUjifCWUGI'; // Replace with your new token
const bot = new TelegramBot(token, { polling: true });

bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, "Welcome to Tears of Aya!", {
        reply_markup: {
            inline_keyboard: [
                [{ text: "Play Now", web_app: { url: "https://www.ayaonsui.xyz/tears-of-aya" } }]
            ]
        }
    });
});