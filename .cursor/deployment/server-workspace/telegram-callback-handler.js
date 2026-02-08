// Telegram Callback Handler - Обработка inline кнопок для дайджестов
// Интеграция с FixedDigestWithButtons для подсветки кнопок

const FixedDigestWithButtons = require('./fixed-digest-with-buttons.js');

class TelegramCallbackHandler {
    constructor(tools) {
        this.tools = tools;
        this.digestSystem = new FixedDigestWithButtons(tools);
        this.targetUserId = 685668909;
        this.targetChannelId = '-1003723471488'; // ID канала @newsneiron
        
        console.log('🔘 Telegram Callback Handler инициализирован');
    }
    
    // Основной обработчик webhook обновлений (включая callback_query)
    async handleWebhookUpdate(update) {
        try {
            console.log('📱 Получено Telegram обновление:', JSON.stringify(update, null, 2));
            
            // Обрабатываем callback_query от inline кнопок
            if (update.callback_query) {
                return await this.handleCallbackQuery(update.callback_query);
            }
            
            // Обрабатываем обычные сообщения (для отладки)
            if (update.message) {
                return await this.handleMessage(update.message);
            }
            
            // Другие типы обновлений игнорируем
            console.log('ℹ️ Обновление не требует обработки callback handler');
            return { processed: false, reason: 'unsupported_update_type' };
            
        } catch (error) {
            console.error('❌ Ошибка обработки callback webhook:', error);
            return { processed: false, error: error.message };
        }
    }
    
    // Обработка callback_query от inline кнопок
    async handleCallbackQuery(callbackQuery) {
        const { id, from, message, data } = callbackQuery;
        
        console.log(`🔘 Callback Query: user=${from.id}, data=${data}, message_id=${message?.message_id}`);
        
        try {
            // Фильтруем только callback от целевого пользователя
            if (from.id !== this.targetUserId) {
                console.log(`⏭️ Игнорирую callback от пользователя ${from.id} (не целевой)`);
                
                // Отвечаем на callback_query (обязательно!)
                await this.answerCallbackQuery(id, '⏭️ Доступно только владельцу канала');
                
                return { processed: false, reason: 'wrong_user' };
            }
            
            // Проверяем, что это callback из нашего канала
            const chatId = message?.chat?.id?.toString();
            if (chatId !== this.targetChannelId) {
                console.log(`⏭️ Игнорирую callback из чата ${chatId} (не целевой канал)`);
                
                await this.answerCallbackQuery(id, '⏭️ Работает только в канале @newsneiron');
                
                return { processed: false, reason: 'wrong_chat' };
            }
            
            // Проверяем формат callback_data (должно быть r:action:chatId:messageId)
            if (!data || !data.startsWith('r:')) {
                console.log(`⏭️ Неизвестный callback_data: ${data}`);
                
                await this.answerCallbackQuery(id, '⏭️ Неизвестная команда');
                
                return { processed: false, reason: 'unknown_callback_data' };
            }
            
            // Обрабатываем callback через систему дайджестов
            const messageId = message?.message_id?.toString();
            const result = await this.digestSystem.handleCallback(
                data,           // callback_data (например: "r:e:-1003723471488:146")
                from.id,        // userId
                messageId,      // messageId
                chatId          // chatId
            );
            
            if (result) {
                console.log(`✅ Callback успешно обработан: ${result.reaction.emoji} ${result.reaction.name} (${result.reaction.score})`);
                console.log(`📊 Источник: ${result.source}, всего callback: ${result.totalCallbacks}`);
                
                // Отвечаем пользователю об успешной обработке
                const responseText = `${result.reaction.emoji} ${result.reaction.name} (+${result.reaction.score > 0 ? result.reaction.score : result.reaction.score}) к источнику "${result.source}"`;
                await this.answerCallbackQuery(id, responseText);
                
                // Сохраняем в память для статистики
                await this.tools.memory_store({
                    text: `Callback обработан: ${result.reaction.emoji} ${result.reaction.name} на ${result.source} (${result.reaction.score} баллов)`,
                    category: 'preference',
                    importance: 0.7
                });
                
                return {
                    processed: true,
                    callbackId: id,
                    userId: from.id,
                    messageId: messageId,
                    reaction: result.reaction,
                    source: result.source,
                    totalCallbacks: result.totalCallbacks
                };
            } else {
                console.log(`❌ Callback не удалось обработать`);
                
                await this.answerCallbackQuery(id, '❌ Ошибка обработки реакции');
                
                return { processed: false, reason: 'callback_processing_failed' };
            }
            
        } catch (error) {
            console.error(`❌ Ошибка обработки callback query: ${error.message}`);
            
            // Обязательно отвечаем на callback_query даже при ошибке
            await this.answerCallbackQuery(id, '❌ Ошибка сервера').catch(() => {});
            
            return { processed: false, error: error.message };
        }
    }
    
