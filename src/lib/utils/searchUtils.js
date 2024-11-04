import { SEARCH_CONFIG } from '../config/searchConfig';

export function buildSearchQuery(parsedQuery) {
  const { boostFactors } = SEARCH_CONFIG;
  
  const query = {
    bool: {
      must: [],
      should: [],
      filter: [
        { term: { status: 'approved' } }
      ]
    }
  };

  // Handle practice areas with proper operator
  if (parsedQuery.practiceAreas.terms.length > 0) {
    const practiceAreaQuery = {
      bool: {
        [parsedQuery.practiceAreas.operator === 'OR' ? 'should' : 'must']: 
          parsedQuery.practiceAreas.terms.map(area => ({
            match: { 
              practiceAreas: {
                query: area,
                boost: boostFactors.practiceAreas
              }
            }
          }))
      }
    };
    query.bool.must.push(practiceAreaQuery);
  }

  // Handle locations with proper operator
  if (parsedQuery.locations.terms.length > 0) {
    const locationQuery = {
      bool: {
        [parsedQuery.locations.operator === 'OR' ? 'should' : 'must']: [
          ...parsedQuery.locations.terms.map(location => ({
            multi_match: {
              query: location,
              fields: [
                `city^${boostFactors.location}`,
                `state^${boostFactors.location}`
              ],
              type: 'best_fields'
            }
          }))
        ]
      }
    };
    query.bool.must.push(locationQuery);
  }

  // Handle keywords and modifiers
  if (parsedQuery.keywords.length > 0) {
    query.bool.should.push({
      multi_match: {
        query: parsedQuery.keywords.join(' '),
        fields: [
          `firstName^${boostFactors.name}`,
          `lastName^${boostFactors.name}`,
          `practiceAreas^${boostFactors.practiceAreas}`,
          `keywords^${boostFactors.keywords}`,
          `city^${boostFactors.location}`,
          `state^${boostFactors.location}`
        ],
        type: 'best_fields',
        operator: 'or',
        fuzziness: 'AUTO'
      }
    });
  }

  // Handle modifiers
  if (parsedQuery.modifiers.experienceLevel !== 'any') {
    query.bool.must.push({
      range: {
        yearsOfExperience: {
          gte: parsedQuery.modifiers.experienceLevel === 'expert' ? 10 : 5
        }
      }
    });
  }

  return {
    query,
    size: SEARCH_CONFIG.resultsPerPage,
    highlight: {
      fields: {
        firstName: {},
        lastName: {},
        practiceAreas: {},
        city: {},
        state: {},
        keywords: {}
      }
    }
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