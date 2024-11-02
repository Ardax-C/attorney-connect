import { initializeApp } from "firebase/app";
import { getVertexAI, getGenerativeModel } from "firebase/vertexai-preview";
import { db } from '$lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import Fuse from 'fuse.js';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_PUBLIC_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_PUBLIC_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_PUBLIC_FIREBASE_MEASUREMENT_ID
};

const firebaseApp = initializeApp(firebaseConfig);
const vertexAI = getVertexAI(firebaseApp);
const model = getGenerativeModel(vertexAI, { model: "gemini-1.5-flash" });

let statesFuse;
let practiceAreasFuse;

async function initializeFuseInstances() {
  if (!statesFuse || !practiceAreasFuse) {
    const statesSnapshot = await getDocs(collection(db, 'stateMapping'));
    const states = statesSnapshot.docs.map(doc => doc.id);
    statesFuse = new Fuse(states, { threshold: 0.3 });

    const practiceAreasSnapshot = await getDocs(collection(db, 'practiceAreas'));
    const practiceAreas = practiceAreasSnapshot.docs.map(doc => doc.data().practiceArea);
    practiceAreasFuse = new Fuse(practiceAreas, { threshold: 0.3 });
  }
}

export async function searchAttorneys(searchTerm) {
  // If search term is empty, return all attorneys
  if (!searchTerm || searchTerm.trim() === '') {
    try {
      const snapshot = await getDocs(collection(db, 'attorneyProfiles'));
      const attorneys = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      return { 
        extractedInfo: null, 
        results: attorneys.sort((a, b) => a.lastName.localeCompare(b.lastName)) 
      };
    } catch (error) {
      console.error('Error fetching all attorneys:', error);
      return { extractedInfo: null, results: [] };
    }
  }

  try {
    await initializeFuseInstances();

    // Extract keywords, practice areas, and locations using Gemini
    const extractedInfo = await extractInfoWithGemini(searchTerm);

    // Store original values before fuzzy matching
    const originalLocations = [...extractedInfo.locations];
    const originalPracticeAreas = [...extractedInfo.practiceAreas];

    // Apply fuzzy matching to locations and practice areas
    const fuzzyMatchedInfo = {
      ...extractedInfo,
      originalLocations,
      originalPracticeAreas,
      locations: fuzzyMatchLocations(extractedInfo.locations),
      practiceAreas: fuzzyMatchPracticeAreas(extractedInfo.practiceAreas)
    };

    // Fetch attorneys based on extracted information
    let matchedAttorneys = await fetchMatchingAttorneys(fuzzyMatchedInfo);

    // Calculate relevance scores
    const scoredResults = calculateRelevanceScores(matchedAttorneys, fuzzyMatchedInfo);

    return { extractedInfo: fuzzyMatchedInfo, results: scoredResults };
  } catch (error) {
    console.error('Error:', error);
    return { extractedInfo: null, results: [] };
  }
}

function fuzzyMatchLocations(locations) {
  return locations.flatMap(location => {
    const results = statesFuse.search(location);
    return results.length > 0 ? results.map(result => result.item) : [location];
  });
}

function fuzzyMatchPracticeAreas(practiceAreas) {
  return practiceAreas.flatMap(area => {
    const results = practiceAreasFuse.search(area);
    return results.length > 0 ? results.map(result => result.item) : [area];
  });
}

function calculateRelevanceScores(profiles, extractedInfo) {
  const scoredProfiles = profiles.map(profile => {
    let score = 0;

    // Location matching
    if (extractedInfo.locations.length > 0) {
      const locationMatch = extractedInfo.locations.some(loc =>
        profile.state.toLowerCase() === loc.toLowerCase() ||
        profile.city.toLowerCase() === loc.toLowerCase()
      );
      if (locationMatch) score += 10;
    }

    // Practice area matching
    const practiceAreaMatches = extractedInfo.practiceAreas.filter(area =>
      profile.practiceAreas.some(pa => pa.toLowerCase().includes(area.toLowerCase()))
    );
    score += practiceAreaMatches.length * 5;

    // Keyword matching
    const profileKeywords = [
      ...profile.searchTerms?.keywords || [],
      ...profile.practiceAreas || []
    ].map(k => k.toLowerCase());

    const keywordMatches = extractedInfo.keywords.filter(keyword =>
      profileKeywords.some(pk => pk.includes(keyword.toLowerCase()))
    );
    score += keywordMatches.length;

    return { ...profile, relevanceScore: score };
  });

  return scoredProfiles
    .filter(profile => profile.relevanceScore > 0)
    .sort((a, b) => b.relevanceScore - a.relevanceScore);
}

