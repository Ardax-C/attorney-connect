import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { db } from './firebase-admin.js';
import { Client } from '@elastic/elasticsearch';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '..', '.env') });

class ElasticSearchService {
  constructor() {
    if (!process.env.VITE_ELASTIC_CLOUD_ID || !process.env.VITE_ELASTIC_API_KEY) {
      throw new Error('Elastic Cloud configuration missing');
    }

    this.client = new Client({
      cloud: {
        id: process.env.VITE_ELASTIC_CLOUD_ID
      },
      auth: {
        apiKey: process.env.VITE_ELASTIC_API_KEY
      }
    });
    this.index = 'attorneys';
  }

  async initIndex() {
    try {
      const exists = await this.client.indices.exists({
        index: this.index
      });

      if (exists) {
        await this.client.indices.delete({
          index: this.index
        });
        console.log('Existing index deleted');
      }

      await this.client.indices.create({
        index: this.index,
        body: {
          settings: {
            number_of_shards: 1,
            number_of_replicas: 1,
            analysis: {
              analyzer: {
                attorney_analyzer: {
                  type: 'custom',
                  tokenizer: 'standard',
                  filter: ['lowercase', 'trim', 'word_delimiter_graph']
                }
              }
            }
          },
          mappings: {
            properties: {
              barNumber: { type: 'keyword' },
              city: { type: 'keyword' },
              createdAt: { type: 'date' },
              email: { type: 'keyword' },
              firstName: { 
                type: 'text',
                analyzer: 'attorney_analyzer',
                fields: { keyword: { type: 'keyword' } }
              },
              lastName: { 
                type: 'text',
                analyzer: 'attorney_analyzer',
                fields: { keyword: { type: 'keyword' } }
              },
              keywords: {
                properties: {
                  keywords: { type: 'keyword' },
                  practiceAreas: { type: 'keyword' }
                }
              },
              phone: { type: 'keyword' },
              practiceAreas: { type: 'keyword' },
              profilePictureUrl: { type: 'keyword' },
              role: { type: 'keyword' },
              searchTerms: {
                properties: {
                  keywords: { type: 'keyword' },
                  practiceAreas: { type: 'keyword' }
                }
              },
              state: { type: 'keyword' },
              status: { type: 'keyword' },
              username: { type: 'keyword' },
              website: { type: 'keyword' }
            }
          }
        }
      });
      console.log('Index created successfully');
    } catch (error) {
      console.error('Error initializing index:', error);
      throw error;
    }
  }

  async indexAttorney(attorney) {
    try {
      if (attorney.id === 'RLV6WtJCHrSP1nC8UOphZeS9p293') {
        console.log('Problematic attorney data:', JSON.stringify(attorney, null, 2));
      }
      
      // Remove __collections__ field if it exists
     // eslint-disable-next-line no-unused-vars
      const { __collections__, ...attorneyData } = attorney;
      
      // Convert Firestore Timestamp to ISO string
      if (attorneyData.createdAt?.toDate) {
        attorneyData.createdAt = attorneyData.createdAt.toDate().toISOString();
      } else if (attorneyData.createdAt?.__time__) {
        attorneyData.createdAt = new Date(attorneyData.createdAt.__time__).toISOString();
      }

      // Ensure arrays are properly formatted
      if (Array.isArray(attorneyData.practiceAreas)) {
        attorneyData.practiceAreas = attorneyData.practiceAreas.map(area => area.trim());
      } else {
        attorneyData.practiceAreas = [];
      }

      // Transform keywords array into expected object structure
      if (Array.isArray(attorneyData.keywords)) {
        attorneyData.keywords = {
          keywords: attorneyData.keywords,
          practiceAreas: attorneyData.practiceAreas || []
        };
      }

      // Transform searchTerms array into expected object structure
      if (Array.isArray(attorneyData.searchTerms)) {
        attorneyData.searchTerms = {
          keywords: attorneyData.searchTerms,
          practiceAreas: attorneyData.practiceAreas || []
        };
      }

      // Existing null checks can stay as fallback
      if (!attorneyData.keywords || typeof attorneyData.keywords !== 'object') {
        attorneyData.keywords = {
          keywords: [],
          practiceAreas: []
        };
      }

      if (!attorneyData.searchTerms || typeof attorneyData.searchTerms !== 'object') {
        attorneyData.searchTerms = {
          keywords: [],
          practiceAreas: []
        };
      }

      const result = await this.client.index({
        index: this.index,
        id: attorney.id,
        document: attorneyData,
        refresh: true
      });

      console.log(`Indexed attorney ${attorney.id}`);
      return result;
    } catch (error) {
      console.error(`Error indexing attorney ${attorney.id}:`, error);
      throw error;
    }
  }

  // Add a method to test the connection
  async testConnection() {
    try {
      const info = await this.client.info();
      console.log('Successfully connected to Elasticsearch');
      console.log('Cluster info:', info);
      return true;
    } catch (error) {
      console.error('Failed to connect to Elasticsearch:', error);
      return false;
    }
  }
}

async function migrateData() {
  const es = new ElasticSearchService();
  
  try {
    // Test connection first
    console.log('Testing Elasticsearch connection...');
    const connected = await es.testConnection();
    if (!connected) {
      throw new Error('Failed to connect to Elasticsearch');
    }

    console.log('Initializing Elasticsearch index...');
    await es.initIndex();
    
    console.log('Fetching attorneys from Firestore...');
    const snapshot = await db.collection('attorneyProfiles').get();
    console.log(`Found ${snapshot.docs.length} attorneys to migrate`);
    
    const batchSize = 10;
    for (let i = 0; i < snapshot.docs.length; i += batchSize) {
      const batch = snapshot.docs.slice(i, i + batchSize);
      
      console.log(`Processing batch ${Math.floor(i / batchSize) + 1}...`);
      await Promise.all(
        batch.map(doc => 
          es.indexAttorney({
            id: doc.id,
            ...doc.data()
          })
        )
      );
    }

    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrateData();