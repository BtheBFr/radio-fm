// api/stats.js - ПРОСТАЯ РАБОЧАЯ ВЕРСИЯ
const crypto = require('crypto');

// Конфигурация
const BAD_WORDS = ['бля', 'пизд', 'хуй', 'еба', 'нах', 'сука', 'fuck', 'shit', 'bitch'];

// Хранилище в памяти (будет сбрасываться при cold start)
let activeUsers = new Map();
let dailyStats = new Map();

// Генерация ID пользователя
function generateUserId(ip, agent) {
    return crypto
        .createHash('md5')
        .update(ip + agent + new Date().toDateString())
        .digest('hex')
        .substr(0, 12);
}

// Проверка на мат
function checkForBadWords(text) {
    if (!text || typeof text !== 'string') return false;
    
    const lowerText = text.toLowerCase();
    return BAD_WORDS.some(word => lowerText.includes(word));
}

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

// Подсчет статистики
function calculateStats() {
    const now = Date.now();
    const todayKey = new Date().toISOString().split('T')[0];
    const cutoffTime = now - 15 * 60 * 1000;
    
    // Активные пользователи (последние 15 минут)
    const onlineUsers = Array.from(activeUsers.values())
        .filter(user => user.lastSeen > cutoffTime);
    
    // Статистика за сегодня
    const todayStat = dailyStats.get(todayKey) || { unique: 1, total: 1 };
    
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
        daysTracked: dailyStats.size,
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
        const userIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown';
        const userAgent = req.headers['user-agent'] || 'unknown';
        const now = Date.now();
        const todayKey = new Date().toISOString().split('T')[0];
        
        // Автоочистка неактивных
        cleanupInactiveUsers();
        
        // Генерация ID пользователя
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
            
            // СТАТИСТИКА ПОЛЬЗОВАТЕЛЕЙ
            const isNewUser = !activeUsers.has(userId);
            
            // Инициализация статистики дня
            if (!dailyStats.has(todayKey)) {
                dailyStats.set(todayKey, { unique: 0, total: 0 });
            }
            
            const dayStat = dailyStats.get(todayKey);
            
            if (isNewUser) {
                dayStat.unique++;
                dayStat.total++;
            } else {
                dayStat.total++;
            }
            
            dailyStats.set(todayKey, dayStat);
            
            // Обновление активных пользователей
            activeUsers.set(userId, {
                ip: userIP,
                agent: userAgent,
                firstSeen: isNewUser ? now : activeUsers.get(userId)?.firstSeen || now,
                lastSeen: now,
                today: todayKey
            });
            
            // ОБРАБОТКА ОТЗЫВОВ
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
                
                return res.status(200).json({
                    success: true,
                    message: 'Оценка принята (проверка мата пройдена)',
                    ratingId: userId + '_' + now,
                    canEditAfter: new Date(now + 3 * 24 * 60 * 60 * 1000).toISOString()
                });
            }
            
            // ВОЗВРАТ СТАТИСТИКИ
            const stats = calculateStats();
            
            return res.status(200).json({
                success: true,
                user: { id: userId, isNew: isNewUser },
                stats: {
                    online: stats.online,
                    today: stats.today,
                    total: stats.total,
                    totalVisits: stats.totalVisits,
                    updated: stats.updated
                },
                meta: {
                    activeSessions: stats.activeSessions,
                    daysTracked: stats.daysTracked,
                    todayDate: todayKey,
                    serverTime: new Date().toISOString()
                }
            });
        }
        
        // ОБРАБОТКА GET ЗАПРОСОВ
        if (req.method === 'GET') {
            const stats = calculateStats();
            
            return res.status(200).json({
                success: true,
                stats: {
                    online: stats.online,
                    today: stats.today,
                    total: stats.total,
                    updated: stats.updated
                }
            });
        }
        
    } catch (error) {
        console.error('❌ API Error:', error);
        
        // Всегда возвращаем успешный ответ
        return res.status(200).json({
            success: true,
            stats: {
                online: 1,
                today: 1,
                total: 1,
                updated: new Date().toISOString()
            },
            error: error.message
        });
    }
};
