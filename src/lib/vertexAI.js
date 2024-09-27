import { initializeApp } from "firebase/app";
import { getVertexAI, getGenerativeModel } from "firebase/vertexai-preview";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_PUBLIC_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_PUBLIC_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_PUBLIC_FIREBASE_MEASUREMENT_ID
};


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
        {{
          "keywords": [list of relevant keywords and terms, in lowercase],
          "practiceAreas": [list of practice areas mentioned or implied, in title case]
        }}
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

const firebaseApp = initializeApp(firebaseConfig);
const vertexAI = getVertexAI(firebaseApp);
const model = getGenerativeModel(vertexAI, { model: "gemini-1.5-flash" });


export async function searchAttorneys(query) {
  if (!query || query.trim() === '') {
    return {
      names: { full: [], first: [], last: [] },
      locations: { states: [], cities: [] },
      practiceAreas: [],
      keywords: [],
      isGeneral: true,
      isAllAttorneys: true  // flag to indicate a request for all attorneys
    };
  }

  try {
    const prompt = `
      Analyze the following natural language search query for attorneys:
      "${query}"

      Do not provide legal advice or referrals. Instead, extract and return the following information in JSON format:
      {
        "names": {
          "full": [list of full names],
          "first": [list of first names],
          "last": [list of last names]
        },
        "locations": {
          "states": [list of states],
          "cities": [list of cities]
        },
        "practiceAreas": [list of practice areas],
        "keywords": [other relevant keywords],
        "isGeneral": boolean indicating if the query is for general attorney search
      }

      Guidelines:
      - Names: Identify and separate full names, first names, and last names.
      - Locations: Recognize both states and cities. Use full state names, not abbreviations.
      - Practice Areas: Identify standard legal practice areas. Use title case (e.g., "Estate Planning").
      - Keywords: Include any other relevant search terms that don't fit into the above categories.
      - isGeneral: Set to true if the query is broad (e.g., "find a lawyer" or "attorneys near me").
      - If a category is not applicable, use an empty array.
      - Correct minor spelling mistakes and interpret vague terms to the best ability.

      Ensure all extracted information is relevant to searching for attorneys.
    `;

    const result = await model.generateContent(prompt);
    const response = result.response;
    let textResponse = response.text();

    let parsedResponse;
    try {
      const jsonStart = textResponse.indexOf('{');
      const jsonEnd = textResponse.lastIndexOf('}') + 1;
      
      if (jsonStart === -1 || jsonEnd === -1) {
        throw new Error("No valid JSON object found in the response");
      }

      const jsonString = textResponse.slice(jsonStart, jsonEnd);
      parsedResponse = JSON.parse(jsonString);
    } catch (jsonError) {
      console.warn("Failed to parse response as JSON:", jsonError.message);
      console.log("Raw response:", textResponse);
      
      // Fallback parsing
      parsedResponse = {
        names: { full: [], first: [], last: [] },
        locations: { states: [], cities: [] },
        practiceAreas: [],
        keywords: query.toLowerCase().split(/\s+/).filter(word => word.length > 3),
        isGeneral: true
      };
    }

    return {
      names: parsedResponse.names || { full: [], first: [], last: [] },
      locations: parsedResponse.locations || { states: [], cities: [] },
      practiceAreas: parsedResponse.practiceAreas?.map(area => area.toLowerCase()) || [],
      keywords: parsedResponse.keywords?.map(keyword => keyword.toLowerCase()) || [],
      isGeneral: parsedResponse.isGeneral || false,
      isAllAttorneys: false  // Set to false for non-empty queries
    };
  } catch (error) {
    console.error('Error in searchAttorneys:', error);
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

