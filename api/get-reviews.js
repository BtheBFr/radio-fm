// api/get-reviews.js - Получение отзывов из Gist
export default async function handler(req, res) {
    // Настройки CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') return res.status(200).end();
    
    try {
        const GIST_ID = '5e1359ada750eb5eb49947764f4ca5e9';
        const gistUrl = `https://gist.githubusercontent.com/BtheBFr/${GIST_ID}/raw/reviews.json`;
        
        console.log('📥 Загружаю отзывы из Gist:', gistUrl);
        
        const response = await fetch(gistUrl + '?t=' + Date.now());
        
        if (!response.ok) {
            throw new Error(`Gist error: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('✅ Отзывы загружены:', data.total, 'оценок');
        
        res.status(200).json({
            success: true,
            ...data
        });
        
    } catch (error) {
        console.error('❌ Error loading reviews:', error);
        
        // Возвращаем пустые данные вместо ошибки
        res.status(200).json({
            success: true,
            ratings: [],
            total: 0,
            average: 0,
            updated: new Date().toISOString(),
            note: 'Using fallback data'
        });
    }
}
