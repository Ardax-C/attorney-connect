import { writable } from 'svelte/store';

function createSearchStore() {
  const { subscribe, set, update } = writable({
    searchTerm: '',
    practiceAreas: [],
    states: [],
    results: [],
    total: 0,
    loading: false,
    error: null,
    page: 1
  });

  return {
    subscribe,
    setSearchTerm: (term) => update(s => ({ ...s, searchTerm: term })),
    setPracticeAreas: (areas) => update(s => ({ ...s, practiceAreas: areas })),
    setStates: (states) => update(s => ({ ...s, states: states })),
    setPage: (page) => update(s => ({ ...s, page })),
    setLoading: (loading) => update(s => ({ ...s, loading })),
    setResults: (results, total) => update(s => ({ ...s, results, total })),
    setError: (error) => update(s => ({ ...s, error })),
    reset: () => set({
      searchTerm: '',
      practiceAreas: [],
      states: [],
      results: [],
      total: 0,
      loading: false,
      error: null,
      page: 1
    })
  };
}

export const searchStore = createSearchStore(); 