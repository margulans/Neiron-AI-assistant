// Native-Like Buttons - Имитация встроенных реакций через кардинальное изменение кнопок
// Максимальное приближение к нативному поведению Telegram реакций

const fs = require('fs');

class NativeLikeButtons {
    constructor(tools) {
        this.tools = tools;
        this.targetUserId = 685668909;
        this.targetChannelId = '-1003723471488';
        
        // Карта состояний кнопок
        this.buttonStates = new Map();
        this.loadStatesSync();
        
        console.log('⚡ Native-Like Buttons система инициализирована');
    }
    
    // Синхронная загрузка состояний кнопок
    loadStatesSync() {
        try {
            const statesPath = 'data/button-states.json';
            if (fs.existsSync(statesPath)) {
                const data = JSON.parse(fs.readFileSync(statesPath, 'utf8'));
                this.buttonStates = new Map(Object.entries(data.buttonStates || {}));
                console.log(`📥 Загружено ${this.buttonStates.size} состояний кнопок`);
            }
        } catch (error) {
            console.error('❌ Ошибка загрузки состояний:', error.message);
        }
    }
    
    // Синхронное сохранение состояний
    saveStatesSync() {
        try {
            if (!fs.existsSync('data')) {
                fs.mkdirSync('data', { recursive: true });
            }
            
            const statesPath = 'data/button-states.json';
            fs.writeFileSync(statesPath, JSON.stringify({
                buttonStates: Object.fromEntries(this.buttonStates),
                savedAt: Date.now()
            }, null, 2));
            
            console.log('💾 Состояния кнопок сохранены');
        } catch (error) {
            console.error('❌ Ошибка сохранения состояний:', error.message);
        }
    }
    
    // Регистрация сообщения с кнопками
    registerMessage(messageId, chatId, newsData) {
        const messageState = {
            messageId: messageId,
            chatId: chatId,
            newsData: newsData,
            selectedReaction: null, // Какая реакция выбрана
            timestamp: Date.now(),
            registered: new Date().toISOString()
        };
        
        this.buttonStates.set(messageId, messageState);
        this.saveStatesSync();
        
        console.log(`📝 Сообщение ${messageId} зарегистрировано для native-like кнопок`);
        return messageState;
    }
    
    // Обработка callback через команду от пользователя
    async handleNativeCallback(message) {
        try {
            const text = message.text || '';
            
            // Проверяем формат: callback:action:chatId:messageId
            if (!text.startsWith('callback:')) {
                return null;
            }
            
            const parts = text.split(':');
            if (parts.length !== 4) {
                console.log(`❌ Неверный формат: ${text}`);
                return null;
            }
            
            const [prefix, action, chatId, messageId] = parts;
            
            // Проверяем пользователя
            if (message.from?.id !== this.targetUserId) {
                console.log(`⏭️ Callback от неавторизованного пользователя: ${message.from?.id}`);
                return null;
            }
            
            return await this.processNativeCallback(action, chatId, messageId, message.from.id);
            
        } catch (error) {
            console.error(`❌ Ошибка handleNativeCallback: ${error.message}`);
            return null;
        }
    }
    
