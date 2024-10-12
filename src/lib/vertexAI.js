import { initializeApp } from "firebase/app";
import { getVertexAI, getGenerativeModel } from "firebase/vertexai-preview";
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

const locations = [
  { name: 'Alabama', type: 'state' },
  { name: 'Alaska', type: 'state' },
  { name: 'Arizona', type: 'state' },
  { name: 'Arkansas', type: 'state' },
  { name: 'California', type: 'state' },
  { name: 'Colorado', type: 'state' },
  { name: 'Connecticut', type: 'state' },
  { name: 'Delaware', type: 'state' },
  { name: 'Florida', type: 'state' },
  { name: 'Georgia', type: 'state' },
  { name: 'Hawaii', type: 'state' },
  { name: 'Idaho', type: 'state' },
  { name: 'Illinois', type: 'state' },
  { name: 'Indiana', type: 'state' },
  { name: 'Iowa', type: 'state' },
  { name: 'Kansas', type: 'state' },
  { name: 'Kentucky', type: 'state' },
  { name: 'Louisiana', type: 'state' },
  { name: 'Maine', type: 'state' },
  { name: 'Maryland', type: 'state' },
  { name: 'Massachusetts', type: 'state' },
  { name: 'Michigan', type: 'state' },
  { name: 'Minnesota', type: 'state' },
  { name: 'Mississippi', type: 'state' },
  { name: 'Missouri', type: 'state' },
  { name: 'Montana', type: 'state' },
  { name: 'Nebraska', type: 'state' },
  { name: 'Nevada', type: 'state' },
  { name: 'New Hampshire', type: 'state' },
  { name: 'New Jersey', type: 'state' },
  { name: 'New Mexico', type: 'state' },
  { name: 'New York', type: 'state' },
  { name: 'North Carolina', type: 'state' },
  { name: 'North Dakota', type: 'state' },
  { name: 'Ohio', type: 'state' },
  { name: 'Oklahoma', type: 'state' },
  { name: 'Oregon', type: 'state' },
  { name: 'Pennsylvania', type: 'state' },
  { name: 'Rhode Island', type: 'state' },
  { name: 'South Carolina', type: 'state' },
  { name: 'South Dakota', type: 'state' },
  { name: 'Tennessee', type: 'state' },
  { name: 'Texas', type: 'state' },
  { name: 'Utah', type: 'state' },
  { name: 'Vermont', type: 'state' },
  { name: 'Virginia', type: 'state' },
  { name: 'Washington', type: 'state' },
  { name: 'West Virginia', type: 'state' },
  { name: 'Wisconsin', type: 'state' },
  { name: 'Wyoming', type: 'state' },
  
  // Major cities
  { name: 'New York City', type: 'city' },
  { name: 'Los Angeles', type: 'city' },
  { name: 'Chicago', type: 'city' },
  { name: 'Houston', type: 'city' },
  { name: 'Phoenix', type: 'city' },
  { name: 'Philadelphia', type: 'city' },
  { name: 'San Antonio', type: 'city' },
  { name: 'San Diego', type: 'city' },
  { name: 'Dallas', type: 'city' },
  { name: 'San Jose', type: 'city' },
  { name: 'Austin', type: 'city' },
  { name: 'Jacksonville', type: 'city' },
  { name: 'Fort Worth', type: 'city' },
  { name: 'Columbus', type: 'city' },
  { name: 'San Francisco', type: 'city' },
  { name: 'Charlotte', type: 'city' },
  { name: 'Indianapolis', type: 'city' },
  { name: 'Seattle', type: 'city' },
  { name: 'Denver', type: 'city' },
  { name: 'Washington D.C.', type: 'city' },
  { name: 'Boston', type: 'city' },
  { name: 'El Paso', type: 'city' },
  { name: 'Detroit', type: 'city' },
  { name: 'Nashville', type: 'city' },
  { name: 'Portland', type: 'city' },
  { name: 'Memphis', type: 'city' },
  { name: 'Oklahoma City', type: 'city' },
  { name: 'Las Vegas', type: 'city' },
  { name: 'Louisville', type: 'city' },
  { name: 'Baltimore', type: 'city' },
  { name: 'Milwaukee', type: 'city' },
  { name: 'Albuquerque', type: 'city' },
  { name: 'Tucson', type: 'city' },
  { name: 'Fresno', type: 'city' },
  { name: 'Sacramento', type: 'city' },
  { name: 'Long Beach', type: 'city' },
  { name: 'Kansas City', type: 'city' },
  { name: 'Mesa', type: 'city' },
  { name: 'Atlanta', type: 'city' },
  { name: 'Colorado Springs', type: 'city' },
  { name: 'Raleigh', type: 'city' },
  { name: 'Omaha', type: 'city' },
  { name: 'Miami', type: 'city' },
  { name: 'Oakland', type: 'city' },
  { name: 'Minneapolis', type: 'city' },
  { name: 'Tulsa', type: 'city' },
  { name: 'Cleveland', type: 'city' },
  { name: 'Wichita', type: 'city' },
  { name: 'Arlington', type: 'city' },
  { name: 'New Orleans', type: 'city' }
];

