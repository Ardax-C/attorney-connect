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

export async function searchAttorneys(query) {
  try {
    const prompt = `
      Parse the following search query for attorney information:
      "${query}"
      Do not provide legal advice or referrals. Instead, extract and return the following information in JSON format:
      {
        "practiceAreas": [list of practice areas mentioned, in title case],
        "states": [list of states mentioned, in title case],
        "cities": [list of cities mentioned, in title case],
        "keywords": [relevant keywords from the query, in lowercase],
        "isAllAttorneys": boolean indicating if the query is asking for all attorneys,
        "specializations": [list of specializations mentioned, in title case]
      }
      If a field is not mentioned in the query, set it to an empty array or false for boolean. Handle potential spelling mistakes and vague queries.
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

function toTitleCase(str) {
  return str.replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
}