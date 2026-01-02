// api/stats.js - ПОЛНЫЙ КОД ДЛЯ СТАТИСТИКИ
const visitors = new Map(); // Хранит активных пользователей
const dailyStats = new Map(); // Хранит статистику по дням
const MAX_INACTIVE_TIME = 15 * 60 * 1000; // 15 минут неактивности

module.exports = async (req, res) => {
    // Настройки CORS для работы с фронтендом
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    try {
        const userIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
        const userAgent = req.headers['user-agent'] || 'unknown';
        const now = Date.now();
        const todayKey = new Date().toISOString().split('T')[0]; // "2025-01-03"
        
        // ==== ОЧИСТКА СТАРЫХ СЕССИЙ ====
        const cutoffTime = now - MAX_INACTIVE_TIME;
        for (const [userId, userData] of visitors.entries()) {
            if (userData.lastSeen < cutoffTime) {
                visitors.delete(userId);
                console.log(`🗑️ Удалена неактивная сессия: ${userId}`);
            }
        }
        
        // ==== ГЕНЕРАЦИЯ ID ПОЛЬЗОВАТЕЛЯ ====
        const crypto = require('crypto');
        const userId = crypto
            .createHash('md5')
            .update(userIP + userAgent + todayKey)
            .digest('hex')
            .substr(0, 12);
        
        // ==== ОБРАБОТКА POST ЗАПРОСОВ (клиент онлайн) ====
        if (req.method === 'POST') {
            let requestData;
            try {
                if (req.body) {
                    requestData = req.body;
                } else {
                    // Читаем raw body если нужно
                    let body = '';
                    req.on('data', chunk => body += chunk);
                    req.on('end', () => {
                        try {
                            requestData = JSON.parse(body || '{}');
                        } catch {
                            requestData = {};
                        }
                    });
                }
            } catch {
                requestData = {};
            }
            
            const isNewUser = !visitors.has(userId);
            
            // ==== ОБНОВЛЕНИЕ СТАТИСТИКИ ДНЯ ====
            if (isNewUser) {
                if (!dailyStats.has(todayKey)) {
                    dailyStats.set(todayKey, {
                        unique: 0,
                        total: 0,
                        firstVisit: now,
                        lastVisit: now
                    });
                }
                
                const dayStat = dailyStats.get(todayKey);
                dayStat.unique++;
                dayStat.total++;
                dayStat.lastVisit = now;
                dailyStats.set(todayKey, dayStat);
                
                console.log(`👤 Новый уникальный посетитель: ${userId}, день: ${todayKey}`);
            } else if (dailyStats.has(todayKey)) {
                // Существующий пользователь - увеличиваем только total
                const dayStat = dailyStats.get(todayKey);
                dayStat.total++;
                dayStat.lastVisit = now;
                dailyStats.set(todayKey, dayStat);
            }
            
            // ==== ОБНОВЛЕНИЕ АКТИВНЫХ ПОЛЬЗОВАТЕЛЕЙ ====
            visitors.set(userId, {
                ip: userIP,
                userAgent: userAgent,
                firstSeen: isNewUser ? now : visitors.get(userId)?.firstSeen || now,
                lastSeen: now,
                today: todayKey,
                page: requestData.page || '/',
                active: true
            });
            
            // ==== ПОДСЧЕТ ТЕКУЩЕЙ СТАТИСТИКИ ====
            // 1. Онлайн сейчас (активные за последние 15 мин)
            const onlineUsers = Array.from(visitors.values()).filter(user => 
                user.lastSeen > cutoffTime
            );
            const onlineCount = Math.max(1, onlineUsers.length);
            
            // 2. Уникальные за сегодня
            const todayUnique = dailyStats.get(todayKey)?.unique || 0;
            const todayCount = Math.max(1, todayUnique);
            
            // 3. Всего уникальных (вся история)
            let totalUnique = 0;
            for (const [day, stat] of dailyStats) {
                totalUnique += stat.unique;
            }
            const totalCount = Math.max(1, totalUnique);
            
            // 4. Всего посещений (включая повторы)
            let totalVisits = 0;
            for (const [day, stat] of dailyStats) {
                totalVisits += stat.total;
            }
            
            // ==== ВОЗВРАЩАЕМ ОТВЕТ ====
            return res.status(200).json({
                success: true,
                user: {
                    id: userId,
                    isNew: isNewUser,
                    firstSeen: isNewUser ? now : visitors.get(userId)?.firstSeen
                },
                stats: {
                    online: onlineCount,
                    today: todayCount,
                    total: totalCount,
                    totalVisits: totalVisits,
                    updated: new Date().toISOString()
                },
                meta: {
                    activeSessions: visitors.size,
                    daysTracked: dailyStats.size,
                    todayDate: todayKey,
                    serverTime: now
                }
            });
        }
        
        // ==== ОБРАБОТКА GET ЗАПРОСОВ (только получение статистики) ====
        if (req.method === 'GET') {
            const cutoffTime = now - MAX_INACTIVE_TIME;
            const onlineUsers = Array.from(visitors.values()).filter(user => 
                user.lastSeen > cutoffTime
            );
            const onlineCount = Math.max(1, onlineUsers.length);
            
            const todayUnique = dailyStats.get(todayKey)?.unique || 0;
            const todayCount = Math.max(1, todayUnique);
            
            let totalUnique = 0;
            for (const [day, stat] of dailyStats) {
                totalUnique += stat.unique;
            }
            const totalCount = Math.max(1, totalUnique);
            
            return res.status(200).json({
                success: true,
                stats: {
                    online: onlineCount,
                    today: todayCount,
                    total: totalCount,
                    updated: new Date().toISOString()
                },
                serverInfo: {
                    time: now,
                    today: todayKey,
                    activeUsers: visitors.size
                }
            });
        }
        
    } catch (error) {
        console.error('❌ Ошибка в stats API:', error);
        // Всегда возвращаем успех с резервными значениями
        return res.status(200).json({
            success: true,
            stats: {
                online: 1,
                today: 1,
                total: 1,
                updated: new Date().toISOString(),
                note: 'Резервная статистика'
            }
        });
    }
};
