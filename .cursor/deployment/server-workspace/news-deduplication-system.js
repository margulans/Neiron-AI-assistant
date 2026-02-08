// News Deduplication System - Предотвращение повторов новостей в дайджестах

const crypto = require('crypto');

class NewsDeduplicationSystem {
    constructor() {
        // Храним хэши отправленных новостей
        this.sentNewsHashes = new Set();
        
        // Храним полную информацию об отправленных новостях
        this.sentNewsDetails = new Map();
        
        // Настройки похожести для дедупликации
        this.similarityThreshold = 0.85; // 85% похожести = дубликат
        this.titleSimilarityThreshold = 0.9; // 90% похожести заголовков
        this.urlExactMatch = true; // Точное совпадение URL = дубликат
        
        // Время жизни записей (30 дней)
        this.maxAge = 30 * 24 * 60 * 60 * 1000;
    }

    // Создание уникального хэша новости
    createNewsHash(newsItem) {
        const hashData = {
            title: this.normalizeText(newsItem.title || ''),
            url: newsItem.url || '',
            source: newsItem.source || ''
        };
        
        const hashString = JSON.stringify(hashData, Object.keys(hashData).sort());
        return crypto.createHash('sha256').update(hashString).digest('hex').substring(0, 16);
    }

    // Нормализация текста для сравнения
    normalizeText(text) {
        return text
            .toLowerCase()
            .replace(/[^\w\sа-яё]/gi, '') // Убираем специальные символы
            .replace(/\s+/g, ' ') // Нормализуем пробелы
            .trim();
    }

    // Вычисление схожести текстов (алгоритм Jaccard similarity)
    calculateTextSimilarity(text1, text2) {
        const words1 = new Set(this.normalizeText(text1).split(' ').filter(w => w.length > 2));
        const words2 = new Set(this.normalizeText(text2).split(' ').filter(w => w.length > 2));
        
        const intersection = new Set([...words1].filter(x => words2.has(x)));
        const union = new Set([...words1, ...words2]);
        
        return union.size > 0 ? intersection.size / union.size : 0;
    }

    // Проверка на дубликат
    isDuplicate(newsItem) {
        const newsHash = this.createNewsHash(newsItem);
        
        // 1. Точное совпадение хэша
        if (this.sentNewsHashes.has(newsHash)) {
            console.log(`🚫 Дубликат найден (точный хэш): ${newsItem.title?.substring(0, 50)}...`);
            return {
                isDuplicate: true,
                reason: 'exact_hash_match',
                hash: newsHash
            };
        }

        // 2. Точное совпадение URL
        if (newsItem.url) {
            for (const [existingHash, existingNews] of this.sentNewsDetails) {
                if (existingNews.url === newsItem.url) {
                    console.log(`🚫 Дубликат найден (совпадение URL): ${newsItem.url}`);
                    return {
                        isDuplicate: true,
                        reason: 'url_exact_match',
                        existingHash: existingHash,
                        existingNews: existingNews
                    };
                }
            }
        }

        // 3. Проверка похожести заголовков
        if (newsItem.title) {
            for (const [existingHash, existingNews] of this.sentNewsDetails) {
                if (existingNews.title) {
                    const titleSimilarity = this.calculateTextSimilarity(newsItem.title, existingNews.title);
                    
                    if (titleSimilarity >= this.titleSimilarityThreshold) {
                        console.log(`🚫 Дубликат найден (похожий заголовок ${Math.round(titleSimilarity * 100)}%): ${newsItem.title}`);
                        return {
                            isDuplicate: true,
                            reason: 'similar_title',
                            similarity: titleSimilarity,
                            existingHash: existingHash,
                            existingNews: existingNews
                        };
                    }
                }
            }
        }

        // 4. Проверка общей похожести контента
        if (newsItem.title && newsItem.description) {
            const newsContent = `${newsItem.title} ${newsItem.description}`;
            
            for (const [existingHash, existingNews] of this.sentNewsDetails) {
                if (existingNews.title && existingNews.description) {
                    const existingContent = `${existingNews.title} ${existingNews.description}`;
                    const contentSimilarity = this.calculateTextSimilarity(newsContent, existingContent);
                    
                    if (contentSimilarity >= this.similarityThreshold) {
                        console.log(`🚫 Дубликат найден (похожий контент ${Math.round(contentSimilarity * 100)}%): ${newsItem.title?.substring(0, 50)}...`);
                        return {
                            isDuplicate: true,
                            reason: 'similar_content',
                            similarity: contentSimilarity,
                            existingHash: existingHash,
                            existingNews: existingNews
                        };
                    }
                }
            }
        }

        console.log(`✅ Новость уникальна: ${newsItem.title?.substring(0, 50)}...`);
        return {
            isDuplicate: false,
            hash: newsHash
        };
    }

