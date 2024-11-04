export async function searchAttorneys({ searchTerm = '', page = 1 }) {
  try {
    console.log('[Search Service] Initializing search with:', { searchTerm, page });

    const response = await fetch('http://localhost:5173/api/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ searchTerm, currentPage: page })
    });

    if (!response.ok) {
      throw new Error('Search failed');
    }

    const data = await response.json();
    console.log('[Search Service] Response:', data);
    return data;
  } catch (error) {
    console.error('[Search Service] Error:', error);
    throw error;
  }
} 