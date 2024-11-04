import { practiceAreaMappings, states } from './mappingData';

export const SEARCH_CONFIG = {
  resultsPerPage: 10,
  maxKeywords: 25,
  boostFactors: {
    practiceAreas: 2.0,
    location: 1.5,
    name: 2.0,
    keywords: 1.2
  },
  indices: {
    attorneys: 'attorneys',
    practiceAreas: 'practice-areas',
    states: 'states'
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