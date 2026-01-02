// api/stats.js - ПОЛНЫЙ ФУНКЦИОНАЛ СТАТИСТИКИ И ПРОВЕРКИ
const crypto = require('crypto');

// Хранилища
const activeUsers = new Map();     // Активные пользователи
const dailyStats = new Map();      // Статистика по дням
const userRatings = new Map();     // Оценки пользователей
const ratingCache = {              // Кеш рейтингов
    average: 0,
    total: 0,
    updated: 0,
    data: null
};

// Список запрещенных слов (сокращенный)
const BAD_WORDS = [
    'бля', 'пизд', 'хуй', 'хуе', 'хуя', 'еб', 'ебу', 'еба',
    'наху', 'залуп', 'манда', 'гандон', 'муда', 'педик', 'пидор',
    'шалав', 'шлюх', 'проститу', 'сука', 'сучк', 'долбоеб', 'дебил',
    'идиот', 'дурак', 'урод', 'кретин', 'уеби', 'выеб',
    'сперм', 'вагин', 'член', 'пенис', 'анальн', 'секс', 'трах',
    'бзд', 'перд', 'говн', 'дерьм', 'кака', 'сса', 'срак',
    'спам', 'scam', 'лох', 'лошара', 'урод', 'долбаёб'
];

// Очистка неактивных пользователей
function cleanupInactiveUsers() {
    const now = Date.now();
    const cutoffTime = now - 15 * 60 * 1000; // 15 минут
    
    for (const [userId, userData] of activeUsers.entries()) {
        if (userData.lastSeen < cutoffTime) {
            activeUsers.delete(userId);
        }
    }
}

