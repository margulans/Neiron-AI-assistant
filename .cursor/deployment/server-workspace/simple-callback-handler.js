// Simple Callback Handler - Упрощенная обработка callback без answerCallbackQuery
// Интеграция с основной системой OpenClaw для подсветки кнопок

const fs = require('fs');

class SimpleCallbackHandler {
    constructor(tools) {
        this.tools = tools;
        this.targetUserId = 685668909;
        this.targetChannelId = '-1003723471488';
        
        // Карта отправленных сообщений для callback обработки
        this.sentMessages = new Map();
        this.loadMessagesSync();
        
        console.log('🔘 Simple Callback Handler инициализирован');
    }
    
    // Синхронная загрузка карты сообщений
    loadMessagesSync() {
        try {
            const messagesPath = 'data/sent-messages-map.json';
            if (fs.existsSync(messagesPath)) {
                const data = JSON.parse(fs.readFileSync(messagesPath, 'utf8'));
                this.sentMessages = new Map(Object.entries(data.sentMessages || {}));
                console.log(`📥 Загружено ${this.sentMessages.size} записей для callback`);
            }
        } catch (error) {
            console.error('❌ Ошибка загрузки сообщений:', error.message);
        }
    }
    
    // Синхронное сохранение карты сообщений
    saveMessagesSync() {
        try {
            if (!fs.existsSync('data')) {
                fs.mkdirSync('data', { recursive: true });
            }
            
            const messagesPath = 'data/sent-messages-map.json';
            fs.writeFileSync(messagesPath, JSON.stringify({
                sentMessages: Object.fromEntries(this.sentMessages),
                savedAt: Date.now()
            }, null, 2));
            
            console.log('💾 Карта сообщений сохранена');
        } catch (error) {
            console.error('❌ Ошибка сохранения сообщений:', error.message);
        }
    }
    
    // Регистрация сообщения с кнопками
    registerMessageWithButtons(messageId, chatId, newsData) {
        const registrationData = {
            messageId: messageId,
            chatId: chatId,
            newsData: newsData,
            callbacks: [],
            timestamp: Date.now(),
            registered: new Date().toISOString()
        };
        
        this.sentMessages.set(messageId, registrationData);
        this.saveMessagesSync();
        
        console.log(`📝 Сообщение ${messageId} зарегистрировано для callback`);
        return registrationData;
    }
    
    // Обработка callback через команду от пользователя
    async handleCallbackCommand(message) {
        try {
            // Ищем callback_data в сообщении
            const text = message.text || '';
            
            // Проверяем формат: callback:action:chatId:messageId
            if (!text.startsWith('callback:')) {
                return null;
            }
            
            const parts = text.split(':');
            if (parts.length !== 4) {
                console.log(`❌ Неверный формат callback команды: ${text}`);
                return null;
            }
            
            const [prefix, action, chatId, messageId] = parts;
            
            // Проверяем пользователя
            if (message.from?.id !== this.targetUserId) {
                console.log(`⏭️ Callback от неавторизованного пользователя: ${message.from?.id}`);
                return null;
            }
            
            return await this.processCallback(action, chatId, messageId, message.from.id);
            
        } catch (error) {
            console.error(`❌ Ошибка handleCallbackCommand: ${error.message}`);
            return null;
        }
    }
    
    // Обработка callback данных
    async processCallback(action, chatId, messageId, userId) {
        try {
            // Находим данные сообщения
            const messageData = this.sentMessages.get(messageId);
            if (!messageData) {
                console.log(`⚠️ Сообщение ${messageId} не найдено в карте callback`);
                return null;
            }
            
            // Определяем реакцию
            const reactionMap = {
                'e': { emoji: '🔥', name: 'Отлично', score: 10 },
                'l': { emoji: '👍', name: 'Лайк', score: 5 },
                'd': { emoji: '👎', name: 'Дизлайк', score: -3 },
                't': { emoji: '💩', name: 'Мусор', score: -5 }
            };
            
            const reaction = reactionMap[action];
            if (!reaction) {
                console.log(`❌ Неизвестная реакция: ${action}`);
                return null;
            }
            
            // Записываем callback
            const callbackRecord = {
                action: action,
                reaction: reaction,
                userId: userId,
                timestamp: Date.now()
            };
            
            messageData.callbacks.push(callbackRecord);
            
            console.log(`👆 Callback обработан: ${reaction.emoji} ${reaction.name} (${reaction.score})`);
            
            // Обновляем кнопки с подсветкой
            await this.updateButtonsWithHighlight(messageId, chatId, action, messageData);
            
            // Отправляем подтверждение пользователю
            await this.sendConfirmationMessage(reaction, messageData);
            
            // Сохраняем данные
            this.saveMessagesSync();
            
            return {
                success: true,
                messageId: messageId,
                reaction: reaction,
                totalCallbacks: messageData.callbacks.length
            };
            
        } catch (error) {
            console.error(`❌ Ошибка processCallback: ${error.message}`);
            return null;
        }
    }
    
