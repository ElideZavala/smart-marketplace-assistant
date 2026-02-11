import { Handler } from '@netlify/functions';
import { initializeGenkit, simpleSuggestionsFlow } from '../../src/genkit/index';

let genkitInitialized = false;

export const handler: Handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    if (!genkitInitialized) {
      initializeGenkit();
      genkitInitialized = true;
    }

    const { items } = JSON.parse(event.body || '{}');

    if (!items || !Array.isArray(items)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid items array' }),
      };
    }

    const itemNames = items.map((item: any) => item.name);
    const result = await simpleSuggestionsFlow({ items: itemNames });

    const suggestions = result.suggestions.map((suggestion: any) => ({
      item: {
        id: Math.random().toString(36).substring(2),
        name: suggestion.name,
        category: suggestion.category,
        quantity: suggestion.quantity,
        unit: suggestion.unit || 'pcs',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      reason: suggestion.reason,
      priority: suggestion.priority,
    }));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(suggestions),
    };
  } catch (error) {
    console.error('Error generating AI suggestions:', error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'AI suggestions unavailable',
        message: 'Unable to generate smart suggestions at the moment',
      }),
    };
  }
};
