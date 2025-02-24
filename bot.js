const TelegramBot = require('node-telegram-bot-api');
const token = '7726659806:AAF0LR4s95SgbhtcFXjkt5IPCkUjifCWUGI'; // Replace with your new token
const bot = new TelegramBot(token, { polling: true });

// Store user sessions
const userSessions = new Map();

bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, "Welcome to Tears of Aya! Choose your version:", {
        reply_markup: {
            inline_keyboard: [
                [
                    { text: "Play Free Version", web_app: { url: "https://ayagame.onrender.com" } },
                    { text: "Play Web3 Version", web_app: { url: "https://www.ayaonsui.xyz/tears-of-aya" } }
                ],
                [{ text: "View Leaderboard", callback_data: 'leaderboard' }]
            ]
        }
    });
});

bot.onText(/\/leaderboard/, async (msg) => {
    const chatId = msg.chat.id;
    try {
        const response = await fetch('https://ayagame.onrender.com/api/web2/leaderboard');
        const leaderboard = await response.json();
        
        let message = "🏆 Top Players 🏆\n\n";
        leaderboard.slice(0, 10).forEach((entry, index) => {
            message += `${index + 1}. ${entry.playerName}: ${entry.score}\n`;
        });
        
        bot.sendMessage(chatId, message);
    } catch (error) {
        bot.sendMessage(chatId, "Sorry, couldn't fetch the leaderboard right now. Try again later!");
    }
});

bot.onText(/\/help/, (msg) => {
    const chatId = msg.chat.id;
    const helpMessage = `
🎮 Tears of Aya - Commands:

/start - Start the game
/leaderboard - View top scores
/help - Show this help message
/web3 - Learn about the Web3 version

Play the free version directly in Telegram or try our Web3 version for additional rewards!
    `;
    bot.sendMessage(chatId, helpMessage);
});

bot.onText(/\/web3/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, 
        "🎮 Try our Web3 version to compete for SUI tokens and exclusive rewards!\n\n" +
        "Features:\n" +
        "• Earn SUI tokens\n" +
        "• Compete on the blockchain\n" +
        "• Exclusive rewards\n\n" +
        "Ready to play?",
        {
            reply_markup: {
                inline_keyboard: [
                    [{ text: "Play Web3 Version", web_app: { url: "https://www.ayaonsui.xyz/tears-of-aya" } }]
                ]
            }
        }
    );
});

// Handle callback queries
bot.on('callback_query', async (callbackQuery) => {
    const chatId = callbackQuery.message.chat.id;
    
    if (callbackQuery.data === 'leaderboard') {
        try {
            const response = await fetch('https://ayagame.onrender.com/api/web2/leaderboard');
            const leaderboard = await response.json();
            
            let message = "🏆 Top Players 🏆\n\n";
            leaderboard.slice(0, 10).forEach((entry, index) => {
                message += `${index + 1}. ${entry.playerName}: ${entry.score}\n`;
            });
            
            bot.sendMessage(chatId, message);
        } catch (error) {
            bot.sendMessage(chatId, "Sorry, couldn't fetch the leaderboard right now. Try again later!");
        }
    }
});

module.exports = bot;