const fuse = new Fuse(locations, {
  keys: ['name'],
  threshold: 0.4,
});

export async function searchAttorneys(query) {

  if (!query || query.trim() === '') {
    return {
      keywords: [],
      locations: { states: [], cities: [] },
      isGeneral: true
    };
  }

  try {
    const prompt = `
      Analyze the following natural language search query for attorneys:
      "${query}"

      Extract and return the following information in JSON format:
      {
        "keywords": [list of relevant keywords],
        "locations": [list of possible location names mentioned],
        "isGeneral": boolean indicating if the query is for a general attorney search
      }

      Guidelines:
      - Keywords: Extract relevant terms that could match attorney specialties, practice areas, or general legal terms.
      - Locations: Extract any mentioned location names that could be cities or states.
      - isGeneral: Set to true if the query is broad (e.g., "find a lawyer" or "attorneys near me")
      - If a category is not applicable, use an empty array.
      - Correct minor spelling mistakes and interpret vague terms to the best ability.

      Ensure all extracted information is relevant to searching for attorneys.
    `;

    const result = await model.generateContent(prompt);
    const response = result.response;
    let textResponse = response.text();

    let parsedResponse;

    try {
      // Extract JSON from the response
      const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedResponse = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No valid JSON found in the response");
      }
    } catch (jsonError) {
      console.log("Failed to parse response as JSON:", jsonError.message);
      
      // Fallback parsing logic
      parsedResponse = {
        keywords: [],
        locations: [],
        isGeneral: true
      };

      // Basic text parsing to extract information
      const lowercaseResponse = textResponse.toLowerCase();
      
      // Extract keywords
      const commonKeywords = ['attorney', 'lawyer', 'legal', 'law', 'litigation', 'counsel', 'advocate'];
      parsedResponse.keywords = commonKeywords.filter(keyword => lowercaseResponse.includes(keyword));

      // Extract locations
      parsedResponse.locations = locations
        .filter(loc => lowercaseResponse.includes(loc.name.toLowerCase()))
        .map(loc => loc.name);

      // Determine if it's a general search
      parsedResponse.isGeneral = lowercaseResponse.includes('general') || parsedResponse.keywords.length === 0;
    }

    // Perform fuzzy matching on locations
    let matchedLocations = { states: [], cities: [] };
    if (parsedResponse.locations && parsedResponse.locations.length > 0) {
      for (let loc of parsedResponse.locations) {
        const results = fuse.search(loc);
        if (results.length > 0) {
          const bestMatch = results[0].item;
          if (bestMatch.type === 'state') {
            matchedLocations.states.push(bestMatch.name);
          } else if (bestMatch.type === 'city') {
            matchedLocations.cities.push(bestMatch.name);
          }
        }
      }
    }

    const finalResponse = {
      keywords: parsedResponse.keywords || [],
      locations: matchedLocations,
      isGeneral: parsedResponse.isGeneral || false
    };
    return finalResponse;
  } catch (error) {
    console.log('Error:', error);
    // Return a default response instead of throwing an error
    return {
      keywords: [],
      locations: { states: [], cities: [] },
      isGeneral: true
    };
  }
}

export function calculateRelevanceScore(attorney, queryAnalysis) {
  let score = 0;

  // Keyword match
  const keywordMatch = queryAnalysis.keywords.some(keyword => 
    (attorney.searchTerms && attorney.searchTerms.keywords && 
     attorney.searchTerms.keywords.some(attorneyKeyword => 
       attorneyKeyword.toLowerCase().includes(keyword.toLowerCase())
    )) ||
    (attorney.practiceAreas && 
     attorney.practiceAreas.some(area => 
       area.toLowerCase().includes(keyword.toLowerCase())
    ))
  );
  if (keywordMatch) {
    score += 3;
  }

  // Location match
  if (queryAnalysis.locations.states.includes(attorney.state)) {
    score += 2;
  }
  if (attorney.city && queryAnalysis.locations.cities.includes(attorney.city)) {
    score += 1.5;
  }

  // If it's a general search, give some score to all attorneys
  if (queryAnalysis.isGeneral) {
    score += 1;
  }

  return score;
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

// Helper function to convert strings to Title Case
function toTitleCase(str) {
  return str.replace(
    /\w\S*/g,
    function(txt) {
      return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    }
  );
}