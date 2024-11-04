export const SEARCH_CONFIG = {
  resultsPerPage: 10,
  maxPages: 100,
  defaultSort: [
    { 'lastName.keyword': { order: 'asc' } },
    { 'firstName.keyword': { order: 'asc' } }
  ]
}; 