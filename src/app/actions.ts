'use server';

import { extractCertificateData } from '@/ai/flows/extract-certificate-data';
import { generateShellId as genShellId } from '@/ai/flows/generate-shell-id';
import { z } from 'zod';
import FuzzySearch from 'fuzzy-search';
import { revalidatePath } from 'next/cache';
import { kv } from '@vercel/kv';
import blockchainData from '../../data/blockchain.json';
import digilockerData from '../../data/digilocker.json';


// Export generateShellId for use in other server components
export const generateShellId = genShellId;

export type CertificateRecord = {
  name: string;
  rollNumber: string | null;
  certificateId: string | null;
  dateOfBirth?: string | null;
  fathersName?: string | null;
  mothersName?: string | null;
};

const BLOCKCHAIN_KEY = 'blockchain_records';
const DIGILOCKER_KEY = 'digilocker_records';


// Function to read records from KV, with a fallback to local JSON for seeding
async function getRecords(key: string): Promise<any[]> {
  let records = await kv.get<any[]>(key);
  
  // If KV is empty, seed it from the local JSON file
  if (!records) {
    if (key === BLOCKCHAIN_KEY) {
      records = blockchainData;
    } else if (key === DIGILOCKER_KEY) {
      records = digilockerData;
    } else {
        records = [];
    }
    // Save the initial data to KV for future requests
    await kv.set(key, records);
  }
  
  return records;
}

// Function to write records to KV
async function writeRecords(key: string, data: any[]): Promise<void> {
  await kv.set(key, data);
}


export type VerificationResult = {
  verdict: 'Valid' | 'Suspicious' | 'Forged';
  trustScore: number;
  details: {
    ocr: {
      data: CertificateRecord;
      accuracy: number;
      usedQr: boolean;
    };
    source: {
      name: 'DigiLocker' | 'Blockchain' | 'None';
      match: boolean;
      verifiedShellId?: string;
      unverifiedShellId?: string;
    };
    tampering: {
      score: number;
      explanation: string;
    };
    blockchain: {
      verified: boolean;
    };
  };
};

export type VerificationState = 
  | { verdict: 'Valid' | 'Suspicious' | 'Forged'; trustScore: number; details: VerificationResult['details']; error?: never }
  | { error: string; verdict?: never; trustScore?: never; details?: never; }
  | { error: 'empty', verdict?: never; trustScore?: never; details?: never; };


// --- Helper function for fuzzy search and comparison ---
async function findBestMatch(ocrData: CertificateRecord, records: any[], sourceName: 'DigiLocker' | 'Blockchain'): Promise<{ match: boolean; record: CertificateRecord | null; fieldSimilarityScore: number, shellIdMatch: boolean, verifiedShellId: string, matchedRecord: any | null }> {
    const searchKeys = sourceName === 'DigiLocker'
        ? ['Certificate.IssuedTo.Person.name', 'Student Name', 'name']
        : ['name'];
      
    const searcher = new FuzzySearch(records, searchKeys, { caseSensitive: false, sort: true });
    const results = searcher.search(ocrData.name);

    if (results.length === 0) {
        return { match: false, record: null, fieldSimilarityScore: 0, shellIdMatch: false, verifiedShellId: '', matchedRecord: null };
    }

    const bestMatchRaw = results[0];
    let bestMatchSimple: CertificateRecord;

    // Normalize the record structure
    if (sourceName === 'DigiLocker' && bestMatchRaw.Certificate && bestMatchRaw.Certificate.IssuedTo) {
        const person = bestMatchRaw.Certificate.IssuedTo.Person;
        bestMatchSimple = {
            name: person.name,
            rollNumber: bestMatchRaw.Certificate.number, 
            certificateId: bestMatchRaw.Certificate.CertificateData?.Examination?.admitCardId, 
            dateOfBirth: person.dob,
            fathersName: person.swd,
            mothersName: person.motherName,
        };
    } else if (sourceName === 'DigiLocker' && bestMatchRaw['Student Name']) {
         bestMatchSimple = {
            name: bestMatchRaw['Student Name'],
            rollNumber: bestMatchRaw['Roll Number'] || null,
            certificateId: bestMatchRaw['Certificate ID'] || null,
            dateOfBirth: bestMatchRaw['Date of Birth'] || null,
            fathersName: bestMatchRaw["Father's Name"] || null,
            mothersName: bestMatchRaw["Mother's Name"] || null,
        };
    }
    else {
        bestMatchSimple = bestMatchRaw as CertificateRecord;
    }
    
    const ocrDataForShell = { ...ocrData };
    if (ocrDataForShell.certificateId === 'null') {
      ocrDataForShell.certificateId = null;
    }

    const { shellId: verifiedShellId } = await generateShellId({ jsonData: bestMatchSimple });
    const { shellId: ocrShellId } = await generateShellId({ jsonData: ocrDataForShell });

    if (ocrShellId === verifiedShellId) {
        return { match: true, record: bestMatchSimple, fieldSimilarityScore: 1, shellIdMatch: true, verifiedShellId, matchedRecord: bestMatchRaw };
    }

    let matchingFields = 0;
    const allKeys = new Set([
        ...Object.keys(ocrDataForShell), 
        ...Object.keys(bestMatchSimple)
    ]) as Set<keyof CertificateRecord>;

    let totalFields = 0;

    allKeys.forEach(key => {
        const ocrValue = ocrDataForShell[key];
        const recordValue = bestMatchSimple[key];
        
        if (ocrValue || recordValue) {
             if (key === 'certificateId' && (ocrValue === 'null' || !ocrValue || recordValue === 'null' || !recordValue)) {
                return;
            }
            totalFields++;
            if (key === 'dateOfBirth' && ocrValue && recordValue) {
                 if (String(ocrValue).replace(/[-/]/g, '') === String(recordValue).replace(/[-/]/g, '')) {
                    matchingFields++;
                }
            } else if (ocrValue && recordValue && String(ocrValue).toLowerCase().trim() === String(recordValue).toLowerCase().trim()) {
                matchingFields++;
            }
        }
    });

    const fieldSimilarityScore = totalFields > 0 ? (matchingFields / totalFields) : 0;
    const isMatch = fieldSimilarityScore >= 0.8;

    return { match: isMatch, record: bestMatchSimple, fieldSimilarityScore, shellIdMatch: false, verifiedShellId, matchedRecord: bestMatchRaw };
}


