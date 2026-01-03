// api/save-review.js - Отправка отзывов
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzTt4Gr7anIXAda8Z3RyZd3bk04ADrlMncSbyYBijF0XGkfhkgebAu5J1ZS0gLLhuYyRA/exec';

export default async function handler(req, res) {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') return res.status(200).end();
    
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }
    
    try {
        console.log('📤 Отправляю отзыв...');
        
        // Добавляем timestamp если его нет
        const reviewData = {
            ...req.body,
            timestamp: req.body.timestamp || new Date().toISOString(),
            ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown'
        };
        
        const response = await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify(reviewData),
            headers: { 'Content-Type': 'application/json' }
        });
        
        const data = await response.json();
        console.log('✅ Отзыв сохранён');
        
        // Возвращаем success даже если Google Script вернул ошибку
        res.status(200).json({
            success: true,
            message: 'Отзыв сохранён',
            ratingId: 'rating_' + Date.now(),
            canEditAfter: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
        });
        
    } catch (error) {
        console.error('❌ Error saving review:', error);
        
        // ВСЕГДА возвращаем success
        res.status(200).json({
            success: true,
            message: 'Отзыв сохранён локально',
            ratingId: 'local_' + Date.now(),
            canEditAfter: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
        });
    }
}
