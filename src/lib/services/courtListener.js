const COURT_LISTENER_BASE_URL = 'https://www.courtlistener.com/api/rest/v4';
const API_TOKEN = import.meta.env.VITE_COURT_LISTENER_TOKEN;

const DEFAULT_PAGE_SIZE = 5;

export async function fetchRecentBriefs({ cursor = null, pageSize = DEFAULT_PAGE_SIZE, query = '', sort }) {
    const params = new URLSearchParams({
        page_size: pageSize,
    });
    
    if (cursor) {
        try {
            const cursorUrl = new URL(cursor);
            const cursorValue = cursorUrl.searchParams.get('cursor');
            params.append('cursor', cursorValue || cursor);
        } catch {
            params.append('cursor', cursor);
        }
    }
    
    if (query) {
        params.append('q', query);
    }
    
    if (sort) {
        params.append('order_by', sort);
    }

    const response = await fetch(`${COURT_LISTENER_BASE_URL}/search/?${params}`, {
        headers: {
            'Authorization': `Token ${API_TOKEN}`,
            'Accept': 'application/json'
        }
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch court briefs: ${response.status}`);
    }

    const data = await response.json();

    return {
        results: data.results.map(brief => ({
            id: brief.cluster_id || brief.id,
            title: brief.caseName || 'Untitled Case',
            court: brief.court || 'Unknown Court',
            datePublished: brief.dateFiled || new Date().toISOString(),
            summary: brief.caseNameFull || brief.caseName || '',
            fullTextUrl: brief.absolute_url,
            citation: Array.isArray(brief.citation) ? brief.citation.join(', ') : brief.citation || '',
            docketNumber: brief.docketNumber || '',
        })),
        count: data.count,
        next: data.next,
        previous: data.previous
    };
}

export async function getCourtDetails(courtId) {
    const response = await fetch(
        `${COURT_LISTENER_BASE_URL}/courts/${courtId}/`,
        {
            headers: {
                'Authorization': `Token ${API_TOKEN}`,
                'Accept': 'application/json'
            }
        }
    );

    if (!response.ok) {
        throw new Error('Failed to fetch court details');
    }

    return await response.json();
} 