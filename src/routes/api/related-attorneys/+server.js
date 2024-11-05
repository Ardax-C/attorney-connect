import { json } from '@sveltejs/kit';

/** @type {import('./$types').RequestHandler} */
export async function GET({ url }) {
    try {
        const state = url.searchParams.get('state');
        const practiceAreas = url.searchParams.get('practiceAreas')?.split(',');
        const attorneyId = url.searchParams.get('attorneyId');
        const limit = parseInt(url.searchParams.get('limit') || '5');

        if (!state || !practiceAreas || !attorneyId) {
            return json({ 
                attorneys: [],
                error: 'Missing required parameters'
            }, { status: 400 });
        }

        return json({ 
            state,
            practiceAreas,
            attorneyId,
            limit
        });

    } catch (error) {
        return json({ 
            attorneys: [],
            error: error.message || 'Failed to process request'
        }, { status: 500 });
    }
} 