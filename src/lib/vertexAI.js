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


export async function generateAttorneyKeywords(city, state, practiceAreas) {
  try {
    const practiceAreasString = practiceAreas.join(', ');
    const prompt = `
      Generate an extensive list of specific keywords and related terms for an attorney specializing in ${practiceAreasString} located in ${city}, ${state}. Terms should be generated from the perspective of an attorney searching for other attorneys.
      Include general terms, related areas of law, and location-specific terms. 'attorney', 'attorneys', 'lawyers' and 'lawyer' should be included by default.
      Return the result as a JSON object with the following format:
      {
        "keywords": [extensive list of relevant keywords and terms, in lowercase],
        "practiceAreas": [list of practice areas mentioned or implied, in title case]
      }
      Ensure the keywords are specific, comprehensive, and relevant to the legal field and location mentioned.
    `;

    console.log("Sending keyword generation query to Vertex AI:", prompt);
    const result = await model.generateContent(prompt);
    console.log("Received raw response from Vertex AI:", result);
    const response = result.response;
    let textResponse = response.text();
    console.log("Extracted text response:", textResponse);

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
        .slice(0, 100); // Limit to 100 keywords

      console.log("Extracted keywords from text response:", keywords);

      return {
        keywords,
        practiceAreas: []
      };
    }
  } catch (error) {
    console.error('Error calling Vertex AI for keyword generation:', error);
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
    console.log("Sending query to Vertex AI:", query);
    const prompt = `
      Parse the following search query for attorney information:
      "${query}"
      Do not provide legal advice or referrals. Instead, extract and return the following information in JSON format:
      {
        "practiceAreas": [list of practice areas mentioned, in title case],
        "state": "state mentioned, in title case",
        "city": "city mentioned (if any), in title case",
        "keywords": [relevant keywords from the query, in lowercase]
      }
      If a field is not mentioned in the query, set it to null.
    `;
    const result = await model.generateContent(prompt);
    console.log("Received raw response from Vertex AI:", result);
    const response = result.response;
    let textResponse = response.text();
    console.log("Extracted text response:", textResponse);
   
    // Try to parse as JSON
    try {
      // Remove the "```json" prefix and "```" suffix if present
      textResponse = textResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      const parsedResponse = JSON.parse(textResponse);
  
      // Ensure all fields are properly formatted
      return {
        practiceAreas: parsedResponse.practiceAreas ? parsedResponse.practiceAreas.map(area => area.toLowerCase()) : [],
        state: parsedResponse.state ? toTitleCase(parsedResponse.state) : null,
        city: parsedResponse.city ? toTitleCase(parsedResponse.city) : null,
        keywords: parsedResponse.keywords ? parsedResponse.keywords.map(keyword => keyword.toLowerCase()) : []
      };
    } catch (jsonError) {
      console.warn("Failed to parse response as JSON:", jsonError.message);
     
      // If JSON parsing fails, extract relevant information from the text
      const practiceAreas = [];
      const state = null;
      const city = null;
      const keywords = query.split(/\s+/)
        .filter(word => word.length > 3)
        .map(word => word.toLowerCase())
        .slice(0, 20); // Limit to 20 keywords
     
      console.log("Extracted information from text response:",
        { practiceAreas, state, city, keywords });
     
      return {
        practiceAreas,
        state,
        city,
        keywords
      };
    }
  } catch (error) {
    console.error('Error calling Vertex AI:', error);
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