    // Обработка native-like callback
    async processNativeCallback(action, chatId, messageId, userId) {
        try {
            // Находим состояние сообщения
            const messageState = this.buttonStates.get(messageId);
            if (!messageState) {
                console.log(`⚠️ Сообщение ${messageId} не найдено`);
                return null;
            }
            
            // Определяем реакцию
            const reactionMap = {
                'e': { emoji: '🔥', name: 'Отлично', score: 10, color: '🟠' },
                'l': { emoji: '👍', name: 'Лайк', score: 5, color: '🟢' },
                'd': { emoji: '👎', name: 'Дизлайк', score: -3, color: '🟡' },
                't': { emoji: '💩', name: 'Мусор', score: -5, color: '🔴' }
            };
            
            const reaction = reactionMap[action];
            if (!reaction) {
                console.log(`❌ Неизвестная реакция: ${action}`);
                return null;
            }
            
            // Сохраняем выбранную реакцию
            messageState.selectedReaction = action;
            messageState.reactionData = reaction;
            messageState.lastReactionAt = Date.now();
            
            console.log(`👆 Native callback: ${reaction.emoji} ${reaction.name} (${reaction.score})`);
            
            // КАРДИНАЛЬНО МЕНЯЕМ ВСЕ КНОПКИ
            await this.updateButtonsNativeStyle(messageId, chatId, action, messageState);
            
            // Отправляем подтверждение
            await this.sendNativeConfirmation(reaction, messageState);
            
            // Сохраняем состояние
            this.saveStatesSync();
            
            return {
                success: true,
                messageId: messageId,
                reaction: reaction,
                selectedAction: action
            };
            
        } catch (error) {
            console.error(`❌ Ошибка processNativeCallback: ${error.message}`);
            return null;
        }
    }
    
    // Обновление кнопок в native стиле (кардинальное изменение)
    async updateButtonsNativeStyle(messageId, chatId, selectedAction, messageState) {
        try {
            // Создаем КАРДИНАЛЬНО НОВЫЕ кнопки
            const nativeButtons = this.createNativeStyleButtons(selectedAction, chatId, messageId);
            
            // Получаем текст новости
            const newsText = this.formatNewsText(messageState.newsData);
            
            console.log(`🔄 Кардинально меняем кнопки для сообщения ${messageId}`);
            console.log(`✨ Выбрано: ${selectedAction}, новые кнопки:`, nativeButtons[0].map(b => b.text));
            
            // Обновляем сообщение с новыми кнопками
            const result = await this.tools.message({
                action: 'edit',
                channel: 'telegram',
                chatId: chatId,
                messageId: parseInt(messageId),
                message: newsText,
                buttons: nativeButtons
            });
            
            if (result && result.ok) {
                console.log(`✅ Кнопки кардинально изменены в native стиле`);
            } else {
                console.error(`❌ Ошибка изменения кнопок: ${JSON.stringify(result)}`);
            }
            
        } catch (error) {
            console.error(`❌ Ошибка updateButtonsNativeStyle: ${error.message}`);
        }
    }
    
    // Создание кнопок в native стиле
    createNativeStyleButtons(selectedAction, chatId, messageId) {
        const selectedReactionMap = {
            'e': '🟠 ВЫ ОЦЕНИЛИ: ОТЛИЧНО',
            'l': '🟢 ВЫ ОЦЕНИЛИ: ЛАЙК', 
            'd': '🟡 ВЫ ОЦЕНИЛИ: ДИЗЛАЙК',
            't': '🔴 ВЫ ОЦЕНИЛИ: МУСОР'
        };
        
        const inactiveButtons = {
            'e': '🔥 Отлично',
            'l': '👍 Лайк',
            'd': '👎 Дизлайк', 
            't': '💩 Мусор'
        };
        
        // Создаем новые кнопки
        const buttons = [];
        
        ['e', 'l', 'd', 't'].forEach(action => {
            if (action === selectedAction) {
                // Выбранная кнопка - кардинально другая
                buttons.push({
                    text: selectedReactionMap[action],
                    callback_data: `selected:${action}:${chatId}:${messageId}`
                });
            } else {
                // Остальные кнопки - неактивные
                buttons.push({
                    text: `⚫ ${inactiveButtons[action]}`,
                    callback_data: `inactive:${action}:${chatId}:${messageId}`
                });
            }
        });
        
        // Группируем по 2 кнопки в ряд
        return [
            [buttons[0], buttons[1]],
            [buttons[2], buttons[3]]
        ];
    }
    
