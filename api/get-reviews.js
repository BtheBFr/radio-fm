// api/get-reviews.js - Получение отзывов из Google Sheets
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzTt4Gr7anIXAda8Z3RyZd3bk04ADrlMncSbyYBijF0XGkfhkgebAu5J1ZS0gLLhuYyRA/exec';

// Кэш для отзывов
let reviewsCache = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 минут

export default async function handler(req, res) {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') return res.status(200).end();
    
    // Проверка кэша
    const now = Date.now();
    if (reviewsCache && (now - cacheTimestamp) < CACHE_DURATION) {
        console.log('📊 Возвращаю отзывы из кэша');
        return res.status(200).json(reviewsCache);
    }
    
    try {
        console.log('📥 Загружаю отзывы из Google Sheets...');
        
        const response = await fetch(GOOGLE_SCRIPT_URL);
        const data = await response.json();
        
        console.log('✅ Отзывы загружены:', data.total || 0, 'оценок');
        
        // Сохраняем в кэш
        reviewsCache = data;
        cacheTimestamp = now;
        
        res.status(200).json(data);
        
    } catch (error) {
        console.error('❌ Error loading reviews:', error);
        
        // При ошибке возвращаем кэшированные данные или пустые
        const response = reviewsCache || {
            success: true,
            ratings: [],
            total: 0,
            average: 0,
            updated: new Date().toISOString()
        };
        
        res.status(200).json(response);
    }
}
