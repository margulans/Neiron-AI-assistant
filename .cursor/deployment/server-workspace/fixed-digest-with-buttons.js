// Fixed Digest System with INLINE BUTTONS - Возвращаем кнопки реакций
// Встроенные реакции Telegram работают не во всех каналах, поэтому используем inline кнопки

const NewsDeduplicationSystem = require('./news-deduplication-system.js');
const fs = require('fs');

class FixedDigestWithButtons {
    constructor(tools) {
        this.tools = tools;
        this.deduplication = new NewsDeduplicationSystem();
        
        // Настройки канала
        this.targetChannel = '@newsneiron';
        this.targetChannelId = '-1003723471488'; // ID канала @newsneiron
        this.userId = 685668909;
        
        // Эмодзи категорий
        this.categoryEmojis = {
            'AI': '🤖',
            'robotics': '🦾', 
            'eVTOL': '✈️',
            'tools': '💻',
            'tech': '⚡',
            'business': '💼',
            'investments': '💰',
            'other': '📰'
        };
        
        // Карта отправленных сообщений для callback обработки
        this.sentMessages = new Map();
        
        // СИНХРОННАЯ загрузка данных
        this.loadDataSync();
    }
    
    // Синхронная загрузка сохраненных данных
    loadDataSync() {
        try {
            // Создаем папку data если не существует
            if (!fs.existsSync('data')) {
                fs.mkdirSync('data', { recursive: true });
                console.log('📁 Создана папка data');
            }
            
            // Загружаем дедупликацию СИНХРОННО
            const dedupPath = 'data/news-deduplication.json';
            if (fs.existsSync(dedupPath)) {
                const dedupData = JSON.parse(fs.readFileSync(dedupPath, 'utf8'));
                this.deduplication.importData(dedupData);
                console.log(`📥 Данные дедупликации загружены: ${this.deduplication.sentNewsHashes.size} новостей в истории`);
            } else {
                console.log('ℹ️ Файл дедупликации не найден, начинаем с чистого состояния');
            }
            
            // Загружаем карту сообщений СИНХРОННО
            const messagesPath = 'data/sent-messages-map.json';
            if (fs.existsSync(messagesPath)) {
                const messagesData = JSON.parse(fs.readFileSync(messagesPath, 'utf8'));
                this.sentMessages = new Map(Object.entries(messagesData.sentMessages || {}));
                console.log(`📥 Загружено ${this.sentMessages.size} записей сообщений`);
            } else {
                console.log('ℹ️ Файл карты сообщений не найден');
            }
            
        } catch (error) {
            console.error('❌ Ошибка загрузки данных:', error.message);
        }
    }
    
    // Синхронное сохранение данных
    saveDataSync() {
        try {
            // Сохраняем дедупликацию
            const dedupPath = 'data/news-deduplication.json';
            fs.writeFileSync(dedupPath, JSON.stringify(this.deduplication.exportData(), null, 2));
            
            // Сохраняем карту сообщений
            const messagesPath = 'data/sent-messages-map.json';
            fs.writeFileSync(messagesPath, JSON.stringify({
                sentMessages: Object.fromEntries(this.sentMessages),
                savedAt: Date.now()
            }, null, 2));
            
            console.log('💾 Данные сохранены синхронно');
            
        } catch (error) {
            console.error('❌ Ошибка сохранения данных:', error.message);
        }
    }
    
    // Создание заголовка дайджеста
    createDigestHeader(digestType, newsCount) {
        const headers = {
            'morning': '🌅 **УТРЕННИЙ ДАЙДЖЕСТ**',
            'afternoon': '☀️ **ДНЕВНОЙ ДАЙДЖЕСТ**', 
            'evening': '🌆 **ВЕЧЕРНИЙ ДАЙДЖЕСТ**',
            'special': '📰 **ВНЕОЧЕРЕДНОЙ ДАЙДЖЕСТ**'
        };
        
        const date = new Date().toLocaleDateString('ru-RU');
        const header = headers[digestType] || '📰 **НОВОСТНОЙ ДАЙДЖЕСТ**';
        
        return `${header} | ${date}\\n\\n🎯 ИИ получает максимальный приоритет\\n📊 ${newsCount} новостей | ⚡ Адаптивный размер\\n\\n---`;
    }
    
