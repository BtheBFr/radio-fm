// api/get-reviews.js - Получение отзывов из Google Sheets
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzTt4Gr7anIXAda8Z3RyZd3bk04ADrlMncSbyYBijF0XGkfhkgebAu5J1ZS0gLLhuYyRA/exec';

// Кэш для отзывов на 1 минуту
let reviewsCache = null;
let cacheTime = 0;

export default async function handler(req, res) {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') return res.status(200).end();
    
    // Используем кэш если данные свежие
    const now = Date.now();
    if (reviewsCache && (now - cacheTime) < 60000) {
        console.log('📊 Использую кэшированные отзывы');
        return res.status(200).json(reviewsCache);
    }
    
    try {
        console.log('📥 Загружаю отзывы из Google Sheets...');
        
        const response = await fetch(GOOGLE_SCRIPT_URL + '?t=' + now);
        if (!response.ok) throw new Error('Ошибка загрузки');
        
        const data = await response.json();
        
        // Обязательно проверяем данные
        const validData = {
            success: true,
            ratings: Array.isArray(data.ratings) ? data.ratings : [],
            total: Number(data.total) || 0,
            average: Number(data.average) || 0,
            updated: data.updated || new Date().toISOString()
        };
        
        console.log('✅ Отзывы загружены:', validData.total, 'оценок');
        
        // Сохраняем в кэш
        reviewsCache = validData;
        cacheTime = now;
        
        res.status(200).json(validData);
        
    } catch (error) {
        console.error('❌ Error loading reviews:', error);
        
        // При ошибке возвращаем хоть что-то из кэша
        const fallbackData = reviewsCache || {
            success: true,
            ratings: [],
            total: 0,
            average: 0,
            updated: new Date().toISOString()
        };
        
        res.status(200).json(fallbackData);
    }
}
