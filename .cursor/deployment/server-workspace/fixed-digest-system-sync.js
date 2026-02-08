// Fixed Digest System SYNC - Исправленная система с синхронной загрузкой данных
// Гарантирует загрузку истории дедупликации перед проверкой дубликатов

const NewsDeduplicationSystem = require('./news-deduplication-system.js');
const fs = require('fs');
const path = require('path');

class FixedDigestSystemSync {
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
    
    // Отправка полного дайджеста с ГАРАНТИРОВАННОЙ проверкой дубликатов
    async sendFullDigest(newsList, digestType = 'morning') {
        try {
            console.log(`🚀 Начинаю отправку ${digestType} дайджеста...`);
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
            
            // Отправляем каждую новость по отдельности
            const results = [];
            for (let i = 0; i < uniqueNews.length; i++) {
                const newsItem = uniqueNews[i];
                
                console.log(`📤 Отправляю новость ${i + 1}/${uniqueNews.length}: ${newsItem.title?.substring(0, 50)}...`);
                
                // Отправляем новость
                const result = await this.sendNewsItem(newsItem, i + 1);
                results.push(result);
                
                // Регистрируем в дедупликации
                if (result.success) {
                    this.deduplication.registerSentNews(newsItem);
                }
                
                // Пауза между сообщениями (чтобы не спамить)
                if (i < uniqueNews.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            }
            
            // Финальное сообщение с инструкциями по реакциям
            const successCount = results.filter(r => r.success).length;
            const instructionsMessage = `📊 **Дайджест завершён**\\n\\n✅ ${successCount} новостей отправлено\\n🔍 ${filterResult.duplicates.length} дубликатов отфильтровано\\n⚡ Исправленная система: встроенные реакции Telegram\\n\\n⏰ Следующий дайджест в ${this.getNextDigestTime(digestType)}\\n\\n---\\n🧠 _Нейрон | Адаптивная система_`;
            
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
                results: results,
                duplicateDetails: filterResult.duplicates
            };
            
        } catch (error) {
            console.error(`❌ Ошибка отправки дайджеста: ${error.message}`);
            return { success: false, error: error.message };
        }
    }
    
    // Отправка одной новости в канал с встроенными реакциями
    async sendNewsItem(newsItem, messageIndex = null) {
        try {
            // Определяем эмодзи категории
            const categoryEmoji = this.categoryEmojis[newsItem.category] || this.categoryEmojis.other;
            
            // Формируем текст новости
            const newsText = this.formatNewsText(newsItem, categoryEmoji);
            
            // Отправляем ТОЛЬКО текст (БЕЗ inline кнопок!)
            const result = await this.tools.message({
                action: 'send',
                channel: 'telegram',
                target: this.targetChannel,
                message: newsText,
                silent: false
            });
            
            if (result && result.messageId) {
                // Регистрируем для обработки реакций webhook
                this.registerMessageForReactions(
                    result.messageId.toString(),
                    this.targetChannelId,
                    newsItem
                );
                
                return {
                    success: true,
                    messageId: result.messageId,
                    newsItem: newsItem
                };
            } else {
                console.error('❌ Не получен messageId от Telegram');
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
        const sourceLine = `\\n📰 ${newsItem.source || 'Источник'}\\n🔗 ${newsItem.url || ''}`;
        
        return `${title}\\n\\n${description}${sourceLine}`;
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
        
        return registrationData;
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
    
    // Получить статистику дедупликации
    getDeduplicationStats() {
        return {
            ...this.deduplication.getStats(),
            loadedAtStartup: true,
            dataFileExists: fs.existsSync('data/news-deduplication.json')
        };
    }
}

module.exports = FixedDigestSystemSync;

// Пример использования
if (require.main === module) {
    console.log(`
💡 ИСПРАВЛЕННАЯ СИСТЕМА ДАЙДЖЕСТОВ (SYNC):

✅ Синхронная загрузка данных дедупликации
✅ Гарантированная проверка дубликатов  
✅ Встроенные реакции Telegram
✅ Подробная статистика фильтрации

🔄 ИСПОЛЬЗОВАНИЕ:

const tools = { message, memory_store, memory_recall };
const digestSystem = new FixedDigestSystemSync(tools);

// Проверка статистики дедупликации
const stats = digestSystem.getDeduplicationStats();
console.log('Статистика:', stats);

// Отправка дайджеста
const result = await digestSystem.sendFullDigest(newsList, 'morning');
`);
}