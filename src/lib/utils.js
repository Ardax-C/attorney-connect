/**
 * Formats a date object or timestamp into a readable string
 * @param {Date|Object} date - Date object or Firestore timestamp
 * @returns {string} Formatted date string
 */
export function formatDate(date) {
    if (!date) return 'Unknown date';
    
    // Handle Firestore Timestamp objects
    const dateObj = date instanceof Date ? date : date.toDate();
    
    return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }).format(dateObj);
} 