// api/get-reviews.js - Получение отзывов
export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') return res.status(200).end();
    
    try {
        console.log('📥 Загружаю отзывы...');
        
        // 🔥 ВРЕМЕННЫЕ ДАННЫЕ ДЛЯ ТЕСТА
        const testReviews = [
            {
                id: 'test1',
                sound: 5,
                design: 4,
                remix: 5,
                song: 4,
                comment: 'Отличное радио!',
                timestamp: '2026-01-01T12:00:00Z'
            },
            {
                id: 'test2',
                sound: 4,
                design: 5,
                remix: 4,
                song: 5,
                comment: 'Нравится дизайн сайта',
                timestamp: '2026-01-02T14:30:00Z'
            }
        ];
        
        const average = 4.5;
        const total = testReviews.length;
        
        console.log('✅ Отзывы загружены:', total, 'оценок');
        
        res.status(200).json({
            success: true,
            ratings: testReviews,
            total: total,
            average: average,
            updated: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('❌ Error:', error);
        res.status(200).json({
            success: true,
            ratings: [],
            total: 0,
            average: 0,
            updated: new Date().toISOString()
        });
    }
}
