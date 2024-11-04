import { practiceAreaMappings, states } from './mappingData';

export const SEARCH_CONFIG = {
  indices: {
    attorneys: 'attorneys'
  },
  boostFactors: {
    name: 3,
    practiceAreas: 2,
    keywords: 1.5,
    location: 1
  },
  resultsPerPage: 12,
  elasticSearch: {
    cloud: {
      id: import.meta.env.VITE_ELASTIC_CLOUD_ID
    },
    auth: {
      apiKey: import.meta.env.VITE_ELASTICSEARCH_API_KEY
    },
    node: import.meta.env.VITE_ELASTICSEARCH_NODE,
    tls: {
      rejectUnauthorized: true
    }
  }
};

// Transform practice area mappings into a simpler format
export const PRACTICE_AREAS = Object.entries(practiceAreaMappings).map(([key, value]) => ({
  id: key,
  name: value.originalName
}));

// Transform states into the required format
export const STATES = states.map(state => ({
  id: state.toLowerCase().replace(/\s+/g, '-'),
  name: state
})); 