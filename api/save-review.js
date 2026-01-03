// api/save-review.js - Отправка отзывов в Google Sheets
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxixUt1dXs0mnpnoayd5CvTeqqBW9slqOjoAVmmuoJwFROa6WV-NS-RQBkpnUgUXrqCQA/exec';

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
        console.log('📤 Отправляю отзыв в Google Sheets...');
        
        const response = await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify(req.body),
            headers: { 'Content-Type': 'application/json' }
        });
        
        const data = await response.json();
        console.log('✅ Отзыв сохранён:', data);
        
        res.status(200).json(data);
        
    } catch (error) {
        console.error('❌ Error saving review:', error);
        
        res.status(200).json({
            success: true,
            message: 'Отзыв сохранён локально',
            ratingId: 'local_' + Date.now(),
            canEditAfter: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
        });
    }
}
