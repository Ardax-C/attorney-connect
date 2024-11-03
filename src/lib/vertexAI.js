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

const firebaseApp = initializeApp(firebaseConfig);
const vertexAI = getVertexAI(firebaseApp);
const model = getGenerativeModel(vertexAI, { model: "gemini-1.5-flash" });

export async function extractInfoWithGemini(searchTerm) {
  console.log('[VertexAI] Input search term:', searchTerm);
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
      - Keywords should be individual words or short phrases that are relevant to the query
      - Practice areas should match standard legal practice categories (e.g., "Tax Law", "Criminal Defense", "Family Law")
      - Locations should be valid US cities or states
      - Set isGeneralSearch to true if the query is just looking for attorneys without specific criteria
      - Normalize location names (e.g., "SC" -> "South Carolina")
      - Include variations of practice areas (e.g., "Tax" -> ["Tax Law", "Tax Attorney", "Tax Litigation"])
      - If a category is not applicable, use an empty array
      - Correct minor spelling mistakes and interpret vague terms

      Example outputs:
      "Tax lawyer" -> {
        "keywords": ["tax", "lawyer", "attorney", "legal"],
        "practiceAreas": ["Tax Law"],
        "locations": [],
        "isGeneralSearch": false
      }

      "Criminal Defense Attorney in SC" -> {
        "keywords": ["criminal", "defense", "attorney", "lawyer"],
        "practiceAreas": ["Criminal Defense", "Criminal Law"],
        "locations": ["South Carolina"],
        "isGeneralSearch": false
      }
  `;

  try {
      const result = await model.generateContent(prompt);
      const response = result.response;
      const textResponse = response.text();
      console.log('[VertexAI] Raw response:', textResponse);
      
      try {
          const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
              const parsed = JSON.parse(jsonMatch[0]);
              const extractedInfo = {
                  keywords: parsed.keywords || [],
                  practiceAreas: parsed.practiceAreas || [],
                  locations: parsed.locations || [],
                  isGeneralSearch: parsed.isGeneralSearch || false
              };
              console.log('[VertexAI] Extracted info:', extractedInfo);
              return extractedInfo;
          }
      } catch (parseError) {
          console.error('Error parsing Gemini response:', parseError);
      }

      // Fallback to basic extraction
      return {
          keywords: [searchTerm],
          practiceAreas: [],
          locations: [],
          isGeneralSearch: true
      };
  } catch (error) {
      console.error('[VertexAI] Error:', error);
      throw error; // Let the error propagate
  }
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

// Helper function to convert strings to Title Case
function toTitleCase(str) {
  return str.replace(
    /\w\S*/g,
    function(txt) {
      return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    }
  );
}