    // Регистрация отправленной новости
    registerSentNews(newsItem) {
        const newsHash = this.createNewsHash(newsItem);
        const timestamp = Date.now();
        
        // Добавляем хэш
        this.sentNewsHashes.add(newsHash);
        
        // Сохраняем детали
        this.sentNewsDetails.set(newsHash, {
            title: newsItem.title,
            description: newsItem.description,
            url: newsItem.url,
            source: newsItem.source,
            category: newsItem.category,
            timestamp: timestamp,
            sentAt: new Date().toISOString()
        });
        
        console.log(`📝 Зарегистрирована новость: ${newsHash} - ${newsItem.title?.substring(0, 50)}...`);
        
        return {
            hash: newsHash,
            timestamp: timestamp
        };
    }

    // Фильтрация списка новостей от дубликатов
    filterDuplicates(newsList) {
        const uniqueNews = [];
        const duplicates = [];
        
        for (const newsItem of newsList) {
            const duplicateCheck = this.isDuplicate(newsItem);
            
            if (duplicateCheck.isDuplicate) {
                duplicates.push({
                    news: newsItem,
                    reason: duplicateCheck.reason,
                    similarity: duplicateCheck.similarity
                });
            } else {
                uniqueNews.push(newsItem);
            }
        }
        
        console.log(`🔍 Фильтрация завершена: ${uniqueNews.length} уникальных, ${duplicates.length} дубликатов`);
        
        return {
            uniqueNews: uniqueNews,
            duplicates: duplicates,
            stats: {
                total: newsList.length,
                unique: uniqueNews.length,
                duplicatesCount: duplicates.length,
                filterRate: Math.round((duplicates.length / newsList.length) * 100)
            }
        };
    }

    // Пакетная регистрация отправленных новостей
    registerSentBatch(newsList) {
        const registered = [];
        
        for (const newsItem of newsList) {
            const registration = this.registerSentNews(newsItem);
            registered.push({
                news: newsItem,
                hash: registration.hash,
                timestamp: registration.timestamp
            });
        }
        
        return registered;
    }

    // Очистка старых записей
    cleanupOldRecords() {
        const cutoffTime = Date.now() - this.maxAge;
        let cleanedCount = 0;
        
        for (const [hash, details] of this.sentNewsDetails) {
            if (details.timestamp < cutoffTime) {
                this.sentNewsDetails.delete(hash);
                this.sentNewsHashes.delete(hash);
                cleanedCount++;
            }
        }
        
        console.log(`🧹 Очищено ${cleanedCount} старых записей новостей`);
        return cleanedCount;
    }

    // Получить статистику системы
    getStats() {
        return {
            totalHashes: this.sentNewsHashes.size,
            totalRecords: this.sentNewsDetails.size,
            similarityThreshold: this.similarityThreshold,
            titleSimilarityThreshold: this.titleSimilarityThreshold,
            maxAge: this.maxAge,
            oldestRecord: this.getOldestRecord(),
            newestRecord: this.getNewestRecord()
        };
    }

    // Получить самую старую запись
    getOldestRecord() {
        let oldest = null;
        for (const details of this.sentNewsDetails.values()) {
            if (!oldest || details.timestamp < oldest.timestamp) {
                oldest = details;
            }
        }
        return oldest;
    }

    // Получить самую новую запись
    getNewestRecord() {
        let newest = null;
        for (const details of this.sentNewsDetails.values()) {
            if (!newest || details.timestamp > newest.timestamp) {
                newest = details;
            }
        }
        return newest;
    }

