import { readable } from 'svelte/store';

export const visibility = readable(true, (set) => {
    if (typeof document === 'undefined') return;

    const handler = () => set(document.visibilityState === 'visible');
    
    document.addEventListener('visibilitychange', handler);
    
    return () => {
        document.removeEventListener('visibilitychange', handler);
    };
}); 