export async function verifyCertificate(
  prevState: VerificationState,
  formData: FormData
): Promise<VerificationState> {
  const imageDataUri = formData.get('imageDataUri') as string;
  const inputSchema = z.string().refine(
    (val) => val.startsWith('data:image/') || val.startsWith('data:application/pdf'),
    {
        message: 'Input must be a data URI for an image or PDF.'
    }
  );
  
  try {
    const validatedData = inputSchema.safeParse(imageDataUri);
    if (!validatedData.success) {
      return { error: 'Invalid file format. Please upload a valid image or PDF file.' };
    }
    
    const analysisResult = await extractCertificateData({ certificateImageDataUri: imageDataUri });

    const ocrData: CertificateRecord = {
      name: analysisResult.name,
      rollNumber: analysisResult.rollNumber,
      certificateId: analysisResult.certificateId,
      dateOfBirth: analysisResult.dateOfBirth,
      fathersName: analysisResult.fathersName,
      mothersName: analysisResult.mothersName,
    };
    const { shellId: unverifiedShellId } = await generateShellId({ jsonData: ocrData });

    const tamperingResult = {
        tamperingScore: analysisResult.tamperingScore,
        explanation: analysisResult.tamperingExplanation,
    };

    const blockchainRecords = await getRecords(BLOCKCHAIN_KEY);
    const blockchainMatchResult = await findBestMatch(ocrData, blockchainRecords, 'Blockchain');

    let bestMatchSource: 'DigiLocker' | 'Blockchain' | 'None' = 'None';
    let finalMatch = false;
    let finalVerifiedShellId = '';
    let trustScore = 0;
    let fieldSimilarity = 0;

    if (blockchainMatchResult.shellIdMatch || blockchainMatchResult.match) {
        bestMatchSource = 'Blockchain';
        finalMatch = true;
        finalVerifiedShellId = blockchainMatchResult.verifiedShellId;
        fieldSimilarity = blockchainMatchResult.shellIdMatch ? 1 : blockchainMatchResult.fieldSimilarityScore;
        trustScore = ((1 - tamperingResult.tamperingScore) * 60) + (fieldSimilarity * 40);
        if (blockchainMatchResult.shellIdMatch) {
            trustScore = Math.max(trustScore, 95);
        }
    } else {
        const digilockerRecords = await getRecords(DIGILOCKER_KEY);
        const digilockerMatchResult = await findBestMatch(ocrData, digilockerRecords, 'DigiLocker');
        
        if (digilockerMatchResult.shellIdMatch || digilockerMatchResult.match) {
            bestMatchSource = 'DigiLocker';
            finalMatch = true;
            finalVerifiedShellId = digilockerMatchResult.verifiedShellId;
            fieldSimilarity = digilockerMatchResult.shellIdMatch ? 1 : digilockerMatchResult.fieldSimilarityScore;
            trustScore = ((1 - tamperingResult.tamperingScore) * 50) + (fieldSimilarity * 50);
        } else {
            bestMatchSource = 'None';
            trustScore = (1 - tamperingResult.tamperingScore) * 50;
        }
    }
    
    let verdict: 'Valid' | 'Suspicious' | 'Forged';
    if (trustScore >= 80 || (finalMatch && trustScore >= 75)) {
        verdict = 'Valid';
    } else if (trustScore >= 40) {
        verdict = 'Suspicious';
    } else {
        verdict = 'Forged';
    }

    return {
      verdict,
      trustScore: Math.round(trustScore),
      details: {
        ocr: { data: ocrData, accuracy: fieldSimilarity, usedQr: false },
        source: { 
            name: bestMatchSource, 
            match: finalMatch, 
            verifiedShellId: finalVerifiedShellId, 
            unverifiedShellId 
        },
        tampering: {
          score: tamperingResult.tamperingScore,
          explanation: tamperingResult.explanation,
        },
        blockchain: { verified: bestMatchSource === 'Blockchain' },
      },
    };
  } catch (e) {
    console.error(e);
    let errorMessage = 'An unexpected error occurred during verification.';
    if (e instanceof z.ZodError) {
        errorMessage = 'The AI failed to extract all required fields from the document. This could be due to a poor quality image or an unsupported document format. Please try again with a clear, high-resolution image.';
    } else if (e instanceof Error) {
        if (e.message.includes('429 Too Many Requests')) {
            errorMessage = 'API quota exceeded. You have made too many requests in a short period. Please wait a minute and try again, or check your billing plan.';
        } else if (e.message.includes('503 Service Unavailable')) {
            errorMessage = 'The verification service is temporarily overloaded. Please wait a moment and try again.';
        } else {
            errorMessage = e.message;
        }
    }
    return { error: errorMessage };
  }
}

