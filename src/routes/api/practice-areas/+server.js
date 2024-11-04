import { json } from '@sveltejs/kit';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '$lib/firebase';

export async function GET() {
  try {
    const practiceAreasQuery = collection(db, "practiceAreas");
    const snapshot = await getDocs(practiceAreasQuery);
    
    const areas = snapshot.docs
      .map(doc => doc.data().practiceArea)
      .filter(area => area) // Remove any undefined/null values
      .sort();

    return json(areas);
  } catch (error) {
    console.error('[Practice Areas API] Error:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch practice areas' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
} 