    // ДВУХШАГОВАЯ отправка новости: текст → editMessage с кнопками
    async sendNewsWithButtons(newsItem, messageIndex = null) {
        try {
            // Определяем эмодзи категории
            const categoryEmoji = this.categoryEmojis[newsItem.category] || this.categoryEmojis.other;
            
            // Формируем текст новости
            const newsText = this.formatNewsText(newsItem, categoryEmoji);
            
            console.log(`📤 Шаг 1: Отправляю текст новости ${messageIndex || ''}: ${newsItem.title?.substring(0, 50)}...`);
            
            // ШАГ 1: Отправляем ТОЛЬКО текст (БЕЗ кнопок)
            const result = await this.tools.message({
                action: 'send',
                channel: 'telegram',
                target: this.targetChannel,
                message: newsText,
                silent: false
            });
            
            if (!result || !result.messageId) {
                console.error('❌ Не получен messageId от Telegram');
                return { success: false, error: 'no_message_id' };
            }
            
            const messageId = result.messageId.toString();
            const chatId = result.chatId || this.targetChannelId;
            
            console.log(`✅ Текст отправлен: messageId=${messageId}, chatId=${chatId}`);
            
            // Пауза между отправкой и редактированием
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // ШАГ 2: Добавляем inline кнопки через editMessage
            const buttons = [
                [
                    {"text": "🔥 Отлично", "callback_data": `r:e:${chatId}:${messageId}`},
                    {"text": "👍 Лайк", "callback_data": `r:l:${chatId}:${messageId}`},
                    {"text": "👎 Дизлайк", "callback_data": `r:d:${chatId}:${messageId}`},
                    {"text": "💩 Мусор", "callback_data": `r:t:${chatId}:${messageId}`}
                ]
            ];
            
            console.log(`📝 Шаг 2: Добавляю кнопки к сообщению ${messageId}...`);
            
            const editResult = await this.tools.message({
                action: 'edit',
                channel: 'telegram',
                chatId: chatId,
                messageId: parseInt(messageId),
                message: newsText, // Тот же текст
                buttons: buttons
            });
            
            if (editResult && editResult.ok) {
                console.log(`✅ Кнопки добавлены к сообщению ${messageId}`);
                
                // Регистрируем для обработки callback
                this.registerMessageForCallback(messageId, chatId, newsItem);
                
                return {
                    success: true,
                    messageId: messageId,
                    chatId: chatId,
                    newsItem: newsItem
                };
            } else {
                console.error(`❌ Ошибка добавления кнопок: ${JSON.stringify(editResult)}`);
                
                // Даже если кнопки не добавились, регистрируем сообщение
                this.registerMessageForCallback(messageId, chatId, newsItem);
                
                return {
                    success: true, // Текст отправлен успешно
                    messageId: messageId,
                    chatId: chatId,
                    newsItem: newsItem,
                    buttonError: true
                };
            }
            
        } catch (error) {
            console.error(`❌ Ошибка отправки новости: ${error.message}`);
            return { success: false, error: error.message };
        }
    }
    
    // Форматирование текста новости
    formatNewsText(newsItem, categoryEmoji) {
        const title = `${categoryEmoji} **${newsItem.title}**`;
        
        // Развернутое описание (3-5 предложений)
        const description = newsItem.description || 'Подробности по ссылке.';
        
        // Источник и ссылка
        const sourceLine = `\\n\\n📰 ${newsItem.source || 'Источник'}\\n🔗 ${newsItem.url || ''}`;
        
        return `${title}\\n\\n${description}${sourceLine}`;
    }
    
