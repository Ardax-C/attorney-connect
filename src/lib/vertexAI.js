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

        try {
            const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                return {
                    keywords: parsed.keywords || [],
                    practiceAreas: parsed.practiceAreas || [],
                    locations: parsed.locations || [],
                    isGeneralSearch: parsed.isGeneralSearch || false
                };
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
        console.error('Error calling Gemini:', error);
        return {
            keywords: [searchTerm],
            practiceAreas: [],
            locations: [],
            isGeneralSearch: true
        };
    }
}