export async function load({ url }) {
    const searchTerm = url.searchParams.get('q') || '';
    return {
        searchTerm
    };
} 