    // Регистрация сообщения для обработки callback
    registerMessageForCallback(messageId, chatId, newsItem) {
        const registrationData = {
            messageId: messageId,
            chatId: chatId,
            source: {
                name: newsItem.source || 'Unknown',
                url: newsItem.url || '',
                category: newsItem.category || 'other'
            },
            expert: newsItem.expert ? {
                name: newsItem.expert.name || 'Unknown Expert',
                handle: newsItem.expert.handle || ''
            } : null,
            newsData: {
                title: newsItem.title,
                category: newsItem.category,
                url: newsItem.url
            },
            timestamp: Date.now(),
            callbacks: [], // Будет заполняться при получении callback
            registered: new Date().toISOString()
        };
        
        this.sentMessages.set(messageId, registrationData);
        
        console.log(`📝 Сообщение ${messageId} зарегистрировано для callback обработки`);
        console.log(`📊 Источник: ${registrationData.source.name}, Эксперт: ${registrationData.expert?.name || 'нет'}`);
        
        return registrationData;
    }
    
    // Отправка полного дайджеста с ГАРАНТИРОВАННОЙ проверкой дубликатов
    async sendFullDigest(newsList, digestType = 'morning') {
        try {
            console.log(`🚀 Начинаю отправку ${digestType} дайджеста с inline кнопками...`);
            console.log(`🔍 Проверяем ${newsList.length} новостей на дубликаты...`);
            
            // ПРИНУДИТЕЛЬНАЯ перезагрузка данных перед фильтрацией
            console.log('🔄 Перезагружаем данные дедупликации...');
            this.loadDataSync();
            
            // Фильтруем дубликаты
            const filterResult = this.deduplication.filterDuplicates(newsList);
            const uniqueNews = filterResult.uniqueNews;
            
            console.log(`📊 Результат фильтрации: ${uniqueNews.length} уникальных, ${filterResult.duplicates.length} дубликатов`);
            
            if (filterResult.duplicates.length > 0) {
                console.log(`🚫 Отфильтрованы дубликаты:`);
                filterResult.duplicates.forEach((dup, index) => {
                    console.log(`  ${index + 1}. ${dup.news.title?.substring(0, 60)}... (${dup.reason})`);
                    if (dup.similarity) {
                        console.log(`     Схожесть: ${Math.round(dup.similarity * 100)}%`);
                    }
                });
            }
            
            if (uniqueNews.length === 0) {
                console.log('⚠️ Нет уникальных новостей для отправки');
                return { success: false, reason: 'no_unique_news', duplicatesFiltered: filterResult.duplicates.length };
            }
            
            // Отправляем заголовок дайджеста
            const header = this.createDigestHeader(digestType, uniqueNews.length);
            const headerResult = await this.tools.message({
                action: 'send',
                channel: 'telegram',
                target: this.targetChannel,
                message: header,
                silent: true
            });
            
            console.log(`📤 Заголовок отправлен: ${headerResult?.messageId || 'N/A'}`);
            
            // Небольшая пауза после заголовка
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Отправляем каждую новость с кнопками
            const results = [];
            for (let i = 0; i < uniqueNews.length; i++) {
                const newsItem = uniqueNews[i];
                
                console.log(`📤 Отправляю новость ${i + 1}/${uniqueNews.length}: ${newsItem.title?.substring(0, 50)}...`);
                
                // Отправляем новость с кнопками (двухшаговый процесс)
                const result = await this.sendNewsWithButtons(newsItem, i + 1);
                results.push(result);
                
                // Регистрируем в дедупликации
                if (result.success) {
                    this.deduplication.registerSentNews(newsItem);
                }
                
                // Пауза между сообщениями
                if (i < uniqueNews.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 1500)); // Увеличенная пауза для двухшагового процесса
                }
            }
            
            // Финальное сообщение
            const successCount = results.filter(r => r.success).length;
            const buttonErrors = results.filter(r => r.buttonError).length;
            
            let statusText = `✅ ${successCount} новостей отправлено`;
            if (buttonErrors > 0) {
                statusText += `\\n⚠️ ${buttonErrors} сообщений без кнопок`;
            }
            
