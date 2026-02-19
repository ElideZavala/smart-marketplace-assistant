import { genkit } from 'genkit';
import * as z from 'zod';
import { vertexAI } from '@genkit-ai/vertexai';

const outputSchema = z.object({
  suggestions: z.array(
    z.object({
      name: z.string(),
      category: z.string(),
      reason: z.string(),
      priority: z.enum(['low', 'medium', 'high']),
      quantity: z.number().min(1).optional(),
      unit: z.string().optional(),
    }),
  ),
});

let ai: ReturnType<typeof genkit> | null = null;

export function initializeGenkit() {
  console.log('🔧 Initializing Genkit...');

  // Parse las credenciales desde la variable de entorno
  let credentials;
  const projectId = process.env['GCLOUD_PROJECT'] || 'ai-marketplace-486420';
  const location = process.env['GCLOUD_LOCATION'] || 'us-central1';

  if (process.env['GOOGLE_SERVICE_ACCOUNT_JSON']) {
    try {
      credentials = JSON.parse(process.env['GOOGLE_SERVICE_ACCOUNT_JSON']);
      console.log('✅ Service account credentials parsed successfully');
      console.log('📦 Project ID:', projectId);
      console.log('📍 Location:', location);
    } catch (error) {
      console.error('❌ Failed to parse GOOGLE_SERVICE_ACCOUNT_JSON:', error);
      throw new Error('Invalid service account JSON');
    }
  } else {
    console.warn('⚠️  GOOGLE_SERVICE_ACCOUNT_JSON not found in environment variables');
    throw new Error('Missing GOOGLE_SERVICE_ACCOUNT_JSON environment variable');
  }

  // Inicializar Genkit con las credenciales
  ai = genkit({
    plugins: [
      vertexAI({
        projectId: projectId,
        location: location,
        googleAuth: {
          // Pasa las credenciales directamente como objeto
          authClient: credentials,
        },
      }),
    ],
  });

  console.log('✅ Genkit initialized successfully');
  return ai;
}

export const simpleSuggestionsFlow = async (input: { items: string[] }) => {
  if (!ai) {
    console.log('⚠️  Genkit not initialized, initializing now...');
    initializeGenkit();
  }

  const prompt = `
You are a grocery shopping assistant. I have these items in my shopping list:
${input.items.join(', ')}

Please suggest 3-5 additional grocery items that would complement this list. For each suggestion, provide:
- name: the item name
- category: one of (produce, dairy, meat, pantry, beverages, snacks, other)
- reason: why this item is suggested (complementary, essential, healthy, etc.)
- priority: low, medium, or high

Focus on practical, commonly purchased items that make sense with the current list.
`;

  try {
    console.log('🤖 Generating suggestions with Gemini...');

    const { output } = await ai!.generate({
      model: 'vertexai/gemini-2.0-flash',
      prompt,
      output: {
        schema: outputSchema,
      },
    });

    console.log('✅ Suggestions generated successfully');
    return output || { suggestions: [] };
  } catch (error) {
    console.error('❌ Error generating suggestions with Genkit:', error);

    // Log más detallado del error
    if (error instanceof Error) {
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }

    throw error; // Propaga el error para que la función lo maneje
  }
};
