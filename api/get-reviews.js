// api/get-reviews.js - Получение отзывов из Google Sheets
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzTt4Gr7anIXAda8Z3RyZd3bk04ADrlMncSbyYBijF0XGkfhkgebAu5J1ZS0gLLhuYyRA/exec';

export default async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'GET') {
        return res.status(405).json({
            success: false,
            error: 'Method not allowed'
        });
    }
    
    try {
        console.log('📥 Загружаю отзывы из Google Sheets...');
        
        // Добавляем timestamp чтобы избежать кэширования
        const timestamp = Date.now();
        const url = `${GOOGLE_SCRIPT_URL}?t=${timestamp}`;
        
        // Делаем запрос с таймаутом
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 секунд таймаут
        
        const response = await fetch(url, {
            signal: controller.signal,
            headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache'
            }
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            console.error('❌ Ошибка HTTP:', response.status);
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        
        // Проверяем и форматируем данные
        const formattedData = {
            success: true,
            ratings: Array.isArray(data.ratings) ? data.ratings : [],
            total: Number(data.total) || 0,
            average: parseFloat(data.average) || 0,
            updated: data.updated || new Date().toISOString()
        };
        
        // Ограничиваем средний рейтинг 0-5
        if (formattedData.average < 0) formattedData.average = 0;
        if (formattedData.average > 5) formattedData.average = 5;
        
        console.log('✅ Отзывы загружены:', formattedData.total, 'оценок, среднее:', formattedData.average.toFixed(1));
        
        return res.status(200).json(formattedData);
        
    } catch (error) {
        console.error('❌ Ошибка загрузки отзывов:', error.message);
        
        // Возвращаем корректные данные даже при ошибке
        const fallbackData = {
            success: true,
            ratings: [],
            total: 0,
            average: 0,
            updated: new Date().toISOString(),
            error: error.message,
            note: 'Используются локальные данные'
        };
        
        return res.status(200).json(fallbackData);
    }
}