            const instructionsMessage = `📊 **Дайджест завершён**\\n\\n${statusText}\\n🔍 ${filterResult.duplicates.length} дубликатов отфильтровано\\n🔘 Inline кнопки для оценки новостей\\n\\n⏰ Следующий дайджест в ${this.getNextDigestTime(digestType)}\\n\\n---\\n🧠 _Нейрон | Dual-Rating система_`;
            
            await new Promise(resolve => setTimeout(resolve, 1000));
            const finalResult = await this.tools.message({
                action: 'send',
                channel: 'telegram', 
                target: this.targetChannel,
                message: instructionsMessage,
                silent: true
            });
            
            console.log(`📤 Финальное сообщение отправлено: ${finalResult?.messageId || 'N/A'}`);
            
            // Сохраняем данные СИНХРОННО
            this.saveDataSync();
            
            console.log(`✅ Дайджест ${digestType} отправлен: ${successCount}/${uniqueNews.length} новостей`);
            
            return {
                success: true,
                digestType: digestType,
                totalNews: newsList.length,
                uniqueNews: uniqueNews.length,
                duplicatesFiltered: filterResult.duplicates.length,
                sentSuccessfully: successCount,
                buttonErrors: buttonErrors,
                results: results,
                duplicateDetails: filterResult.duplicates
            };
            
        } catch (error) {
            console.error(`❌ Ошибка отправки дайджеста: ${error.message}`);
            return { success: false, error: error.message };
        }
    }
    
    // Обработка callback от inline кнопок
    async handleCallback(callbackData, userId, messageId, chatId) {
        try {
            // Проверяем формат: r:action:chatId:messageId
            const parts = callbackData.split(':');
            if (parts.length !== 4 || parts[0] !== 'r') {
                console.log(`⏭️ Неизвестный callback: ${callbackData}`);
                return null;
            }
            
            const [prefix, action, callbackChatId, callbackMessageId] = parts;
            
            // Фильтруем только реакции от целевого пользователя
            if (userId !== this.userId) {
                console.log(`⏭️ Игнорирую callback от пользователя ${userId} (не целевой)`);
                return null;
            }
            
            // Проверяем, что это наше сообщение
            const messageData = this.sentMessages.get(callbackMessageId);
            if (!messageData) {
                console.log(`⚠️ Сообщение ${callbackMessageId} не найдено в карте callback`);
                return null;
            }
            
            // Определяем тип реакции и баллы
            const reactionMap = {
                'e': { emoji: '🔥', name: 'Отлично', score: 10 },
                'l': { emoji: '👍', name: 'Лайк', score: 5 },
                'd': { emoji: '👎', name: 'Дизлайк', score: -3 },
                't': { emoji: '💩', name: 'Мусор', score: -5 }
            };
            
            const reaction = reactionMap[action];
            if (!reaction) {
                console.log(`⏭️ Неизвестное действие: ${action}`);
                return null;
            }
            
            // Записываем callback
            const callbackRecord = {
                action: action,
                reaction: reaction,
                userId: userId,
                timestamp: Date.now(),
                messageId: callbackMessageId,
                chatId: callbackChatId
            };
            
            messageData.callbacks.push(callbackRecord);
            
            console.log(`👆 Callback обработан: ${reaction.emoji} ${reaction.name} (${reaction.score}) на ${messageData.source.name}`);
            
            // Обновляем кнопки — подсвечиваем выбранную
            await this.updateButtonsAfterCallback(callbackMessageId, callbackChatId, action, messageData);
            
            // Сохраняем обновленные данные
            this.saveDataSync();
            
            return {
                messageId: callbackMessageId,
                reaction: reaction,
                source: messageData.source.name,
                expert: messageData.expert?.name || null,
                totalCallbacks: messageData.callbacks.length
            };
            
        } catch (error) {
            console.error(`❌ Ошибка обработки callback: ${error.message}`);
            return null;
        }
    }
    
    // Обновление кнопок после callback (подсветка выбранной)
    async updateButtonsAfterCallback(messageId, chatId, selectedAction, messageData) {
        try {
            // Создаем кнопки с подсветкой выбранной
            const buttonTexts = {
                'e': selectedAction === 'e' ? '✅ Отлично' : '🔥 Отлично',
                'l': selectedAction === 'l' ? '✅ Лайк' : '👍 Лайк', 
                'd': selectedAction === 'd' ? '✅ Дизлайк' : '👎 Дизлайк',
                't': selectedAction === 't' ? '✅ Мусор' : '💩 Мусор'
            };
            
            const buttons = [
                [
                    {"text": buttonTexts.e, "callback_data": `r:e:${chatId}:${messageId}`},
                    {"text": buttonTexts.l, "callback_data": `r:l:${chatId}:${messageId}`},
                    {"text": buttonTexts.d, "callback_data": `r:d:${chatId}:${messageId}`},
                    {"text": buttonTexts.t, "callback_data": `r:t:${chatId}:${messageId}`}
                ]
            ];
            
            // Обновляем кнопки
            const editResult = await this.tools.message({
                action: 'edit',
                channel: 'telegram',
                chatId: chatId,
                messageId: parseInt(messageId),
                message: this.formatNewsText(messageData.newsData, 
                    this.categoryEmojis[messageData.newsData.category] || this.categoryEmojis.other),
                buttons: buttons
            });
            
            if (editResult && editResult.ok) {
                console.log(`✅ Кнопки обновлены для сообщения ${messageId} (выбрано: ${selectedAction})`);
            } else {
                console.error(`❌ Ошибка обновления кнопок: ${JSON.stringify(editResult)}`);
            }
            
        } catch (error) {
            console.error(`❌ Ошибка обновления кнопок: ${error.message}`);
        }
    }
    
    // Получить время следующего дайджеста
    getNextDigestTime(currentType) {
        const times = {
            'morning': '13:00',
            'afternoon': '18:00', 
            'evening': '08:00 (завтра)',
            'special': 'по расписанию'
        };
        return times[currentType] || 'по расписанию';
    }
    
    // Получить статистику callback
    getCallbackStats() {
        let totalCallbacks = 0;
        const actionCounts = {};
        const sourceStats = {};
        
        for (const messageData of this.sentMessages.values()) {
            totalCallbacks += messageData.callbacks.length;
            
            // Считаем callback по типам
            for (const callback of messageData.callbacks) {
                const action = callback.action;
                actionCounts[action] = (actionCounts[action] || 0) + 1;
            }
            
            // Считаем по источникам
            const sourceName = messageData.source.name;
            if (!sourceStats[sourceName]) {
                sourceStats[sourceName] = { callbacks: 0, totalScore: 0 };
            }
            sourceStats[sourceName].callbacks += messageData.callbacks.length;
            
            for (const callback of messageData.callbacks) {
                sourceStats[sourceName].totalScore += callback.reaction.score;
            }
        }
        
        return {
            totalMessages: this.sentMessages.size,
            totalCallbacks: totalCallbacks,
            actionCounts: actionCounts,
            sourceStats: sourceStats,
            deduplicationStats: this.deduplication.getStats()
        };
    }
}

module.exports = FixedDigestWithButtons;

// Пример использования
if (require.main === module) {
    console.log(`
💡 ИСПРАВЛЕННАЯ СИСТЕМА ДАЙДЖЕСТОВ С INLINE КНОПКАМИ:

✅ Двухшаговая отправка: текст → editMessage с кнопками
✅ Синхронная дедупликация с гарантией загрузки истории
✅ Обработка callback от inline кнопок  
✅ Автоматическая подсветка выбранных реакций

🔄 ИСПОЛЬЗОВАНИЕ:

const tools = { message, memory_store, memory_recall };
const digestSystem = new FixedDigestWithButtons(tools);

// Отправка дайджеста
const result = await digestSystem.sendFullDigest(newsList, 'morning');

// Обработка callback
const callbackResult = await digestSystem.handleCallback(
    'r:e:123:456', // callback_data
    685668909,     // userId
    '456',         // messageId
    '123'          // chatId
);
`);
}