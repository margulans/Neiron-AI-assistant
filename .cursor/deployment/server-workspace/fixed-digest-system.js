// Fixed Digest System - Исправленная система отправки дайджестов
// Использует встроенные реакции Telegram + дедупликация + правильная регистрация

const NewsDeduplicationSystem = require('./news-deduplication-system.js');

class FixedDigestSystem {
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
        
        // Встроенные реакции для рейтинга (НЕ inline кнопки!)
        this.reactionEmojis = ['🔥', '👍', '👎', '💩'];
        
        // Карта отправленных сообщений для webhook
        this.sentMessages = new Map();
        
        this.loadData();
    }
    
    // Загрузка сохраненных данных
    async loadData() {
        try {
            const fs = require('fs').promises;
            
            // Загружаем дедупликацию
            try {
                const dedupData = await fs.readFile('data/news-deduplication.json', 'utf8');
                this.deduplication.importData(JSON.parse(dedupData));
                console.log('📥 Данные дедупликации загружены');
            } catch (e) {
                console.log('ℹ️ Файл дедупликации не найден, начинаем с чистого состояния');
            }
            
            // Загружаем карту сообщений
            try {
                const messagesData = await fs.readFile('data/sent-messages-map.json', 'utf8');
                const data = JSON.parse(messagesData);
                this.sentMessages = new Map(Object.entries(data.sentMessages || {}));
                console.log(`📥 Загружено ${this.sentMessages.size} записей сообщений`);
            } catch (e) {
                console.log('ℹ️ Файл карты сообщений не найден');
            }
            
        } catch (error) {
            console.error('❌ Ошибка загрузки данных:', error);
        }
    }
    
    // Сохранение данных
    async saveData() {
        try {
            const fs = require('fs').promises;
            await fs.mkdir('data', { recursive: true });
            
            // Сохраняем дедупликацию
            await fs.writeFile(
                'data/news-deduplication.json', 
                JSON.stringify(this.deduplication.exportData(), null, 2)
            );
            
            // Сохраняем карту сообщений
            await fs.writeFile(
                'data/sent-messages-map.json',
                JSON.stringify({
                    sentMessages: Object.fromEntries(this.sentMessages),
                    savedAt: Date.now()
                }, null, 2)
            );
            
            console.log('💾 Данные сохранены');
            
        } catch (error) {
            console.error('❌ Ошибка сохранения данных:', error);
        }
    }
    
    // Создание заголовка дайджеста
    createDigestHeader(digestType, newsCount) {
        const headers = {
            'morning': '🌅 **УТРЕННИЙ ДАЙДЖЕСТ**',
            'afternoon': '☀️ **ДНЕВНОЙ ДАЙДЖЕСТ**', 
            'evening': '🌆 **ВЕЧЕРНИЙ ДАЙДЖЕСТ**'
        };
        
        const date = new Date().toLocaleDateString('ru-RU');
        const header = headers[digestType] || '📰 **НОВОСТНОЙ ДАЙДЖЕСТ**';
        
        return `${header} | ${date}\n\n🎯 ИИ получает максимальный приоритет\n📊 ${newsCount} новостей | ⚡ Адаптивный размер\n\n---`;
    }
    
    // Отправка одной новости в канал с встроенными реакциями
    async sendNewsItem(newsItem, messageIndex = null) {
        try {
            // Определяем эмодзи категории
            const categoryEmoji = this.categoryEmojis[newsItem.category] || this.categoryEmojis.other;
            
            // Формируем текст новости
            const newsText = this.formatNewsText(newsItem, categoryEmoji);
            
            console.log(`📤 Отправляю новость ${messageIndex || ''}: ${newsItem.title?.substring(0, 50)}...`);
            
            // Отправляем ТОЛЬКО текст (БЕЗ inline кнопок!)
            const result = await this.tools.message({
                action: 'send',
                channel: 'telegram',
                target: this.targetChannel,
                message: newsText,
                silent: false
            });
            
            if (result && result.message_id) {
                console.log(`✅ Сообщение отправлено: ID ${result.message_id}`);
                
                // Регистрируем для обработки реакций webhook
                this.registerMessageForReactions(
                    result.message_id.toString(),
                    this.targetChannelId,
                    newsItem
                );
                
                // Регистрируем в системе дедупликации
                this.deduplication.registerSentNews(newsItem);
                
                return {
                    success: true,
                    messageId: result.message_id,
                    newsItem: newsItem
                };
            } else {
                console.error('❌ Не получен message_id от Telegram');
                return { success: false, error: 'no_message_id' };
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
        const sourceLine = `\n📰 ${newsItem.source || 'Источник'}\n🔗 ${newsItem.url || ''}`;
        
        return `${title}\n\n${description}${sourceLine}`;
    }
    
    // Регистрация сообщения для обработки реакций
    registerMessageForReactions(messageId, chatId, newsItem) {
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
            reactions: [], // Будет заполняться при получении реакций
            registered: new Date().toISOString()
        };
        
        this.sentMessages.set(messageId, registrationData);
        
        console.log(`📝 Сообщение ${messageId} зарегистрировано для обработки реакций`);
        console.log(`📊 Источник: ${registrationData.source.name}, Эксперт: ${registrationData.expert?.name || 'нет'}`);
        
        return registrationData;
    }
    
    // Отправка полного дайджеста
    async sendFullDigest(newsList, digestType = 'morning') {
        try {
            console.log(`🚀 Начинаю отправку ${digestType} дайджеста...`);
            
            // Фильтруем дубликаты
            const filterResult = this.deduplication.filterDuplicates(newsList);
            const uniqueNews = filterResult.uniqueNews;
            
            if (filterResult.duplicates.length > 0) {
                console.log(`🚫 Отфильтровано ${filterResult.duplicates.length} дубликатов:`);
                filterResult.duplicates.forEach(dup => {
                    console.log(`  - ${dup.news.title?.substring(0, 60)}... (${dup.reason})`);
                });
            }
            
            if (uniqueNews.length === 0) {
                console.log('⚠️ Нет уникальных новостей для отправки');
                return { success: false, reason: 'no_unique_news' };
            }
            
            // Отправляем заголовок дайджеста
            const header = this.createDigestHeader(digestType, uniqueNews.length);
            await this.tools.message({
                action: 'send',
                channel: 'telegram',
                target: this.targetChannel,
                message: header,
                silent: true
            });
            
            // Небольшая пауза после заголовка
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Отправляем каждую новость по отдельности
            const results = [];
            for (let i = 0; i < uniqueNews.length; i++) {
                const newsItem = uniqueNews[i];
                
                // Отправляем новость
                const result = await this.sendNewsItem(newsItem, i + 1);
                results.push(result);
                
                // Пауза между сообщениями (чтобы не спамить)
                if (i < uniqueNews.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            }
            
            // Финальное сообщение с инструкциями по реакциям
            const instructionsMessage = `📊 **Дайджест завершён**\n\n✅ ${results.filter(r => r.success).length} новостей отправлено\n🔍 ${filterResult.duplicates.length} дубликатов отфильтровано\n\n⏰ Следующий дайджест в ${this.getNextDigestTime(digestType)}\n\n---\n🧠 _Нейрон | Адаптивная система_`;
            
            await new Promise(resolve => setTimeout(resolve, 1000));
            await this.tools.message({
                action: 'send',
                channel: 'telegram', 
                target: this.targetChannel,
                message: instructionsMessage,
                silent: true
            });
            
            // Сохраняем данные
            await this.saveData();
            
            console.log(`✅ Дайджест ${digestType} отправлен: ${results.filter(r => r.success).length}/${uniqueNews.length} новостей`);
            
            return {
                success: true,
                digestType: digestType,
                totalNews: newsList.length,
                uniqueNews: uniqueNews.length,
                duplicatesFiltered: filterResult.duplicates.length,
                sentSuccessfully: results.filter(r => r.success).length,
                results: results
            };
            
        } catch (error) {
            console.error(`❌ Ошибка отправки дайджеста: ${error.message}`);
            return { success: false, error: error.message };
        }
    }
    
    // Получить время следующего дайджеста
    getNextDigestTime(currentType) {
        const times = {
            'morning': '13:00',
            'afternoon': '18:00', 
            'evening': '08:00 (завтра)'
        };
        return times[currentType] || 'по расписанию';
    }
    
    // Обработка реакции от webhook (интеграция с DualRatingSystem)
    async handleReactionFromWebhook(messageId, emoji, userId) {
        const messageData = this.sentMessages.get(messageId);
        
        if (!messageData) {
            console.log(`⚠️ Сообщение ${messageId} не найдено в карте реакций`);
            return null;
        }
        
        // Проверяем, что это валидная реакция от правильного пользователя
        if (userId !== this.userId) {
            console.log(`⏭️ Игнорирую реакцию от пользователя ${userId}`);
            return null;
        }
        
        if (!this.reactionEmojis.includes(emoji)) {
            console.log(`⏭️ Игнорирую реакцию ${emoji} (не для рейтинга)`);
            return null;
        }
        
        // Записываем реакцию
        const reactionData = {
            emoji: emoji,
            userId: userId,
            timestamp: Date.now(),
            score: this.getReactionScore(emoji)
        };
        
        messageData.reactions.push(reactionData);
        
        console.log(`👆 Реакция обработана: ${emoji} (${reactionData.score}) на ${messageData.source.name}`);
        
        // Сохраняем обновленные данные
        await this.saveData();
        
        return {
            messageId: messageId,
            reaction: emoji,
            score: reactionData.score,
            source: messageData.source.name,
            expert: messageData.expert?.name || null,
            totalReactions: messageData.reactions.length
        };
    }
    
    // Получить баллы за реакцию
    getReactionScore(emoji) {
        const scores = {
            '🔥': 10,  // Огонь - отлично
            '👍': 5,   // Лайк - нравится  
            '👎': -3,  // Дизлайк - не нравится
            '💩': -5   // Мусор - плохо
        };
        return scores[emoji] || 0;
    }
    
    // Получить статистику реакций
    getReactionsStats() {
        let totalReactions = 0;
        const reactionCounts = {};
        const sourceStats = {};
        
        for (const messageData of this.sentMessages.values()) {
            totalReactions += messageData.reactions.length;
            
            // Считаем реакции по типам
            for (const reaction of messageData.reactions) {
                reactionCounts[reaction.emoji] = (reactionCounts[reaction.emoji] || 0) + 1;
            }
            
            // Считаем по источникам
            const sourceName = messageData.source.name;
            if (!sourceStats[sourceName]) {
                sourceStats[sourceName] = { reactions: 0, totalScore: 0 };
            }
            sourceStats[sourceName].reactions += messageData.reactions.length;
            
            for (const reaction of messageData.reactions) {
                sourceStats[sourceName].totalScore += reaction.score;
            }
        }
        
        return {
            totalMessages: this.sentMessages.size,
            totalReactions: totalReactions,
            reactionCounts: reactionCounts,
            sourceStats: sourceStats,
            deduplicationStats: this.deduplication.getStats()
        };
    }
    
    // Очистка старых данных
    async cleanup() {
        console.log('🧹 Запуск очистки старых данных...');
        
        // Очищаем дедупликацию
        const dedupCleaned = this.deduplication.cleanupOldRecords();
        
        // Очищаем карту сообщений (старше 30 дней)
        const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
        let messagesCleaned = 0;
        
        for (const [messageId, messageData] of this.sentMessages) {
            if (messageData.timestamp < thirtyDaysAgo) {
                this.sentMessages.delete(messageId);
                messagesCleaned++;
            }
        }
        
        // Сохраняем результаты
        await this.saveData();
        
        console.log(`🧹 Очистка завершена: ${dedupCleaned} записей дедупликации, ${messagesCleaned} записей сообщений`);
        
        return {
            deduplicationCleaned: dedupCleaned,
            messagesCleaned: messagesCleaned
        };
    }
}

module.exports = FixedDigestSystem;

// Пример использования
if (require.main === module) {
    console.log(`
💡 ИСПРАВЛЕННАЯ СИСТЕМА ДАЙДЖЕСТОВ:

✅ Встроенные реакции Telegram вместо inline кнопок
✅ Система дедупликации новостей  
✅ Правильная регистрация для webhook обработки
✅ Автосохранение данных

🔄 ИСПОЛЬЗОВАНИЕ:

const tools = { message, memory_store, memory_recall };
const digestSystem = new FixedDigestSystem(tools);

// Отправка дайджеста
const newsList = [
    {
        title: 'Заголовок новости',
        description: 'Описание новости в 3-5 предложений...',
        url: 'https://example.com',
        source: 'Источник',
        category: 'AI'
    }
];

const result = await digestSystem.sendFullDigest(newsList, 'morning');

// Обработка реакции от webhook
const reactionResult = await digestSystem.handleReactionFromWebhook('123', '🔥', 685668909);

// Статистика
const stats = digestSystem.getReactionsStats();
console.log('Статистика:', stats);
`);
}