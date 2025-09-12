// src/app/api/add-record/route.ts
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { generateShellId } from '@/ai/flows/generate-shell-id';
import { kv } from '@vercel/kv';
import blockchainData from '@/data/blockchain.json';

// Hardcoded API key for demonstration purposes
// In a real application, this should be stored securely in environment variables
const AUTH_API_KEY = process.env.INSTITUTION_API_KEY || 'your-secret-api-key';

const BLOCKCHAIN_KEY = 'blockchain_records';

// Function to read records from Vercel KV, with a fallback to local JSON for seeding
async function getRecords(key: string): Promise<any[]> {
  let records = await kv.get<any[]>(key);
  // If KV is empty, seed it from the local JSON file
  if (!records) {
    if (key === BLOCKCHAIN_KEY) {
      records = blockchainData;
    } else {
      records = [];
    }
    // Save the initial data to KV for future requests
    await kv.set(key, records);
  }
  return records;
}

const recordSchema = z.object({
  name: z.string(),
  rollNumber: z.string().nullable(),
  certificateId: z.string().nullable(),
  dateOfBirth: z.string().optional().nullable(),
  fathersName: z.string().optional().nullable(),
  mothersName: z.string().optional().nullable(),
});

export async function POST(request: Request) {
  // 1. Authenticate the request
  const apiKey = request.headers.get('x-api-key');
  if (apiKey !== AUTH_API_KEY) {
    return NextResponse.json({ success: false, message: 'Unauthorized: Invalid API Key' }, { status: 401 });
  }

  try {
    const body = await request.json();

    // 2. Validate the incoming data
    const validation = recordSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ success: false, message: 'Invalid data format.', errors: validation.error.issues }, { status: 400 });
    }

    const newRecord = validation.data;
    const records = await getRecords(BLOCKCHAIN_KEY);

    // 3. Check for duplicates
    const { shellId: newRecordId } = await generateShellId({ jsonData: newRecord });
    for (const record of records) {
      const { shellId: existingRecordId } = await generateShellId({ jsonData: record });
      if (newRecordId === existingRecordId) {
        return NextResponse.json({ success: false, message: 'This certificate is already on the blockchain.' }, { status: 409 });
      }
    }

    // 4. Add the new record and save
    records.push(newRecord);
    await kv.set(BLOCKCHAIN_KEY, records);

    return NextResponse.json({ success: true, message: 'Certificate successfully added to the blockchain.', shellId: newRecordId }, { status: 201 });

  } catch (e) {
    console.error('API Error:', e);
    const message = e instanceof Error ? e.message : 'An unknown error occurred.';
    return NextResponse.json({ success: false, message: `Failed to add record: ${message}` }, { status: 500 });
  }
}
