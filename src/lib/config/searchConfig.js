// Import the mapping data
import practiceAreaMappings from '../data/practiceAreaMappings.json';
import stateMapping from '../data/stateMapping.json';

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
export const PRACTICE_AREAS = Object.entries(practiceAreaMappings.data).map(([key, value]) => ({
  id: key,
  name: value.originalName
}));

// Transform state mappings into a simpler format
export const STATES = Object.entries(stateMapping.data).map(([state]) => ({
  id: state.toLowerCase().replace(/\s+/g, '-'),
  name: state
})); 