// Проверка на мат
function checkForBadWords(text) {
    if (!text || typeof text !== 'string') return false;
    
    const lowerText = text.toLowerCase()
        .replace(/[.,!?;:()\[\]{}'"`~@#$%^&*+=|\\<>\/]/g, ' ')
        .replace(/\s+/g, ' ');
    
    const words = lowerText.split(' ');
    
    for (const word of words) {
        if (word.length < 3) continue;
        
        for (const badWord of BAD_WORDS) {
            if (word.includes(badWord)) {
                return true;
            }
        }
    }
    
    // Проверка паттернов
    const badPatterns = [
        /бля[^\s]*/i, /пизд[^\s]*/i, /ху[йяе][^\s]*/i,
        /еба[^\s]*/i, /наху[^\s]*/i, /залуп[^\s]*/i,
        /[xх][уy][йея][^\s]*/i, /[3з]а[еe]ба[^\s]*/i,
        /fuck/i, /shit/i, /asshole/i, /bitch/i, /dick/i
    ];
    
    return badPatterns.some(pattern => pattern.test(text));
}

// Генерация ID пользователя
function generateUserId(ip, agent) {
    return crypto
        .createHash('md5')
        .update(ip + agent + new Date().toDateString())
        .digest('hex')
        .substr(0, 12);
}

// Подсчет статистики
function calculateStats() {
    const now = Date.now();
    const todayKey = new Date().toISOString().split('T')[0];
    const cutoffTime = now - 15 * 60 * 1000;
    
    // Активные пользователи
    const onlineUsers = Array.from(activeUsers.values())
        .filter(user => user.lastSeen > cutoffTime);
    
    // Статистика за сегодня
    const todayStat = dailyStats.get(todayKey) || { unique: 0, total: 0 };
    
    // Общая статистика
    let totalUnique = 0;
    let totalVisits = 0;
    
    for (const [day, stat] of dailyStats) {
        totalUnique += stat.unique;
        totalVisits += stat.total;
    }
    
    return {
        online: Math.max(1, onlineUsers.length),
        today: Math.max(1, todayStat.unique),
        total: Math.max(1, totalUnique),
        totalVisits: Math.max(1, totalVisits),
        activeSessions: activeUsers.size,
        daysTracked: dailyStats.size
    };
}

// Обновление рейтинга
function updateRatingCache() {
    const ratings = Array.from(userRatings.values());
    
    if (ratings.length === 0) {
        ratingCache.average = 0;
        ratingCache.total = 0;
        ratingCache.updated = Date.now();
        ratingCache.data = { ratings: [] };
        return;
    }
    
    const total = ratings.reduce((sum, rating) => {
        const avg = (rating.sound + rating.design + rating.remix + rating.song) / 4;
        return sum + avg;
    }, 0);
    
    ratingCache.average = parseFloat((total / ratings.length).toFixed(1));
    ratingCache.total = ratings.length;
    ratingCache.updated = Date.now();
    ratingCache.data = {
        ratings: ratings,
        average: ratingCache.average,
        total: ratingCache.total,
        updated: new Date().toISOString()
    };
}

// Основной обработчик
module.exports = async (req, res) => {
    // Настройки CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') return res.status(200).end();
    
    try {
        const userIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
        const userAgent = req.headers['user-agent'] || 'unknown';
        const now = Date.now();
        const todayKey = new Date().toISOString().split('T')[0];
        
        // Автоочистка
        cleanupInactiveUsers();
        
        // Генерация ID
        const userId = generateUserId(userIP, userAgent);
        
        // ОБРАБОТКА POST ЗАПРОСОВ
        if (req.method === 'POST') {
            let body = {};
            try {
                if (req.body) {
                    body = req.body;
                } else {
                    let rawBody = '';
                    req.on('data', chunk => rawBody += chunk);
                    req.on('end', () => {
                        try { body = JSON.parse(rawBody); } catch { body = {}; }
                    });
                }
            } catch (e) {
                body = {};
            }
            
            const action = body.action || 'ping';
            
            // === СТАТИСТИКА ПОЛЬЗОВАТЕЛЕЙ ===
            const isNewUser = !activeUsers.has(userId);
            
            if (isNewUser) {
                // Новая статистика дня
                if (!dailyStats.has(todayKey)) {
                    dailyStats.set(todayKey, { unique: 0, total: 0 });
                }
                const dayStat = dailyStats.get(todayKey);
                dayStat.unique++;
                dayStat.total++;
                dailyStats.set(todayKey, dayStat);
            } else if (dailyStats.has(todayKey)) {
                // Существующий пользователь
                const dayStat = dailyStats.get(todayKey);
                dayStat.total++;
                dailyStats.set(todayKey, dayStat);
            }
            
            // Обновление активных пользователей
            activeUsers.set(userId, {
                ip: userIP,
                agent: userAgent,
                firstSeen: isNewUser ? now : activeUsers.get(userId)?.firstSeen || now,
                lastSeen: now,
                today: todayKey
            });
            
            // === ОБРАБОТКА ОТЗЫВОВ ===
            if (action === 'submit_rating' && body.rating) {
                const rating = body.rating;
                
                // Проверка комментария на мат
                if (rating.comment && checkForBadWords(rating.comment)) {
                    return res.status(400).json({
                        success: false,
                        error: 'Комментарий содержит нецензурную лексику',
                        code: 'BAD_WORDS'
                    });
                }
                
                // Сохранение оценки
                userRatings.set(userId + '_' + now, {
                    ...rating,
                    userId: userId,
                    ip: userIP,
                    timestamp: now,
                    date: todayKey
                });
                
                // Обновление кеша
                updateRatingCache();
                
                return res.status(200).json({
                    success: true,
                    message: 'Оценка сохранена',
                    ratingId: userId + '_' + now,
                    canEditAfter: new Date(now + 3 * 24 * 60 * 60 * 1000).toISOString()
                });
            }
            
            // === ВОЗВРАТ СТАТИСТИКИ ===
            const stats = calculateStats();
            
            return res.status(200).json({
                success: true,
                user: { id: userId, isNew: isNewUser },
                stats: {
                    online: stats.online,
                    today: stats.today,
                    total: stats.total,
                    totalVisits: stats.totalVisits,
                    updated: new Date().toISOString()
                },
                meta: {
                    activeSessions: stats.activeSessions,
                    daysTracked: stats.daysTracked,
                    todayDate: todayKey
                }
            });
        }
        
        // === ОБРАБОТКА GET ЗАПРОСОВ ===
        if (req.method === 'GET') {
            const path = req.url.split('?')[0];
            
            // Получение рейтингов
            if (path.includes('/ratings') || path === '/ratings') {
                // Проверяем актуальность кеша (5 минут)
                if (ratingCache.updated > Date.now() - 5 * 60 * 1000 && ratingCache.data) {
                    return res.status(200).json(ratingCache.data);
                }
                
                updateRatingCache();
                return res.status(200).json(ratingCache.data || {
                    ratings: [],
                    average: 0,
                    total: 0,
                    updated: new Date().toISOString()
                });
            }
            
            // Получение статистики
            const stats = calculateStats();
            
            return res.status(200).json({
                success: true,
                stats: {
                    online: stats.online,
                    today: stats.today,
                    total: stats.total,
                    updated: new Date().toISOString()
                },
                serverInfo: {
                    time: now,
                    today: todayKey,
                    version: '1.2.0'
                }
            });
        }
        
    } catch (error) {
        console.error('❌ API Error:', error);
        
        // Всегда возвращаем успешный ответ с резервными значениями
        return res.status(200).json({
            success: true,
            stats: {
                online: 1,
                today: 1,
                total: 1,
                updated: new Date().toISOString(),
                note: 'Резервная статистика'
            },
            error: error.message
        });
    }
};
