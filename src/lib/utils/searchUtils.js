import { SEARCH_CONFIG } from '../config/searchConfig';

export function buildSearchQuery(params) {
  const {
    searchTerm = '',
    practiceAreas = [],
    states = [],
    page = 1,
    limit = SEARCH_CONFIG.resultsPerPage
  } = params;

  const query = {
    bool: {
      must: [],
      should: [],
      filter: [
        { term: { status: 'approved' } }
      ]
    }
  };

  if (searchTerm) {
    query.bool.must.push({
      multi_match: {
        query: searchTerm,
        fields: [
          `firstName^${SEARCH_CONFIG.boostFactors.name}`,
          `lastName^${SEARCH_CONFIG.boostFactors.name}`,
          `practiceAreas^${SEARCH_CONFIG.boostFactors.practiceAreas}`,
          `keywords^${SEARCH_CONFIG.boostFactors.keywords}`,
          'city',
          'state'
        ],
        type: 'best_fields',
        operator: 'or',
        fuzziness: 'AUTO'
      }
    });
  }

  if (practiceAreas.length > 0) {
    query.bool.filter.push({
      terms: { practiceAreas: practiceAreas }
    });
  }

  if (states.length > 0) {
    query.bool.filter.push({
      terms: { state: states }
    });
  }

  return {
    query,
    from: (page - 1) * limit,
    size: limit,
    sort: [
      { _score: 'desc' },
      { 'lastName.keyword': 'asc' }
    ]
  };
}

export function formatSearchResults(elasticResults) {
  return {
    attorneys: elasticResults.hits.hits.map(hit => ({
      id: hit._id,
      score: hit._score,
      ...hit._source,
      matchedFields: getMatchedFields(hit)
    })),
    total: elasticResults.hits.total.value,
    maxScore: elasticResults.hits.max_score
  };
}

function getMatchedFields(hit) {
  const matched = new Set();
  if (hit.highlight) {
    Object.keys(hit.highlight).forEach(field => matched.add(field));
  }
  return Array.from(matched);
} 