    // Обновление кнопок с подсветкой выбранной
    async updateButtonsWithHighlight(messageId, chatId, selectedAction, messageData) {
        try {
            // Создаем кнопки с подсветкой выбранной
            const buttonTexts = {
                'e': selectedAction === 'e' ? '✅ Отлично' : '🔥 Отлично',
                'l': selectedAction === 'l' ? '✅ Лайк' : '👍 Лайк',
                'd': selectedAction === 'd' ? '✅ Дизлайк' : '👎 Дизлайк',
                't': selectedAction === 't' ? '✅ Мусор' : '💩 Мусор'
            };
            
            // Используем тестовый префикс для тестовых сообщений
            const prefix = messageData.newsData?.title?.includes('ТЕСТ') ? 'test' : 'r';
            
            const buttons = [
                [
                    {"text": buttonTexts.e, "callback_data": `${prefix}:e:${chatId}:${messageId}`},
                    {"text": buttonTexts.l, "callback_data": `${prefix}:l:${chatId}:${messageId}`},
                    {"text": buttonTexts.d, "callback_data": `${prefix}:d:${chatId}:${messageId}`},
                    {"text": buttonTexts.t, "callback_data": `${prefix}:t:${chatId}:${messageId}`}
                ]
            ];
            
            // Получаем текст новости
            const newsText = this.formatNewsText(messageData.newsData);
            
            // Обновляем сообщение
            const result = await this.tools.message({
                action: 'edit',
                channel: 'telegram',
                chatId: chatId,
                messageId: parseInt(messageId),
                message: newsText,
                buttons: buttons
            });
            
            if (result && result.ok) {
                console.log(`✅ Кнопки обновлены с подсветкой: ${buttonTexts[selectedAction]}`);
            } else {
                console.error(`❌ Ошибка обновления кнопок: ${JSON.stringify(result)}`);
            }
            
        } catch (error) {
            console.error(`❌ Ошибка updateButtonsWithHighlight: ${error.message}`);
        }
    }
    
    // Отправка подтверждения пользователю
    async sendConfirmationMessage(reaction, messageData) {
        try {
            const source = messageData.newsData?.source || 'новость';
            const confirmText = `${reaction.emoji} **Реакция зарегистрирована!**\\n\\n${reaction.name} (${reaction.score > 0 ? '+' : ''}${reaction.score}) → "${source}"\\n\\nТвоя оценка поможет улучшить следующие дайджесты! 🎯`;
            
            await this.tools.message({
                action: 'send',
                channel: 'telegram',
                target: this.targetUserId,
                message: confirmText,
                silent: true
            });
            
            console.log(`📨 Подтверждение отправлено: ${reaction.emoji} ${reaction.name}`);
            
        } catch (error) {
            console.error(`❌ Ошибка отправки подтверждения: ${error.message}`);
        }
    }
    
    // Форматирование текста новости
    formatNewsText(newsData) {
        if (!newsData) return 'Неизвестная новость';
        
        const categoryEmojis = {
            'AI': '🤖', 'robotics': '🦾', 'eVTOL': '✈️', 'tools': '💻',
            'tech': '⚡', 'business': '💼', 'investments': '💰', 'other': '📰'
        };
        
        const categoryEmoji = categoryEmojis[newsData.category] || categoryEmojis.other;
        const title = `${categoryEmoji} **${newsData.title}**`;
        const description = newsData.description || 'Подробности по ссылке.';
        const sourceLine = `\\n\\n📰 ${newsData.source || 'Источник'}\\n🔗 ${newsData.url || ''}`;
        
        return `${title}\\n\\n${description}${sourceLine}`;
    }
    
    // Создание команды для callback (для отладки)
    createCallbackCommand(action, chatId, messageId) {
        return `callback:${action}:${chatId}:${messageId}`;
    }
    
    // Получить статистику callback
    getCallbackStats() {
        let totalCallbacks = 0;
        const actionCounts = {};
        
        for (const messageData of this.sentMessages.values()) {
            if (messageData.callbacks && Array.isArray(messageData.callbacks)) {
                totalCallbacks += messageData.callbacks.length;
                
                for (const callback of messageData.callbacks) {
                    const action = callback.action;
                    actionCounts[action] = (actionCounts[action] || 0) + 1;
                }
            }
        }
        
        return {
            totalMessages: this.sentMessages.size,
            totalCallbacks: totalCallbacks,
            actionCounts: actionCounts,
            targetUserId: this.targetUserId,
            targetChannelId: this.targetChannelId
        };
    }
}

module.exports = SimpleCallbackHandler;

// Пример использования
if (require.main === module) {
    console.log(`
💡 SIMPLE CALLBACK HANDLER:

✅ Упрощенная обработка callback без специальных API
✅ Подсветка выбранных кнопок через editMessage
✅ Подтверждения пользователю через личные сообщения
✅ Интеграция с существующей системой дайджестов

🔄 ИСПОЛЬЗОВАНИЕ:

const SimpleCallbackHandler = require('./simple-callback-handler.js');
const handler = new SimpleCallbackHandler(tools);

// Регистрация сообщения с кнопками
handler.registerMessageWithButtons('149', '-1003723471488', {
    title: 'Тестовая новость',
    source: 'Test Source',
    category: 'tech'
});

// Обработка callback команды от пользователя  
const result = await handler.handleCallbackCommand({
    text: 'callback:e:-1003723471488:149',
    from: { id: 685668909 }
});

// Проверка статистики
const stats = handler.getCallbackStats();
console.log('Статистика:', stats);
`);
}