    // Экспорт данных
    exportData() {
        return {
            sentNewsHashes: Array.from(this.sentNewsHashes),
            sentNewsDetails: Object.fromEntries(this.sentNewsDetails),
            config: {
                similarityThreshold: this.similarityThreshold,
                titleSimilarityThreshold: this.titleSimilarityThreshold,
                maxAge: this.maxAge
            },
            exportedAt: Date.now()
        };
    }

    // Импорт данных
    importData(data) {
        if (data.sentNewsHashes) {
            this.sentNewsHashes = new Set(data.sentNewsHashes);
        }
        if (data.sentNewsDetails) {
            this.sentNewsDetails = new Map(Object.entries(data.sentNewsDetails));
        }
        if (data.config) {
            this.similarityThreshold = data.config.similarityThreshold || this.similarityThreshold;
            this.titleSimilarityThreshold = data.config.titleSimilarityThreshold || this.titleSimilarityThreshold;
            this.maxAge = data.config.maxAge || this.maxAge;
        }
        
        console.log(`📥 Импортировано ${this.sentNewsHashes.size} хэшей и ${this.sentNewsDetails.size} записей`);
    }

    // Поиск новости по хэшу
    findNewsByHash(hash) {
        return this.sentNewsDetails.get(hash) || null;
    }

    // Поиск похожих новостей
    findSimilarNews(newsItem, limit = 5) {
        const similarities = [];
        
        if (!newsItem.title) return [];
        
        for (const [hash, details] of this.sentNewsDetails) {
            if (details.title) {
                const similarity = this.calculateTextSimilarity(newsItem.title, details.title);
                if (similarity > 0.3) { // Минимальная похожесть для включения
                    similarities.push({
                        hash: hash,
                        news: details,
                        similarity: similarity
                    });
                }
            }
        }
        
        return similarities
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, limit);
    }
}

module.exports = NewsDeduplicationSystem;

// Тестирование системы
if (require.main === module) {
    console.log('🧪 Тестирование News Deduplication System...');
    
    const dedup = new NewsDeduplicationSystem();
    
    // Тестовые новости
    const testNews = [
        {
            title: 'OpenAI выпустила GPT-5 с революционными возможностями',
            description: 'Новая модель превосходит предыдущие версии по всем метрикам',
            url: 'https://openai.com/gpt5',
            source: 'OpenAI Blog',
            category: 'AI'
        },
        {
            title: 'OpenAI запускает GPT-5 с невероятными функциями',
            description: 'Модель демонстрирует значительные улучшения',
            url: 'https://techcrunch.com/openai-gpt5',
            source: 'TechCrunch',
            category: 'AI'
        },
        {
            title: 'Tesla представила новый Cybertruck',
            description: 'Электрический пикап получил обновленный дизайн',
            url: 'https://tesla.com/cybertruck',
            source: 'Tesla Blog',
            category: 'Tech'
        },
        {
            title: 'OpenAI выпустила GPT-5 с революционными возможностями', // Точный дубликат
            description: 'Новая модель превосходит предыдущие версии по всем метрикам',
            url: 'https://openai.com/gpt5',
            source: 'OpenAI Blog',
            category: 'AI'
        }
    ];
    
    console.log('\n🔍 Тест 1: Фильтрация дубликатов из списка');
    const filterResult = dedup.filterDuplicates(testNews);
    console.log('Результат фильтрации:', filterResult.stats);
    
    console.log('\n📝 Тест 2: Регистрация отправленных новостей');
    const registered = dedup.registerSentBatch(filterResult.uniqueNews);
    console.log(`Зарегистрировано: ${registered.length} новостей`);
    
    console.log('\n🔍 Тест 3: Повторная проверка на дубликаты');
    const duplicateCheck = dedup.isDuplicate(testNews[0]);
    console.log('Проверка дубликата:', duplicateCheck);
    
    console.log('\n🔍 Тест 4: Поиск похожих новостей');
    const similar = dedup.findSimilarNews({
        title: 'GPT-5 от OpenAI революционизирует ИИ',
        description: 'Анализ новых возможностей'
    });
    console.log(`Найдено похожих: ${similar.length}`);
    similar.forEach(s => console.log(`- ${s.news.title} (${Math.round(s.similarity * 100)}%)`));
    
    console.log('\n📊 Тест 5: Статистика системы');
    const stats = dedup.getStats();
    console.log('Статистика:', stats);
    
    console.log('\n✅ Тестирование завершено!');
}