    // Ответ на callback_query (обязательный для всех callback)
    async answerCallbackQuery(callbackQueryId, text = '', showAlert = false) {
        try {
            const result = await this.tools.message({
                action: 'answerCallbackQuery',
                channel: 'telegram',
                callbackQueryId: callbackQueryId,
                text: text,
                showAlert: showAlert
            });
            
            if (result && result.ok) {
                console.log(`✅ Callback query ${callbackQueryId} answered: "${text}"`);
            } else {
                console.error(`❌ Ошибка ответа на callback query: ${JSON.stringify(result)}`);
            }
            
            return result;
            
        } catch (error) {
            console.error(`❌ Ошибка answerCallbackQuery: ${error.message}`);
            return null;
        }
    }
    
    // Обработка обычных сообщений (для отладки)
    async handleMessage(message) {
        console.log(`💬 Сообщение от ${message.from?.username || message.from?.id}: ${message.text?.slice(0, 50) || '[медиа]'}`);
        
        // Можно добавить команды для тестирования callback системы
        if (message.text === '/test_callbacks' && message.from?.id === this.targetUserId) {
            return await this.sendTestMessageWithButtons(message.chat.id);
        }
        
        return { processed: false, reason: 'message_not_handled' };
    }
    
    // Отправка тестового сообщения с кнопками для проверки callback
    async sendTestMessageWithButtons(chatId) {
        try {
            console.log('🧪 Отправляю тестовое сообщение с кнопками...');
            
            const testNews = {
                title: 'ТЕСТ CALLBACK — Проверка подсветки кнопок',
                description: 'Нажми любую кнопку для проверки системы callback. Выбранная кнопка должна подсветиться галочкой ✅',
                url: 'https://example.com/callback-test-' + Date.now(),
                source: 'Тест системы',
                category: 'tech'
            };
            
            const result = await this.digestSystem.sendNewsWithButtons(testNews, 'ТЕСТ');
            
            if (result.success) {
                console.log(`✅ Тестовое сообщение отправлено: ${result.messageId}`);
                return {
                    processed: true,
                    action: 'test_message_sent',
                    messageId: result.messageId,
                    chatId: result.chatId
                };
            } else {
                console.error(`❌ Ошибка отправки тестового сообщения: ${result.error}`);
                return { processed: false, error: result.error };
            }
            
        } catch (error) {
            console.error(`❌ Ошибка sendTestMessageWithButtons: ${error.message}`);
            return { processed: false, error: error.message };
        }
    }
    
    // Получить статистику callback обработки
    getCallbackStats() {
        return {
            targetUserId: this.targetUserId,
            targetChannelId: this.targetChannelId,
            digestSystemStats: this.digestSystem.getCallbackStats(),
            handlerInitialized: true
        };
    }
}

// Express.js middleware для callback webhook
function createCallbackWebhookMiddleware(tools) {
    const handler = new TelegramCallbackHandler(tools);
    
    return async (req, res) => {
        try {
            const update = req.body;
            
            if (!update) {
                return res.status(400).json({ error: 'No update data' });
            }
            
            const result = await handler.handleWebhookUpdate(update);
            
            // Отвечаем успешно всегда, чтобы Telegram не ретраил
            res.status(200).json({
                ok: true,
                result: result
            });
            
        } catch (error) {
            console.error('❌ Ошибка в callback webhook middleware:', error);
            
            // Все равно отвечаем успешно
            res.status(200).json({
                ok: false,
                error: error.message
            });
        }
    };
}

// Простая функция для прямого использования
async function handleTelegramCallback(update, tools) {
    const handler = new TelegramCallbackHandler(tools);
    return await handler.handleWebhookUpdate(update);
}

module.exports = {
    TelegramCallbackHandler,
    createCallbackWebhookMiddleware,
    handleTelegramCallback
};

// Пример использования
if (require.main === module) {
    console.log(`
💡 TELEGRAM CALLBACK HANDLER:

✅ Обработка callback_query от inline кнопок
✅ Фильтрация по пользователю (ID: 685668909) и каналу (@newsneiron)
✅ Интеграция с FixedDigestWithButtons для подсветки кнопок
✅ Автоматическое обновление рейтингов источников

🔄 ИСПОЛЬЗОВАНИЕ:

// 1. Express.js middleware
const express = require('express');
const { createCallbackWebhookMiddleware } = require('./telegram-callback-handler.js');

const app = express();
app.use(express.json());

const tools = { message, memory_store, memory_recall };
app.post('/webhook/telegram', createCallbackWebhookMiddleware(tools));

app.listen(3000, () => {
    console.log('🚀 Callback webhook сервер запущен на порту 3000');
});

// 2. Прямое использование функции
const { handleTelegramCallback } = require('./telegram-callback-handler.js');

async function processUpdate(update) {
    const tools = { message, memory_store, memory_recall };
    const result = await handleTelegramCallback(update, tools);
    console.log('Результат:', result);
}

// 3. Тест кнопок
// Отправь команду /test_callbacks в канал для проверки системы
`);
}