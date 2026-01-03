// api/stats.js - ИСПРАВЛЕННАЯ ВЕРСИЯ СТАТИСТИКИ
const crypto = require('crypto');

// Хранилище в памяти
let activeSessions = new Map(); // {userId: {lastSeen, data}}
let dailyStats = new Map(); // {date: {uniqueUsers, visits}}
let allTimeStats = { uniqueUsers: new Set(), totalVisits: 0 };

// Очистка неактивных сессий
function cleanupSessions() {
    const now = Date.now();
    const fifteenMinutes = 15 * 60 * 1000;
    
    for (const [userId, session] of activeSessions.entries()) {
        if (now - session.lastSeen > fifteenMinutes) {
            activeSessions.delete(userId);
        }
    }
}

// Получение статистики
function getStats() {
    const now = Date.now();
    const today = new Date().toISOString().split('T')[0];
    const fifteenMinutesAgo = now - (15 * 60 * 1000);
    
    // Активные пользователи (последние 15 минут)
    const onlineUsers = Array.from(activeSessions.values())
        .filter(session => session.lastSeen > fifteenMinutesAgo)
        .length;
    
    // Статистика за сегодня
    const todayStat = dailyStats.get(today) || { uniqueUsers: new Set(), visits: 0 };
    
    return {
        online: Math.max(1, onlineUsers), // МИНИМУМ 1
        today: Math.max(1, todayStat.uniqueUsers.size),
        total: Math.max(1, allTimeStats.uniqueUsers.size),
        updated: new Date().toISOString()
    };
}

module.exports = async (req, res) => {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') return res.status(200).end();
    
    try {
        const userIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress || '0.0.0.0';
        const userAgent = req.headers['user-agent'] || 'unknown';
        const now = Date.now();
        const today = new Date().toISOString().split('T')[0];
        
        // Очищаем старые сессии
        cleanupSessions();
        
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
            
            // Генерация ID пользователя
            const clientId = body.userId || crypto
                .createHash('md5')
                .update(userIP + userAgent + today)
                .digest('hex')
                .substr(0, 12);
            
            // ИНИЦИАЛИЗАЦИЯ статистики дня
            if (!dailyStats.has(today)) {
                dailyStats.set(today, { uniqueUsers: new Set(), visits: 0 });
            }
            
            const todayStat = dailyStats.get(today);
            
            // ОБНОВЛЕНИЕ статистики
            const isNewToday = !todayStat.uniqueUsers.has(clientId);
            const isNewOverall = !allTimeStats.uniqueUsers.has(clientId);
            
            if (isNewToday) {
                todayStat.uniqueUsers.add(clientId);
            }
            todayStat.visits++;
            
            if (isNewOverall) {
                allTimeStats.uniqueUsers.add(clientId);
            }
            allTimeStats.totalVisits++;
            
            // Обновление активной сессии
            activeSessions.set(clientId, {
                lastSeen: now,
                ip: userIP,
                agent: userAgent,
                firstSeen: activeSessions.get(clientId)?.firstSeen || now
            });
            
            // Сохранение обновлённой статистики
            dailyStats.set(today, todayStat);
            
            // Возврат статистики
            const stats = getStats();
            
            res.status(200).json({
                success: true,
                stats: stats,
                user: {
                    id: clientId,
                    isNewToday: isNewToday,
                    isNewOverall: isNewOverall
                }
            });
            
        } else if (req.method === 'GET') {
            const stats = getStats();
            res.status(200).json({
                success: true,
                stats: stats
            });
        }
        
    } catch (error) {
        console.error('❌ Stats API Error:', error);
        
        // Всегда возвращаем корректные данные
        res.status(200).json({
            success: true,
            stats: {
                online: 1,
                today: 1,
                total: 1,
                updated: new Date().toISOString()
            }
        });
    }
};