export async function addToBlockchain(
  data: CertificateRecord
): Promise<{ success: boolean; message: string }> {
    const recordSchema = z.object({
        name: z.string(),
        rollNumber: z.string().nullable(),
        certificateId: z.string().nullable(),
        dateOfBirth: z.string().optional().nullable(),
        fathersName: z.string().optional().nullable(),
        mothersName: z.string().optional().nullable(),
    });

    const validation = recordSchema.safeParse(data);
    if (!validation.success) {
        return { success: false, message: 'Invalid data format.' };
    }

    const newRecord = validation.data;

    try {
        const records = await getRecords(BLOCKCHAIN_KEY);
        
        // Check for duplicates
        const { shellId: newRecordId } = await generateShellId({ jsonData: newRecord });
        for (const record of records) {
            const { shellId: existingRecordId } = await generateShellId({ jsonData: record });
            if (newRecordId === existingRecordId) {
                return { success: false, message: 'This certificate is already on the blockchain.' };
            }
        }

        records.push(newRecord);
        await writeRecords(BLOCKCHAIN_KEY, records);

        // Revalidate the path to ensure the new data is fetched on next load
        revalidatePath('/');

        return { success: true, message: 'Certificate successfully added to the blockchain.' };
    } catch (e) {
        console.error(e);
        const message = e instanceof Error ? e.message : 'An unknown error occurred.';
        return { success: false, message: `Failed to add to blockchain: ${message}` };
    }
}

type AddRecordsState = {
    success: boolean;
    message: string;
}

export async function addDigilockerRecords(
    prevState: AddRecordsState,
    formData: FormData
): Promise<AddRecordsState> {
    const jsonFile = formData.get('jsonFile') as File | null;

    if (!jsonFile || jsonFile.type !== 'application/json') {
        return { success: false, message: 'Please upload a valid JSON file.' };
    }

    try {
        const fileContent = await jsonFile.text();
        const newRecords = JSON.parse(fileContent);

        if (!Array.isArray(newRecords)) {
            return { success: false, message: 'JSON file must contain an array of records.' };
        }

        const existingRecords = await getRecords(DIGILOCKER_KEY);
        
        const mergedRecords = existingRecords.concat(newRecords);

        await writeRecords(DIGILOCKER_KEY, mergedRecords);

        revalidatePath('/admin');
        
        return { 
            success: true, 
            message: `Successfully added ${newRecords.length} records to the DigiLocker database.`,
        };
    } catch (e) {
        console.error(e);
        let message = 'An unknown error occurred.';
        if (e instanceof SyntaxError) {
            message = 'Invalid JSON format. Please check the file content.';
        } else if (e instanceof Error) {
            message = e.message;
        }
        return { success: false, message: `Failed to process file: ${message}` };
    }
}
