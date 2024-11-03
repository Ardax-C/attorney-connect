import { extractInfoWithGemini } from '../vertexAI';

export async function analyzeSearchTerm(searchTerm) {
    if (!searchTerm?.trim()) {
        return {
            locations: [],
            practiceAreas: [],
            keywords: []
        };
    }
    return await extractInfoWithGemini(searchTerm);
} 