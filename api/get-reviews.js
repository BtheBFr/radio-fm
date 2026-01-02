// api/get-reviews.js - Получение отзывов из Edge Config
export default async function handler(req, res) {
    // Настройки CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') return res.status(200).end();
    
    try {
        console.log('📥 Загружаю отзывы из Edge Config...');
        
        // 🔥 Пока тестовые данные
        const testReviews = [
            {
                id: 'test1',
                sound: 5,
                design: 4,
                remix: 5,
                song: 4,
                comment: 'Отличное радио! Слушаю каждый день.',
                timestamp: new Date().toISOString()
            },
            {
                id: 'test2',
                sound: 4,
                design: 5,
                remix: 4,
                song: 5,
                comment: 'Крутой дизайн сайта!',
                timestamp: new Date().toISOString()
            },
            {
                id: 'test3',
                sound: 3,
                design: 4,
                remix: 5,
                song: 3,
                comment: 'Нормально, но можно лучше',
                timestamp: new Date().toISOString()
            }
        ];
        
        // Рассчитываем среднюю
        const totalScore = testReviews.reduce((sum, review) => {
            const avg = (review.sound + review.design + review.remix + review.song) / 4;
            return sum + avg;
        }, 0);
        
        const average = totalScore / testReviews.length;
        
        console.log('✅ Отзывы загружены:', testReviews.length, 'шт.');
        
        res.status(200).json({
            success: true,
            ratings: testReviews,
            total: testReviews.length,
            average: parseFloat(average.toFixed(1)),
            updated: new Date().toISOString()
        });
        
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
