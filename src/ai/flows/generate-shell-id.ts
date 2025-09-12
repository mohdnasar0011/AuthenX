// This is a server-side file.
'use server';

/**
 * @fileOverview Flow to generate a deterministic "Shell ID" from any JSON object.
 *
 * - generateShellId - Function to generate the Shell ID.
 * - GenerateShellIdInput - Input type for the function.
 * - GenerateShellIdOutput - Output type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import crypto from 'crypto';

const GenerateShellIdInputSchema = z.object({
  jsonData: z.any().describe("The JSON object to be normalized and hashed."),
});
export type GenerateShellIdInput = z.infer<typeof GenerateShellIdInputSchema>;

const GenerateShellIdOutputSchema = z.object({
  shellId: z.string().describe("The generated SHA-256 Shell ID."),
});
export type GenerateShellIdOutput = z.infer<typeof GenerateShellIdOutputSchema>;

// Helper function to recursively sort object keys
const sortObjectKeys = (obj: any): any => {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(sortObjectKeys);
  }
  return Object.keys(obj)
    .sort()
    .reduce((result: { [key: string]: any }, key) => {
      result[key] = sortObjectKeys(obj[key]);
      return result;
    }, {});
};

// Helper function to normalize values
const normalizeValue = (value: any): any => {
    if (typeof value === 'string') {
        // Trim and convert to lowercase
        return value.toLowerCase().trim();
    }
    if (Array.isArray(value)) {
        // Filter out empty/null values from arrays before mapping
        return value.filter(v => v !== null && v !== undefined && v !== '').map(normalizeValue);
    }
    if (typeof value === 'object' && value !== null) {
        // Return a new object with normalized values, excluding null/undefined/empty string keys
        const newObj: { [key: string]: any } = {};
        for (const key in value) {
            if(value[key] !== null && value[key] !== undefined && value[key] !== '') {
               const normalized = normalizeValue(value[key]);
               // Only add the key if the normalized value is not an empty object or array
               if (typeof normalized === 'object' && normalized !== null) {
                   if (Array.isArray(normalized) && normalized.length > 0) {
                       newObj[key] = normalized;
                   } else if (!Array.isArray(normalized) && Object.keys(normalized).length > 0) {
                       newObj[key] = normalized;
                   }
               } else if (typeof normalized !== 'object') {
                    newObj[key] = normalized;
               }
            }
        }
        return newObj;
    }
    return value;
};


export async function generateShellId(
  input: GenerateShellIdInput
): Promise<GenerateShellIdOutput> {
  return generateShellIdFlow(input);
}

const generateShellIdFlow = ai.defineFlow(
  {
    name: 'generateShellIdFlow',
    inputSchema: GenerateShellIdInputSchema,
    outputSchema: GenerateShellIdOutputSchema,
  },
  async ({ jsonData }) => {
    // 1. Normalize values (recursive)
    const normalizedData = normalizeValue(jsonData);
    
    // 2. Sort keys to ensure deterministic order
    const sortedData = sortObjectKeys(normalizedData);

    // 3. Stringify the object consistently
    const canonicalString = JSON.stringify(sortedData);

    // 4. Generate SHA-256 hash
    const hash = crypto.createHash('sha256').update(canonicalString).digest('hex');

    return { shellId: hash };
  }
);
