import { getVertexAI, getGenerativeModel } from "firebase/vertexai-preview";
import { collection, getDocs } from 'firebase/firestore';
import { app, db } from '$lib/firebase';

const vertexAI = getVertexAI(app);
const model = getGenerativeModel(vertexAI, { model: "gemini-1.5-flash" });

async function getPracticeAreas() {
  try {
    const practiceAreasQuery = collection(db, "practiceAreas");
    const snapshot = await getDocs(practiceAreasQuery);
    
    return snapshot.docs
      .map(doc => doc.data().practiceArea)
      .filter(area => area)
      .sort();
  // eslint-disable-next-line no-unused-vars
  } catch (error) {
    return [];
  }
}

export async function extractInfoWithGemini(searchTerm) {
  const availablePracticeAreas = await getPracticeAreas();
  console.log('[VertexAI] Available practice areas:', availablePracticeAreas);
  
  if (!Array.isArray(availablePracticeAreas) || availablePracticeAreas.length === 0) {
    return {
      practiceAreas: { terms: [], operator: 'AND' },
      locations: { terms: [], operator: 'AND' },
      keywords: [],
      isGeneralSearch: true
    };
  }

  // Helper function to normalize terms for matching
  function normalizeForMatching(term) {
    return term.toLowerCase()
      .replace(/\s+(law|lawyer|attorney|legal)(\s|$)/ig, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Create normalized mappings
  const practiceAreaMappings = availablePracticeAreas.reduce((acc, area) => {
    const normalized = normalizeForMatching(area);
    acc[normalized] = area;
    acc[area.toLowerCase()] = area;
    return acc;
  }, {});

  console.log('[VertexAI] Practice area mappings:', practiceAreaMappings);

  const prompt = `
    Parse this legal search query: "${searchTerm}"
    
    Available practice areas are: ${availablePracticeAreas.join(', ')}

    Extract and normalize the information:
    1. For practice areas:
       - Match to the closest available practice area
       - Consider both full names ("Criminal Law") and base terms ("Criminal")
    2. Extract locations (cities, states)
    3. Extract other relevant keywords
    
    Return ONLY a JSON object with this structure (no additional text):
    {
      "practiceAreas": {
        "terms": ["matched practice area"],
        "operator": "AND"
      },
      "locations": {
        "terms": ["location"],
        "operator": "AND"
      },
      "keywords": ["relevant keywords"],
      "isGeneralSearch": false
    }
  `;

  const result = await model.generateContent(prompt);
  const response = result.response;
  let textResponse = response.text();

  try {
    textResponse = textResponse.replace(/```json\s*|\s*```/g, '');
    const parsedResponse = JSON.parse(textResponse);

    // Match practice areas using normalized forms
    const matchedPracticeAreas = parsedResponse.practiceAreas?.terms?.map(area => {
      const normalized = normalizeForMatching(area);
      const match = practiceAreaMappings[normalized];
      return match;
    }).filter(Boolean) || [];


    return {
      practiceAreas: {
        terms: matchedPracticeAreas,
        operator: parsedResponse.practiceAreas?.operator || 'AND'
      },
      locations: {
        terms: parsedResponse.locations?.terms || [],
        operator: parsedResponse.locations?.operator || 'AND'
      },
      keywords: Array.isArray(parsedResponse.keywords) ? parsedResponse.keywords : [],
      isGeneralSearch: matchedPracticeAreas.length === 0 && 
                      (!parsedResponse.locations?.terms?.length)
    };
  // eslint-disable-next-line no-unused-vars
  } catch (parseError) {
    
    // Apply same matching logic in fallback
    const words = searchTerm.toLowerCase().split(/\s+/);
    const potentialPracticeArea = words.join(' ');
    const normalized = normalizeForMatching(potentialPracticeArea);
    const matchedPracticeArea = practiceAreaMappings[normalized];

    if (matchedPracticeArea) {
      return {
        practiceAreas: {
          terms: [matchedPracticeArea],
          operator: 'AND'
        },
        locations: { terms: [], operator: 'AND' },
        keywords: words.filter(w => !['law', 'lawyer', 'attorney', 'legal'].includes(w)),
        isGeneralSearch: false
      };
    }
    
    return {
      practiceAreas: { terms: [], operator: 'AND' },
      locations: { terms: [], operator: 'AND' },
      keywords: words,
      isGeneralSearch: true
    };
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
    // eslint-disable-next-line no-unused-vars
    } catch (jsonError) {

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

export async function analyzeLegalIssue(legalIssue) {
    try {
        const response = await fetch('/api/analyze-legal-issue', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ legalIssue })
        });

        if (!response.ok) {
            throw new Error('Failed to analyze legal issue');
        }

        return await response.json();
    } catch (error) {
        console.error('Error in analyzeLegalIssue:', error);
        return { practiceAreas: [] };
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

