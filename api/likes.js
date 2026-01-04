// api/likes.js - API для лайков
const fs = require('fs');
const path = require('path');

// Путь к файлу с лайками
const LIKES_FILE = path.join(process.cwd(), 'data', 'likes.json');

// Создаем директорию если нет
const dataDir = path.dirname(LIKES_FILE);
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// Загружаем лайки
function loadLikes() {
    try {
        if (fs.existsSync(LIKES_FILE)) {
            const data = fs.readFileSync(LIKES_FILE, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error('Ошибка загрузки лайков:', error);
    }
    // Инициализируем структуру если файла нет
    return { 
        tracks: {},     // Глобальные счетчики лайков: { "trackId": count }
        users: {}       // Лайки пользователей: { "userId": ["trackId1", "trackId2"] }
    };
}

// Сохраняем лайки
function saveLikes(likes) {
    try {
        fs.writeFileSync(LIKES_FILE, JSON.stringify(likes, null, 2));
        return true;
    } catch (error) {
        console.error('Ошибка сохранения лайков:', error);
        return false;
    }
}

// Основной обработчик
module.exports = async (req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-User-Id');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    try {
        const userId = req.headers['x-user-id'] || req.body?.userId || 'anonymous';
        let likes = loadLikes();
        
        // Инициализируем структуры если нет
        if (!likes.tracks) likes.tracks = {};
        if (!likes.users) likes.users = {};
        if (!likes.users[userId]) likes.users[userId] = [];
        
        if (req.method === 'GET') {
            // Получаем все лайки для пользователя
            return res.status(200).json({
                success: true,
                tracks: likes.tracks,          // ВСЕ лайки всех пользователей
                userLikes: likes.users[userId] || [] // Лайки текущего пользователя
            });
            
        } else if (req.method === 'POST') {
            // Добавляем лайк
            const { trackId } = req.body;
            
            if (!trackId) {
                return res.status(400).json({ 
                    success: false, 
                    error: 'Не указан trackId' 
                });
            }
            
            // Добавляем лайк если его еще нет
            if (!likes.users[userId].includes(trackId)) {
                likes.users[userId].push(trackId);
                likes.tracks[trackId] = (likes.tracks[trackId] || 0) + 1;
                saveLikes(likes);
            }
            
            return res.status(200).json({
                success: true,
                count: likes.tracks[trackId] || 0,
                userLikes: likes.users[userId]
            });
            
        } else if (req.method === 'DELETE') {
            // Убираем лайк
            const { trackId } = req.body;
            
            if (!trackId) {
                return res.status(400).json({ 
                    success: false, 
                    error: 'Не указан trackId' 
                });
            }
            
            // Убираем лайк если он есть
            const userIndex = likes.users[userId].indexOf(trackId);
            if (userIndex > -1) {
                likes.users[userId].splice(userIndex, 1);
                
                // Уменьшаем счетчик, но не ниже 0
                if (likes.tracks[trackId] && likes.tracks[trackId] > 0) {
                    likes.tracks[trackId] -= 1;
                } else {
                    likes.tracks[trackId] = 0;
                }
                
                saveLikes(likes);
            }
            
            return res.status(200).json({
                success: true,
                count: likes.tracks[trackId] || 0,
                userLikes: likes.users[userId] || []
            });
        }
        
        return res.status(405).json({ success: false, error: 'Method not allowed' });
        
    } catch (error) {
        console.error('Ошибка обработки лайка:', error);
        return res.status(200).json({
            success: false,
            error: error.message
        });
    }
};
