// This file is used for local development with Genkit.
// It is not used in the production build on Vercel.
import { config } from 'dotenv';
config();

import '@/ai/flows/extract-certificate-data.ts';
import '@/ai/flows/generate-shell-id.ts';
