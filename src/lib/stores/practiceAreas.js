import { writable } from 'svelte/store';

export const practiceAreas = writable([]);

let initialized = false;

export async function initializePracticeAreas() {
  if (initialized) return;
  
  try {
    if (typeof window === 'undefined') {
      return;
    }
    
    const response = await fetch('/api/practice-areas');
    if (!response.ok) {
      throw new Error('Failed to fetch practice areas');
    }
    
    const areas = await response.json();
    practiceAreas.set(areas);
    initialized = true;
    return areas;
  } catch (error) {
    console.error('[Practice Areas Store] Error loading practice areas:', error);
    throw error;
  }
} 