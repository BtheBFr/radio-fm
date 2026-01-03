// api/get-reviews.js - Получение отзывов из Google Sheets
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzTt4Gr7anIXAda8Z3RyZd3bk04ADrlMncSbyYBijF0XGkfhkgebAu5J1ZS0gLLhuYyRA/exec';

export default async function handler(req, res) {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') return res.status(200).end();
    
    try {
        console.log('📥 Загружаю отзывы из Google Sheets...');
        
        const response = await fetch(GOOGLE_SCRIPT_URL);
        const data = await response.json();
        
        console.log('✅ Отзывы загружены:', data.total || 0, 'оценок');
        
        res.status(200).json(data);
        
    } catch (error) {
        console.error('❌ Error loading reviews:', error);
        
        res.status(200).json({
            success: true,
            ratings: [],
            total: 0,
            average: 0,
            updated: new Date().toISOString()
        });
    }
}