    // Отправка подтверждения в native стиле
    async sendNativeConfirmation(reaction, messageState) {
        try {
            const source = messageState.newsData?.source || 'новость';
            const confirmText = `${reaction.color} **${reaction.emoji} ${reaction.name.toUpperCase()}!**\\n\\n**+${reaction.score > 0 ? reaction.score : reaction.score} баллов** → "${source}"\\n\\n🎯 **Реакция учтена!** Кнопка изменена в стиле Telegram.\\n\\n_Система адаптируется под твои предпочтения_ ⚡`;
            
            await this.tools.message({
                action: 'send',
                channel: 'telegram',
                target: this.targetUserId,
                message: confirmText,
                silent: true
            });
            
            console.log(`📨 Native подтверждение: ${reaction.emoji} ${reaction.name}`);
            
        } catch (error) {
            console.error(`❌ Ошибка native подтверждения: ${error.message}`);
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
    
    // Отправка новости с native-like кнопками
    async sendNewsWithNativeButtons(newsData) {
        try {
            // Шаг 1: Отправляем текст
            const newsText = this.formatNewsText(newsData);
            
            const result = await this.tools.message({
                action: 'send',
                channel: 'telegram',
                target: '@newsneiron',
                message: newsText,
                silent: false
            });
            
            if (!result || !result.messageId) {
                return { success: false, error: 'no_message_id' };
            }
            
            const messageId = result.messageId.toString();
            const chatId = result.chatId || this.targetChannelId;
            
            // Регистрируем сообщение
            this.registerMessage(messageId, chatId, newsData);
            
            // Пауза
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Шаг 2: Добавляем native-like кнопки
            const nativeButtons = [[
                {"text": "🔥 Отлично", "callback_data": `native:e:${chatId}:${messageId}`},
                {"text": "👍 Лайк", "callback_data": `native:l:${chatId}:${messageId}`}
            ], [
                {"text": "👎 Дизлайк", "callback_data": `native:d:${chatId}:${messageId}`},
                {"text": "💩 Мусор", "callback_data": `native:t:${chatId}:${messageId}`}
            ]];
            
            const editResult = await this.tools.message({
                action: 'edit',
                channel: 'telegram',
                chatId: chatId,
                messageId: parseInt(messageId),
                message: newsText,
                buttons: nativeButtons
            });
            
            if (editResult && editResult.ok) {
                console.log(`✅ Native-like кнопки добавлены к сообщению ${messageId}`);
                
                return {
                    success: true,
                    messageId: messageId,
                    chatId: chatId,
                    newsData: newsData
                };
            } else {
                console.error(`❌ Ошибка добавления native кнопок`);
                return { success: false, error: 'button_add_failed' };
            }
            
        } catch (error) {
            console.error(`❌ Ошибка sendNewsWithNativeButtons: ${error.message}`);
            return { success: false, error: error.message };
        }
    }
    
    // Получить статистику
    getStats() {
        let totalReactions = 0;
        const reactionCounts = {};
        
        for (const messageState of this.buttonStates.values()) {
            if (messageState.selectedReaction) {
                totalReactions++;
                const action = messageState.selectedReaction;
                reactionCounts[action] = (reactionCounts[action] || 0) + 1;
            }
        }
        
        return {
            totalMessages: this.buttonStates.size,
            totalReactions: totalReactions,
            reactionCounts: reactionCounts,
            targetUserId: this.targetUserId,
            targetChannelId: this.targetChannelId
        };
    }
}

module.exports = NativeLikeButtons;

// Пример использования
if (require.main === module) {
    console.log(`
💡 NATIVE-LIKE BUTTONS СИСТЕМА:

✅ Кардинальное изменение кнопок после нажатия
✅ Имитация встроенных реакций Telegram
✅ Визуальная обратная связь в стиле нативных реакций
✅ Цветовая индикация выбранной реакции

🔄 ПРИНЦИП РАБОТЫ:

ДО:  [🔥 Отлично] [👍 Лайк] [👎 Дизлайк] [💩 Мусор]
ПОСЛЕ НАЖАТИЯ 🔥:  [🟠 ВЫ ОЦЕНИЛИ: ОТЛИЧНО] [⚫ 👍 Лайк] [⚫ 👎 Дизлайк] [⚫ 💩 Мусор]

Выбранная кнопка становится КАРДИНАЛЬНО другой, остальные - неактивными.
`);
}