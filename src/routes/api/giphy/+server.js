import { json } from '@sveltejs/kit';

const GIPHY_API_KEY = import.meta.env.VITE_GIPHY_API_KEY;

export async function GET({ url }) {
    try {
        const isTrending = url.searchParams.get('trending') === 'true';
        const query = url.searchParams.get('query');

        let apiUrl = 'https://api.giphy.com/v1/gifs/';
        apiUrl += isTrending ? 'trending?' : 'search?';
        apiUrl += `api_key=${GIPHY_API_KEY}`;
        
        if (!isTrending) {
            apiUrl += `&q=${encodeURIComponent(query)}`;
        }
        
        apiUrl += '&limit=20&rating=pg-13';

        const response = await fetch(apiUrl);
        
        if (!response.ok) {
            throw new Error('GIPHY API request failed');
        }
        
        const data = await response.json();
        return json(data);
    } catch (error) {
        console.error('GIPHY API error:', error);
        return json({ error: 'Failed to fetch GIFs' }, { status: 500 });
    }
} 