async function extractInfoWithGemini(searchTerm) {
  const prompt = `
    Analyze the following natural language search query for attorneys:
    "${searchTerm}"

    Extract and return the following information in JSON format:
    {
      "keywords": [list of relevant keywords],
      "practiceAreas": [list of specific practice areas mentioned or implied],
      "locations": [list of locations mentioned (cities or states)],
      "isGeneralSearch": boolean indicating if it's a general search for attorneys
    }

    Guidelines:
    - Keywords should be individual words or short phrases relevant to the query.
    - Practice areas should be specific legal fields (e.g., "personal injury", "family law", "criminal defense").
    - Locations should be recognized city or state names in the United States.
    - Set isGeneralSearch to true if the query is just looking for attorneys without specifying a practice area or location.
    - If a category is not applicable, use an empty array.
    - Correct minor spelling mistakes and interpret vague terms to the best ability.
  `;

  const result = await model.generateContent(prompt);
  const response = result.response;
  const textResponse = response.text();

  try {
    const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    } else {
      throw new Error("No valid JSON found in the response");
    }
  } catch (error) {
    console.error('Error parsing response:', error);
    return { keywords: [], practiceAreas: [], locations: [], isGeneralSearch: true };
  }
}

async function fetchMatchingAttorneys(extractedInfo) {
  let attorneyQuery = query(collection(db, 'attorneyProfiles'));

  if (extractedInfo.locations.length > 0) {
    attorneyQuery = query(attorneyQuery, where('state', 'in', extractedInfo.locations));
  }

  if (extractedInfo.practiceAreas.length > 0) {
    attorneyQuery = query(attorneyQuery, where('practiceAreas', 'array-contains-any', extractedInfo.practiceAreas));
  }

  const snapshot = await getDocs(attorneyQuery);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function generateAttorneyKeywords(firstName, lastName, city, state, practiceAreas) {
  try {
    const practiceAreasString = practiceAreas.join(', ');
    const prompt = `
      Generate a focused list of relevant keywords for an attorney with the following details:
        Name: ${firstName} ${lastName}
        City: ${city}
        State: ${state}
        Practice Areas: ${practiceAreasString}

        The list should include:
        1. The terms "attorney", "attorneys", "lawyer", and "lawyers" by default.
        2. The provided first and last names.
        3. The provided city and state names.
        4. Specific practice area terms.
        5. General legal terms relevant to the specified practice areas.
        6. 1-2 location-specific legal terms if applicable.

        Limit the total number of keywords to 30 or fewer.
        Return the result as a JSON object with the following format:
        {
          "keywords": [list of relevant keywords and terms, in lowercase],
          "practiceAreas": [list of practice areas mentioned or implied, in title case]
        }
        Ensure all keywords are specific, relevant, and useful for linking related attorneys based on practice area and location.
    `;

    const result = await model.generateContent(prompt);
    const response = result.response;
    let textResponse = response.text();

    // Try to parse as JSON
    try {
      // Remove the "```json" prefix and "```" suffix if present
      textResponse = textResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      const parsedResponse = JSON.parse(textResponse);

      // Ensure all fields are properly formatted
      return {
        keywords: parsedResponse.keywords ? parsedResponse.keywords.map(keyword => keyword.toLowerCase()) : [],
        practiceAreas: parsedResponse.practiceAreas ? parsedResponse.practiceAreas.map(area => toTitleCase(area)) : []
      };
    } catch (jsonError) {
      console.warn("Failed to parse response as JSON:", jsonError.message);

      // If JSON parsing fails, extract relevant information from the text
      const keywords = textResponse.toLowerCase().split(/\s+/)
        .filter(word => word.length > 2)
        .slice(0, 25); // Limit to 25 keywords

      return {
        keywords,
        practiceAreas: []
      };
    }
  } catch (error) {
    if (error.message.includes('Permission') || error.message.includes('IAM_PERMISSION_DENIED')) {
      console.error('This appears to be a permissions issue. Please check that the correct IAM roles have been assigned to your service account.');
    }
    throw error;
  }
}

export async function analyzeLegalIssue(legalIssueText) {
  const prompt = `
    Analyze the following legal issue description and identify the most relevant practice areas:
    "${legalIssueText}"

    Return the result as a JSON object with the following format:
    {
      "practiceAreas": [list of identified practice areas],
      "confidence": number between 0 and 1 indicating confidence in the analysis
    }

    Guidelines:
    - Match practice areas to standard legal practice categories
    - Return between 1-3 most relevant practice areas
    - Use title case for practice areas
    - If unsure, include more general practice areas
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = result.response;
    const textResponse = response.text();

    const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    } else {
      throw new Error("No valid JSON found in the response");
    }
  } catch (error) {
    console.error('Error analyzing legal issue:', error);
    return { practiceAreas: [], confidence: 0 };
  }
}

export { fuzzyMatchLocations, fuzzyMatchPracticeAreas };

// Helper function to convert strings to Title Case
function toTitleCase(str) {
  return str.replace(
    /\w\S*/g,
    function(txt) {
      return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    }
  );
}