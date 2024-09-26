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
  try {
    const prompt = `
      Parse the following natural language search query for attorneys:
      "${query}"

      The query may include attorney names, practice areas, locations (states, cities), specializations, or other relevant keywords.

      Do not provide legal advice or referrals. Instead, extract and return the following information in JSON format:
      {
        "names": [list of full or partial attorney names mentioned],
        "firstNames": [list of first names mentioned], 
        "lastNames": [list of last names mentioned],
        "practiceAreas": [list of practice areas mentioned, in title case],
        "states": [list of states mentioned, in title case], 
        "cities": [list of cities mentioned, in title case],
        "keywords": [other relevant keywords from the query, in lowercase],
        "isAllAttorneys": boolean indicating if the query is asking for all attorneys,
        "specializations": [list of specializations mentioned, in title case]
      }

      Guidelines:
      - If a field is not mentioned in the query, set it to an empty array or false for booleans.
      - Handle potential spelling mistakes and vague queries. Use best judgment to interpret intent.
      - For names, extract full names if provided. If only first or last names are mentioned, populate the respective fields.
      - Practice areas and specializations should be standardized to title case (e.g., "Personal Injury", "Estate Planning").  
      - States and cities should be title cased (e.g., "New York", "Los Angeles").
      - The "keywords" field should contain any other terms relevant to the search that don't fit in the other categories. 
      - Set "isAllAttorneys" to true if the query seems to be searching for all attorneys, attorneys in general, or is very broad.
      - Aim to extract as much relevant information as possible to enable a comprehensive search.
    `;
    const result = await model.generateContent(prompt);
    const response = result.response;
    let textResponse = response.text();
   
    try {
      textResponse = textResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      const parsedResponse = JSON.parse(textResponse);
  
      return {
        practiceAreas: parsedResponse.practiceAreas?.map(area => area.toLowerCase()) || [],
        states: parsedResponse.states?.map(state => toTitleCase(state)) || [],
        cities: parsedResponse.cities?.map(city => toTitleCase(city)) || [],
        keywords: parsedResponse.keywords?.map(keyword => keyword.toLowerCase()) || [],
        isAllAttorneys: parsedResponse.isAllAttorneys || false,
        specializations: parsedResponse.specializations?.map(spec => spec.toLowerCase()) || []
      };
    } catch (jsonError) {
      console.warn("Failed to parse response as JSON:", jsonError.message);
     
      return {
        practiceAreas: [],
        states: [],
        cities: [],
        keywords: query.toLowerCase().split(/\s+/).filter(word => word.length > 3),
        isAllAttorneys: query.toLowerCase().includes("all attorneys"),
        specializations: []
      };
    }
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

